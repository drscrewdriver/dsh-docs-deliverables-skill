>= ⚠ 代际横幅｜双半心智模型成立；文中 settings.installSection 注册骨架属第 2 代形态（0.1.7+ 已移除），按 three-generation-settings-waist.md 三代分派改写后使用。

# DSH 插件双半模式：Settings 面板内容与声明分离

> 示例项目：`dsh-tidychat`（https://github.com/BananaSoldier01/dsh-tidychat）
> 核心价值：Host 半声明 Schema，Browser 半渲染 UI，两者通过命名空间桥接——一份配置，两份定义。

---

## 一、问题背景

DSH 插件采用 **双半架构**（Host half + Browser half），由 cordis 框架管理生命周期：

- **Host 半**：运行在服务进程（Node.js），负责注册命名空间、声明 Schema、读取宿主 API
- **Browser 半**：运行在浏览器，负责 DOM 操作、React 渲染、用户交互

**核心问题**：Settings 面板需要两部分——**数据结构**（字段、类型、默认值）和**用户界面**（标签、描述、开关组件）。DSH 把它们拆分到不同的半中：

| 需要 | 在哪定义 | 为什么 |
|---|---|---|
| Schema + 默认值 | Host 半 | 宿主的 settings 引擎需要 schema 才能生成值存储 |
| UI 面板 | Browser 半 | React 组件只能在浏览器渲染，DSH 的 slot 注入也在浏览器 |
| 值读写桥接 | 通过命名空间 | 两端通过同一个 `namespace: 'myplugin'` 共享值 |

---

## 二、架构总览

```
┌──────────────────────────────────────────────────────────────────┐
│                         DSH 宿主进程                              │
│                                                                  │
│  Host 半（src/index.ts）                                          │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Schema 声明                                                │    │
│  │   export const Config = z.object({                        │    │
│  │     fold: z.boolean().default(false),                     │    │
│  │     divider: z.boolean().default(true),                   │    │
│  │   })                                                      │    │
│  │                                                          │    │
│  │ Settings 引擎注册                                          │    │
│  │   settings.installSection(ctx, 'myplugin', Config, {}, { │    │
│  │     setSource: () => {},  // ← 空函数                      │    │
│  │     onChange: () => {},   // ← 空函数                      │    │
│  │   })                                                      │    │
│  └──────────────────────────────────────────────────────────┘    │
│                          │                                       │
│                    settingsScope (bridge)                        │
│                          │                                       │
├──────────────────────────┼───────────────────────────────────────┤
│                         │ 浏览器                                  │
│                         ▼                                       │
│  Browser 半（src/client/index.ts）                                │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ 读取值（通过同一命名空间）                                    │    │
│  │   const scope = ctx.settingsScope.bind({ namespace })      │    │
│  │   const snap = scope.getSnapshot()                         │    │
│  │   const value = snap.value || { fold: true, ... }          │    │
│  │                                                          │    │
│  │ 面板内容定义（硬编码 UI 结构）                                 │    │
│  │   const fields = [                                         │    │
│  │     ['fold', '自动折叠', '隐藏思考/工具调用'],              │    │
│  │     ['divider', '分隔线', '思考与正文之间画线'],            │    │
│  │   ]                                                        │    │
│  │                                                          │    │
│  │ UI 渲染（React 组件）                                       │    │
│  │   const TidychatSettingsCard = () => { /* ... */ }         │    │
│  │   ctx.slots.inject('settings.plugin.item', () =>          │    │
│  │     ctx.slots.register({ name, key: 'myplugin' },          │    │
│  │       TidychatSettingsCard))                               │    │
│  │                                                          │    │
│  │ 用户交互写回                                                │    │
│  │   scope.set('fold', !value.fold)                           │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 三、Host 半：只声明，不渲染

### 3.1 完整代码

```typescript
// src/index.ts
import type { Context } from '@deepseek-ai/cordis'
import z from 'schemastery'

// ─── 命名空间 ───
// v0.1.3-alpha.1 起使用字符串字面量，不再经 settingsNamespace() 包装
export const MYPLUGIN_NS = 'myplugin' as const

// ─── 配置 Schema ───
export interface MyConfig {
  enabled?: boolean
  featureA?: boolean
  featureB?: boolean
}

export const Config: z<MyConfig> = z.object({
  enabled: z.boolean().default(true),
  featureA: z.boolean().default(false),
  featureB: z.boolean().default(true),
})

// ─── 入口 ───
export const inject: string[] = []

