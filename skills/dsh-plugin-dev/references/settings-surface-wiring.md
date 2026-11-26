# 设置面接线与样式自查 — settings-surface-wiring

> 溯源｜2026-11-26 立。核验宿主基准：桌面 `app.asar` @0.2.x（asar 头 offset=16、JSON 从 16 开始、数据区 = `16 + (headerSize - 8)`）。
> 起源：`dsh-manage-session` 2.0.26 的四类实机故障（列数切换不生效 / 家族 tab 开关不接线 / star 行退化 / 设置卡样式错乱）。
> 三态断言台账见本文 §8；锚点唯一闸 `maintenance/skill-anchor-map.yaml`。

## 0. 结论速览（新插件开工前必背）

| # | 铁律 | 违反后的症状 |
|---|---|---|
| 1 | `writable: false` 只能来自**真实读取**，绝不能硬编码兜底 | 开关全禁 + 「只读挂载」文案误报，用户以为宿主坏了 |
| 2 | 设置卡的所有控件状态必须由**同一份快照**驱动，且快照要**订阅**变化 | 拨了开关 / 点了分段钮，界面与行为都不跟 |
| 3 | 分段钮、开关这类控件的类名**必须在样式串里有定义** | 控件渲染成裸 `<button>`，视觉全烂，typecheck/build/单测全绿 |
| 4 | 一次性 fetch 读设置 = 快照，永不刷新 | 设置写成功了，面板仍按旧值渲染 |
| 5 | 任何「用户点过就永久隐藏」的 localStorage 键，语义改动时必须**升版键名** | 修好的按钮对老用户永久失效，且极难复现 |

**这五条没有一条能被 tsc / vitest / build 抓到。** §6 给了三道可执行闸。

## 1. 设置数据面：三代 waist 与「可写」的真值来源

三代 waist 的注册 API 分派见 `three-generation-settings-waist.md` §1，本文不重复。本文只讲**拿到值之后怎么写**——这是最多插件翻车的地方。

### 1.1 宿主的 writable 恒为 true（硬证据）

宿主 `@deepseek-ai/dsh-settings/src/index.ts`：

```ts
/** Whether the active profile accepts form edits. */
get writable(): boolean { return true }
```

⇒ **宿主不存在「只读模式」**。任何 `writable: false` 都是插件自己产生的。

`describe()` 返回的每一行：

| 字段 | 含义 |
|---|---|
| `ns` | **等于 profile entry id**（`entry.options.id`），不是插件自定的命名空间 |
| `schema` | 该 entry 的 volatile 子 schema |
| `revision` | 该 ns 的写版本号 |
| `value` / `base` / `user` | 生效值 / 继承层值 / 用户覆写层值 |

只有**同时满足**「entry 处于 ACTIVE fiber」+「schema 里有 volatile 字段」的 entry 才会出现在 describe 里。`volatileForm(schema) === undefined` 的 entry 直接返回 `[]`，**不报错、不出现**——这是「设置卡永远 loading / unavailable」的头号原因。

### 1.2 客户端的 namespace 就是 entry id（硬证据）

`dsh-client-ui-settings/src/client/config-form.ts`：

```ts
get<T>(entryId: string): ConfigForm<T> {
  const existing = this.forms.get(entryId)
  if (existing !== undefined) return existing
  const form = new ConfigFormController<T>(
    this.owner, { namespace: entryId }, this.mirror, this.schema,
  )
  ...
}
```

`derive()` 的两条独立判据：

```ts
const { writable } = mirrored.view          // ← 宿主值，恒 true
const view = mirrored.view.namespaces.find(c => c.ns === this.spec.namespace)
if (view === undefined) {
  draft.status = 'unavailable'              // ← 该 ns 不在 describe 文档里
  draft.writable = writable
  return
}
```

⇒ **两种失败要分清**：

