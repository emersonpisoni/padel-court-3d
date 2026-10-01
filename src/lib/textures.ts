import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

const cache = new Map<string, CanvasTexture>()

function cached(key: string, make: () => CanvasTexture) {
  let tex = cache.get(key)
  if (!tex) {
    tex = make()
    cache.set(key, tex)
  }
  return tex
}

/** Alambrado em losango (tela metálica). */
export function fenceTexture() {
  return cached('fence', () => {
    const size = 64
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')!
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(0, size / 2)
    ctx.lineTo(size / 2, 0)
    ctx.lineTo(size, size / 2)
    ctx.lineTo(size / 2, size)
    ctx.closePath()
    ctx.stroke()
    const tex = new CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = RepeatWrapping
    tex.anisotropy = 4
    return tex
  })
}

/** Malha quadrada da rede. */
export function netTexture() {
  return cached('net', () => {
    const size = 32
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')!
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.strokeRect(0, 0, size, size)
    const tex = new CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = RepeatWrapping
    tex.anisotropy = 4
    return tex
  })
}

/** Etiqueta arredondada com texto (usada em sprites de nome/número). */
export function labelTexture(text: string, bg: string, fg = '#ffffff') {
  return cached(`label:${text}:${bg}:${fg}`, () => {
    const scale = 4
    const font = `600 ${22 * scale}px system-ui, -apple-system, "Segoe UI", sans-serif`
    const measure = document.createElement('canvas').getContext('2d')!
    measure.font = font
    const padX = 12 * scale
    const h = 34 * scale
    const w = Math.max(h, Math.ceil(measure.measureText(text).width) + padX * 2)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = bg
    ctx.beginPath()
    ctx.roundRect(0, 0, w, h, h / 2)
    ctx.fill()
    ctx.fillStyle = fg
    ctx.font = font
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, w / 2, h / 2 + scale)
    const tex = new CanvasTexture(canvas)
    tex.colorSpace = SRGBColorSpace
    tex.userData.aspect = w / h
    return tex
  })
}
