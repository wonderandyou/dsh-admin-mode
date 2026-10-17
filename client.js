window.__ModuleLoader__.load({
  id: '@local/dsh-admin-mode',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useLayoutEffect, useRef } = React;

    const ADMIN = 'admin';
    const FULL = 'danger-full-access';
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
      'admin.detail': '完全访问 + 永不询问：截屏、控制鼠标键盘、调用任意工具全部放行，自主执行直到任务完成',
      'full.confirm.title': '确认启用完全权限？',
      'full.confirm.body': '启用完全权限后，智能体将减少确认步骤，并可直接执行更多操作，包括敏感操作、文件修改或外部命令。',
      'full.confirm.ack': '我已了解风险，并愿意继续',
      'full.confirm.enable': '启用完全权限',
      'warn.1.title': '严重警告 1/2 · 将交出整台电脑',
      'warn.1.body': '启用「管理员」后，DSH 将获得你电脑的全部操作权限：截屏、控制鼠标和键盘、调用任意工具，且不再向你请求同意。它可能修改或删除文件、执行外部命令、操作任意窗口。',
      'warn.1.ack': '我已了解，这只是第一次确认',
      'warn.1.next': '继续（还有一次确认）',
      'warn.2.title': '严重警告 2/2 · 自主执行，不会追问',
      'warn.2.body': '管理员模式下，DSH 以完成任务为最高优先级：遇到问题自行决策、不中途询问（重大安全例外除外），直到任务完成。普通操作请选「完全权限」。',
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
      'admin.detail': 'Full access, never asks: screenshots, mouse and keyboard, every tool are allowed; keep working autonomously until the task is done',
      'full.confirm.title': 'Enable Full access?',
      'full.confirm.body': 'Full access reduces confirmation steps and lets the agent perform more actions directly, including sensitive operations, file changes, or external commands.',
      'full.confirm.ack': 'I understand the risks and want to continue',
      'full.confirm.enable': 'Enable Full access',
      'warn.1.title': 'Severe warning 1/2 · handing over the whole computer',
      'warn.1.body': 'Administrator mode grants DSH full control of this computer: screenshots, mouse and keyboard, and every tool, with no further approval. It may change or delete files, run external commands, and operate any window.',
      'warn.1.ack': 'I understand; this is only the first confirmation',
      'warn.1.next': 'Continue (one more confirmation)',
      'warn.2.title': 'Severe warning 2/2 · autonomous, will not ask',
      'warn.2.body': 'In Administrator mode DSH treats finishing the task as the top priority: it decides on its own and does not stop to ask, except for major safety problems, until the task is complete. Use Full access for ordinary work.',
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

        const options = catalog.options || [];
        const currentValue = selection.currentValue;
        const labelOf = (option) => {
          if (!option) return t('custom');
          if (option.value === 'read-only') return t('preset.readOnly');
          if (option.value === 'workspace-write') return t('preset.workspaceWrite');
          if (option.value === FULL) return t('preset.fullAccess');
          if (option.value === ADMIN) return t('admin.label');
          return option.name || option.value;
        };
        const detailOf = (option) => {
          if (!option) return undefined;
          if (option.value === ADMIN) return t('admin.detail');
          return option.description;
        };
        const current = options.find((option) => option.value === currentValue);
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
          className: currentValue === ADMIN ? 'apm-trigger apm-danger' : 'apm-trigger',
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 28,
            padding: '0 8px',
            border: 'none',
            borderRadius: 8,
            color: currentValue === ADMIN
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

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'admin-permission: dictionaries');
      const submit = async (sessionId, preset) => {
        const live = ctx.sessions.binding(sessionId) && ctx.sessions.binding(sessionId).session;
        if (!live) throw new Error('this session is not materialized yet');
        const result = await live.command('/permission ' + preset);
        if (!result.ok) throw new Error('permission switch failed: ' + result.error.code + ': ' + result.error.message);
        if (!result.value.matched) throw new Error('the host offers no /permission command');
        return true;
      };
      const Control = makeControl(ctx);
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
