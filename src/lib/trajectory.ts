import type { BallPoint, Vec3 } from '../types'
import { netHeightAt } from './court'

export const BALL_RADIUS = 0.12 // desenhada maior que a real para ser vista de longe/no projetor
const REAL_BALL_RADIUS = 0.033
export const BALL_SPEED = 9 // m/s na velocidade 1x (mais lenta que a real, pensada para aula)

/** Ponto no segmento a -> b com uma parábola de pico `arc` acima da reta. */
export function segmentPoint(a: Vec3, b: Vec3, arc: number, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t + 4 * arc * t * (1 - t),
    z: a.z + (b.z - a.z) * t,
  }
}

const SAMPLES = 32

export function segmentLength(a: Vec3, b: Vec3, arc: number): number {
  let len = 0
  let prev = a
  for (let i = 1; i <= SAMPLES; i++) {
    const p = segmentPoint(a, b, arc, i / SAMPLES)
    len += Math.hypot(p.x - prev.x, p.y - prev.y, p.z - prev.z)
    prev = p
  }
  return len
}

/** Amostra a trajetória inteira como lista de pontos (para desenhar a linha). */
export function sampleTrajectory(points: BallPoint[]): Vec3[] {
  if (points.length < 2) return points.map((p) => ({ x: p.x, y: p.y, z: p.z }))
  const out: Vec3[] = [points[0]]
  for (let i = 1; i < points.length; i++) {
    for (let s = 1; s <= SAMPLES; s++) out.push(segmentPoint(points[i - 1], points[i], points[i].arc, s / SAMPLES))
  }
  return out
}

export function trajectoryLength(points: BallPoint[]): number {
  let len = 0
  for (let i = 1; i < points.length; i++) len += segmentLength(points[i - 1], points[i], points[i].arc)
  return len
}

/** Posição da bola em u ∈ [0, 1], proporcional à distância percorrida. */
export function trajectoryPosition(points: BallPoint[], u: number): Vec3 | null {
  if (points.length === 0) return null
  if (points.length === 1) return points[0]
  const lengths = points.slice(1).map((p, i) => segmentLength(points[i], p, p.arc))
  const total = lengths.reduce((s, l) => s + l, 0)
  if (total === 0) return points[0]
  let target = Math.max(0, Math.min(1, u)) * total
  for (let i = 0; i < lengths.length; i++) {
    if (target <= lengths[i] || i === lengths.length - 1) {
      const t = lengths[i] === 0 ? 1 : Math.min(1, target / lengths[i])
      return segmentPoint(points[i], points[i + 1], points[i + 1].arc, t)
    }
    target -= lengths[i]
  }
  return points[points.length - 1]
}

export interface NetCrossing {
  segment: number // índice do ponto de chegada
  point: Vec3
  clears: boolean
  margin: number // folga sobre a rede em metros (negativo = bateu na rede)
}

/** Onde a trajetória cruza a rede (x = 0) e se passa por cima dela. */
export function netCrossings(points: BallPoint[]): NetCrossing[] {
  const out: NetCrossing[] = []
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    if (a.x === b.x || Math.sign(a.x) === Math.sign(b.x)) continue
    const t = a.x / (a.x - b.x)
    const p = segmentPoint(a, b, b.arc, t)
    const margin = p.y - REAL_BALL_RADIUS - netHeightAt(p.z)
    out.push({ segment: i, point: p, clears: margin > 0, margin })
  }
  return out
}

/** Duração (s, a 1x) de um passo: o tempo da bola, com mínimo para o movimento dos jogadores. */
export function stepDuration(points: BallPoint[]): number {
  return Math.max(1.6, trajectoryLength(points) / BALL_SPEED)
}

/** Sugestão de "pico" de acordo com o tipo de golpe. */
export const SHOT_PRESETS: { label: string; arc: number; hint: string }[] = [
  { label: 'Reta', arc: 0.3, hint: 'Bola rápida e baixa (smash, voleio forte)' },
  { label: 'Normal', arc: 1.2, hint: 'Golpe de fundo padrão' },
  { label: 'Bandeja', arc: 0.8, hint: 'Golpe por cima, controlado' },
  { label: 'Globo', arc: 4.5, hint: 'Lob alto por cima dos adversários' },
  { label: 'Quique', arc: 1.0, hint: 'Subida após quicar no chão/vidro' },
]