| 现象 | 含义 | 修法 |
|---|---|---|
| `status === 'unavailable'` | entry id 不匹配 / entry 不是 ACTIVE / schema 无 volatile 字段 | 对齐 entry id、给字段加 `.volatile()` |
| `status === 'ready' && writable === false` | 只可能来自你自己的兜底分支 | 见 §1.3 |

### 1.3 绝对不要写这种兜底（反面教材）

```ts
// ⛔ 事故源：manage-session src/index.ts L943
if (method === 'settings-describe') {
  const state = runtime.settingsBridge
  if (state !== undefined && state.bridge !== undefined) return settingsDescribe(state)
  // modern 宿主：运行时配置只读投影
  return { ok: true, namespaces: configSnapshotProjection(config), writable: false, revision: 0 }
  //                                                                  ^^^^^^^^^^^^^^^
}
```

这段的本意是「桥没咬合时给个只读兜底」，实际后果：**宿主完全可写，但插件告诉 UI 是只读，卡上所有控件 disable，还渲染一句「当前会话无法修改设置（只读挂载）」。**

正确做法（二选一，按宿主线分派）：

```ts
// 方案 A（推荐）：直连宿主 settings 服务，不自己搭桥
//   咬合条件用「能力探测」而不是某个特定方法名
const canRead  = typeof settings.describe === 'function'
const canWrite = typeof settings.update === 'function' || typeof settings.mutate === 'function'
if (canRead) {
  const row = settings.describe().find(r => r.ns === ENTRY_ID)
  // row.value 就是完整生效值
}
if (canWrite) {
  // ⚠ 不传 expectedRevision：宿主 write() 在 expected === undefined 时跳过 revision 比对
  await settings.update(ENTRY_ID, { columns: 4 })
}
```

```ts
// 方案 B：确实要保留自家桥（老宿主兼容），咬合条件必须拆成「能读 / 能写」
const readable = typeof settings.describe === 'function' || typeof settings.get === 'function'
const writable = typeof settings.update === 'function' || typeof settings.mutate === 'function'
if (!readable && !writable) return state        // 真·不可用，此时才允许报只读
```

**铁律补充**：真的不可用时，文案必须是「本宿主未提供设置服务」而**不是**「只读挂载」——后者会让用户和后续排查者都走错方向（本仓上一轮排查就为此浪费了一整轮）。

### 1.4 expectedRevision 什么时候传

宿主 `write()`：

```ts
if (expected !== undefined && descriptor.revision !== expected) {
  throw new SettingsConflictError(ns, expected, descriptor.revision)
}
```

| 场景 | 传不传 | 理由 |
|---|---|---|
| 面板上的开关 / 分段钮 | **不传** | 面板可能停留很久，revision 早过期；不传则宿主跳过比对，永远成功 |
| 表单整体保存（乐观锁语义） | 传 | 要检测「别人改过了」 |
| 批量变更（多个字段一次写） | 传 `mutate` 的固定 revision | 让整批原子成立或整批失败 |

### 1.5 写入路径三选一（按宿主能力）

```ts
// ① 合并写（首选）：只覆盖给出的字段
await settings.update(ns, patch)

// ② 整段替换：先 unset 所有 live 字段，再 set 给出的字段
await settings.replace(ns, section)

// ③ 路径级原子操作（update 缺席时用）
await settings.mutate(ns, [{ op: 'set', path: ['columns'], value: 4 }], undefined)
```

三者都要求目标 entry 的 schema **确有 volatile 字段**，否则抛
`Plugin entry "<ns>" has no volatile fields`。

## 2. 卡片状态机：一份快照驱动一切

### 2.1 必须订阅，不能只读一次

```ts
// ⛔ 事故源：manage-session src/client/manage.tsx L458
useEffect(() => {
  void callSteward('session-health-status', {}).then((res) => {
    const raw = res.switches?.columns
    if (typeof raw === 'number') setColSetting(raw)   // 读一次，永不刷新
  })
}, [])                                                // ← 空依赖
```

设置写成功 → 宿主 describe 更新 → **但面板按旧值渲染**。用户看到「点了没反应」。

