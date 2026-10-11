>= ⚠ HISTORICAL｜已被 three-generation-settings-waist.md + settings-registration-migration.md 三代表取代，仅保留作 0.1.2 时代历史沿革；其 dual-API 结论在 0.1.7+ 全线失效。

# DSH 插件 0.1.2+ 兼容性适配指南

> 基于 `dsh-tidychat` v0.2.6 → v0.2.7 的实际适配经验整理。
> 适用场景：你的插件已支持 DSH ≥ 0.1.0-rc.7，现在希望同时兼容 **0.1.2-alpha.2+ / 0.1.2-rc.1**。

---

## 一、问题背景

DSH 在 **0.1.2-alpha.1 → 0.1.2-alpha.2** 之间对 `dsh-settings` 包做了 breaking change：

| 变更项 | 0.1.0-rc.7 / 0.1.1-rc.x | 0.1.2-alpha.2+ / 0.1.2-rc.1 |
|---|---|---|
| `dsh-settings` 导出的函数 | `installSettingsSection`、`settingsNamespace` | **被移除** |
| 宿主注册 settings 的方式 | 从 `dsh-settings` 导入函数后调用 | `ctx.settings.installSection(owner, ns, schema, entry, hooks)` |

**结果**：0.1.2+ 的 DSH 中，直接 `import { installSettingsSection } from '@deepseek-ai/dsh-settings'` 会报 `Failed to load plugins`，因为导出符号不存在。

---

## 二、核心适配模式：运行时检测 + 双 API 回退

### 2.1 原理

两种注册 API 在所有目标版本（0.1.0-rc.7 ~ 0.1.2-rc.1）中都存在**至少一个**可用路径：

| DSH 版本 | `ctx.settings.installSection` | `ctx.settings.register` |
|---|---|---|
| **0.1.0-rc.7 / 0.1.1-rc.x** | ❌ 不存在 | ✅ 存在 |
| **0.1.2-alpha.2+ / 0.1.2-rc.1** | ✅ 存在 | ✅ 也存在（保留） |

**关键发现**：`register` 方法在**所有目标版本**中都存在，`installSection` 只在 0.1.2+ 出现。因此策略是：

1. **优先** `installSection`（0.1.2+ 的新行为，保持语义一致）
2. **回退** `register`（所有旧版本都能用）
3. **静默跳过**（极端情况，两者都不存在时插件仍不崩溃）

### 2.2 示例代码：settings 注册

#### ❌ 旧写法（仅兼容 0.1.0-rc.7 ~ 0.1.2-rc.1 的早期，0.1.2+ 会报错）

```typescript
// src/index.ts
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import z from 'schemastery'

export const MY_NS = settingsNamespace('myplugin')

export const Config: z<MyConfig> = z.object({
  enabled: z.boolean().default(true),
})

export function apply(ctx: any): void {
  // 在 0.1.2+ 中，installSettingsSection 不存在 → 模块加载失败
  installSettingsSection(ctx, MY_NS, Config, {}, {
    setSource: () => {},
    onChange: () => {},
  })
}
```

#### ✅ 新写法（兼容所有版本：0.1.0-rc.7 ~ 0.1.2-rc.1）

```typescript
// src/index.ts
import type { Context } from '@deepseek-ai/cordis'
import z from 'schemastery'

// v0.1.3-alpha.1 起 settings 用小写连字符字符串命名空间，
// 不再需要 settingsNamespace() 包装。
export const MY_NS = 'myplugin' as const

export const Config: z<MyConfig> = z.object({
  enabled: z.boolean().default(true),
})

export const inject: string[] = []

export function apply(ctx: Context, config?: MyConfig): void {
  // 通过 cordis inject 拿到宿主的 settings 模块
  ctx.inject(['settings'], (settingsCtx: any) => {
    const settings = settingsCtx.settings

    // 优先使用 0.1.2+ 的新 API
    if (typeof settings?.installSection === 'function') {
      settings.installSection(ctx, MY_NS, Config, config ?? {}, {
        setSource: () => {},
        onChange: () => {},
      })
    }
    // 回退到所有版本都存在的旧 API
    else if (typeof settings?.register === 'function') {
      settings.register(MY_NS, Config, { base: config ?? {} })
    }
    // 静默跳过：极端旧版本无 register，插件仍能加载，只是没有 settings 面板
  })
}
```

