import type { WebGLRenderer } from 'three'
import type { CameraControls } from '@react-three/drei'
import { MathUtils, PerspectiveCamera } from 'three'
import type { Vec2 } from '../types'

/** Referências compartilhadas entre a cena 3D e a interface. */
export const sceneRefs: { controls: CameraControls | null; gl: WebGLRenderer | null } = {
  controls: null,
  gl: null,
}

export type CameraPreset = '3d' | 'top' | 'side' | 'behindA' | 'behindB'

export const CAMERA_PRESETS: { id: CameraPreset; label: string; key: string }[] = [
  { id: '3d', label: 'Visão 3D', key: '1' },
  { id: 'top', label: 'De cima', key: '2' },
  { id: 'side', label: 'Lateral', key: '3' },
  { id: 'behindA', label: 'Atrás do time A', key: '4' },
  { id: 'behindB', label: 'Atrás do time B', key: '5' },
]

function camera() {
  const c = sceneRefs.controls?.camera
  return c instanceof PerspectiveCamera ? c : null
}

/** Distância para enquadrar uma área w × h olhando de frente. */
function fitDistance(w: number, h: number) {
  const cam = camera()
  const fov = MathUtils.degToRad(cam?.fov ?? 40)
  const aspect = cam?.aspect ?? 16 / 9
  const tan = Math.tan(fov / 2)
  return Math.max(h / 2 / tan, w / 2 / (tan * aspect))
}

export function goToPreset(preset: CameraPreset, animate = true) {
  const c = sceneRefs.controls
  if (!c) return
  const portrait = (camera()?.aspect ?? 1.6) < 1
  switch (preset) {
    case '3d': {
      const d = fitDistance(26, 15) * 1.25
      c.setLookAt(-d * 0.6, d * 0.58, d * 0.55, 0, 0, 0, animate)
      break
    }
    case 'top': {
      // No celular em pé, gira a quadra para o comprimento ficar na vertical
      const d = portrait ? fitDistance(12, 22) : fitDistance(22, 12)
      if (portrait) c.setLookAt(-0.001, d, 0, 0, 0, 0, animate)
      else c.setLookAt(0, d, 0.001, 0, 0, 0, animate)
      break
    }
    case 'side': {
      const d = fitDistance(22, 6)
      c.setLookAt(0, d * 0.35, d, 0, 0.6, 0, animate)
      break
    }
    case 'behindA':
      c.setLookAt(-15, 4.2, 0, 2, 0.4, 0, animate)
      break
    case 'behindB':
      c.setLookAt(15, 4.2, 0, -2, 0.4, 0, animate)
      break
  }
}

/** Câmera na altura dos olhos do jogador, olhando para o lado adversário. */
export function playerView(pos: Vec2) {
  const c = sceneRefs.controls
  if (!c) return
  const dir = pos.x < 0 ? 1 : -1
  c.setLookAt(pos.x - dir * 0.6, 1.7, pos.z, dir * 7, 0.6, pos.z * 0.3, true)
}

export function zoom(factor: number) {
  const c = sceneRefs.controls
  if (!c) return
  c.dolly(factor, true)
}

export function setControlsEnabled(enabled: boolean) {
  if (sceneRefs.controls) sceneRefs.controls.enabled = enabled
}
