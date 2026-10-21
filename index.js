/**
 * dsh-admin-mode — Host half.
 *
 * 职责：
 *  1. 鼠标门控：非「管理员」档一律拒绝鼠标类工具（guard，单调拒绝）
 *  2. 「自己完成所有操作」规则注入（多通道保底）
 *  3. 鼠标状态路由（给 client 的操控提示用）
 *
 * ★ 没有强制依赖任何宿主服务：某个服务不存在时，其它功能照常工作。
 *   包内**不 spawn 任何外部程序**（没有 Python / exe）。
 */
export const inject = []

import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

/** 鼠标类工具：只有「管理员」权限档允许调用。 */
const MOUSE_TOOLS = new Set([
  'cua_driver_native__click',
  'cua_driver_native__double_click',
  'cua_driver_native__right_click',
  'cua_driver_native__drag',
  'cua_driver_native__scroll',
  'cua_driver_native__move_cursor',
  'cua_driver_native__browser_click',
  'cua_driver_native__browser_pointer',
])

/** ★ 插件核心规则：自己完成所有操作。
 *  单独抽出来，便于在多个通道里重复注入（任一通道可用即生效）。 */
const SELF_DONE_RULE =
  '管理员模式核心规则：所有操作由你自己完成并验证 —— 打开程序、点击、输入、测试、截图、读日志、' +
  '自查 DOM/接口全部自己做；不把操作或测试交给用户，用户只做最后验收。' +
  '没自测通过之前不许说"好了"；插件类改动必须自己触发一次真实操作、自己看到效果才算完成。'

/** 写一份通道诊断，别人机器上出问题时能直接看。 */
const writeDiag = (lines) => {
  try {
    const fs = require('node:fs')
    const os = require('node:os')
    const path = require('node:path')
    const file = path.join(os.tmpdir(), 'dsh_admin_mode_diag.txt')
    fs.writeFileSync(file, lines.join('\n'))
  } catch {
    // ignore
  }
}

const channels = []
const mark = (name, ok) => {
  channels.push(name + '=' + (ok ? 'ok' : 'fail'))
  writeDiag(channels)
}