### 2.3 行为对比

| 方面 | `installSection`（0.1.2+） | `register`（所有版本） |
|---|---|---|
| 参数签名 | `(owner, ns, schema, entry, hooks)` | `(ns, schema, { base })` |
| 命名空间 | 字符串字面量 `'myplugin'` | 字符串字面量 `'myplugin'` |
| 默认配置 | `entry` 参数传入 | `{ base: entry }` 传入 |
| hooks | `{ setSource, onChange }` | 不适用 |

> **注意**：`register` 不需要 `setSource`/`onChange`，它只传入 `{ base }`。插件实际读取配置走的是浏览器半的 `settingsScope.bind({ namespace })`。

---

## 三、命名空间注册方式的变化

### 3.1 旧版：通过 `settingsNamespace()` 包装

```typescript
// 0.1.0-rc.7 ~ 0.1.1-rc.x 的旧写法
import { settingsNamespace } from '@deepseek-ai/dsh-settings'

export const MY_NS = settingsNamespace('myplugin')
// → MY_NS 是一个 Symbol 或特殊对象，内部编码命名空间字符串
```

### 3.2 新版：直接使用字符串字面量

```typescript
// v0.1.3-alpha.1 起，settings 模块改用字符串命名空间
export const MY_NS = 'myplugin' as const
```

**两者在浏览器半读取时等价**：

```typescript
// 浏览器半（client/index.ts）— 两种写法读取方式不变
const settingsFace = ctx.get('webUiSettings') ?? ctx.get('settingsScope')
const settingsScope = settingsFace?.bind({ namespace: 'myplugin' })
// namespace 传的是原始字符串，新旧 host 半都能正确路由
```

---

## 四、slot 注册兼容

DSH 的 slot 系统在 0.1.0-rc.7 起已由 list 改为 keyed，这一变更在 v0.2.6 中已验证稳定：

### 4.1 settings 面板插件卡片

```typescript
// 注册到 settings.plugin.item keyed 槽（所有目标版本）
ctx.slots.inject('settings.plugin.item', () =>
  ctx.slots.register(
    {
      name: 'settings.plugin.item',
      key: 'myplugin',       // keyed 槽用 key，不用 id
      order: 100,
      inject: () => ({}),
    },
    MySettingsCard,          // React 组件
  ),
)
```

### 4.2 会话头插槽

```typescript
// 注册到 conversation.session.header.utilities（所有目标版本）
ctx.slots.inject('conversation.session.header.utilities', () =>
  ctx.slots.register(
    {
      name: 'conversation.session.header.utilities',
      id: 'myplugin-nav',    // 组件实例 id
      order: 100,
    },
    MyNavComponent,
  ),
)
```

> **注意**：`key` 用于命名空间级分发（settings 面板），`id` 用于组件实例标识。两者不混用。

---

## 五、DOM 锚点兼容

DSH 的 DOM 属性契约在所有目标版本中保持稳定。你的插件应基于**语义属性**定位，而非编译期 hash 类名：

```typescript
// 所有目标版本一致的 DOM 锚点
const CONVERSATION_SCROLL = '[data-conversation-scroll]'    // 滚动容器
const ANCHOR_KEY = '[data-chat-anchor-key]'                  // 消息锚点
const FLOW_KIND = (el: Element) => el.getAttribute('data-chat-flow-kind')
const VARIANT_THINK = '[data-variant="think"]'               // 思考块
const COMPOSER_CARD = '[data-composer-card]'                 // 输入框

// 示例：定位滚动容器
const findScrollContainer = () => document.querySelector('[data-conversation-scroll]')

// 示例：获取会话容器内所有锚点行
const scopedRows = (selector: string): Element[] => {
  const container = findScrollContainer()
  return Array.from((container ?? document).querySelectorAll(selector))
}
```

### 新增的 flow-kind 类型（0.1.2+ 可能出现）

