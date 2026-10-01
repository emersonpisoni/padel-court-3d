import { useEffect } from 'react'
import { Scene } from './scene/Scene'
import { TopBar } from './ui/TopBar'
import { ToolDock } from './ui/ToolDock'
import { SidePanel } from './ui/SidePanel'
import { Timeline } from './ui/Timeline'
import { deleteSelection, goToStep, redo, setTool, togglePlay, undo, useEditor, usePlayback, useView } from './store'
import { CAMERA_PRESETS, goToPreset, zoom } from './lib/camera'
import { toggleFullscreen, useToast } from './lib/actions'

const HINTS = {
  select: 'Arraste jogadores, cones e pontos da bola. Gire a quadra arrastando o fundo; zoom com a roda ou pinça.',
  ball: 'Clique no chão (quique), no vidro (parede) ou num jogador (golpe) para traçar a bola.',
  marker: 'Clique na quadra para colocar cones ou alvos.',
}

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('input, textarea, select, [contenteditable]')) return
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
        return
      }
      if (mod || e.altKey) return
      const preset = CAMERA_PRESETS.find((p) => p.key === e.key)
      if (preset) return goToPreset(preset.id)
      switch (e.key) {
        case ' ':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowLeft':
          goToStep(useEditor.getState().stepIndex - 1)
          break
        case 'ArrowRight':
          goToStep(useEditor.getState().stepIndex + 1)
          break
        case 'Delete':
        case 'Backspace':
          deleteSelection()
          break
        case 'Escape':
          useEditor.setState({ selection: null })
          setTool('select')
          break
        case 'v':
        case 'V':
          setTool('select')
          break
        case 'b':
        case 'B':
          setTool('ball')
          break
        case 'm':
        case 'M':
          setTool('marker')
          break
        case 'f':
        case 'F':
          toggleFullscreen()
          break
        case '+':
        case '=':
          zoom(3)
          break
        case '-':
          zoom(-3)
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

function NoteOverlay() {
  const show = useView((s) => s.showNotes)
  const note = useEditor((s) => s.play.steps[s.stepIndex].note)
  const stepIndex = useEditor((s) => s.stepIndex)
  const total = useEditor((s) => s.play.steps.length)
  if (!show || !note) return null
  return (
    <div className="note-overlay">
      <span className="step-tag">
        Passo {stepIndex + 1}/{total}
      </span>
      {note}
    </div>
  )
}

function Toast() {
  const { message, kind } = useToast()
  if (!message) return null
  return (
    <div className={`toast ${kind}`} role="status">
      {message}
    </div>
  )
}

export default function App() {
  useShortcuts()
  const tool = useEditor((s) => s.tool)
  const playing = usePlayback((s) => s.playing)

  return (
    <div className="app">
      <TopBar />
      <div className="main">
        <div className={`viewport tool-${tool}`}>
          <Scene />
          <ToolDock />
          {!playing && <div className="hint">{HINTS[tool]}</div>}
          <NoteOverlay />
          <Toast />
        </div>
        <SidePanel />
      </div>
      <Timeline />
    </div>
  )
}
