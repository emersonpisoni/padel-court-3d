import { useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { Plane, Vector3, type Group, type Mesh } from 'three'
import { COURT, clampToCourt } from '../lib/court'
import { BALL_RADIUS, netCrossings, sampleTrajectory, trajectoryPosition } from '../lib/trajectory'
import type { BallPoint } from '../types'
import { currentStep, select, updateBallPoint, useEditor, usePlayback, useView } from '../store'
import { CLICK_TOLERANCE, Label, setCursor, useDrag } from './helpers'

export const BALL_COLOR = '#d4f43a'
const KIND_COLOR: Record<BallPoint['kind'], string> = {
  hit: '#ffffff',
  bounce: BALL_COLOR,
  wall: '#38bdf8',
}

/** Plano onde o ponto desliza ao ser arrastado: paredes ficam na parede, os demais na horizontal. */
function dragPlane(p: BallPoint): Plane {
  if (p.kind === 'wall') {
    if (Math.abs(p.x) > COURT.halfLength - 0.2) return new Plane(new Vector3(1, 0, 0), -p.x)
    return new Plane(new Vector3(0, 0, 1), -p.z)
  }
  return new Plane(new Vector3(0, 1, 0), -p.y)
}

function PointHandle({ point, index }: { point: BallPoint; index: number }) {
  const selected = useEditor((s) => s.selection?.type === 'ball' && s.selection.id === point.id)
  const tool = useEditor((s) => s.tool)
  const plane = useMemo(() => dragPlane(point), [point])
  const color = KIND_COLOR[point.kind]

  const drag = useDrag({
    enabled: tool !== 'marker',
    plane,
    onStart: () => select({ type: 'ball', id: point.id }),
    onMove: (pt) => {
      if (point.kind === 'wall') {
        const y = Math.max(0.1, Math.min(COURT.backTotalHeight, pt.y))
        if (Math.abs(point.x) > COURT.halfLength - 0.2) updateBallPoint(point.id, { z: clampToCourt(0, pt.z, 0.06).z, y }, false)
        else updateBallPoint(point.id, { x: clampToCourt(pt.x, 0, 0.06).x, y }, false)
      } else {
        updateBallPoint(point.id, clampToCourt(pt.x, pt.z, 0.06), false)
      }
    },
  })

  const scale = selected ? 1.5 : 1
  return (
    <group>
      {/* Linha vertical até o chão, para dar noção de altura */}
      {point.y > 0.05 && (
        <Line
          points={[
            [point.x, 0.01, point.z],
            [point.x, point.y, point.z],
          ]}
          color={color}
          lineWidth={1}
          transparent
          opacity={0.5}
          dashed
          dashSize={0.08}
          gapSize={0.08}
        />
      )}
      {point.kind === 'bounce' && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[point.x, 0.015, point.z]}>
          <ringGeometry args={[0.16 * scale, 0.24 * scale, 32]} />
          <meshBasicMaterial color={color} />
        </mesh>
      )}
      <mesh
        position={[point.x, Math.max(point.y, 0.06), point.z]}
        scale={scale}
        {...drag}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          if (e.delta > CLICK_TOLERANCE) return
          e.stopPropagation()
          select({ type: 'ball', id: point.id })
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setCursor('grab')
        }}
        onPointerOut={() => setCursor('')}
      >
        <sphereGeometry args={[0.09, 20, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={selected ? 0.8 : 0.25} />
      </mesh>
      <Label text={String(index + 1)} color="#0f172a" textColor={color} height={0.26} position={[point.x, Math.max(point.y, 0.06) + 0.32, point.z]} />
    </group>
  )
}

/** Bola animada + sombra no chão. */
function AnimatedBall({ points }: { points: BallPoint[] }) {
  const ball = useRef<Mesh>(null)
  const shadow = useRef<Group>(null)

  useFrame(() => {
    const { t, playing } = usePlayback.getState()
    const visible = points.length > 1 && (playing || t < 1)
    const pos = visible ? trajectoryPosition(points, t) : null
    if (!ball.current || !shadow.current) return
    ball.current.visible = shadow.current.visible = !!pos
    if (!pos) return
    ball.current.position.set(pos.x, Math.max(BALL_RADIUS, pos.y), pos.z)
    shadow.current.position.set(pos.x, 0.013, pos.z)
    const s = Math.max(0.4, 1 - pos.y / 6)
    shadow.current.scale.set(s, s, s)
  })

  return (
    <>
      <mesh ref={ball} castShadow visible={false}>
        <sphereGeometry args={[BALL_RADIUS, 24, 16]} />
        <meshStandardMaterial color={BALL_COLOR} emissive={BALL_COLOR} emissiveIntensity={0.35} roughness={0.6} />
      </mesh>
      <group ref={shadow} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.12, 24]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.4} depthWrite={false} />
        </mesh>
      </group>
    </>
  )
}

export function Ball() {
  const points = useEditor((s) => currentStep(s).ball)
  const showTrajectory = useView((s) => s.showTrajectory)
  // Durante a animação a linha fica apagada para a bola se destacar
  const animating = usePlayback((s) => s.playing || s.t < 1)
  const path = useMemo(() => sampleTrajectory(points).map((p) => [p.x, p.y, p.z] as [number, number, number]), [points])
  const floorPath = useMemo(() => path.map(([x, , z]) => [x, 0.012, z] as [number, number, number]), [path])
  const crossings = useMemo(() => netCrossings(points), [points])

  return (
    <group>
      {showTrajectory && path.length > 1 && (
        <>
          <Line points={path} color={BALL_COLOR} lineWidth={3.5} transparent opacity={animating ? 0.3 : 1} />
          {/* Projeção no chão: ajuda a ler a direção quando se olha de cima */}
          <Line points={floorPath} color="#000000" lineWidth={2} transparent opacity={0.3} />
        </>
      )}
      {showTrajectory && points.map((p, i) => <PointHandle key={p.id} point={p} index={i} />)}
      {showTrajectory &&
        crossings.map((c) => (
          <group key={c.segment} position={[0, c.point.y, c.point.z]}>
            <mesh rotation={[0, Math.PI / 2, 0]}>
              <ringGeometry args={[0.12, 0.17, 24]} />
              <meshBasicMaterial color={c.clears ? '#22c55e' : '#ef4444'} />
            </mesh>
            {!c.clears && <Label text="Na rede!" color="#ef4444" position={[0, 0.45, 0]} />}
          </group>
        ))}
      <AnimatedBall points={points} />
    </group>
  )
}