| `data-chat-flow-kind` | 说明 | 处理建议 |
|---|---|---|
| `user` | 用户消息 | 保留，导航锚点 |
| `think` | 思考块（含 `data-variant="think"`） | 折叠 |
| `tool-call` | 工具调用 | 折叠 |
| `assistant-step` | 助手步骤 | 区分有无正文 |
| `turn-tail` | 回合尾部计时 | 提取用时信息 |
| `model-retry` | 已重试模型请求 | **0.1.2+ 新增**，应归入折叠 |
| `context` | 上下文注入 | 折叠或隐藏 |

---

## 六、语义色 Token 兼容

DSH 的语义色 token 在所有目标版本中保持一致：

```css
/* ✅ 使用语义 token，不硬编码颜色 */

/* 正文/辅助文字色 */
color: var(--dsw-alias-label-primary, #222);
color: var(--dsw-alias-label-secondary, #666);
color: var(--dsw-alias-label-tertiary, #999);
color: var(--dsw-alias-label-caption, rgba(127,127,127,0.5));

/* 背景层 */
background: var(--dsw-alias-bg-layer-3, #fff);

/* 边框 */
border-color: var(--dsw-alias-border-l2, rgba(128,128,128,0.3));

/* 品牌/强调色 */
color: var(--dsw-alias-state-business-primary, #3b82f6);
```

> **原则**：所有颜色通过 `var(--dsw-alias-*, fallback)` 引用，不做 `prefers-color-scheme` 或 `body[data-ds-dark-theme]` 硬编码检测。

---

## 七、资源清理（plugin lifecycle）

所有副作用必须在 `ctx.effect` 内登记，插件卸载时自动清理：

```typescript
export function apply(ctx: any): void {
  const disposers: Array<() => void> = []

  // 登记一次性资源
  const track = (dispose: () => void): (() => void) => {
    disposers.push(dispose)
    return () => {
      const i = disposers.indexOf(dispose)
      if (i >= 0) disposers.splice(i, 1)
    }
  }

  // 在插件卸载时统一清理
  ctx.effect(() => () => {
    for (const d of disposers.splice(0)) {
      try { d() } catch { /* ignore */ }
    }
  })

  // 示例：MutationObserver
  const obs = new MutationObserver(callback)
  const disposer = track(() => obs.disconnect())

  // 示例：CSS style 注入（卸载时移除）
  ctx.effect(() => {
    const tag = document.createElement('style')
    tag.textContent = CSS
    document.head.appendChild(tag)
    return () => tag.remove()
  })

  // 示例：MutationObserver 观察主题变化 → 清理时移除
  ctx.effect(() => {
    const themeObs = new MutationObserver(() => { recomputeTheme() })
    themeObs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
    })
    return () => {
      themeObs.disconnect()
      // 清理写入 :root 的临时 CSS 变量，不污染宿主
      document.documentElement.style.removeProperty('--myplugin-theme-color')
    }
  })
}
```

---

## 八、默认值调整建议

当你的插件功能可能与 DSH 0.1.2+ 原生功能冲突时，**将冲突功能的默认值改为 `false`**：

```typescript
export const Config: z<MyConfig> = z.object({
  // 如果你的折叠逻辑与 DSH 0.1.2 原生折叠冲突 → 默认 false
  fold: z.boolean().default(false),

  // 如果你的自动加载与 DSH 0.1.2 原生加载冲突 → 默认 false
  autoLoad: z.boolean().default(false),

  // 如果你的导航条与 DSH 0.1.2 原生 TurnNavigator 冲突 → 默认 false
  navigator: z.boolean().default(false),

  // 没有冲突的功能保持默认 true
  highlight: z.boolean().default(true),
})
```

用户仍可在「设置 → 插件配置」面板中手动开启，但首次安装不会与官方功能打架。

---

## 九、完整模板

将以上模式整合为一个可直接复用的模板：

```typescript
// src/index.ts — Host 半
import type { Context } from '@deepseek-ai/cordis'
import z from 'schemastery'

export const PLUGIN_NS = 'myplugin' as const

export interface MyConfig {
  enabled?: boolean
  featureA?: boolean
  featureB?: boolean
}

export const Config: z<MyConfig> = z.object({
  enabled: z.boolean().default(true),
  featureA: z.boolean().default(false),   // 与 0.1.2+ 原生冲突
  featureB: z.boolean().default(true),
})

export const inject: string[] = []

export function apply(ctx: Context, config?: MyConfig): void {
  // ===== Settings 注册：运行时检测 API =====
  ctx.inject(['settings'], (settingsCtx: any) => {
    const settings = settingsCtx.settings
    if (typeof settings?.installSection === 'function') {
      settings.installSection(ctx, PLUGIN_NS, Config, config ?? {}, {
        setSource: () => {},
        onChange: () => {},
      })
    } else if (typeof settings?.register === 'function') {
      settings.register(PLUGIN_NS, Config, { base: config ?? {} })
    }
  })
}
```

