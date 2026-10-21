# DSH 管理员模式（dsh-admin-mode）

把「完全访问 + 永不询问」做成 DSH 里的一个权限档，并**自带官方 computer use**、
屏幕操作 HUD 和「自主迭代」按钮。

![preview](docs/preview.png)

---

## 里面有什么

### 1. 管理员权限档

- 在输入框的**权限菜单**里新增一档 **「管理员」**（红色警示 + 「危险」徽章）
- 效果 = `danger-full-access` + `approval: never`：
  **截屏、鼠标、键盘、任意工具全部放行，不再弹批准请求**，可以一直自主执行到任务完成
- ★ **无沙箱**：`danger-full-access` 让 DSH 的文件与命令执行脱离沙箱限制
- 选择时**连续弹两次严重警告**，每次都必须勾选确认才能继续
- 权限菜单一共 4 档（官方 `auto` 档在本插件里隐藏，不提供）：
  `仅可查看` → `工作区内修改` → `完全权限` → `管理员`

### 2. 自主迭代按钮

输入框工具行上的 **↻** 按钮（宽窗口显示「↻ 迭代」）：

- 填「迭代方向」+「迭代次数」，一键让 AI **自主连续迭代 N 轮**
- 每轮都会带着方向重新开工，直到次数用完
- 窄窗口自动收成 26px 圆钮，不占地方

### 3. 内置官方 computer use（**不需要另外装**）

- bundle patch 里直接 `insert` 两个**官方**插件：
  - `@deepseek-ai/dsh-computer-use`
  - `@deepseek-ai/dsh-experimental-computer-use-cua-driver-native`
- 版本固定 `0.2.1-rc.2`（与 DSH 运行时一致，两个包都是 npm 公开包）
- 还会注入一条系统提示：**操作电脑时优先用 computer use 工具直接操作屏幕**，
  而不是写脚本模拟鼠标键盘

### 4. 操控提示

- 鼠标操作期间，**消息流里**（对话末尾，像一条消息）显示「正在操控电脑」；操作停止后自动消失
- 判据：鼠标工具调用会刷新操作状态，**30 秒内有过鼠标操作就持续显示**，
  连续操作、中间思考几秒都不会中断
- 按 **ESC**：立刻隐藏并暂停显示 3 秒
- **零外部依赖**：前端 DOM + `/admin-mode/hud` 只读状态路由

### 5. `auto` 档（自动审查）：不提供

- DSH 官方有一档 `auto`（无沙箱 + 每次工具调用前审查，EXP）；本插件把它从权限菜单里**隐藏**
- 原因：实测 `auto` + `never`（永不询问）= 审查拒绝即静默拒绝，**所有工具调用都会被拦死**，
  连只读命令都无法执行；配 `ask` 又违背「管理员档永不询问」的定位
- 所以 `auto` 不再出现在菜单里；如果当前会话正处在 `auto`（例如用 `/permission auto` 切的），
  按钮上仍会显示它的名字，只是菜单不提供这一项

---

## 6. 鼠标门控 + 管理员档工作规范（v1.0.0 内建）

### 只有「管理员」档能操作鼠标

- 鼠标类工具（`click` / `double_click` / `right_click` / `drag` / `scroll` / `move_cursor` 以及浏览器点击）
  在**非管理员档**下由 Host 侧 `tools.guard()` 拒绝（不弹批准、不执行）
- ⚠ **已知限制**：官方 computer use 工具（`cua_driver_native__*`）走的是外部 MCP 通道，
  实测**可能绕过 `tools.guard`**（非管理员档下点击仍会执行）。插件已加诊断标记
  （`mouseGuardRegistered` / `mouseGuardCalls` / `mouseGuardLast` / `mouseGuardDeny`）
  方便确认 guard 实际有没有被调用；要在 MCP 层彻底拦截需要改 computer-use 插件，不在本插件范围内
- 想用鼠标 → 建议切到「管理员」档

### 鼠标必须滑动

- 系统提示要求：移动光标用多次 `move_cursor` 分步滑动，每步不超过屏幕宽高的 1/6，通常 3~6 步到位；
  **禁止一步跳到目标再点**
