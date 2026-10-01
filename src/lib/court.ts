import type { CourtTheme } from '../types'

/** Medidas oficiais (FIP) em metros. */
export const COURT = {
  halfLength: 10,
  halfWidth: 5,
  serviceLineFromNet: 6.95,
  centerLineOverhang: 0.2,
  lineWidth: 0.05,
  netHeightCenter: 0.88,
  netHeightPost: 0.92,
  backGlassHeight: 3,
  backTotalHeight: 4,
  // Paredes laterais, a partir do fundo: 2 m de vidro com 3 m, depois 2 m de vidro com 2 m
  sideGlass1Length: 2,
  sideGlass1Height: 3,
  sideGlass2Length: 2,
  sideGlass2Height: 2,
  sideMeshHeight: 3,
} as const

/** Altura da rede no ponto z (desce linearmente dos postes até o centro). */
export function netHeightAt(z: number): number {
  const t = Math.min(1, Math.abs(z) / COURT.halfWidth)
  return COURT.netHeightCenter + (COURT.netHeightPost - COURT.netHeightCenter) * t
}

export const COURT_THEMES: Record<CourtTheme, { label: string; surface: string; surround: string }> = {
  blue: { label: 'Azul', surface: '#1f5fae', surround: '#163f73' },
  green: { label: 'Verde', surface: '#2f7d4f', surround: '#1f5536' },
  terracotta: { label: 'Saibro', surface: '#b4563a', surround: '#7d3a27' },
  purple: { label: 'Roxa', surface: '#5b3fa0', surround: '#3d2a6d' },
}

/** Limites onde jogadores/bola podem ficar (um pouco para dentro das paredes). */
export function clampToCourt(x: number, z: number, margin = 0.15) {
  return {
    x: Math.max(-COURT.halfLength + margin, Math.min(COURT.halfLength - margin, x)),
    z: Math.max(-COURT.halfWidth + margin, Math.min(COURT.halfWidth - margin, z)),
  }
}
