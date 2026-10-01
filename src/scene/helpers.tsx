import { useMemo, useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { Plane, Vector3 } from 'three'
import { beginDrag, endDrag } from '../store'
import { setControlsEnabled } from '../lib/camera'
import { labelTexture } from '../lib/textures'

/** Pixels que o ponteiro pode andar e ainda contar como clique (e não como giro de câmera). */
export const CLICK_TOLERANCE = 6

interface DragOptions {
  /** Plano onde o objeto desliza. Padrão: chão (y = 0). */
  plane?: Plane
  enabled?: boolean
  onStart?: () => void
  onMove: (point: Vector3) => void
}

/**
 * Arrastar um objeto 3D sobre um plano. O histórico (desfazer) só é gravado
 * quando o ponteiro realmente se move, então um simples clique não polui o histórico.
 */
export function useDrag({ plane, enabled = true, onStart, onMove }: DragOptions) {
  const floor = useMemo(() => new Plane(new Vector3(0, 1, 0), 0), [])
  const state = useRef({ active: false, moved: false })
  const hit = useMemo(() => new Vector3(), [])

  return {
    onPointerDown(e: ThreeEvent<PointerEvent>) {
      if (!enabled || e.button !== 0) return
      e.stopPropagation()
      ;(e.target as Element).setPointerCapture(e.pointerId)
      state.current = { active: true, moved: false }
      setControlsEnabled(false)
      onStart?.()
    },
    onPointerMove(e: ThreeEvent<PointerEvent>) {
      if (!state.current.active) return
      e.stopPropagation()
      if (!state.current.moved) {
        state.current.moved = true
        beginDrag()
      }
      if (e.ray.intersectPlane(plane ?? floor, hit)) onMove(hit)
    },
    onPointerUp(e: ThreeEvent<PointerEvent>) {
      if (!state.current.active) return
      ;(e.target as Element).releasePointerCapture(e.pointerId)
      if (state.current.moved) endDrag()
      state.current.active = false
      setControlsEnabled(true)
    },
  }
}

export function setCursor(cursor: string) {
  document.body.style.cursor = cursor
}

/** Etiqueta que sempre fica de frente para a câmera. */
export function Label({
  text,
  color,
  position,
  height = 0.36,
  textColor,
}: {
  text: string
  color: string
  position: [number, number, number]
  height?: number
  textColor?: string
}) {
  const texture = labelTexture(text, color, textColor)
  const aspect = (texture.userData.aspect as number) ?? 1
  return (
    <sprite position={position} scale={[height * aspect, height, 1]} renderOrder={10}>
      <spriteMaterial map={texture} depthTest={false} transparent />
    </sprite>
  )
}
