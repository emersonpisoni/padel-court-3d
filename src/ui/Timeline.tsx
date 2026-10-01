import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Copy, Pause, Play, Plus, Repeat, SkipBack, SkipForward, StickyNote, Trash2 } from 'lucide-react'
import {
  addStep,
  duplicateStep,
  goToStep,
  moveStep,
  removeStep,
  setStepNote,
  togglePlay,
  useEditor,
  usePlayback,
} from '../store'
import { IconButton } from './IconButton'

const SPEEDS = [0.25, 0.5, 1, 1.5, 2]

export function Timeline() {
  const steps = useEditor((s) => s.play.steps)
  const stepIndex = useEditor((s) => s.stepIndex)
  const { playing, t, speed, loop, playAll } = usePlayback()
  const note = steps[stepIndex].note
  const [draft, setDraft] = useState(note)

  useEffect(() => setDraft(note), [note, stepIndex])

  return (
    <footer className="timeline">
      <div className="transport">
        <IconButton icon={SkipBack} label="Passo anterior (←)" onClick={() => goToStep(stepIndex - 1)} disabled={stepIndex === 0} />
        <button className={`play-btn ${playing ? 'playing' : ''}`} onClick={togglePlay} aria-label={playing ? 'Pausar' : 'Reproduzir'} title="Reproduzir / pausar (Espaço)">
          {playing ? <Pause size={22} /> : <Play size={22} />}
        </button>
        <IconButton icon={SkipForward} label="Próximo passo (→)" onClick={() => goToStep(stepIndex + 1)} disabled={stepIndex === steps.length - 1} />
        <input
          className="scrub"
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={t}
          aria-label="Linha do tempo do passo"
          onChange={(e) => usePlayback.setState({ t: Number(e.target.value), playing: false })}
        />
        <select value={speed} aria-label="Velocidade" title="Velocidade" onChange={(e) => usePlayback.setState({ speed: Number(e.target.value) })}>
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}×
            </option>
          ))}
        </select>
        <label className="toggle compact" title="Ao terminar um passo, segue para o próximo">
          <input type="checkbox" checked={playAll} onChange={(e) => usePlayback.setState({ playAll: e.target.checked })} />
          Todos os passos
        </label>
        <IconButton icon={Repeat} label="Repetir" active={loop} onClick={() => usePlayback.setState({ loop: !loop })} />
      </div>

      <div className="steps-row">
        <div className="steps" role="tablist" aria-label="Passos da jogada">
          {steps.map((st, i) => (
            <button
              key={st.id}
              role="tab"
              aria-selected={i === stepIndex}
              className={`step-chip ${i === stepIndex ? 'active' : ''}`}
              onClick={() => goToStep(i)}
              title={st.note || `Passo ${i + 1}`}
            >
              {i + 1}
              {i === stepIndex && <span className="progress" style={{ width: `${t * 100}%` }} />}
            </button>
          ))}
          <IconButton icon={Plus} label="Novo passo (continua de onde a bola parou)" onClick={addStep} showLabel text="Passo" className="add-step" />
        </div>
        <div className="step-actions">
          <IconButton icon={ChevronLeft} label="Mover passo para trás" onClick={() => moveStep(-1)} disabled={stepIndex === 0} />
          <IconButton icon={ChevronRight} label="Mover passo para frente" onClick={() => moveStep(1)} disabled={stepIndex === steps.length - 1} />
          <IconButton icon={Copy} label="Duplicar passo" onClick={duplicateStep} />
          <IconButton icon={Trash2} label="Excluir passo" onClick={removeStep} disabled={steps.length === 1} className="danger" />
        </div>
      </div>

      <label className="note">
        <StickyNote size={16} />
        <input
          value={draft}
          placeholder={`Anotação do passo ${stepIndex + 1} — ex.: “Bandeja na paralela e subir à rede”`}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => draft !== note && setStepNote(draft)}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      </label>
    </footer>
  )
}
