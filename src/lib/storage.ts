import type { Play } from '../types'

const CURRENT_KEY = 'padel3d.current'
const LIBRARY_KEY = 'padel3d.library'

export interface SavedPlay {
  id: string
  name: string
  updatedAt: number
  play: Play
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // armazenamento indisponível (aba anônima, cota cheia): segue sem salvar
  }
}

export const loadCurrentPlay = () => read<Play>(CURRENT_KEY)
export const saveCurrentPlay = (play: Play) => write(CURRENT_KEY, play)

export const loadLibrary = () => read<SavedPlay[]>(LIBRARY_KEY) ?? []

export function saveToLibrary(play: Play): SavedPlay[] {
  const library = loadLibrary().filter((p) => p.id !== play.id)
  const next = [{ id: play.id, name: play.name, updatedAt: Date.now(), play }, ...library]
  write(LIBRARY_KEY, next)
  return next
}

export function removeFromLibrary(id: string): SavedPlay[] {
  const next = loadLibrary().filter((p) => p.id !== id)
  write(LIBRARY_KEY, next)
  return next
}

export function isPlay(value: unknown): value is Play {
  const v = value as Play
  return !!v && typeof v === 'object' && Array.isArray(v.players) && Array.isArray(v.steps) && v.steps.length > 0
}

export function downloadFile(filename: string, content: string | Blob, type = 'application/json') {
  const blob = typeof content === 'string' ? new Blob([content], { type }) : content
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function slugify(text: string) {
  return (
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'jogada'
  )
}