```ts
// ✅ 正确：让上层把配置当 prop 传下来，或自己订阅 scope
export function ManageConsole({ columns }: { columns?: number }) {
  const [colSetting, setColSetting] = useState(columns ?? DEFAULT_COLUMNS)
  useEffect(() => { if (columns !== undefined) setColSetting(columns) }, [columns])
  ...
}
```

上层（面板 / 入口）本来就持有 `bound` 快照：

```ts
const snapshot = useSyncExternalStore(
  (l) => bound.subscribe(l),
  () => bound.getSnapshot(),
)
const config = { ...DEFAULT_CONFIG, ...(snapshot.value ?? {}) }
// → 把 config.columns 一路透传下去
```

### 2.2 控件禁用的判据只能有一个

```ts
// ✅ 三个开关 + 分段钮 + 提示文案，全部读同一个 writable
const writable = snapshot.writable
<input disabled={!writable} ... />
{!writable && <span>{translate(t, 'card.readonly')}</span>}
```

⛔ 不要出现「一个控件读 snapshot.writable，另一个读 prop，还有一个读本地 state」——状态会分裂。

### 2.3 乐观回显的失败必须可见

写接口返回失败时要**回滚 + 抛错**，让用户看到开关弹回去：

```ts
set: async (field, value) => {
  const before = keyOf(shared)[field]
  keyOf(shared)[field] = value       // 乐观回显
  refresh()
  const res = await callHost('settings-mutate', { ns, fields: { [field]: value } })
  if (res.ok !== true) {
    keyOf(shared)[field] = before    // ← 弹回 = 用户可见的失败信号
    refresh()
    throw new Error(res.error ?? '设置写入失败')
  }
}
```

## 3. 宿主给插件的「跳转到设置页」能力盘点

很多插件的设置卡在 A 分区，用户却在 B 面板里找它——所以想加「跳到设置页」按钮。宿主能力实况：

| 面 | 能不能给插件用 | 证据 |
|---|---|---|
| `settings.launcher` owner props 的 `openSettings(sectionId?)` | ❌ 拿不到：该席位 `kind: 'single'`，已被 `ui-settings-general` 占用 | `ui-settings/src/client/contract/slots.ts` |
| `settings.section` owner props | ⚠ 只有 `close`，没有 `openSection` | 同上 |
| `settings.onboarding` owner props 的 `openSection(id)` | ⚠ 只发给 onboarding step 注册者 | 同上 |
| shell store 的 `actions.openSection(id)` | 🔶 **理论可拿**：`settings-general` 注册 `sidebar.settings` 时把 `store: shellStore` 写进了 register options | `settings-general/src/client/index.ts` |
| `settings.open` 快捷键命令 | ✅ 可派发 keydown 打开面板，但**无法指定分区** | `settings-general` 里 `ctx.shortcuts.register({ id: 'settings.open', … })` |

`openSection` 的语义（`settings-general/src/client/shell-store.ts`）：

```ts
openSection: (d, id: string) => { d.activeId = id; d.open = true }
```

**分级处方**：

```ts
// A 级（首选，需运行时探测一次）：直接驱动 shell store
const entry = slots.entries('sidebar.settings')[0] as any
const store = entry?.store?.create?.()
store?.actions?.openSection?.('plugins')      // 'plugins' = Plugins 设置分区 id

// B 级（A 不可达时降级）：派发快捷键打开设置面板 + 明示路径
window.dispatchEvent(new KeyboardEvent('keydown', {
  code: 'Comma', ctrlKey: true, altKey: true, bubbles: true,
}))
// 并在按钮下方提示「设置 → 插件 → <你的包名>」3 秒

// C 级：打开 profile 配置文档（宿主有 documentPath / prepareDocument）
await settings.prepareDocument()
```

⛔ 不要用 `document.querySelector` 找宿主内部按钮再 `.click()`——宿主改结构即碎，且测试环境永远抓不到。