```typescript
// src/client/index.ts — Browser 半
import * as React from 'react'

export const inject = ['slots', 'sessions'] as const

export function apply(ctx: any): void {
  // CSS 注入（自动清理）
  ctx.effect(() => {
    const tag = document.createElement('style')
    tag.textContent = CSS
    document.head.appendChild(tag)
    return () => tag.remove()
  })

  // Settings 读取 + 订阅（即时生效）
  const config: MyConfig = { enabled: true, featureA: false, featureB: true }
  let settingsScope: any = null
  const settingsFace = ctx.get('webUiSettings') ?? ctx.get('settingsScope')
  if (settingsFace !== undefined && typeof settingsFace.bind === 'function') {
    try { settingsScope = settingsFace.bind({ namespace: PLUGIN_NS }) } catch { settingsScope = null }
  }

  if (settingsScope !== null) {
    // 读快照
    try {
      const snap = settingsScope.getSnapshot()
      if (snap?.status === 'ready' && snap.value) {
        config.enabled = snap.value.enabled ?? true
        config.featureA = snap.value.featureA ?? false
        config.featureB = snap.value.featureB ?? true
      }
    } catch { /* keep defaults */ }

    // 订阅变更
    ctx.effect(() => {
      let unsub: () => void = () => {}
      try { unsub = settingsScope.subscribe(() => { /* 重新读配置 + 重渲染 */ }) } catch { /* ignore */ }
      return () => { try { unsub() } catch { /* ignore */ } }
    })
  }

  // Slot 注册：settings 面板卡片
  ctx.slots.inject('settings.plugin.item', () =>
    ctx.slots.register(
      { name: 'settings.plugin.item', key: PLUGIN_NS, order: 100, inject: () => ({}) },
      MySettingsCard,
    ),
  )
}
```

---

## 十、验证清单

部署前逐项检查：

- [ ] Host 半使用 `ctx.inject(['settings'], ...)` + `installSection`/`register` 双 API 回退
- [ ] Host 半不使用 `import { ... } from '@deepseek-ai/dsh-settings'`
- [ ] 命名空间使用字符串字面量 `'myplugin'`，不经过 `settingsNamespace()`
- [ ] 功能默认值已评估与 0.1.2+ 原生功能的冲突，冲突项设为 `false`
- [ ] 所有 DOM 操作基于 `data-*` 语义属性，不依赖编译期 hash 类名
- [ ] 所有副作用通过 `ctx.effect` 登记，支持清理
- [ ] CSS 变量全部使用 `--dsw-alias-*` 语义 token
- [ ] 卸载时清理所有临时 CSS 变量（`style.removeProperty`）
- [ ] 在 DSH 0.1.1-rc.x 和 0.1.2-rc.1 上各验证一次
- [ ] README 顶部版本适配表格已更新（含 settings API 和冲突功能说明）

---

## 附录：版本兼容性速查

```
DSH 版本                          settings API            原生功能变化
─────────────────────────────────────────────────────────────────
0.1.0-rc.7 ~ 0.1.1-rc.x          register ✅              无原生折叠/导航
0.1.2-alpha.1                     installSection ✅        新增折叠过程/System prompt
0.1.2-alpha.2+ / 0.1.2-rc.1      installSection ✅        新增 TurnNavigator + 原生折叠
```

> **参考**：`dsh-tidychat` v0.2.6 → v0.2.7 实际适配提交：
> - 折叠重做：`652a1f1`（model-retry 处理）
> - v0.2.6：`22620d8`（折叠/分隔线重做 + 定位条暂缓）
> - v0.2.7：`19c6a2d`（settings API 向后兼容）
> - README 适配矩阵：`ea43d88`
