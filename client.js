window.__ModuleLoader__.load({
  id: '@local/dsh-admin-mode',
  factory(require) {
    const React = require('react');
    let ReactDOM = null;
    try { ReactDOM = require('react-dom'); } catch (err) { ReactDOM = null; }
    const h = React.createElement;
    const { useState, useEffect, useLayoutEffect, useRef } = React;

    const ADMIN = 'admin';
    const FULL = 'danger-full-access';

    // ★ 交付门槛熔断开关：UI 自检发现宿主聊天框异常时置 true，
    //   本插件立刻停止渲染自己的控件，把界面还给宿主，绝不把聊天框搞崩。
    let adminUiDisabled = false;
    const NS = 'admin.permission';

    const zh = {
      'mode': '访问模式，当前：{name}',
      'custom': '自定义权限',
      'current': '当前',
      'danger': '危险',
      'cancel': '取消',
      'preset.readOnly': '仅可查看',
      'preset.workspaceWrite': '工作区内修改',
      'preset.fullAccess': '完全权限',
      'admin.label': '管理员',
      'autoReview.label': '自动审查（EXP）',
      'admin.detail': '完全访问 + 永不询问：截屏、控制鼠标键盘、调用任意工具全部放行，自主执行直到任务完成。⚠ 鼠标操作仅此档可用；会强制沙箱自测 + 逐帧检验，token 消耗显著',
      'full.confirm.title': '确认启用完全权限？',
      'full.confirm.body': '启用完全权限后，智能体将减少确认步骤，并可直接执行更多操作，包括敏感操作、文件修改或外部命令。',
      'full.confirm.ack': '我已了解风险，并愿意继续',
      'full.confirm.enable': '启用完全权限',
      'warn.1.title': '严重警告 1/2 · 将交出整台电脑',
      'warn.1.body': '启用「管理员」后，DSH 将获得你电脑的全部操作权限：截屏、控制鼠标和键盘、调用任意工具，且不再向你请求同意。它可能修改或删除文件、执行外部命令、操作任意窗口。',
      'warn.1.ack': '我已了解，这只是第一次确认',
      'warn.1.next': '继续（还有一次确认）',
      'warn.2.title': '严重警告 2/2 · 自主执行 + 大量消耗 tokens',
      'warn.2.body': '管理员模式下，DSH 以完成任务为最高优先级：遇到问题自行决策、不中途询问（重大安全例外除外），直到任务完成。⚠ 该档位要求 agent 在沙箱内逐项自测、逐帧检验，token 消耗会明显增加（按任务量可能几十万甚至更多）；鼠标工具仅此档可用。普通操作请选「完全权限」。',
      'warn.2.ack': '我确认启用管理员模式',
      'warn.2.confirm': '启用管理员',
    };

    const en = {
      'mode': 'Access mode, current: {name}',
      'custom': 'Custom permission',
      'current': 'Current',
      'danger': 'Danger',
      'cancel': 'Cancel',
      'preset.readOnly': 'Read Only',
      'preset.workspaceWrite': 'Workspace Write',
      'preset.fullAccess': 'Full access',
      'admin.label': 'Administrator',
      'autoReview.label': 'Auto review (EXP)',
      'admin.detail': 'Full access, never asks: screenshots, mouse and keyboard, every tool are allowed; keep working autonomously until the task is done. Mouse tools only work in this mode; in-sandbox self-testing and frame-by-frame checks burn noticeably more tokens',
      'full.confirm.title': 'Enable Full access?',
      'full.confirm.body': 'Full access reduces confirmation steps and lets the agent perform more actions directly, including sensitive operations, file changes, or external commands.',
      'full.confirm.ack': 'I understand the risks and want to continue',
      'full.confirm.enable': 'Enable Full access',
      'warn.1.title': 'Severe warning 1/2 · handing over the whole computer',
      'warn.1.body': 'Administrator mode grants DSH full control of this computer: screenshots, mouse and keyboard, and every tool, with no further approval. It may change or delete files, run external commands, and operate any window.',
      'warn.1.ack': 'I understand; this is only the first confirmation',
      'warn.1.next': 'Continue (one more confirmation)',
      'warn.2.title': 'Severe warning 2/2 · autonomous, and token-hungry',
      'warn.2.body': 'In Administrator mode DSH treats finishing the task as the top priority: it decides on its own and does not stop to ask, except for major safety problems, until the task is complete. This mode also requires in-sandbox self-testing and frame-by-frame verification, so token usage rises significantly (hundreds of thousands is normal for long tasks). Mouse tools are available only in this mode. Use Full access for ordinary work.',
      'warn.2.ack': 'I confirm Administrator mode',
      'warn.2.confirm': 'Enable Administrator',
    };

    function Shield(props) {
      const size = props.size || 14;
      return h('svg', {
        viewBox: '0 0 24 24',
        width: size,
        height: size,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.8,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
        style: { display: 'block', flex: '0 0 auto' },
      },
        h('path', { d: 'M12 3l7 3v5.5c0 4.4-3 7.4-7 9.5-4-2.1-7-5.1-7-9.5V6l7-3z' }),
        h('path', { d: 'M12 8.5v4' }),
        h('path', { d: 'M12 15.5h.01' }));
    }

    function Chevron(props) {
      return h('svg', {
        viewBox: '0 0 24 24',
        width: 12,
        height: 12,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
        style: { display: 'block', transform: props.open ? 'rotate(180deg)' : 'none', transition: 'transform 120ms ease' },
      },
        h('path', { d: 'M6 9l6 6 6-6' }));
    }

    const controlStyles = [
      '.apm-trigger{background:transparent;transition:background-color 120ms ease}',
      '.apm-trigger:hover:not(:disabled){background:transparent}',
      '.apm-trigger.apm-danger{background:transparent}',
      '.apm-trigger.apm-danger:hover:not(:disabled){background:transparent}',
      '.apm-item{background:transparent;transition:background-color 120ms ease}',
      '.apm-item:hover{background:rgba(64,132,255,.18)}',
      '.apm-item:active{background:rgba(64,132,255,.3)}',
      '.apm-item:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}',
    ].join('\n');

    const overlayStyle = {
      position: 'fixed',
      left: 0,
      top: 0,
      width: '100vw',
      height: '100vh',
      boxSizing: 'border-box',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.55)',
      padding: 24,
    };

    const cardStyle = {
      width: 'min(440px, 100%)',
      borderRadius: 14,
      border: '1px solid var(--dsw-alias-state-error-primary)',
      background: 'var(--dsw-alias-bg-overlay)',
      color: 'var(--dsw-alias-label-primary)',
      padding: '18px 18px 14px',
      boxShadow: '0 18px 50px rgba(0, 0, 0, 0.45)',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    };

    function makeControl(ctx) {
      return function AdminPermissionControl(props) {
        // 自检失败熔断：不再渲染本插件的权限控件
        if (adminUiDisabled) return null;
        const { locked, select, useProjection, t } = props;
        const selection = useProjection('permissions');
        const [catalog, setCatalog] = useState(null);
        const [open, setOpen] = useState(false);
        const [warn, setWarn] = useState(null);
        const [pending, setPending] = useState(null);
        const [error, setError] = useState(null);
        const boxRef = useRef(null);
        const overlayRef = useRef(null);

        useLayoutEffect(() => {
          if (warn === null) return;
          const el = overlayRef.current;
          if (!el) return;
          const containing = el.offsetParent;
          if (containing) {
            const rect = containing.getBoundingClientRect();
            el.style.left = `${-rect.left}px`;
            el.style.top = `${-rect.top}px`;
          } else {
            el.style.left = '0px';
            el.style.top = '0px';
          }
          el.style.width = `${window.innerWidth}px`;
          el.style.height = `${window.innerHeight}px`;
        }, [warn]);

        useEffect(() => {
          let alive = true;
          const load = () => {
            ctx.remote.permissionPresets.catalog().then((result) => {
              if (!alive) return;
              if (result && result.ok) {
                setCatalog(result.value);
                setError(null);
              } else {
                setError((result && result.error && result.error.message) || 'catalog unavailable');
              }
            }).catch((cause) => {
              if (alive) setError(String(cause));
            });
          };
          load();
          const off = ctx.remote.$on('permission-presets/catalog-changed', load);
          return () => {
            alive = false;
            off();
          };
        }, []);

        useEffect(() => {
          if (!open) return undefined;
          const onPointerDown = (event) => {
            if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false);
          };
          document.addEventListener('mousedown', onPointerDown);
          return () => document.removeEventListener('mousedown', onPointerDown);
        }, [open]);

        useEffect(() => {
          if (warn === null) return undefined;
          const onKeyDown = (event) => {
            if (event.key === 'Escape') setWarn(null);
          };
          document.addEventListener('keydown', onKeyDown);
          return () => document.removeEventListener('keydown', onKeyDown);
        }, [warn]);

        if (selection === undefined || catalog === null) return null;

        // ★ 2026-10-21 主人要求：auto（自动审查）不要了 —— 菜单里不列它。
        //   若当前会话正处在 auto，按钮上仍能显示它的名字（不会瞎），只是菜单不提供。
        const HIDDEN_PRESETS = ['auto'];
        const isHidden = (option) => HIDDEN_PRESETS.indexOf(option.value) !== -1;
        const allOptions = catalog.options || [];
        const options = allOptions.filter((option) => !isHidden(option));
        const currentValue = selection.currentValue;
        const currentIsAdmin = currentValue === ADMIN;
        const labelOf = (option) => {
          if (!option) return t('custom');
          if (option.value === 'read-only') return t('preset.readOnly');
          if (option.value === 'workspace-write') return t('preset.workspaceWrite');
          if (option.value === FULL) return t('preset.fullAccess');
          if (option.value === ADMIN) return t('admin.label');
          // ★ 2026-10-21：把官方 auto 档按官方中文名显示成「自动审查」，
          //   不要露出裸的 auto 字样。
          if (option.value === 'auto') return t('autoReview.label');
          return option.name || option.value;
        };
        const detailOf = (option) => {
          if (!option) return undefined;
          if (option.value === ADMIN) return t('admin.detail');
          return option.description;
        };
        const current = options.find((option) => option.value === currentValue)
          || allOptions.find((option) => option.value === currentValue);
        const currentLabel = labelOf(current);

        const applyPreset = (value) => {
          setPending(value);
          Promise.resolve()
            .then(() => select(value))
            .catch((cause) => setError(String(cause)))
            .then(() => setPending(null));
        };

        const choose = (value) => {
          setOpen(false);
          if (value === currentValue) return;
          if (value === ADMIN) {
            setWarn({ step: 1, value, ack: false });
            return;
          }
          if (value === FULL) {
            setWarn({ step: 0, value, ack: false });
            return;
          }
          applyPreset(value);
        };

        const warnCopy = (state) => {
          if (state.step === 0) {
            return {
              title: t('full.confirm.title'),
              body: t('full.confirm.body'),
              ack: t('full.confirm.ack'),
              action: t('full.confirm.enable'),
            };
          }
          if (state.step === 1) {
            return {
              title: t('warn.1.title'),
              body: t('warn.1.body'),
              ack: t('warn.1.ack'),
              action: t('warn.1.next'),
            };
          }
          return {
            title: t('warn.2.title'),
            body: t('warn.2.body'),
            ack: t('warn.2.ack'),
            action: t('warn.2.confirm'),
          };
        };

        const trigger = h('button', {
          type: 'button',
          disabled: locked || pending !== null,
          title: detailOf(current),
          'aria-label': t('mode', { name: currentLabel }),
          'aria-expanded': open,
          onClick: () => setOpen(!open),
          className: currentIsAdmin ? 'apm-trigger apm-danger' : 'apm-trigger',
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 28,
            padding: '0 8px',
            border: 'none',
            borderRadius: 8,
            color: currentIsAdmin
              ? 'var(--dsw-alias-state-error-primary)'
              : 'var(--dsw-alias-label-primary)',
            font: 'inherit',
            fontSize: 12.5,
            cursor: locked || pending !== null ? 'default' : 'pointer',
            opacity: locked ? 0.6 : 1,
          },
        },
          h('span', { style: { display: 'flex', color: 'inherit' } }, h(Shield, { size: 14 })),
          h('span', { style: { whiteSpace: 'nowrap' } }, currentLabel),
          h('span', { style: { display: 'flex', color: 'inherit', opacity: 0.75 } }, h(Chevron, { open })));

        const menu = open
          ? h('div', {
              role: 'menu',
              style: {
                position: 'absolute',
                bottom: 'calc(100% + 6px)',
                left: 0,
                width: 320,
                maxHeight: 380,
                overflowY: 'auto',
                padding: 6,
                borderRadius: 12,
                border: '1px solid var(--dsw-alias-border-l1)',
                background: 'var(--dsw-alias-bg-overlay)',
                boxShadow: '0 14px 40px rgba(0, 0, 0, 0.35)',
                zIndex: 60,
              },
            },
              error === null
                ? null
                : h('div', { style: { padding: '6px 10px', fontSize: 11.5, color: 'var(--dsw-alias-state-error-primary)' } }, error),
              options.map((option) => {
                const isAdmin = option.value === ADMIN;
                const selected = option.value === currentValue;
                const detail = detailOf(option);
                return h('button', {
                  key: option.value,
                  type: 'button',
                  role: 'menuitemradio',
                  'aria-checked': selected,
                  className: 'apm-item',
                  onClick: () => choose(option.value),
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    gap: 3,
                    width: '100%',
                    padding: '8px 10px',
                    border: 'none',
                    borderRadius: 8,
                    color: isAdmin ? 'var(--dsw-alias-state-error-primary)' : 'var(--dsw-alias-label-primary)',
                    font: 'inherit',
                    textAlign: 'left',
                    cursor: 'pointer',
                  },
                },
                  h('span', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: isAdmin ? 650 : 550 } },
                    isAdmin ? h(Shield, { size: 13 }) : null,
                    labelOf(option),
                    isAdmin
                      ? h('span', {
                          style: {
                            fontSize: 10,
                            lineHeight: '14px',
                            padding: '0 5px',
                            borderRadius: 999,
                            border: '1px solid var(--dsw-alias-state-error-primary)',
                            color: 'var(--dsw-alias-state-error-primary)',
                          },
                        }, t('danger'))
                      : null,
                    selected
                      ? h('span', { style: { marginLeft: 'auto', fontSize: 11, color: 'var(--dsw-alias-label-secondary)' } }, t('current'))
                      : null),
                  detail
                    ? h('span', { style: { fontSize: 11.5, lineHeight: 1.45, color: isAdmin ? 'inherit' : 'var(--dsw-alias-label-secondary)', opacity: isAdmin ? 0.85 : 1 } }, detail)
                    : null);
              }))
          : null;

        const copy = warn === null ? null : warnCopy(warn);
        const modal = warn === null
          ? null
          : h('div', { ref: overlayRef, style: overlayStyle },
              h('div', { role: 'dialog', 'aria-modal': true, style: cardStyle },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, color: 'var(--dsw-alias-state-error-primary)', fontWeight: 700, fontSize: 15 } },
                  h(Shield, { size: 18 }),
                  h('span', null, copy.title)),
                h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--dsw-alias-label-primary)' } }, copy.body),
                h('label', { style: { display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, lineHeight: 1.5, cursor: 'pointer' } },
                  h('input', {
                    type: 'checkbox',
                    checked: warn.ack,
                    onChange: (event) => setWarn({ ...warn, ack: event.target.checked }),
                    style: { marginTop: 2, flex: '0 0 auto' },
                  }),
                  h('span', null, copy.ack)),
                h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 2 } },
                  h('button', {
                    type: 'button',
                    onClick: () => setWarn(null),
                    style: {
                      height: 32,
                      padding: '0 12px',
                      borderRadius: 8,
                      border: '1px solid var(--dsw-alias-border-l1)',
                      background: 'transparent',
                      color: 'var(--dsw-alias-label-primary)',
                      font: 'inherit',
                      fontSize: 12.5,
                      cursor: 'pointer',
                    },
                  }, t('cancel')),
                  h('button', {
                    type: 'button',
                    disabled: !warn.ack,
                    onClick: () => {
                      const state = warn;
                      if (state.step === 0 || state.step === 2) {
                        setWarn(null);
                        applyPreset(state.value);
                        return;
                      }
                      setWarn({ step: 2, value: state.value, ack: false });
                    },
                    style: {
                      height: 32,
                      padding: '0 12px',
                      borderRadius: 8,
                      border: 'none',
                      background: warn.ack ? 'var(--dsw-alias-state-error-primary)' : 'var(--dsw-alias-state-idle-primary)',
                      color: '#fff',
                      font: 'inherit',
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: warn.ack ? 'pointer' : 'default',
                      opacity: warn.ack ? 1 : 0.6,
                    },
                  }, copy.action))));

        return h('div', { ref: boxRef, style: { position: 'relative', display: 'inline-flex' } },
          h('style', { key: 'apm-style' }, controlStyles),
          trigger, menu, modal);
      };
    }

    // ---------------- 自主迭代 ----------------
    const ITERATE_NS = 'admin.iterate';

    const iterateZh = {
      'btn': '迭代',
      'title': '自主迭代',
      'body': '让 AI 对当前成果自己迭代指定次数，每轮都会渲染验证。',
      'count': '迭代次数',
      'unit': '次',
      'notice': '点击「开始迭代」只会发送一条指令；之后 AI 连续跑完全部轮次，不再往对话框追加消息',
      'project': '目标项目',
      'direction': '迭代方向',
      'directionHint': '例如：丰富雨天地面反射、加人物和车…',
      'noProject': '还没有项目记录：先按方向迭代一次，之后这里会出现最近三个项目',
      'start': '开始迭代',
      'cancel': '取消',
      'busy': '提交中…',
      'fail': '提交失败：',
    };

    const iterateEn = {
      'btn': 'Iterate',
      'title': 'Auto-iterate',
      'body': 'Let the agent iterate the current result the given number of times, rendering after each round.',
      'count': 'Rounds',
      'unit': 'rounds',
      'notice': 'Start sends exactly one instruction; the agent then runs all rounds without adding more messages',
      'project': 'Project',
      'direction': 'Direction',
      'directionHint': 'e.g. richer wet reflections, add people and cars…',
      'noProject': 'No projects yet — iterate once and the three most recent will show up here',
      'start': 'Start',
      'cancel': 'Cancel',
      'busy': 'Submitting…',
      'fail': 'Submit failed: ',
    };

    const modalCancelStyle = {
      height: 32,
      padding: '0 12px',
      borderRadius: 8,
      border: '1px solid var(--dsw-alias-border-l1)',
      background: 'transparent',
      color: 'var(--dsw-alias-label-primary)',
      font: 'inherit',
      fontSize: 12.5,
      cursor: 'pointer',
    };

    const modalPrimaryStyle = {
      height: 32,
      padding: '0 14px',
      borderRadius: 8,
      border: 'none',
      background: 'var(--dsw-alias-state-success-primary, #2f7d4f)',
      color: '#fff',
      font: 'inherit',
      fontSize: 12.5,
      fontWeight: 600,
      cursor: 'pointer',
    };


    const ITERATE_CSS = `
      .dsh-iter-wrap { display: inline-flex; align-items: center; height: 26px; flex-shrink: 0; }
      .dsh-iter-trigger { height: 26px; padding: 0 8px; border-radius: 6px;
        border: 1px solid var(--dsw-alias-border-l1); background: transparent;
        color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px;
        cursor: pointer; display: inline-flex; align-items: center; gap: 4px;
        white-space: nowrap; transition: background 120ms ease, border-color 120ms ease; }
      .dsh-iter-trigger:hover { background: rgba(255,255,255,0.07); border-color: var(--dsw-alias-state-success-primary, #2f7d4f); }
      .dsh-iter-glyph { font-size: 14px; line-height: 1; display: inline-block; }
      .dsh-iter-trigger:hover .dsh-iter-glyph { transform: rotate(180deg); }
      .dsh-iter-glyph { transition: transform 300ms ease; }
      /* ★ 2026-10-19 修「选项挤到第二排」：窄容器里只留 ↻ 图标，收起「迭代」两个字，
         并压成 26px 圆形小钮（一共省约 50px）。工具行 .row 自带 container-type: inline-size，
         所以这里直接查它。悬停 title 仍是 t('title')，功能不受影响。 */
      @container (max-width: 1020px) {
        .dsh-iter-text { display: none; }
        .dsh-iter-trigger { width: 26px; padding: 0; justify-content: center; border-radius: 999px; }
      }

      .dsh-iter-mask { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.46);
        display: flex; align-items: center; justify-content: center;
        backdrop-filter: blur(2px); animation: dshIterFade 140ms ease-out; }
      @keyframes dshIterFade { from { opacity: 0 } to { opacity: 1 } }

      .dsh-iter-card { width: 468px; max-width: 92vw; padding: 20px 20px 16px;
        border-radius: 14px; display: flex; flex-direction: column; gap: 14px;
        background: var(--dsw-alias-bg-elevated, #1c1d21);
        border: 1px solid var(--dsw-alias-border-l1);
        color: var(--dsw-alias-label-primary);
        box-shadow: 0 28px 70px rgba(0,0,0,0.5);
        animation: dshIterPop 160ms cubic-bezier(0.2, 0.9, 0.3, 1.2); }
      @keyframes dshIterPop { from { opacity: 0; transform: scale(0.96) translateY(6px) } to { opacity: 1; transform: none } }

      .dsh-iter-title { font-size: 15px; font-weight: 650; letter-spacing: 0.2px; }
      .dsh-iter-sub { margin: -6px 0 0; font-size: 12.5px; line-height: 1.65; opacity: 0.78; }
      .dsh-iter-divider { height: 1px; background: var(--dsw-alias-border-l1); opacity: 0.55; }

      .dsh-iter-field { display: flex; flex-direction: column; gap: 7px; }
      .dsh-iter-label { font-size: 12px; font-weight: 600; opacity: 0.72; letter-spacing: 0.3px; }
      .dsh-iter-input { width: 100%; box-sizing: border-box; height: 34px; padding: 0 11px;
        border-radius: 9px; border: 1px solid var(--dsw-alias-border-l1);
        background: rgba(255,255,255,0.03); color: inherit; font: inherit; font-size: 13px;
        outline: none; transition: border-color 120ms ease, background 120ms ease; }
      .dsh-iter-input:focus { border-color: var(--dsw-alias-state-success-primary, #2f7d4f);
        background: rgba(255,255,255,0.05); }
      .dsh-iter-input::placeholder { opacity: 0.42; }

      .dsh-iter-stepper { display: inline-flex; align-items: center; gap: 6px; }
      .dsh-iter-step { width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l1);
        background: transparent; color: inherit; font: inherit; font-size: 15px; line-height: 1;
        cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
        transition: background 120ms ease; }
      .dsh-iter-step:hover { background: rgba(255,255,255,0.08); }
      .dsh-iter-step:disabled { opacity: 0.35; cursor: default; }
      .dsh-iter-num { width: 64px; height: 30px; text-align: center; padding: 0 6px;
        border-radius: 8px; border: 1px solid var(--dsw-alias-border-l1);
        background: rgba(255,255,255,0.03); color: inherit; font: inherit; font-size: 13px;
        outline: none; -moz-appearance: textfield; }
      .dsh-iter-num::-webkit-outer-spin-button,
      .dsh-iter-num::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      .dsh-iter-num:focus { border-color: var(--dsw-alias-state-success-primary, #2f7d4f); }
      .dsh-iter-unit { font-size: 12px; opacity: 0.55; }

      .dsh-iter-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 2px; }
      .dsh-iter-btn { height: 34px; padding: 0 16px; border-radius: 9px; font: inherit;
        font-size: 13px; cursor: pointer; transition: opacity 120ms ease, transform 120ms ease; }
      .dsh-iter-btn:active { transform: scale(0.98); }
      .dsh-iter-cancel { border: 1px solid var(--dsw-alias-border-l1); background: transparent;
        color: var(--dsw-alias-label-primary); }
      .dsh-iter-cancel:hover { background: rgba(255,255,255,0.06); }
      .dsh-iter-go { border: none; font-weight: 600; color: #fff;
        background: var(--dsw-alias-state-success-primary, #2f7d4f); }
      .dsh-iter-go:hover { opacity: 0.9; }
      .dsh-iter-go:disabled { opacity: 0.55; cursor: default; }
      .dsh-iter-err { font-size: 12px; color: var(--dsw-alias-state-error-primary); }
      .dsh-iter-notice { margin: 0; font-size: 11.5px; line-height: 1.55; opacity: 0.48; }
    `;

    function makeIterate(ctx) {
      return function IterateDock(props) {
        const t = props.t;
        const [open, setOpen] = useState(false);
        const [count, setCount] = useState(3);
        const [direction, setDirection] = useState('');
        const [busy, setBusy] = useState(false);
        const [error, setError] = useState(null);

        useEffect(() => {
          if (typeof props.onActiveChange === 'function') props.onActiveChange(false);
        }, []);

        const clamp = (v) => Math.max(1, Math.min(30, v));

        const start = async () => {
          setBusy(true);
          setError(null);
          try {
            await props.run({ count: count, direction: direction });
            setOpen(false);
          } catch (err) {
            setError(String((err && err.message) || err));
          } finally {
            setBusy(false);
          }
        };

        const trigger = h('button', {
          type: 'button',
          className: 'dsh-iter-trigger',
          onClick: () => { setError(null); setOpen(true); },
          title: t('title'),
        },
          h('span', { className: 'dsh-iter-glyph' }, '\u21bb'),
          h('span', { className: 'dsh-iter-text' }, t('btn')));

        const modalBody = open ? h('div', {
          className: 'dsh-iter-mask',
          onClick: (event) => { if (event.target === event.currentTarget) setOpen(false); },
        },
          h('div', { className: 'dsh-iter-card' },
            h('div', { className: 'dsh-iter-title' }, t('title')),
            h('p', { className: 'dsh-iter-sub' }, t('body')),
            h('div', { className: 'dsh-iter-divider' }),

            h('div', { className: 'dsh-iter-field' },
              h('div', { className: 'dsh-iter-label' }, t('direction')),
              h('input', {
                className: 'dsh-iter-input',
                type: 'text',
                value: direction,
                placeholder: t('directionHint'),
                onChange: (event) => setDirection(event.target.value),
              })),

            h('div', { className: 'dsh-iter-field' },
              h('div', { className: 'dsh-iter-label' }, t('count')),
              h('div', { className: 'dsh-iter-stepper' },
                h('button', {
                  type: 'button',
                  className: 'dsh-iter-step',
                  disabled: count <= 1,
                  onClick: () => setCount(clamp(count - 1)),
                }, '\u2212'),
                h('input', {
                  className: 'dsh-iter-num',
                  type: 'number',
                  min: 1,
                  max: 30,
                  value: count,
                  onChange: (event) => {
                    const next = Number(event.target.value);
                    setCount(Number.isFinite(next) ? clamp(Math.round(next)) : 1);
                  },
                }),
                h('button', {
                  type: 'button',
                  className: 'dsh-iter-step',
                  disabled: count >= 30,
                  onClick: () => setCount(clamp(count + 1)),
                }, '+'),
                h('span', { className: 'dsh-iter-unit' }, t('unit')))),

            h('p', { className: 'dsh-iter-notice' }, t('notice')),
            error ? h('div', { className: 'dsh-iter-err' }, t('fail') + error) : null,

            h('div', { className: 'dsh-iter-actions' },
              h('button', {
                type: 'button',
                className: 'dsh-iter-btn dsh-iter-cancel',
                onClick: () => setOpen(false),
              }, t('cancel')),
              h('button', {
                type: 'button',
                className: 'dsh-iter-btn dsh-iter-go',
                disabled: busy,
                onClick: start,
              }, busy ? t('busy') : t('start')))),
        ) : null;

        const modal = modalBody
          ? (ReactDOM && ReactDOM.createPortal ? ReactDOM.createPortal(modalBody, document.body) : modalBody)
          : null;

        return h('div', { className: 'dsh-iter-wrap' },
          h('style', { key: 'dsh-iter-css' }, ITERATE_CSS),
          trigger,
          modal);
      };
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'admin-permission: dictionaries');
      ctx.effect(() => ctx.locale.register(ITERATE_NS, { zh: iterateZh, en: iterateEn }), 'admin-permission: iterate dictionaries');
      const submit = async (sessionId, preset) => {
        const live = ctx.sessions.binding(sessionId) && ctx.sessions.binding(sessionId).session;
        if (!live) throw new Error('this session is not materialized yet');
        const result = await live.command('/permission ' + preset);
        if (!result.ok) throw new Error('permission switch failed: ' + result.error.code + ': ' + result.error.message);
        if (!result.value.matched) throw new Error('the host offers no /permission command');
        return true;
      };
      // 已撤销：隐藏滑块会连带隐藏模型选择器，不再干预 DSH 原生控件

      // 已移除：DOM 搬运会破坏输入框布局，改为不干预布局

      // ---------------------------------------------------------------- 操控电脑提示
      // ★ 参考 dsh-qwen-paint 的「思考流动画」写法：不画全屏浮层，
      //   而是在**最后一条消息条目**里挂一段流光文字「正在操控电脑」。
      //   纯前端 DOM，零外部依赖；只在鼠标类工具运行中出现，一停立刻移除。
      const MOUSE_HUD_TOOLS = new Set([
        'cua_driver_native__click',
        'cua_driver_native__double_click',
        'cua_driver_native__right_click',
        'cua_driver_native__drag',
        'cua_driver_native__scroll',
        'cua_driver_native__move_cursor',
        'cua_driver_native__browser_click',
        'cua_driver_native__browser_pointer',
      ])
      const SHINE_ID = 'dsh-admin-shine'
      const SHINE_CSS_ID = 'dsh-admin-shine-css'
      let shineSuppressedUntil = 0

      const ensureShineCss = () => {
        if (document.getElementById(SHINE_CSS_ID)) return
        const style = document.createElement('style')
        style.id = SHINE_CSS_ID
        style.textContent = [
          // ★ 2026-10-21 主人要求：参考 qwen-paint 插件的做法 —— 流光要像**消息流里的一条**
          //   显示在对话末尾，不要做成压在输入框上的浮层（浮层会盖住 composer）。
          //   做法：定位消息列表容器（[class*="flowItem"] 的父节点）后追加一个普通流内元素。
          '.dshadm-shine-item{display:flex;align-items:center;gap:7px;margin:8px 0 2px;',
          '  padding:3px 12px;border-radius:999px;width:max-content;',
          '  background:rgba(80,130,255,.10);border:1px solid rgba(120,170,255,.22);}',
          '.dshadm-shine-dot{width:7px;height:7px;border-radius:50%;flex:none;',
          '  background:linear-gradient(90deg,#7fd8ff,#a78bfa);',
          '  animation:dshadm-shine-pulse 1.2s ease-in-out infinite;}',
          '.dshadm-shine-text{font-size:12.5px;font-weight:600;letter-spacing:.4px;',
          '  background:linear-gradient(90deg,#7fd8ff,#a78bfa,#f9a8d4,#7fd8ff);',
          '  background-size:220% 100%;-webkit-background-clip:text;background-clip:text;',
          '  color:transparent;animation:dshadm-shine-run 2.2s linear infinite;}',
          '@keyframes dshadm-shine-run{0%{background-position:0% 50%}100%{background-position:220% 50%}}',
          '@keyframes dshadm-shine-pulse{0%,100%{opacity:.35;transform:scale(.8)}50%{opacity:1;transform:scale(1.15)}}',
        ].join('\n')
        document.head.appendChild(style)
      }

      /** 流光作为消息流里的一条：追加到消息列表容器末尾（跟着滚动，像一条消息）。
       *  ★ 参考 qwen-paint 插件已验证过的做法（flowItem 定位 + 追加）。 */
      const ensureShine = () => {
        ensureShineCss()
        const firstItem = document.querySelector('[class*="flowItem"]')
        const host = firstItem !== null ? firstItem.parentElement : null
        if (host === null) return null
        let el = document.getElementById(SHINE_ID)
        if (el === null) {
          el = document.createElement('div')
          el.id = SHINE_ID
          el.className = 'dshadm-shine-item'
          el.innerHTML =
            '<span class="dshadm-shine-dot"></span>' +
            '<span class="dshadm-shine-text">正在操控电脑</span>'
        }
        if (el.parentElement !== host) {
          try { host.appendChild(el) } catch (error) { return null }
        }
        return el
      }

      const removeShine = () => {
        try {
          const stale = document.getElementById(SHINE_ID)
          if (stale !== null) stale.remove()
        } catch (error) { /* 忽略 */ }
      }

      let shineBusy = false
      const shineTick = async () => {
        if (Date.now() < shineSuppressedUntil) {
          removeShine()
          return
        }
        if (shineBusy) return
        shineBusy = true
        try {
          const res = await fetch('/admin-mode/hud', { cache: 'no-store' })
          if (!res.ok) {
            removeShine()
            return
          }
          const data = await res.json()
          if (data && data.active === true) ensureShine()
          else removeShine()
        } catch (error) {
          removeShine()
        } finally {
          shineBusy = false
        }
      }

      const shineTimer = setInterval(shineTick, 120)
      const onShineKey = (event) => {
        if (event.key !== 'Escape') return
        if (document.getElementById(SHINE_ID) === null) return
        shineSuppressedUntil = Date.now() + 3000
        removeShine()
      }
      document.addEventListener('keydown', onShineKey, true)
      ctx.effect(() => () => {
        clearInterval(shineTimer)
        document.removeEventListener('keydown', onShineKey, true)
        removeShine()
      }, 'admin-mode: control shine')

      const Control = makeControl(ctx);
      const Iterate = makeIterate(ctx);

      // ---------------------------------------------------------------- UI 自检 + 熔断
      // ★ 交付门槛（主人 2026-10-21 要求）：插件加载后必须自己确认宿主核心界面还活着。
      //   判据：聊天输入区（composer）存在且尺寸正常。一旦探测失败（典型症状就是
      //   "聊天框失效"），立刻撤掉本插件所有视觉层并置熔断开关，把界面还给宿主，
      //   同时把结果 POST 给 host 写进诊断文件，交付前能查。
      const probeComposer = () => {
        try {
          const candidates = ['[data-composer-card]', '[role="textbox"]', 'textarea', '[contenteditable="true"]']
          let live = false
          for (const selector of candidates) {
            for (const node of document.querySelectorAll(selector)) {
              const rect = node.getBoundingClientRect()
              if (rect.height > 20 && rect.width > 40) { live = true; break }
            }
            if (live) break
          }
          const ourControl = document.querySelector('.apm-trigger') !== null
          const result = { composer: live, ourControl, at: new Date().toISOString() }
          window.__dshAdminSelfTest = result
          if (!live) {
            adminUiDisabled = true
            removeShine()
            const css = document.getElementById(SHINE_CSS_ID)
            if (css !== null) css.remove()
            console.error('[admin-mode] composer probe failed; own UI disabled', result)
          }
          fetch('/admin-mode/selftest', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(result),
          }).catch(() => {})
          return result
        } catch (error) {
          return null
        }
      }
      const probeTimers = [setTimeout(probeComposer, 1500), setTimeout(probeComposer, 4000)]
      ctx.effect(() => () => {
        for (const timer of probeTimers) clearTimeout(timer)
      }, 'admin-mode: ui self-test')

      ctx.slots.inject('conversation.input.left', () => ctx.slots.register({
        name: 'conversation.input.left',
        id: 'admin-iterate',
        order: 100,
        locale: ITERATE_NS,
        inject: (sessionId) => ({
          run: async (opts) => {
            const bound = ctx.sessions.binding(sessionId);
            const live = bound && bound.session;
            if (!live) throw new Error('session-not-ready');
            const n = (opts && opts.count) || 3;
            const direction = String((opts && opts.direction) || '').trim();

            // ★ 2026-10-21 主人要求：末尾不加句号，消息只保留「轮数 + 方向」。
            let text = '\u81ea\u4e3b\u8fed\u4ee3 ' + n + ' \u8f6e';
            if (direction) {
              text += '\uff1a' + direction;
            }

            const res = await live.prompt([{ type: 'text', text: text }], 'queue');
            if (!res.ok) throw new Error((res.error && res.error.message) || 'prompt-failed');
            return true;
          },
        }),
      }, Iterate));
      ctx.slots.inject('conversation.input.permission', () => ctx.slots.register({
        name: 'conversation.input.permission',
        priority: -1,
        locale: NS,
        inject: (sessionId) => ({
          select: (preset) => submit(sessionId, preset),
        }),
      }, Control));
    }

    return {
      inject: ['slots', 'sessions', 'remote', 'remote.permissionPresets', 'locale'],
      apply,
    };
  },
});