**探测纪律**：A 级是**运行时才知道**的（类型面从来不声明 store）。所以这类按钮必须写成「A 尝试 → 失败落 B」，不能假设 A 成立。

## 4. 设置面样式自查（本项目最贵的教训）

### 4.1 症状

设置卡里加了一组分段钮（1–6 列）。JSX 写的是：

```tsx
createElement('div', { className: 'dms_seg' }, COLUMN_CHOICES.map(n =>
  createElement('button', {
    className: `dms_segBtn${normalizeColumns(value.columns) === n ? ' dms_segBtnOn' : ''}`,
    ...
  }, String(n))))
```

但样式串里 **`dms_seg` / `dms_segBtn` / `dms_segBtnOn` 一个都没定义**（实测 `grep -c dms_seg` 在 `src/client/index.ts` 的样式块 = 0）。

结果：分段钮渲染成浏览器默认按钮（灰底、丑边框、无选中态），看起来像「设置面样式坏了」。

**为什么所有闸都没抓**：

| 闸 | 为什么抓不到 |
|---|---|
| `tsc` | `className` 是字符串字面量，不是类型的一部分 |
| `vitest` | 单测断言的是 `onClick` 行为，不查样式 |
| `npm run build` | 打包不看 CSS 引用完整性 |
| 人工 review | className 和样式串在**两个文件**里，相隔 100 多行 |

### 4.2 修法：同名控件抄兄弟仓的令牌

同类控件在 `dsh-search-index` 里有正确的实现（`src/client/panel.tsx`）：

```css
.dsws_seg{display:inline-flex;align-items:center;gap:2px;background:var(--dsw-alias-interactive-bg-hover);border-radius:8px;padding:2px;flex:none}
.dsws_segBtn{height:24px;border:none;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:6px;padding:0 10px;font-size:12px;font-weight:500;line-height:20px}
.dsws_segBtn:hover{color:var(--dsw-alias-label-primary)}
.dsws_segBtn:disabled{cursor:not-allowed;opacity:.5}
.dsws_segBtnActive{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:0 1px 2px rgba(0,0,0,.08)}
```

**新建同类控件时的动作清单**：

1. 先在兄弟仓 `grep` 同名控件（`seg` / `toggle` / `pill` / `star`），抄它的类名结构 + 令牌。
2. 类名带本插件前缀（`dms_` / `dsws_` / `dstw_`），避免跨插件互相污染。
3. **加完立刻跑 `check-surface-classes` 闸**（§5.1）——这是唯一能抓住它的机械手段。
4. 样式令牌只用 `--dsw-alias-*` 变量，禁写死 `#fff` / `#000`（暗色主题事故，见 `family-tab-contract.md` §6）。

### 4.3 同一个坑的第二种形态：模板插值前缀

```tsx
className: `dms_levelPill dms_level_${gate.level}`   // gate.level ∈ ok|warn|fail|skipped
```

样式里定义了 `dms_level_ok` / `dms_level_warn` / `dms_level_fail` / `dms_level_skipped` ✅

但同一个文件里还有：

```tsx
className: `dms_gate dms_gate_${gate.level}`          // ← ❌ 样式里只有 dms_gate / dms_gateList / dms_gateName
```

**判据**：模板插值 `PREFIX${...}` 的校验方式不是「PREFIX 本身被定义」，而是「**有任一已定义类名以 PREFIX 开头**」。§5.1 的闸按这条判。

### 4.4 「样式全素」三因（类名齐全 ≠ 样式到位）

`dsh-progress-union` 曾经整个设置卡「裸奔」——类名、CSS 全都写好了，用户看到的却是浏览器默认控件。**这类故障和 §4.1 的「类名没定义」是两回事，闸抓不到，必须靠纪律。** 三个真实成因：

#### 因一：`<style>` 写在组件里，到不了另一个 React 根

