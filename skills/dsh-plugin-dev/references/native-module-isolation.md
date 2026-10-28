> 溯源｜插件 native 模块隔离规范——起源案例 prime-memory #11（sharp/libvips 同进程 DLL 冲突）。

# Native 模块隔离模式

## 1. 为什么需要关注这个

DSH 宿主是 Electron 应用，进程内已加载 native binary（目前已知：`sharp` → `libvips-42.dll`）。  
Windows `LoadLibrary` 按文件名去重（进程地址空间范围），**worker_threads 共享地址空间不隔离**。  
若插件在同进程内加载同名但不同版本的 native → 崩溃或功能静默损坏。

**当前已知冲突对**：

| 宿主侧 | 插件侧引入途径 | 同名文件 |
|---|---|---|
| sharp 0.35.5 (`libvips-42.dll` 8.18.7) | `@huggingface/transformers` 顶层 require sharp → runtime 装出 0.34.5 (`libvips-42.dll` 8.17.3) | `libvips-42.dll` |

## 2. 隔离决策树

```
Q1: 插件或其 runtime 是否引入 native binary？
    ├─ 否 → 无需关注
    └─ 是 → Q2
Q2: 引入的 native 文件 basename 是否与宿主已有清单重叠？
    ├─ 否 → 安全（如 sqlite-vec、@node-rs/jieba：宿主不加载同名文件）
    └─ 是 → Q3
Q3: 该 native 的加载发生在哪个执行上下文？
    ├─ 主线程（直接 require） → 必须移除或对齐（风险最高）
    ├─ worker_threads → 同进程、不隔离 → 必须迁移到子进程
    └─ child_process → 独立进程、独立 DLL 表 → 安全（推荐）
```

## 3. 推荐实现模式：子进程隔离

### 3.1 主线程侧（通道代理）

```js
import { fork } from 'node:child_process';
import * as path from 'node:path';

class NativeChildChannel {
  constructor(modulePath, cfg) {
    this.child = fork(modulePath, [], {
      env: { ...process.env, NATIVE_CFG: JSON.stringify(cfg) },
      stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
    });
    this.pending = new Map();
    this.nextId = 1;
    this.child.on('message', msg => {
      const entry = this.pending.get(msg.id);
      if (entry) { this.pending.delete(msg.id); entry.resolve(msg); }
    });
    this.child.on('exit', code => {
      for (const [, e] of this.pending) e.reject(new Error(`child exited ${code}`));
      this.pending.clear();
    });
  }
  request(call) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.child.send({ ...call, id });
    });
  }
  terminate() {
    if (process.platform === 'win32') {
      // child_process + npm 孙进程需 taskkill /T 杀进程树
      const { execSync } = require('node:child_process');
      try { execSync(`taskkill /pid ${this.child.pid} /T /F`); } catch {}
    } else {
      this.child.kill('SIGTERM');
    }
  }
}
```

### 3.2 子进程侧（推理入口）

```js
// embedding-child.cjs
'use strict';
const cfg = JSON.parse(process.env.NATIVE_CFG || '{}');
const path = require('node:path');
const { createRequire } = require('node:module');

// createRequire 从 runtime 目录解析——此进程有独立 DLL 命名空间
const req = createRequire(path.join(cfg.runtimeDir, 'package.json'));
const mod = req('@huggingface/transformers'); // 内部 require("sharp") 只影响本进程

// IPC 协议
process.on('message', async (msg) => {
  if (msg.type === 'embed') {
    const vectors = await doEmbed(msg.texts);
    process.send({ id: msg.id, ok: true, vectors: vectors.map(v => Array.from(v)) });
  }
});
process.on('uncaughtException', (err) => {
  try { process.send({ type: 'fatal', error: err.message }); } catch {}
  process.exit(1);
});
```

### 3.3 关键注意事项

| 点 | 说明 |
|---|---|
| 向量序列化 | fork IPC 不支持 ArrayBuffer transfer；Float32Array → `Array.from(v)` (JSON) 往返精度无损（IEEE 754 double ⊃ float32） |
| Windows kill | `child.kill()` 只杀 cmd.exe wrapper；用 `taskkill /T /F` 杀进程树 |
| execPath | `fork()` 默认用 `process.execPath`（Electron 自带 Node runtime），无需额外指定 |
| 生命周期 | 插件 disable / 宿主 before-quit 时必须 `terminate()` 防孤儿 |
| 崩溃策略 | 子进程退出 → 主线程转 failed 态 → 降级 FTS；不自愈（与 worker 版一致） |

## 4. 宿主 Native 清单维护

此清单为 G7 门禁的比对基准，随宿主版本更新：

```yaml
# 宿主 native 文件清单（2026-10，基于 0.2.1-rc.2）
host_natives:
  win32-x64:
    - libvips-42.dll           # @img/sharp-win32-x64 (sharp 0.35.5)
    - libvips-cpp-8.18.7.dll   # 同上
    - sharp-win32-x64-0.35.5.node
  linux-x64:
    - libvips.so.*             # @img/sharp-libvips-linux-x64
    - sharp-linux-x64-*.node
  darwin-arm64:
    - libvips.*.dylib          # @img/sharp-darwin-arm64
    - sharp-darwin-arm64-*.node
```

宿主**不加载**的已知插件侧 native（当前安全）：
- `sqlite_vec.dll` / `sqlite_vec.so`（prime-memory 用）
- `jieba.win32-x64-msvc.node`（prime-memory 用）

## 5. 验证片段

```bash
# 检查 runtime 是否引入与宿主冲突的 native basename
RUNTIME_DIR="<dataDir>/runtime"
find "$RUNTIME_DIR/node_modules" \( -name "*.dll" -o -name "*.node" \) \
  -exec basename {} \; | sort -u > /tmp/plugin_natives.txt

# 与宿主清单比对（硬编码或自动化）
grep -F -x -f host_natives.txt /tmp/plugin_natives.txt && echo "CONFLICT" || echo "SAFE"
```