export function apply(ctx: Context, config?: MyConfig): void {
  // 通过 runtime detection 兼容 0.1.0-rc.7 ~ 0.1.2-rc.1
  ctx.inject(['settings'], (settingsCtx: any) => {
    const settings = settingsCtx.settings

    // 优先 0.1.2+ 的 installSection
    if (typeof settings?.installSection === 'function') {
      settings.installSection(ctx, MYPLUGIN_NS, Config, config ?? {}, {
        setSource: () => {},    // 空函数 —— Host 半不消费配置值
        onChange: () => {},     // 空函数 —— UI 更新由 Browser 半处理
      })
    }
    // 回退到所有版本都有的 register
    else if (typeof settings?.register === 'function') {
      settings.register(MYPLUGIN_NS, Config, { base: config ?? {} })
    }
    // 极端情况（无 register）静默跳过，插件仍能加载
  })
}
```

### 3.2 Host 半做了什么 / 没做什么

| 做了 ✅ | 没做 ❌ |
|---|---|
| 定义 `Config` interface 和 `z.object()` schema | 不定义面板标题、字段标签、描述文案 |
| 声明默认值 `z.boolean().default(false)` | 不渲染任何 React 组件 |
| 注册命名空间到宿主 settings 引擎 | 不调用 `settingsScope.getSnapshot()` |
| 传递 schema 给引擎，引擎生成值存储 | 不处理用户点击开关的交互 |
| `setSource`/`onChange` 留空 | 不使用 `ctx.slots.inject` |

---

## 四、Browser 半：只渲染，不声明 Schema

### 4.1 完整代码

```typescript
// src/client/index.ts
import * as React from 'react'

export const inject = ['slots'] as const

export function apply(ctx: any): void {
  // ─── 读取 settings scope ───
  const config = { enabled: true, featureA: false, featureB: true }
  let settingsScope: any = null
  const settingsFace = ctx.get('webUiSettings') ?? ctx.get('settingsScope')
  if (settingsFace !== undefined && typeof settingsFace.bind === 'function') {
    try {
      settingsScope = settingsFace.bind({ namespace: 'myplugin' })  // ← 同一命名空间
    } catch {
      settingsScope = null
    }
  }

  // ─── 面板内容定义（硬编码 UI） ───
  const fields: Array<[string, string, string]> = [
    ['enabled', '启用插件', '开启后所有功能生效。'],
    ['featureA', '功能 A', '描述功能 A 的作用。'],
    ['featureB', '功能 B', '描述功能 B 的作用。'],
  ]

  // ─── React 面板组件 ───
  const MySettingsCard = () => {
    const [open, setOpen] = React.useState(false)
    const [snap, setSnap] = React.useState<any>(null)

    React.useEffect(() => {
      if (settingsScope === null) return
      const pull = () => {
        try { setSnap(settingsScope.getSnapshot()) } catch { setSnap(null) }
      }
      pull()
      let unsub: () => void = () => {}
      try { unsub = settingsScope.subscribe(pull) } catch { /* ignore */ }
      return () => { try { unsub() } catch { /* ignore */ } }
    }, [])

    const value = (snap?.value) ?? { enabled: true, featureA: false, featureB: true }
    const writable = snap?.writable ?? false

    return React.createElement('li', { className: 'myplugin-card' },
      React.createElement('button', {
        onClick: () => setOpen(!open),
      }, `插件设置（${open ? '收起' : '展开'}）`),
      open ? React.createElement('div', null,
        fields.map(([field, label, hint]) =>
          React.createElement('div', { key: field },
            React.createElement('span', null, label),
            React.createElement('button', {
              disabled: !writable,
              onClick: () => {
                void settingsScope.set(field, !value[field]).catch(() => {})
              },
            }, value[field] ? '开' : '关'),
            React.createElement('p', null, hint),
          )
        )
      ) : null,
    )
  }

  // ─── 注册到 DSH slot ───
  ctx.slots.inject('settings.plugin.item', () =>
    ctx.slots.register(
      { name: 'settings.plugin.item', key: 'myplugin', order: 100, inject: () => ({}) },
      MySettingsCard,
    ),
  )
}
```

### 4.2 Browser 半做了什么 / 没做什么

| 做了 ✅ | 没做 ❌ |
|---|---|
| 通过 `namespace: 'myplugin'` 读取同一命名空间的值 | 不定义 `Config` schema 或 `z.object()` |
| 硬编码 `fields` 数组定义面板显示内容 | 不在 Host 半中定义字段列表 |
| 渲染 React 组件 `MySettingsCard` | 不调用 `settings.installSection()` |
| 注册到 `settings.plugin.item` slot | 不调用 `ctx.settings.register()` |
| 用户交互时 `settingsScope.set(field, val)` 写回 | 不定义字段类型（`boolean`/`string` 等） |

---

## 五、桥接机制

两端通过 **同一命名空间字符串** 共享数据：

```
Host 半注册：  settings.installSection(ctx, 'myplugin', Config, ...)
Browser 半读：  settingsScope.bind({ namespace: 'myplugin' })
Browser 半写：  settingsScope.set(field, value)
```

**关键约束**：
- 命名空间字符串必须一致（`'myplugin'`），否则两端读不到对方的值
- Schema 中的字段名必须与 UI 中 `fields` 数组的 `field` 键一致
- `z.default()` 的默认值应与 Browser 半 fallback 默认值一致

---

## 六、实际项目中的完整数据流

以 `dsh-tidychat` 为例，展示一个完整的用户操作生命周期：

```
1. 用户打开「设置 → 插件配置 → 会话整理」
   │
   ├─→ Browser 半：TidychatSettingsCard React 组件被渲染
   │   ├─→ fields 数组定义显示哪些字段
   │   ├─→ settingsScope.getSnapshot() 读取当前值
   │   └─→ React 渲染开关组件（开/关状态来自 snap.value）
   │
