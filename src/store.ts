import { create } from 'zustand'
import type {
  BallPoint,
  BallPointKind,
  CourtTheme,
  MarkerKind,
  Play,
  Player,
  Selection,
  Step,
  Team,
  Tool,
  Vec2,
} from './types'
import { defaultPosition, FORMATIONS } from './lib/formations'
import { loadCurrentPlay, saveCurrentPlay } from './lib/storage'

// crypto.randomUUID só existe em contexto seguro; o app pode ser aberto via IP da rede local (http)
export const uid = () => Math.random().toString(36).slice(2, 10)

const HISTORY_LIMIT = 100

export const DEFAULT_TEAM_COLORS: Record<Team, string> = { A: '#ef4444', B: '#f59e0b' }

function makeStep(positions: Record<string, Vec2>, ball: BallPoint[] = [], note = ''): Step {
  return { id: uid(), positions, ball, note }
}

function ballPoint(kind: BallPointKind, x: number, y: number, z: number, arc = 0): BallPoint {
  return { id: uid(), kind, x, y, z, arc }
}

/** Jogada de exemplo: saque + resposta, para o professor já ver como funciona. */
export function createExamplePlay(): Play {
  const players: Player[] = [
    { id: uid(), team: 'A', label: 'A1', name: '' },
    { id: uid(), team: 'A', label: 'A2', name: '' },
    { id: uid(), team: 'B', label: 'B1', name: '' },
    { id: uid(), team: 'B', label: 'B2', name: '' },
  ]
  const serve = FORMATIONS[0].positions
  const pos1: Record<string, Vec2> = {}
  players.forEach((p, i) => (pos1[p.id] = { ...serve[i] }))
  const pos2: Record<string, Vec2> = {
    ...pos1,
    [players[0].id]: { x: -3.2, z: 2.3 },
    [players[2].id]: { x: 7.6, z: -2.5 },
  }
  return {
    id: uid(),
    name: 'Saque e subida à rede',
    players,
    markers: [],
    teamColors: { ...DEFAULT_TEAM_COLORS },
    steps: [
      makeStep(
        pos1,
        [
          ballPoint('hit', -9.1, 0.8, 1.5),
          ballPoint('bounce', 5, 0, -2.2, 1.0),
          ballPoint('hit', 8.4, 0.9, -2.5, 0.8),
        ],
        'A1 saca na diagonal. A2 já fica posicionado na rede.',
      ),
      makeStep(
        pos2,
        [
          ballPoint('hit', 8.4, 0.9, -2.5),
          ballPoint('hit', -3, 1.1, 2.0, 1.1),
          ballPoint('bounce', 6.3, 0, 3.6, 0.35),
        ],
        'Após o saque, A1 sobe à rede e voleia cruzado, buscando o ângulo.',
      ),
    ],
  }
}

export function createEmptyPlay(): Play {
  return {
    id: uid(),
    name: 'Nova jogada',
    players: [],
    markers: [],
    teamColors: { ...DEFAULT_TEAM_COLORS },
    steps: [makeStep({})],
  }
}

interface EditorState {
  play: Play
  stepIndex: number
  selection: Selection | null
  tool: Tool
  ballKind: Exclude<BallPointKind, 'wall'>
  markerKind: MarkerKind
  defaultArc: number
  dragging: boolean
  past: Play[]
  future: Play[]
}

export const useEditor = create<EditorState>(() => ({
  play: loadCurrentPlay() ?? createExamplePlay(),
  stepIndex: 0,
  selection: null,
  tool: 'select',
  ballKind: 'bounce',
  markerKind: 'cone',
  defaultArc: 1.2,
  dragging: false,
  past: [],
  future: [],
}))

// Salva automaticamente a jogada atual
let saveTimer: ReturnType<typeof setTimeout> | undefined
useEditor.subscribe((s, prev) => {
  if (s.play === prev.play) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => saveCurrentPlay(s.play), 300)
})

// ---------- edição com histórico ----------

/** Aplica uma alteração na jogada. `record: false` não cria entrada no histórico (usado durante arrastes). */
export function edit(fn: (draft: Play) => void, record = true) {
  useEditor.setState((s) => {
    const draft = structuredClone(s.play)
    fn(draft)
    return record
      ? { play: draft, past: [...s.past, s.play].slice(-HISTORY_LIMIT), future: [] }
      : { play: draft }
  })
}

/** Marca o início de um arraste: guarda o estado atual para poder desfazer. */
export function beginDrag() {
  useEditor.setState((s) => ({ dragging: true, past: [...s.past, s.play].slice(-HISTORY_LIMIT), future: [] }))
  usePlayback.setState({ playing: false, t: 1 })
}

