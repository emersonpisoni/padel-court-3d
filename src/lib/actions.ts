import { create } from 'zustand'
import { loadPlay, useEditor } from '../store'
import { sceneRefs } from './camera'
import { downloadFile, isPlay, slugify } from './storage'

// ---------- avisos rápidos (toast) ----------

interface ToastState {
  message: string | null
  kind: 'info' | 'error'
}

export const useToast = create<ToastState>(() => ({ message: null, kind: 'info' }))
let toastTimer: ReturnType<typeof setTimeout> | undefined

export function toast(message: string, kind: ToastState['kind'] = 'info') {
  clearTimeout(toastTimer)
  useToast.setState({ message, kind })
  toastTimer = setTimeout(() => useToast.setState({ message: null }), 2600)
}

// ---------- foto da quadra ----------

/** Salva um PNG da visão atual, com a anotação do passo na parte de baixo. */
export function screenshot() {
  const gl = sceneRefs.gl
  if (!gl) return
  const { play, stepIndex } = useEditor.getState()
  const step = play.steps[stepIndex]
  const src = gl.domElement
  const canvas = document.createElement('canvas')
  canvas.width = src.width
  canvas.height = src.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(src, 0, 0)

  const scale = src.width / src.clientWidth
  const title = `${play.name} — passo ${stepIndex + 1}/${play.steps.length}`
  const lines = [title, ...(step.note ? [step.note] : [])]
  const pad = 14 * scale
  const lineH = 24 * scale
  ctx.fillStyle = 'rgba(15, 23, 42, 0.78)'
  ctx.fillRect(0, canvas.height - lines.length * lineH - pad * 2, canvas.width, lines.length * lineH + pad * 2)
  lines.forEach((text, i) => {
    ctx.fillStyle = i === 0 ? '#d4f43a' : '#f8fafc'
    ctx.font = `${i === 0 ? 600 : 400} ${16 * scale}px system-ui, sans-serif`
    ctx.fillText(text, pad, canvas.height - pad - (lines.length - 1 - i) * lineH - 6 * scale, canvas.width - pad * 2)
  })

  canvas.toBlob((blob) => {
    if (!blob) return
    downloadFile(`${slugify(play.name)}-passo-${stepIndex + 1}.png`, blob)
    toast('Imagem salva')
  }, 'image/png')
}

// ---------- exportar / importar ----------

export function exportPlay() {
  const { play } = useEditor.getState()
  downloadFile(`${slugify(play.name)}.padel.json`, JSON.stringify(play, null, 2))
  toast('Arquivo da jogada baixado')
}

export function importPlay() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json,application/json'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      if (!isPlay(data)) throw new Error('formato inválido')
      loadPlay(data)
      toast(`Jogada "${data.name}" importada`)
    } catch {
      toast('Não foi possível ler esse arquivo', 'error')
    }
  }
  input.click()
}

// ---------- tela cheia ----------

export function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen()
  else document.documentElement.requestFullscreen?.().catch(() => toast('Tela cheia não suportada aqui', 'error'))
}
