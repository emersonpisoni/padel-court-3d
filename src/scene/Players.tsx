import { useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import type { Group } from 'three'
import { clampToCourt } from '../lib/court'
import type { Player, Vec2 } from '../types'
import {
  addBallPoint,
  currentStep,
  movePlayer,
  select,
  useEditor,
  usePlayback,
  useView,
} from '../store'
import { CLICK_TOLERANCE, Label, setCursor, useDrag } from './helpers'

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

/** Posição do jogador no instante atual da reprodução (interpola do passo anterior para o atual). */
function animatedPosition(playerId: string): Vec2 | null {
  const { play, stepIndex } = useEditor.getState()
  const cur = play.steps[stepIndex]?.positions[playerId]
  if (!cur) return null
  const prev = play.steps[stepIndex - 1]?.positions[playerId] ?? cur
  const t = easeInOut(usePlayback.getState().t)
  return { x: prev.x + (cur.x - prev.x) * t, z: prev.z + (cur.z - prev.z) * t }
}

function PlayerFigure({ player, color }: { player: Player; color: string }) {
  const group = useRef<Group>(null)
  const selected = useEditor((s) => s.selection?.type === 'player' && s.selection.id === player.id)
  const tool = useEditor((s) => s.tool)
  const showLabels = useView((s) => s.showLabels)
  const facing = player.team === 'A' ? 0 : Math.PI

  useFrame(() => {
    const p = animatedPosition(player.id)
    if (p && group.current) group.current.position.set(p.x, 0, p.z)
  })

  const drag = useDrag({
    enabled: tool === 'select',
    onStart: () => select({ type: 'player', id: player.id }),
    onMove: (pt) => movePlayer(player.id, clampToCourt(pt.x, pt.z, 0.3)),
  })

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > CLICK_TOLERANCE) return
    e.stopPropagation()
    const t = useEditor.getState().tool
    if (t === 'ball') {
      // Clique no jogador com a ferramenta da bola = golpe na altura da raquete
      const pos = currentStep().positions[player.id]
      if (pos) addBallPoint('hit', pos.x, 1, pos.z)
    } else if (t === 'select') {
      select({ type: 'player', id: player.id })
    }
  }

  const caption = player.name ? `${player.label} · ${player.name}` : player.label

  return (
    <group
      ref={group}
      {...drag}
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation()
        setCursor(tool === 'select' ? 'grab' : 'pointer')
      }}
      onPointerOut={() => setCursor('')}
    >
      {/* Anel no chão */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <ringGeometry args={[selected ? 0.38 : 0.34, selected ? 0.5 : 0.44, 40]} />
        <meshBasicMaterial color={selected ? '#ffffff' : color} transparent opacity={selected ? 1 : 0.85} />
      </mesh>
      <group rotation={[0, facing, 0]}>
        {/* Corpo */}
        <mesh position={[0, 0.72, 0]} castShadow>
          <capsuleGeometry args={[0.23, 0.9, 6, 16]} />
          <meshStandardMaterial color={color} roughness={0.55} emissive={selected ? color : '#000000'} emissiveIntensity={0.35} />
        </mesh>
        {/* Cabeça */}
        <mesh position={[0, 1.55, 0]} castShadow>
          <sphereGeometry args={[0.15, 20, 16]} />
          <meshStandardMaterial color="#f1c7a5" roughness={0.7} />
        </mesh>
        {/* Viseira indicando para onde o jogador olha */}
        <mesh position={[0.1, 1.6, 0]} rotation={[0, 0, -0.2]}>
          <boxGeometry args={[0.14, 0.03, 0.22]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
        {/* Raquete (mão direita) */}
        <group position={[0.15, 1.0, 0.36]} rotation={[0, 0, -0.5]}>
          <mesh position={[0, -0.12, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.2, 8]} />
            <meshStandardMaterial color="#111827" />
          </mesh>
          <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.13, 0.13, 0.035, 24]} />
            <meshStandardMaterial color="#e5e7eb" roughness={0.4} />
          </mesh>
        </group>
      </group>
      {showLabels && <Label text={caption} color={color} position={[0, 2.05, 0]} />}
    </group>
  )
}

/** Fantasma na posição do passo anterior + seta até a posição atual. */
function MovementArrows() {
  const play = useEditor((s) => s.play)
  const stepIndex = useEditor((s) => s.stepIndex)
  const playing = usePlayback((s) => s.playing || s.t < 1)
  const show = useView((s) => s.showMovement)
  const prev = play.steps[stepIndex - 1]
  if (!show || playing || !prev) return null
  const cur = play.steps[stepIndex]

  return (
    <group>
      {play.players.map((p) => {
        const a = prev.positions[p.id]
        const b = cur.positions[p.id]
        if (!a || !b) return null
        const dx = b.x - a.x
        const dz = b.z - a.z
        const dist = Math.hypot(dx, dz)
        if (dist < 0.25) return null
        const color = play.teamColors[p.team]
        const ux = dx / dist
        const uz = dz / dist
        const tip = { x: b.x - ux * 0.5, z: b.z - uz * 0.5 }
        const angle = Math.atan2(ux, uz)
        return (
          <group key={p.id}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[a.x, 0.011, a.z]}>
              <ringGeometry args={[0.3, 0.42, 32]} />
              <meshBasicMaterial color={color} transparent opacity={0.35} />
            </mesh>
            <Line
              points={[
                [a.x + ux * 0.45, 0.03, a.z + uz * 0.45],
                [tip.x - ux * 0.2, 0.03, tip.z - uz * 0.2],
              ]}
              color={color}
              lineWidth={3}
              dashed
              dashSize={0.25}
              gapSize={0.15}
            />
            <mesh position={[tip.x, 0.05, tip.z]} rotation={[Math.PI / 2, 0, -angle]}>
              <coneGeometry args={[0.14, 0.32, 16]} />
              <meshBasicMaterial color={color} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

export function Players() {
  const players = useEditor((s) => s.play.players)
  const teamColors = useEditor((s) => s.play.teamColors)
  return (
    <group>
      {players.map((p) => (
        <PlayerFigure key={p.id} player={p} color={teamColors[p.team]} />
      ))}
      <MovementArrows />
    </group>
  )
}