```js
// ⛔ 错误：style 节点挂在组件自己的子树里
return h('div', { className: 'dsu-set' },
  h('style', null, SETTINGS_CSS),   // 只覆盖「本组件渲染出来的子树」
  ...fields)
```

设置页 / 插件详情页是**另一个 React 根**。数据面板里渲染的 `<style>` 到不了那里 → 那张卡「裸奔」。
**正确**：进 `document.head`（progress-union 的 `SETTINGS_STYLE_ID` 就是这么修的，源码注释原话：*「上一版设置卡『裸奔』的原因」*）。

#### 因二：等组件挂载才注入 → 先画出来的是无样式节点

```js
// ⛔ 错误：在组件里 useEffect 注入
useEffect(() => { ensureHeadStyle(ID, CSS) }, [])

// ✅ 正确：apply() 期就进 head
export function apply(ctx) {
  ensureHeadStyle(BOARD_STYLE_ID, CSS)   // 挂载前一切就绪
  ctx.slots.register(...)
}
```

progress-union 的实测时序坑（源码注释逐字记着）：

- **会话头部工具区**（`conversation.session.header.utilities`）比面板先挂载；
- **输入框 dock** 在进度板为空时会**提前 return，连自己的 `<style>` 都不渲染**；
- ⇒ 「样式还没到、节点已经画出来」，退化成浏览器默认按钮（浅底 `ButtonFace` + 1px 边框 + 深色 `ButtonText`），**在深色头部上就是一块反色块**。

> 判据：任何跨槽位复用的样式，一律 `apply()` 期 `ensureHeadStyle`，不要依赖任一组件挂载。

#### 因三：`document.getElementById` 幂等闸用了同一个 id

```js
function ensureHeadStyle(id, css) {
  if (document.getElementById(id)) return   // ← 后续同 id 的 CSS 永远进不去
  ...
}
```

HMR 重载插件、或两处注册同一 id 时，**第二份 CSS 被静默丢弃**。加样式时务必换新 id（progress-union 用 `...-settings-style` / `...-board-style` 两个独立 id 正是为此）。

#### 因四（同族）：类名漏定义

```js
className: 'pb-dock-btn pb-dock-enable'   // ← pb-dock-enable 全仓零定义（闸实测命中）
```

`pb-dock-btn` 有定义、`pb-dock-enable` 没有 → 那个「启用自动」按钮只能是半截样式。这类由 §5.1 的闸抓。

### 4.5 新控件上线前的样式自查（4 步）

```
1. 类名有定义       → node scripts/check-surface-classes.mjs --prefix <前缀>
2. 注入位置对       → 跨 React 根 / 跨槽位的样式必须进 document.head，不能写在组件子树里
3. 注入时机对       → apply() 期 ensureHeadStyle，不等组件挂载
4. 幂等 id 唯一     → 每套 CSS 一个独立 id；加样式换新 id，否则旧 id 的存在会吞掉新 CSS
```

前三步里只有第 1 步能自动化（闸）；**2/3/4 只能靠人看**，所以写进本检查单当纪律。<br>
在线自检（30 秒）：在宿主里打开出问题的那个面，DevTools 里 `document.querySelectorAll('style[id^="dsh-"]')` 看样式节点在不在 `head`；节点在 `head` 但控件仍裸 → 查类名（第 1 步）；节点根本不在 → 查因一/因二。


## 5. 三道可执行闸（全部零依赖，可拷进任何仓）

### 5.1 样式类名完整性闸

`scripts/check-surface-classes.mjs`（随本 skill 分发）：

```sh
node scripts/check-surface-classes.mjs --prefix dms_
# 退出码 0 = 全部有定义；1 = 有漏定义（逐条列出 文件:行号 + 类名）
```

实测命中 manage-session 2.0.26 的真问题：

```
dms_seg       ← src/client/card.tsx:157
dms_setStar   ← src/client/card.tsx:176
dms_gate_<插值> ← src/client/health-panel.tsx:329（没有任何已定义类名以 dms_gate_ 开头）
dms_segBtn<插值> ← src/client/card.tsx:160
```

