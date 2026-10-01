import { useMemo } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { DoubleSide, Vector3 } from 'three'
import { COURT, COURT_THEMES, clampToCourt } from '../lib/court'
import { fenceTexture, netTexture } from '../lib/textures'
import { addBallPoint, addMarker, useEditor, useView } from '../store'
import { CLICK_TOLERANCE } from './helpers'

const { halfLength: HL, halfWidth: HW } = COURT
const LINE_Y = 0.004
const WALL_INSET = 0.06

/** Clique no piso: adiciona ponto da bola ou marcador, conforme a ferramenta. */
function onFloorClick(e: ThreeEvent<MouseEvent>) {
  if (e.delta > CLICK_TOLERANCE) return
  const { tool, ballKind, markerKind } = useEditor.getState()
  if (tool === 'select') return
  e.stopPropagation()
  const { x, z } = clampToCourt(e.point.x, e.point.z, 0.1)
  if (tool === 'ball') addBallPoint(ballKind, x, ballKind === 'hit' ? 1 : 0, z)
  else addMarker(markerKind, x, z)
}

/**
 * Clique numa parede: ponto da bola batendo no vidro/alambrado.
 * Só vale se o raio vem de dentro da quadra; se a câmera está fora, o clique "atravessa"
 * a parede e cai no piso (é o que o professor espera ao clicar na quadra através do vidro).
 */
function makeWallClick(outward: Vector3) {
  return (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > CLICK_TOLERANCE) return
    if (useEditor.getState().tool !== 'ball') return
    if (e.ray.direction.dot(outward) <= 0) return
    e.stopPropagation()
    const p = e.point
    const x = Math.abs(outward.x) > 0 ? Math.sign(outward.x) * (HL - WALL_INSET) : clampToCourt(p.x, 0).x
    const z = Math.abs(outward.z) > 0 ? Math.sign(outward.z) * (HW - WALL_INSET) : clampToCourt(0, p.z).z
    addBallPoint('wall', x, Math.max(0.1, p.y), z)
  }
}

interface PanelProps {
  center: [number, number, number]
  size: [number, number]
  /** Normal apontando para fora da quadra. */
  outward: Vector3
  kind: 'glass' | 'mesh'
}

function WallPanel({ center, size, outward, kind }: PanelProps) {
  const rotationY = outward.x !== 0 ? Math.PI / 2 : 0
  const onClick = useMemo(() => makeWallClick(outward), [outward])
  const fence = useMemo(() => {
    if (kind !== 'mesh') return null
    const tex = fenceTexture().clone()
    tex.repeat.set(size[0] * 6, size[1] * 6)
    tex.needsUpdate = true
    return tex
  }, [kind, size])

  return (
    <mesh position={center} rotation={[0, rotationY, 0]} onClick={onClick}>
      <planeGeometry args={size} />
      {kind === 'glass' ? (
        <meshStandardMaterial
          color="#d6ecff"
          transparent
          opacity={0.2}
          roughness={0.05}
          metalness={0.1}
          side={DoubleSide}
          depthWrite={false}
        />
      ) : (
        <meshStandardMaterial color="#1f2937" map={fence} transparent alphaTest={0.4} side={DoubleSide} />
      )}
    </mesh>
  )
}

const OUT = {
  px: new Vector3(1, 0, 0),
  nx: new Vector3(-1, 0, 0),
  pz: new Vector3(0, 0, 1),
  nz: new Vector3(0, 0, -1),
}