- 能点/能滑的操作优先用 computer use，**不用脚本模拟鼠标键盘**；脚本只留给文件处理、构建、渲染等非 UI 任务

### 管理员档的工作要求（tokens 不设限）

1. 必须在沙箱里把改动真跑一遍（真实点击、输入、截图验证），不许只改代码就宣布完成
2. UI / 动画 / 视觉改动必须**逐帧检验**（连续截多帧对比，确认无错位、穿模、闪烁）
3. 必须**完全符合用户需求**才算完成，不确定就继续测
4. 完成后如果有产出（图片、视频、文档、压缩包、exe），**自动打开所在文件夹并选中该文件**
   （Windows: `explorer /select,<路径>`）
5. 管理员档 token 消耗明显更高 —— 权限菜单和两次警告里都标了 **tokens 警告**

### ★ 交付门槛（硬性，避免"聊天框失效"这类事故）

- **没自己实测通过，不许告诉用户可以用了**；用户只做最后验收
- UI / 插件类改动，必须**重启后**在真实界面里逐项确认：
  聊天框能打开、能输入文字、能发送、消息与回复正常显示、权限菜单能打开并切换、
  页面不白屏、不卡在启动页
- **插件自带 UI 自检**：client 加载后 1.5s / 4s 各探测一次聊天输入区，
  发现 composer 缺失或尺寸为 0 时 **立刻熔断**——撤掉自己的视觉层、停渲染自己的控件，
  把界面还给宿主，并把结果 POST 到 `/admin-mode/selftest`，
  写进 `%TEMP%\dsh_admin_mode_diag.txt`（`uiSelfTest=ok/fail`）

---

## 安装

> 需要 **DSH 桌面端**（Electron），并且版本与 `0.2.1-rc.2` 的 computer use 兼容。

### 方法 A：插件管理器（推荐，如果你的 DSH 有这一页）

1. 解压压缩包，得到 `dsh-admin-mode/` 目录（里面有 `package.json`）
2. DSH 左侧「插件」页 → 安装本地插件 → 选这个目录
3. 重启 DSH

### 方法 B：手工安装（Windows）

1. 解压到例如 `D:\dsh-admin-mode\`
2. 打开 `%USERPROFILE%\.dsh\profiles\<你的profile>\package.json`（一般是 `desktop`）
3. `dependencies` 里加一行：
   ```json
   "@local/dsh-admin-mode": "file:D:/dsh-admin-mode"
   ```
4. `dsh.profile.bundles` 数组里加 `"@local/dsh-admin-mode"`
5. 在 `node_modules\@local\` 下建一个 **Junction**（目录联接）：
   ```
   mklink /J "%USERPROFILE%\.dsh\profiles\desktop\node_modules\@local\dsh-admin-mode" "D:\dsh-admin-mode"
   ```
6. **重启 DSH**（关掉窗口重新打开）

安装成功后：
- 输入框权限菜单里多出「管理员」
- 工具行多出 **↻** 按钮
- 让 AI「打开记事本写一句话」能看到屏幕 HUD

> ⚠ DSH 的 `desktop` profile 由 Electron 独占管理，`dsh plugin install` 可能会报
> `profile "desktop" is managed exclusively by the Electron application` —— 那就用方法 B。

### 卸载

把第 3~5 步加的东西删掉，重启 DSH 即可。

---

## 安全提示

- 「管理员」档 = **完全文件访问 + 永不询问**，请只在你信任的任务里用
- computer use 是官方 **experimental** 原生驱动，与 DSH 同进程运行，原生崩溃可能带崩 DSH
- 操控提示只是视觉提示，不改变权限行为

---

## 结构

```
package.json         插件清单（依赖 + bundle patch + 客户端入口）
index.js             Host 半：鼠标门控（guard）+ 系统提示 + /admin-mode/hud 状态路由
client.js            Client 半：权限菜单（含两次警告）+ 自主迭代按钮 + 操控提示
cordis.patch.yml     插入权限预设、官方 computer use、客户端控件
locale/*.json        插件元数据（中/英）
icon.svg             插件图标
docs/preview.png     界面预览
```

## License

MIT