export function endDrag() {
  useEditor.setState({ dragging: false })
}

export function undo() {
  useEditor.setState((s) => {
    const prev = s.past[s.past.length - 1]
    if (!prev) return s
    return { play: prev, past: s.past.slice(0, -1), future: [s.play, ...s.future], ...fixIndices(prev, s) }
  })
}

export function redo() {
  useEditor.setState((s) => {
    const next = s.future[0]
    if (!next) return s
    return { play: next, past: [...s.past, s.play], future: s.future.slice(1), ...fixIndices(next, s) }
  })
}

function fixIndices(play: Play, s: EditorState) {
  return { stepIndex: Math.min(s.stepIndex, play.steps.length - 1), selection: null }
}

export function loadPlay(play: Play) {
  useEditor.setState({ play, stepIndex: 0, selection: null, past: [], future: [] })
  usePlayback.setState({ playing: false, t: 1 })
}

export const currentStep = (s: EditorState = useEditor.getState()) => s.play.steps[s.stepIndex]

const stepDraft = (draft: Play) => draft.steps[useEditor.getState().stepIndex]

export function select(selection: Selection | null) {
  useEditor.setState({ selection })
}

export function setTool(tool: Tool) {
  useEditor.setState({ tool, selection: null })
}

// ---------- jogadores ----------

export function addPlayer(team: Team) {
  const { play } = useEditor.getState()
  const sameTeam = play.players.filter((p) => p.team === team)
  const used = new Set(sameTeam.map((p) => p.label))
  let n = 1
  while (used.has(`${team}${n}`)) n++
  const player: Player = { id: uid(), team, label: `${team}${n}`, name: '' }
  const pos = defaultPosition(team, sameTeam.length)
  edit((d) => {
    d.players.push(player)
    d.steps.forEach((st) => (st.positions[player.id] = { ...pos }))
  })
  select({ type: 'player', id: player.id })
}

export function removePlayer(id: string) {
  edit((d) => {
    d.players = d.players.filter((p) => p.id !== id)
    d.steps.forEach((st) => delete st.positions[id])
  })
  select(null)
}

export function updatePlayer(id: string, patch: Partial<Pick<Player, 'name' | 'label' | 'team'>>) {
  edit((d) => {
    const p = d.players.find((pl) => pl.id === id)
    if (p) Object.assign(p, patch)
  })
}

export function movePlayer(id: string, pos: Vec2) {
  edit((d) => {
    stepDraft(d).positions[id] = pos
  }, false)
}

/** Aplica uma formação no passo atual (cria os 4 jogadores se ainda não existirem). */
export function applyFormation(formationId: string) {
  const formation = FORMATIONS.find((f) => f.id === formationId)
  if (!formation) return
  edit((d) => {
    const order: Team[] = ['A', 'A', 'B', 'B']
    const byTeam = { A: d.players.filter((p) => p.team === 'A'), B: d.players.filter((p) => p.team === 'B') }
    const counters = { A: 0, B: 0 }
    order.forEach((team, i) => {
      let player = byTeam[team][counters[team]]
      counters[team]++
      if (!player) {
        player = { id: uid(), team, label: `${team}${counters[team]}`, name: '' }
        d.players.push(player)
        d.steps.forEach((st) => (st.positions[player.id] = { ...formation.positions[i] }))
      }
      stepDraft(d).positions[player.id] = { ...formation.positions[i] }
    })
  })
}

// ---------- bola ----------

export function addBallPoint(kind: BallPointKind, x: number, y: number, z: number) {
  const { defaultArc } = useEditor.getState()
  const point = ballPoint(kind, x, y, z, defaultArc)
  edit((d) => {
    stepDraft(d).ball.push(point)
  })
  select({ type: 'ball', id: point.id })
}

export function updateBallPoint(id: string, patch: Partial<Omit<BallPoint, 'id'>>, record = true) {
  edit((d) => {
    const p = stepDraft(d).ball.find((b) => b.id === id)
    if (p) Object.assign(p, patch)
  }, record)
}

export function removeBallPoint(id: string) {
  edit((d) => {
    const st = stepDraft(d)
    st.ball = st.ball.filter((b) => b.id !== id)
  })
  select(null)
}

export function clearBall() {
  edit((d) => {
    stepDraft(d).ball = []
  })
  select(null)
}

// ---------- marcadores ----------

