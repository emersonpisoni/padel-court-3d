import type { Team, Vec2 } from '../types'

export interface Formation {
  id: string
  label: string
  description: string
  // posições na ordem [A1, A2, B1, B2]
  positions: [Vec2, Vec2, Vec2, Vec2]
}

export const FORMATIONS: Formation[] = [
  {
    id: 'serve',
    label: 'Saque',
    description: 'A1 saca, A2 na rede, B1 recebe na diagonal',
    positions: [
      { x: -9.3, z: 1.6 },
      { x: -2.8, z: -2.5 },
      { x: 8.6, z: -2.6 },
      { x: 5.5, z: 2.5 },
    ],
  },
  {
    id: 'net-vs-back',
    label: 'Rede × Fundo',
    description: 'Time A atacando na rede, time B defendendo no fundo',
    positions: [
      { x: -2.8, z: 2.5 },
      { x: -2.8, z: -2.5 },
      { x: 8, z: -2.5 },
      { x: 8, z: 2.5 },
    ],
  },
  {
    id: 'back-vs-back',
    label: 'Fundo × Fundo',
    description: 'As duas duplas defendendo no fundo',
    positions: [
      { x: -8, z: 2.5 },
      { x: -8, z: -2.5 },
      { x: 8, z: -2.5 },
      { x: 8, z: 2.5 },
    ],
  },
  {
    id: 'net-vs-net',
    label: 'Rede × Rede',
    description: 'Duelo de voleios',
    positions: [
      { x: -3, z: 2.5 },
      { x: -3, z: -2.5 },
      { x: 3, z: -2.5 },
      { x: 3, z: 2.5 },
    ],
  },
]

/** Posição padrão para um novo jogador do time. */
export function defaultPosition(team: Team, indexInTeam: number): Vec2 {
  const side = team === 'A' ? -1 : 1
  const z = indexInTeam % 2 === 0 ? 2.5 : -2.5
  const x = side * (7 - Math.floor(indexInTeam / 2) * 2)
  return { x, z: team === 'A' ? z : -z }
}