对照组 `dsh-search-index` 同一脚本通过（`dsws_seg*` 全部有定义）——证明闸能区分好坏仓。

**接进 `prepack`**（和 `verify-layout` 同级），让它成为发版前的硬闸。

**已知覆盖边界（别当全覆盖闸用）**——反向自测（2026-11-26，临时仓 `src/client/card.tsx` 放 3 个未定义类名 + 1 个插值前缀）：

| 形态 | 闸能不能抓 |
|---|---|
| `className: 'foo'`，样式无 `.foo` | ✅ FAIL（exit 1） |
| `` className: `bar${x}` ``，样式无 `.bar*` 族 | ✅ FAIL（按 orphanFragments 报） |
| `` className: `x${on ? ' hidden' : ''}` `` —— `hidden` 在**插值内部** | ❌ **扫不到**（静态扫描只取 `${` 外的片段） |
| `className: clsx('a', cond && 'b')` / `class=` / `css.xxx`（CSS Modules） | ❌ 不参与（后者由 TS 类型保证） |

⇒ 条件类名请写成**两个完整分支**：`on ? 'x hidden' : 'x'`，别把它塞进插值里。
⇒ 闸只做「有没有定义」的集合判定，**不校验**令牌用错、颜色写死、暗色主题失配。

对照组：`dsh-search-index` 同一脚本 exit 0（`dsws_seg*` 全部有定义）。

### 5.2 设置写路径冒烟（人工 30 秒，每加一个控件跑一次）

1. 打开设置卡 → 拨一个开关 / 点一个分段钮。
2. **看行为**（不只是看 UI）：分段钮要看主面板网格列数变没变；开关要看功能生效没。
3. 刷新页面 → 看值是否保持。
4. `grep` profile 配置文档确认落盘：

   ```sh
   grep -A 8 "id: <你的包名>" ~/.dsh/profiles/<profile>/cordis.patch.yml
   ```

   **出现该 entry 段且带你写的字段 = 真落盘**；没出现 = 写路径没通（或只是 UI 乐观回显）。

5. 若控件显示为 disabled，先查 `getSnapshot().writable` 的**来源**，不要假设宿主只读（§1.1）。

### 5.3 「永久隐藏」类交互的键名版本闸

任何 `localStorage` 里记「用户点过了就别再打扰」的键，必须满足：

```ts
// 键名带语义版本；语义一改就升版
const KEY = `dsh.star.${NS}.v2.dismissed`

// 旧键处理：删掉，不迁值
try { localStorage.removeItem(`dsh.star.${NS}.dismissed`) } catch { /* 隐私模式 */ }
```

**为什么删而不迁**：旧键里的值往往是**旧 bug 写进去的误判**（manage-session 2.0.25 把「点 ★」写成了「隐藏」，凡是点过 ★ 的用户旧键都是 `1`）。迁值 = 把 bug 固化到新键上，用户永远看不到修好的按钮。

**判据**：修完必须能在浏览器里手动清掉新旧两个键 → 刷新 → 按钮回来。这是唯一能自证的方式。

## 6. 新插件开工检查单（复制到你的 checklist）

```
[ ] entry id 确认：profile entry id == 客户端 configForms.get() 的 key == 你所有 describe 查找用的 ns
[ ] Config schema 里每个要出现在表单的字段都过了 .volatile()（老线用 typeof field.volatile === 'function' 探测）
[ ] writable 来源单一：读宿主 → 传下来，全程无硬编码 false
[ ] 不可用文案区分「宿主无设置服务」与「真只读」，不混用
[ ] 每个控件都订阅快照变化，没有一次性 fetch 决定 UI
[ ] 写入不传 expectedRevision（除非确实要乐观锁）
[ ] 每个新 className 在样式串里都有定义 → 跑 check-surface-classes.mjs
[ ] 样式只用 --dsw-alias-* 令牌，无写死颜色
[ ] 模板插值类名（PREFIX${x}）的 PREFIX 有对应已定义族
[ ] 「跳过/不再提示」类 localStorage 键带版本段，改语义先升版
[ ] 跳转设置页的按钮走「A 尝试 → B 降级」，不假设 store 可达
[ ] 部署产物上人工点一遍（build 绿 ≠ UI 对）
```