export function addMarker(kind: MarkerKind, x: number, z: number) {
  const id = uid()
  edit((d) => {
    d.markers.push({ id, kind, x, z })
  })
  select({ type: 'marker', id })
}

export function moveMarker(id: string, pos: Vec2) {
  edit((d) => {
    const m = d.markers.find((mk) => mk.id === id)
    if (m) Object.assign(m, pos)
  }, false)
}

export function removeMarker(id: string) {
  edit((d) => {
    d.markers = d.markers.filter((m) => m.id !== id)
  })
  select(null)
}

// ---------- passos ----------

export function goToStep(index: number) {
  const { play } = useEditor.getState()
  if (index < 0 || index >= play.steps.length) return
  useEditor.setState({ stepIndex: index, selection: null })
  usePlayback.setState({ playing: false, t: 1 })
}

/** Novo passo após o atual: mantém as posições e começa a bola de onde ela parou. */
export function addStep() {
  const { stepIndex, play } = useEditor.getState()
  const cur = play.steps[stepIndex]
  const last = cur.ball[cur.ball.length - 1]
  const ball = last ? [{ ...last, id: uid(), arc: 0 }] : []
  edit((d) => {
    d.steps.splice(stepIndex + 1, 0, makeStep(structuredClone(cur.positions), ball))
  })
  goToStep(stepIndex + 1)
}

export function duplicateStep() {
  const { stepIndex, play } = useEditor.getState()
  const copy = structuredClone(play.steps[stepIndex])
  copy.id = uid()
  copy.ball.forEach((b) => (b.id = uid()))
  edit((d) => {
    d.steps.splice(stepIndex + 1, 0, copy)
  })
  goToStep(stepIndex + 1)
}

export function removeStep() {
  const { stepIndex, play } = useEditor.getState()
  if (play.steps.length <= 1) return
  edit((d) => {
    d.steps.splice(stepIndex, 1)
  })
  goToStep(Math.max(0, stepIndex - 1))
}

export function moveStep(dir: -1 | 1) {
  const { stepIndex, play } = useEditor.getState()
  const target = stepIndex + dir
  if (target < 0 || target >= play.steps.length) return
  edit((d) => {
    const [st] = d.steps.splice(stepIndex, 1)
    d.steps.splice(target, 0, st)
  })
  goToStep(target)
}

export function setStepNote(note: string) {
  edit((d) => {
    stepDraft(d).note = note
  })
}

/** Remove o item selecionado (tecla Delete). */
export function deleteSelection() {
  const { selection } = useEditor.getState()
  if (!selection) return
  if (selection.type === 'player') removePlayer(selection.id)
  else if (selection.type === 'ball') removeBallPoint(selection.id)
  else removeMarker(selection.id)
}

// ---------- reprodução ----------

interface PlaybackState {
  playing: boolean
  /** Progresso no passo atual, de 0 a 1. Parado = 1 (posições finais do passo). */
  t: number
  speed: number
  loop: boolean
  /** Ao terminar um passo, segue para o próximo. */
  playAll: boolean
}

export const usePlayback = create<PlaybackState>(() => ({
  playing: false,
  t: 1,
  speed: 1,
  loop: false,
  playAll: true,
}))

export function togglePlay() {
  const { playing, t } = usePlayback.getState()
  if (playing) {
    usePlayback.setState({ playing: false })
    return
  }
  const { stepIndex, play } = useEditor.getState()
  // Se já estava no fim do último passo e reproduzindo tudo, recomeça do início
  if (t >= 1 && usePlayback.getState().playAll && stepIndex === play.steps.length - 1 && play.steps.length > 1) {
    useEditor.setState({ stepIndex: 0, selection: null })
  }
  usePlayback.setState({ playing: true, t: t >= 1 ? 0 : t })
}

// ---------- preferências de exibição ----------

interface ViewState {
  courtTheme: CourtTheme
  showMovement: boolean
  showTrajectory: boolean
  showLabels: boolean
  showNotes: boolean
  panelOpen: boolean
}

const VIEW_KEY = 'padel3d.view'

function loadView(): Partial<ViewState> {
  try {
    return JSON.parse(localStorage.getItem(VIEW_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export const useView = create<ViewState>(() => ({
  courtTheme: 'blue',
  showMovement: true,
  showTrajectory: true,
  showLabels: true,
  showNotes: true,
  panelOpen: typeof window === 'undefined' || window.innerWidth > 820,
  ...loadView(),
}))

useView.subscribe((s) => {
  try {
    localStorage.setItem(VIEW_KEY, JSON.stringify(s))
  } catch {
    // ignora
  }
})
