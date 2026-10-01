import { useEffect, useState } from 'react'
import {
  Camera,
  Download,
  FilePlus,
  Library,
  Maximize,
  Minimize,
  PanelRightClose,
  PanelRightOpen,
  Redo2,
  Undo2,
  Upload,
} from 'lucide-react'
import { createEmptyPlay, createExamplePlay, edit, loadPlay, redo, undo, useEditor, useView } from '../store'
import { exportPlay, importPlay, screenshot, toggleFullscreen } from '../lib/actions'
import { IconButton } from './IconButton'
import { LibraryDialog } from './LibraryDialog'

/** Só pergunta se a jogada atual foi alterada nesta sessão. */
function confirmDiscard() {
  if (useEditor.getState().past.length === 0) return true
  return confirm('Começar uma nova jogada? A atual será descartada — salve em "Minhas jogadas" antes, se quiser guardá-la.')
}

export function TopBar() {
  const name = useEditor((s) => s.play.name)
  const canUndo = useEditor((s) => s.past.length > 0)
  const canRedo = useEditor((s) => s.future.length > 0)
  const panelOpen = useView((s) => s.panelOpen)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [newMenu, setNewMenu] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [draftName, setDraftName] = useState(name)

  useEffect(() => setDraftName(name), [name])
  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const commitName = () => {
    const value = draftName.trim() || 'Jogada sem nome'
    if (value !== name) edit((d) => void (d.name = value))
    else setDraftName(value)
  }

  return (
    <header className="topbar">
      <div className="brand">
        <img src="/favicon.svg" alt="" width={26} height={26} />
        <span>
          Padel <b>3D</b>
        </span>
      </div>
      <input
        className="play-name"
        value={draftName}
        aria-label="Nome da jogada"
        onChange={(e) => setDraftName(e.target.value)}
        onBlur={commitName}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      <div className="topbar-actions">
        <IconButton icon={Undo2} label="Desfazer (Ctrl+Z)" onClick={undo} disabled={!canUndo} />
        <IconButton icon={Redo2} label="Refazer (Ctrl+Shift+Z)" onClick={redo} disabled={!canRedo} />
        <span className="sep" />
        <div className="menu-anchor">
          <IconButton icon={FilePlus} label="Nova jogada" onClick={() => setNewMenu((v) => !v)} />
          {newMenu && (
            <div className="menu" onMouseLeave={() => setNewMenu(false)}>
              <button
                onClick={() => {
                  if (confirmDiscard()) loadPlay(createEmptyPlay())
                  setNewMenu(false)
                }}
              >
                Quadra vazia
              </button>
              <button
                onClick={() => {
                  if (confirmDiscard()) loadPlay(createExamplePlay())
                  setNewMenu(false)
                }}
              >
                Jogada de exemplo
              </button>
            </div>
          )}
        </div>
        <IconButton icon={Library} label="Minhas jogadas" onClick={() => setLibraryOpen(true)} />
        <IconButton icon={Download} label="Exportar arquivo da jogada" onClick={exportPlay} className="hide-sm" />
        <IconButton icon={Upload} label="Importar arquivo de jogada" onClick={importPlay} className="hide-sm" />
        <IconButton icon={Camera} label="Salvar imagem (PNG)" onClick={screenshot} />
        <IconButton icon={fullscreen ? Minimize : Maximize} label="Tela cheia (F)" onClick={toggleFullscreen} />
        <IconButton
          icon={panelOpen ? PanelRightClose : PanelRightOpen}
          label={panelOpen ? 'Esconder painel' : 'Mostrar painel'}
          onClick={() => useView.setState({ panelOpen: !panelOpen })}
        />
      </div>
      {libraryOpen && <LibraryDialog onClose={() => setLibraryOpen(false)} />}
    </header>
  )
}