## 7. 定位这类问题的取证顺序（比盲改快一个数量级）

| 步骤 | 动作 | 得到什么 |
|---|---|---|
| 1 | 先确认宿主是不是清白的 | 读宿主 `writable` getter、describe 实现（§1.1） |
| 2 | 分清 `unavailable` 与 `writable:false` | 决定是 id 错配还是自己兜底分支（§1.2） |
| 3 | `grep` 自己的 `writable: false` 字面量 | 一次命中（§1.3） |
| 4 | 对每个控件查「谁在写它的 disabled」 | 找到状态分裂点（§2.2） |
| 5 | 对每个新 className `grep` 样式串 | 抓漏定义（§5.1） |
| 6 | 对每个「用户点过就消失」的交互查键名版本 | 抓退化（§5.3） |

⛔ 顺序反了会浪费整轮：manage-session 上一轮先怀疑宿主只读 / provider 锁 / 版本旧，三条全被源码否掉，最后才回到插件自己的 `writable: false` 字面量。

## 8. 断言台账

| claim | 证据 | 状态 |
|---|---|---|
| 宿主 settings `writable` 恒 true | `dsh-settings/src/index.ts` `get writable(): boolean { return true }` | VERIFIED（asar 实读） |
| describe 的 ns = entry id，且仅 ACTIVE + 有 volatile 字段的 entry 出现 | 同文件 `describe()`：`entry.options.id` + `volatileForm(schema)` undefined 即跳过 | VERIFIED |
| 客户端 `configForms.get(entryId)` 把 entryId 当 namespace | `dsh-client-ui-settings/src/client/config-form.ts` 构造函数 | VERIFIED |
| `writable` 取宿主值、`status` 取「ns 在不在文档里」 | 同文件 `derive()` | VERIFIED |
| 宿主写接口无 `register`，只有 update/replace/mutate | `dsh-settings/src/index.ts` 方法表 | VERIFIED |
| `expected === undefined` 时跳过 revision 比对 | 同文件 `write()` | VERIFIED |
| 无 volatile 字段的 entry 写入抛错 | 同文件 `volatileForm` undefined 分支 | VERIFIED |
| `settings.launcher` 是 single 且被官方占用 | `ui-settings/src/client/contract/slots.ts` + `settings-general` 注册 | VERIFIED |
| section owner props 只有 `close` | 同上 `SettingsSectionOwnerProps` | VERIFIED |
| `openSection` = `{activeId, open}` | `settings-general/src/client/shell-store.ts` | VERIFIED |
| `sidebar.settings` 注册时带 `store` | `settings-general/src/client/index.ts` register 调用 | VERIFIED（写入侧）；**运行时可达性 PENDING** |
| `dms_seg*` / `dms_setStar` / `dms_gate_*` 无样式定义 | `check-surface-classes.mjs` 实测输出 | VERIFIED |
| `dsws_seg*` 有定义（对照组） | 同脚本在 `dsh-search-index` 通过 | VERIFIED |
| star 行退化由旧 dismissed 键造成 | 产物 `extendedStarRow` 首行 `if (starDismissed()) return link` + 2.0.25 把点★写成隐藏的历史 | VERIFIED（源码）；用户侧键值为 `1` 属 FARM 待测 |

## Maintenance

锚点唯一闸 `maintenance/skill-anchor-map.yaml`（本文对应 claim 前缀 `surface-`）。
宿主升 rc 后重跑 §1 的 grep；未命中段落加「⚠ 待重新核实 <日期>」。
**样式闸脚本要随附进每个插件仓的 `scripts/`，随 `prepack` 跑**——否则本文只是文档，不是防线。
