// Sistema de coordenadas (metros):
//   x -> comprimento da quadra (-10 .. 10), rede em x = 0. Time A joga em x < 0, time B em x > 0.
//   z -> largura da quadra (-5 .. 5)
//   y -> altura

export type Team = 'A' | 'B'

export interface Vec2 {
  x: number
  z: number
}

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface Player {
  id: string
  team: Team
  label: string // ex.: "A1"
  name: string // ex.: "Joana" (opcional, pode ficar vazio)
}

/** Tipo de ponto da trajetória da bola. */
export type BallPointKind = 'hit' | 'bounce' | 'wall'

export interface BallPoint extends Vec3 {
  id: string
  kind: BallPointKind
  /** Altura extra (pico da parábola) do segmento que CHEGA neste ponto. Ignorado no primeiro ponto. */
  arc: number
}

export type MarkerKind = 'cone' | 'target'

export interface Marker extends Vec2 {
  id: string
  kind: MarkerKind
}

/** Um "passo" (quadro) da jogada: posições dos jogadores + trajetória da bola + anotação. */
export interface Step {
  id: string
  positions: Record<string, Vec2>
  ball: BallPoint[]
  note: string
}

export interface Play {
  id: string
  name: string
  players: Player[]
  markers: Marker[]
  steps: Step[]
  teamColors: Record<Team, string>
}

export type Tool = 'select' | 'ball' | 'marker'

export type Selection =
  | { type: 'player'; id: string }
  | { type: 'ball'; id: string }
  | { type: 'marker'; id: string }

export type CourtTheme = 'blue' | 'green' | 'terracotta' | 'purple'