export function apply(ctx) {
  // ★ 2026-10-21：apply 一进来就先落一行「启动时间戳」，
  //   这样重启后看诊断文件就能立刻判断插件到底有没有被宿主加载。
  channels.length = 0
  channels.push('apply@' + new Date().toISOString())
  writeDiag(channels)

  let guardCalls = 0
  let guardLast = ''

  // ================================================================ 保底 1
  // systemPrompt：宿主有就注入（可选，没有也不影响插件其它功能）
  try {
    ctx.inject(['systemPrompt'], (childCtx) => {
      try {
        childCtx.systemPrompt.section({
          name: 'admin-mode-self-verify',
          order: 42,
          text: [
            SELF_DONE_RULE,
            '操作电脑的优先级：需要打开应用、点击、输入、看屏幕时，优先用 computer use 工具',
            '（cua_driver_native__*）直接操作屏幕，不要写脚本模拟鼠标键盘；只有工具不可用时才回退到脚本。',
            '鼠标使用规范：',
            '（1）只有「管理员」权限档允许鼠标类工具（click / double_click / right_click / drag / scroll / move_cursor）；',
            '其它档位会被直接拒绝，不要尝试绕过。',
            '（2）鼠标必须滑动：用多次 move_cursor 分步移动，每次不超过屏幕宽高的 1/6，通常 3~6 步到目标；',
            '禁止一步跳到目标再点。',
            '（3）能点/能滑的操作不要用脚本注入或坐标硬编码代替；脚本只用于文件处理、构建、渲染等非 UI 任务。',
            '（4）按 ESC 会立刻收掉操控提示并暂停 3 秒，此时不要再重试鼠标动作，把控制权交还用户。',
            '（5）UI / 动画 / 视觉类改动必须逐帧检验（连续截多帧对比），确认没有错位、穿模、闪烁。',
            '（6）完成后有产出（图片、视频、文档、压缩包、exe）时，自动打开所在文件夹并选中该文件',
            '（Windows 用 explorer /select,<路径>）。',
            '（7）管理员档会明显消耗 tokens（自测 + 逐帧验证），开始前先跟用户说明预期。',
            '（8）用户通过「↻ 迭代」按钮发起自主迭代时，对话框里只会出现一条很短的指令',
            '（如「自主迭代 3 轮：方向」）。你要把它当作完整任务：连续跑完指定轮次，',
            '中途不要停下来询问，每轮开头标注【第 k/N 轮】，全部轮次完成后统一汇报。',
            '（9）★ 交付门槛（硬性）：任何改动必须由你自己实测通过，才能告诉用户"可以用"。',
            'UI / 插件类改动必须重启后在真实界面里逐项确认：聊天框能打开、能输入文字、能发送、',
            '消息与回复能正常显示、权限菜单能打开并切换、页面不白屏、不卡在启动页；',
            '改完没重启过、没亲眼看过，就不算测过。测试不通过就继续修，不许说"应该没问题"，',
            '更不许把测试交给用户——用户只做最后验收。',
          ].join(''),
        })
        mark('systemPrompt', true)
      } catch (error) {
        mark('systemPrompt', false)
        console.warn('admin-mode: systemPrompt section skipped:', String(error))
      }
    })
  } catch (error) {
    mark('systemPrompt', false)
  }

  // ================================================================ 保底 2/3 —— 已停用
  // ★ 2026-10-21 主人明确要求：规则不要出现在对话框里。
  //   agent.inject() 的本质是往会话 inbox 插一条 user 消息，界面**必然**显示成一条
  //   对话，无法靠参数隐藏（以前那条「管理员模式核心规则」就是这么冒出来的）。
  //   所以彻底停用 inject 通道，规则只走上面「保底 1」的 systemPrompt.section：
  //   它只进模型系统提示，不进消息流，用户在对话框里看不到任何多余内容。

  // agent/created 只留一个加载标记，用于诊断文件确认插件真的被宿主加载。
  try {
    // ★ 事件参数是 { agent, source, signal }，不是 agent 本身
    ctx.on('agent/created', () => {
      mark('agentCreated', true)
    })
  } catch (error) {
    mark('agentCreated', false)
  }

  // ================================================================ 鼠标门控
  let permissionPresets = null
  try {
    ctx.inject(['permissionPresets'], (childCtx) => {
      try {
        permissionPresets = childCtx.permissionPresets
        mark('permissionPresets', true)
      } catch {
        mark('permissionPresets', false)
      }
      // ★ 2026-10-21 回滚：不再把「管理员」桥接成 auto。
      //   实测 auto + approval=never = 审查拒绝即静默拒绝，所有工具调用全被拦死
      //   （连只读命令都 100% 失败），管理员档直接变废档。
      //   现在「管理员」= 纯 danger-full-access + never（无沙箱、永不询问）；
      //   官方「自动审查（auto）」作为独立档原样放回权限菜单，由用户自行选择。
    })
  } catch {
    mark('permissionPresets', false)
  }

  try {
    ctx.tools.guard((exec) => {
      // ★ 2026-10-21：诊断用 —— 记录 guard 实际被调用过几次、最近一次的工具名，
      //   用来确认「MCP 类工具（cua_driver_native__*）到底走不走 tools.guard」。
      guardCalls += 1
      guardLast = String(exec && exec.name)
      if (guardCalls === 1 || MOUSE_TOOLS.has(exec.name)) {
        mark('mouseGuardCalls', guardCalls)
        mark('mouseGuardLast', guardLast)
      }
      if (!MOUSE_TOOLS.has(exec.name)) return undefined
      if (!permissionPresets) return undefined
      let preset
      try {
        const session = exec.agent?.session
        preset = session ? permissionPresets.current(session) : undefined
      } catch {
        preset = undefined
      }
      // 只有「管理员」档（纯 danger-full-access + never）放行鼠标；
      // 官方「自动审查（auto）」是独立档，不再等同管理员。
      if (preset === 'admin') return undefined
      mark('mouseGuardDeny', true)
      return (
        '鼠标操作仅限「管理员」权限档：' +
        `当前权限档是「${preset ?? '未知'}」，已拒绝执行 ${exec.name}。` +
        '请切换到管理员档，或者用不涉及鼠标的方式完成任务。'
      )
    })
    mark('mouseGuardRegistered', true)
  } catch (error) {
    mark('mouseGuardRegistered', false)
    console.warn('admin-mode: mouse guard skipped:', String(error))
  }

  // ================================================================ 鼠标状态
  const MOUSE_ACTIVE_WINDOW_MS = 30000
  let lastMouseAt = 0

  ctx.on('tools/pre-execute', (exec, next) => {
    if (MOUSE_TOOLS.has(exec.name)) lastMouseAt = Date.now()
    return next()
  })

  ctx.on('tools/result', (exec) => {
    if (MOUSE_TOOLS.has(exec.name)) lastMouseAt = Date.now()
  })

  try {
    ctx.on('agent/inbox/claimed', () => {
      lastMouseAt = 0
    })
  } catch {
    // event may not exist in older runtimes
  }

  // ================================================================ 状态路由
  let sessionsService = null
  try {
    ctx.inject(['sessions'], (childCtx) => {
      sessionsService = childCtx.sessions
    })
  } catch {
    sessionsService = null
  }
  try {
    ctx.inject(['webServer'], (childCtx) => {
      try {
        childCtx.effect(
          () =>
            childCtx.webServer.register({
              kind: 'prefix',
              path: '/admin-mode',
              handler: async (req, res) => {
                const pathname = String(req.url || '').split('?')[0]
                if (pathname === '/admin-mode/selftest' && req.method === 'POST') {
                  // ★ UI 自检上报：客户端加载后探测「聊天框还在不在」，
                  //   结果落进诊断文件（同 %TEMP%\dsh_admin_mode_diag.txt），
                  //   便于交付前确认没有把 composer 搞崩。
                  try {
                    const chunks = []
                    for await (const chunk of req) chunks.push(chunk)
                    const raw = Buffer.concat(chunks).toString('utf8').slice(0, 4000)
                    const parsed = raw.length > 0 ? JSON.parse(raw) : {}
                    mark('uiSelfTest', parsed && parsed.composer === true)
                    mark('uiSelfTestDetail', raw.replace(/\s+/g, ' ').slice(0, 300))
                    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' })
                    res.end(JSON.stringify({ ok: true }))
                  } catch (error) {
                    res.writeHead(400, { 'content-type': 'text/plain' })
                    res.end('bad selftest payload')
                  }
                  return
                }
                if (pathname !== '/admin-mode/hud') {
                  res.writeHead(404, { 'content-type': 'text/plain' })
                  res.end('not found')
                  return
                }
                const active = Date.now() - lastMouseAt < MOUSE_ACTIVE_WINDOW_MS
                res.writeHead(200, {
                  'content-type': 'application/json',
                  'cache-control': 'no-store',
                })
                res.end(JSON.stringify({ active }))
              },
            }),
          'admin-mode: hud state route',
        )
        mark('webServer', true)
      } catch (error) {
        mark('webServer', false)
        console.warn('admin-mode: hud route skipped:', String(error))
      }
    })
  } catch {
    mark('webServer', false)
  }
}