2. 用户点击「自动折叠」开关
   │
   ├─→ Browser 半：toggle('fold') 调用 settingsScope.set('fold', false)
   │   └─→ 写入宿主 settings 引擎
   │
   ├─→ Host 半：settings 引擎更新 'myplugin' 命名空间下的值
   │   └─→ 触发订阅通知（如果设了 onChange）
   │
   └─→ Browser 半：settingsScope.subscribe 回调触发
       └─→ React 重新渲染，开关状态更新为「关」
       └─→ 同时 config 变量更新 → 插件功能生效/失效
```

---

## 七、常见反模式与正确做法

### 反模式 1：在 Host 半定义 UI 内容

```typescript
// ❌ 错误：Host 半不能渲染 React
export function apply(ctx: any): void {
  // 这行在宿主进程中执行，没有 React 运行时
  const card = React.createElement('button', null, '设置面板')
}
```

### 反模式 2：在 Browser 半注册 Schema

```typescript
// ❌ 错误：Browser 半不能调用 installSection
export function apply(ctx: any): void {
  ctx.settings.installSection(...)  // 宿主进程中才有 settings
}
```

### 反模式 3：两端命名空间不一致

```typescript
// ❌ 错误：Host 用 'myplugin'，Browser 用 'myplugin-settings'
// Host: settings.installSection(ctx, 'myplugin', ...)
// Browser: settingsScope.bind({ namespace: 'myplugin-settings' })  // 读不到！
```

### 正确做法

```typescript
// ✅ 常量只声明一次，两端 import 同一文件
// src/config.ts（共享文件）
export const NS = 'myplugin' as const

// src/index.ts — Host 半
import { NS, Config } from './config'
settings.installSection(ctx, NS, Config, ...)

// src/client/index.ts — Browser 半
import { NS } from '../config'
settingsScope.bind({ namespace: NS })
```

---

## 八、设计决策总结

| 设计决策 | 原因 | 影响 |
|---|---|---|
| Host 半不渲染 UI | 宿主进程无 React | UI 必须在 Browser 半 |
| Browser 半不声明 Schema | Browser 半不接触宿主引擎 | Schema 定义在 Host 半 |
| 通过命名空间桥接 | cordis 框架的 settings 模块提供 bridge | 两端解耦，但需保持命名空间一致 |
| `setSource`/`onChange` 留空 | UI 交互由 Browser 半直接处理 | Host 半是纯粹的"声明层" |
| 默认值在 Host 半声明 | Schema 引擎需要默认值 | Browser 半 fallback 值需与之一致 |
| 面板文案硬编码在 Browser 半 | UI 内容天然属于浏览器 | 文案修改只需改 client |

---

## 九、对其他 DSH 插件的启示

任何在 DSH 中需要 settings 面板的插件，都遵循这个模式：

1. **Host 半**：`Config` interface → `z.object()` → `settings.installSection`/`register`
2. **Browser 半**：`fields` 数组 → React 组件 → `slots.inject('settings.plugin.item')`
3. **桥接**：同一命名空间字符串 `'myplugin'`

这个分离不是强制约束，而是 DSH 架构的自然结果——host 半在 Node.js 进程，browser 半在浏览器。理解这一点有助于编写结构清晰的 DSH 插件。

---

*参考：`dsh-tidychat` src/index.ts + src/client/index.ts，v0.2.7*