function buildWalls() {
  const panels: PanelProps[] = []
  for (const s of [-1, 1]) {
    const back = s > 0 ? OUT.px : OUT.nx
    // Fundo: vidro de 3 m + alambrado até 4 m
    panels.push({ center: [s * HL, COURT.backGlassHeight / 2, 0], size: [HW * 2, COURT.backGlassHeight], outward: back, kind: 'glass' })
    panels.push({
      center: [s * HL, (COURT.backGlassHeight + COURT.backTotalHeight) / 2, 0],
      size: [HW * 2, COURT.backTotalHeight - COURT.backGlassHeight],
      outward: back,
      kind: 'mesh',
    })
    for (const t of [-1, 1]) {
      const side = t > 0 ? OUT.pz : OUT.nz
      const g1 = COURT.sideGlass1Length
      const g2 = COURT.sideGlass2Length
      // 1º trecho lateral: vidro 3 m + alambrado até 4 m
      panels.push({ center: [s * (HL - g1 / 2), COURT.sideGlass1Height / 2, t * HW], size: [g1, COURT.sideGlass1Height], outward: side, kind: 'glass' })
      panels.push({ center: [s * (HL - g1 / 2), 3.5, t * HW], size: [g1, 1], outward: side, kind: 'mesh' })
      // 2º trecho lateral: vidro 2 m + alambrado até 3 m
      panels.push({ center: [s * (HL - g1 - g2 / 2), COURT.sideGlass2Height / 2, t * HW], size: [g2, COURT.sideGlass2Height], outward: side, kind: 'glass' })
      panels.push({ center: [s * (HL - g1 - g2 / 2), 2.5, t * HW], size: [g2, 1], outward: side, kind: 'mesh' })
    }
  }
  // Meio das laterais: alambrado de 3 m
  const midLen = 2 * (HL - COURT.sideGlass1Length - COURT.sideGlass2Length)
  for (const t of [-1, 1]) {
    panels.push({ center: [0, COURT.sideMeshHeight / 2, t * HW], size: [midLen, COURT.sideMeshHeight], outward: t > 0 ? OUT.pz : OUT.nz, kind: 'mesh' })
  }

  // Pilares metálicos a cada 2 m
  const posts: { pos: [number, number, number]; h: number }[] = []
  for (const s of [-1, 1]) {
    for (let z = -HW; z <= HW + 0.01; z += 2) posts.push({ pos: [s * HL, 0, z], h: COURT.backTotalHeight })
    for (const t of [-1, 1]) {
      for (let x = 0; x < HL; x += 2) {
        const h = x >= HL - COURT.sideGlass1Length ? 4 : COURT.sideMeshHeight
        posts.push({ pos: [s * x, 0, t * HW], h })
      }
    }
  }
  return { panels, posts }
}

const WALLS = buildWalls()

function Walls() {
  const { panels, posts } = WALLS
  return (
    <group>
      {panels.map((p, i) => (
        <WallPanel key={i} {...p} />
      ))}
      {posts.map((p, i) => (
        <mesh key={i} position={[p.pos[0], p.h / 2, p.pos[2]]} castShadow>
          <boxGeometry args={[0.05, p.h, 0.05]} />
          <meshStandardMaterial color="#4b5563" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

function Lines() {
  const w = COURT.lineWidth
  const centerLen = 2 * (COURT.serviceLineFromNet + COURT.centerLineOverhang)
  return (
    <group>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * COURT.serviceLineFromNet, LINE_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w, HW * 2]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      <mesh position={[0, LINE_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[centerLen, w]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  )
}

function Net() {
  const tex = useMemo(() => {
    const t = netTexture().clone()
    t.repeat.set(HW * 2 * 20, COURT.netHeightCenter * 20)
    t.needsUpdate = true
    return t
  }, [])
  const h = COURT.netHeightCenter
  return (
    <group>
      <mesh position={[0, h / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[HW * 2, h]} />
        <meshStandardMaterial color="#0f172a" map={tex} transparent alphaTest={0.3} side={DoubleSide} />
      </mesh>
      {/* Faixa branca do topo */}
      <mesh position={[0, h - 0.025, 0]}>
        <boxGeometry args={[0.02, 0.05, HW * 2]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      {[-1, 1].map((t) => (
        <mesh key={t} position={[0, COURT.netHeightPost / 2, t * (HW - 0.05)]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, COURT.netHeightPost, 12]} />
          <meshStandardMaterial color="#111827" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

export function Court() {
  const theme = useView((s) => COURT_THEMES[s.courtTheme])
  return (
    <group>
      {/* Área externa */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#3f4652" roughness={1} />
      </mesh>
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[HL * 2 + 3, HW * 2 + 3]} />
        <meshStandardMaterial color={theme.surround} roughness={0.95} />
      </mesh>
      {/* Piso de jogo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={onFloorClick}>
        <planeGeometry args={[HL * 2, HW * 2]} />
        <meshStandardMaterial color={theme.surface} roughness={0.9} />
      </mesh>
      <Lines />
      <Net />
      <Walls />
    </group>
  )
}
