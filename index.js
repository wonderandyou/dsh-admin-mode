import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const HUD_SCRIPT = path.join(HERE, 'hud', 'cua_hud.py')
const CMD_FILE = path.join(os.tmpdir(), 'dsh_cua_hud_cmd.txt')

/** Python interpreters to try, in order. Override with DSH_HUD_PYTHON. */
function pythonCandidates() {
  return [
    process.env.DSH_HUD_PYTHON,
    'pythonw.exe',
    'pythonw',
    'python.exe',
    'python',
    'C:\\Users\\q3153\\AppData\\Local\\Programs\\Python\\Python312\\pythonw.exe',
  ].filter(Boolean)
}

export function apply(ctx) {
  let child = null
  let candidateIndex = 0

  const write = (value) => {
    try {
      fs.writeFileSync(CMD_FILE, value)
    } catch {
      // HUD not running yet; ignore
    }
  }

  const ensureHud = () => {
    if (child !== null) return
    const candidates = pythonCandidates()
    const python = candidates[candidateIndex % candidates.length]
    try {
      child = spawn(python, [HUD_SCRIPT, CMD_FILE], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      })
      child.on('error', () => {
        child = null
        candidateIndex += 1
      })
      child.unref()
    } catch {
      child = null
      candidateIndex += 1
    }
  }

  const isComputerUse = (name) =>
    typeof name === 'string' && name.startsWith('cua_driver_native__')

  // The HUD ships with this bundle: every computer-use call keeps it alive.
  ctx.on('tools/pre-execute', (exec, next) => {
    if (isComputerUse(exec.name)) {
      ensureHud()
      write('show')
    }
    return next()
  })

  ctx.on('tools/result', (exec) => {
    if (isComputerUse(exec.name)) write('show')
  })

  ctx.effect(() => () => {
    if (child !== null) {
      try {
        process.kill(child.pid)
      } catch {
        // already gone
      }
      child = null
    }
  }, 'dsh-admin-mode: stop computer-use HUD')
}
