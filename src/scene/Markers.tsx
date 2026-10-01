import type { ThreeEvent } from '@react-three/fiber'
import { clampToCourt } from '../lib/court'
import type { Marker } from '../types'
import { moveMarker, select, useEditor } from '../store'
import { CLICK_TOLERANCE, setCursor, useDrag } from './helpers'

function MarkerItem({ marker }: { marker: Marker }) {
  const selected = useEditor((s) => s.selection?.type === 'marker' && s.selection.id === marker.id)
  const tool = useEditor((s) => s.tool)
  const drag = useDrag({
    enabled: tool !== 'ball',
    onStart: () => select({ type: 'marker', id: marker.id }),
    onMove: (pt) => moveMarker(marker.id, clampToCourt(pt.x, pt.z, 0.1)),
  })
  const handlers = {
    ...drag,
    onClick: (e: ThreeEvent<MouseEvent>) => {
      if (e.delta > CLICK_TOLERANCE || tool === 'ball') return
      e.stopPropagation()
      select({ type: 'marker', id: marker.id })
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      if (tool !== 'ball') setCursor('grab')
    },
    onPointerOut: () => setCursor(''),
  }

  if (marker.kind === 'cone') {
    return (
      <group position={[marker.x, 0, marker.z]} {...handlers}>
        <mesh position={[0, 0.16, 0]} castShadow>
          <coneGeometry args={[0.12, 0.32, 20]} />
          <meshStandardMaterial color={selected ? '#fdba74' : '#f97316'} emissive="#f97316" emissiveIntensity={selected ? 0.5 : 0.1} />
        </mesh>
        <mesh position={[0, 0.17, 0]}>
          <cylinderGeometry args={[0.072, 0.09, 0.05, 20]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 0.01, 0]}>
          <boxGeometry args={[0.3, 0.02, 0.3]} />
          <meshStandardMaterial color="#ea580c" />
        </mesh>
      </group>
    )
  }

  // Alvo: anéis concêntricos no chão
  return (
    <group position={[marker.x, 0.008, marker.z]} rotation={[-Math.PI / 2, 0, 0]} {...handlers}>
      {[0.7, 0.48, 0.26].map((r, i) => (
        <mesh key={r} position={[0, 0, i * 0.001]}>
          <circleGeometry args={[r, 40]} />
          <meshBasicMaterial color={i % 2 === 0 ? '#ef4444' : '#ffffff'} transparent opacity={selected ? 0.95 : 0.7} />
        </mesh>
      ))}
      {selected && (
        <mesh position={[0, 0, 0.004]}>
          <ringGeometry args={[0.72, 0.8, 40]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      )}
    </group>
  )
}

export function Markers() {
  const markers = useEditor((s) => s.play.markers)
  return (
    <group>
      {markers.map((m) => (
        <MarkerItem key={m.id} marker={m} />
      ))}
    </group>
  )
}
