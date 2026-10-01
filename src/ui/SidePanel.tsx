import { useEffect, useState } from 'react'
import { CircleDot, Eye, Palette, Plus, Spline, Target, TrafficCone, Trash2, Users } from 'lucide-react'
import type { BallPoint, BallPointKind, CourtTheme, Team } from '../types'
import {
  addPlayer,
  applyFormation,
  clearBall,
  currentStep,
  edit,
  removeBallPoint,
  removePlayer,
  select,
  setTool,
  updateBallPoint,
  updatePlayer,
  useEditor,
  useView,
} from '../store'
import { COURT_THEMES } from '../lib/court'
import { FORMATIONS } from '../lib/formations'
import { netCrossings, SHOT_PRESETS } from '../lib/trajectory'
import { playerView } from '../lib/camera'

type Tab = 'players' | 'ball' | 'court'

export function SidePanel() {
  const open = useView((s) => s.panelOpen)
  const selection = useEditor((s) => s.selection)
  const tool = useEditor((s) => s.tool)
  const [tab, setTab] = useState<Tab>('players')

  // Abre a aba certa conforme o que o professor está fazendo
  useEffect(() => {
    if (selection?.type === 'player') setTab('players')
    else if (selection?.type === 'ball') setTab('ball')
    else if (selection?.type === 'marker') setTab('court')
  }, [selection])
  useEffect(() => {
    if (tool === 'ball') setTab('ball')
    else if (tool === 'marker') setTab('court')
  }, [tool])

  if (!open) return null
  return (
    <aside className="panel">
      <nav className="tabs" role="tablist">
        <TabButton id="players" tab={tab} setTab={setTab} icon={<Users size={16} />} label="Jogadores" />
        <TabButton id="ball" tab={tab} setTab={setTab} icon={<Spline size={16} />} label="Bola" />
        <TabButton id="court" tab={tab} setTab={setTab} icon={<Palette size={16} />} label="Quadra" />
      </nav>
      <div className="panel-body">
        {tab === 'players' && <PlayersTab />}
        {tab === 'ball' && <BallTab />}
        {tab === 'court' && <CourtTab />}
      </div>
    </aside>
  )
}

function TabButton(props: { id: Tab; tab: Tab; setTab: (t: Tab) => void; icon: React.ReactNode; label: string }) {
  return (
    <button role="tab" aria-selected={props.tab === props.id} className={props.tab === props.id ? 'active' : ''} onClick={() => props.setTab(props.id)}>
      {props.icon}
      {props.label}
    </button>
  )
}

// ---------------- Jogadores ----------------

function PlayersTab() {
  const players = useEditor((s) => s.play.players)
  const teamColors = useEditor((s) => s.play.teamColors)
  const selection = useEditor((s) => s.selection)
  const positions = useEditor((s) => currentStep(s).positions)

  const setTeamColor = (team: Team, color: string) => edit((d) => void (d.teamColors[team] = color))

  return (
    <>
      <section>
        <h3>Adicionar</h3>
        <div className="row">
          {(['A', 'B'] as Team[]).map((team) => (
            <button key={team} className="team-btn" style={{ '--team': teamColors[team] } as React.CSSProperties} onClick={() => addPlayer(team)}>
              <Plus size={15} /> Time {team}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3>Formações prontas</h3>
        <p className="muted small">Posiciona os 4 jogadores no passo atual.</p>
        <div className="grid-2">
          {FORMATIONS.map((f) => (
            <button key={f.id} className="chip-btn" title={f.description} onClick={() => applyFormation(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3>Na quadra</h3>
        {players.length === 0 && <p className="empty">Nenhum jogador. Adicione acima ou escolha uma formação.</p>}
        <ul className="list">
          {players.map((p) => {
            const isSelected = selection?.type === 'player' && selection.id === p.id
            return (
              <li key={p.id} className={isSelected ? 'selected' : ''} onClick={() => select({ type: 'player', id: p.id })}>
                <span className="dot" style={{ background: teamColors[p.team] }} />
                <input
                  className="label-input"
                  value={p.label}
                  maxLength={4}
                  aria-label="Número"
                  onChange={(e) => updatePlayer(p.id, { label: e.target.value })}
                />
                <input
                  className="grow"
                  value={p.name}
                  placeholder="Nome do aluno"
                  aria-label="Nome do aluno"
                  onChange={(e) => updatePlayer(p.id, { name: e.target.value })}
                />
                <button
                  className="icon-btn"
                  title="Ver pelos olhos deste jogador"
                  aria-label="Ver pelos olhos deste jogador"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (positions[p.id]) playerView(positions[p.id])
                  }}
                >
                  <Eye size={16} />
                </button>
                <button
                  className="icon-btn danger"
                  title="Remover jogador"
                  aria-label="Remover jogador"
                  onClick={(e) => {
                    e.stopPropagation()
                    removePlayer(p.id)
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section>
        <h3>Cores dos times</h3>
        <div className="row">
          {(['A', 'B'] as Team[]).map((team) => (
            <label key={team} className="color-field">
              <input type="color" value={teamColors[team]} onChange={(e) => setTeamColor(team, e.target.value)} />
              Time {team}
            </label>
          ))}
        </div>
      </section>
    </>
  )
}

// ---------------- Bola ----------------

const KIND_LABEL: Record<BallPointKind, string> = { hit: 'Golpe', bounce: 'Quique no chão', wall: 'Batida na parede' }

function BallTab() {
  const tool = useEditor((s) => s.tool)
  const ballKind = useEditor((s) => s.ballKind)
  const defaultArc = useEditor((s) => s.defaultArc)
  const points = useEditor((s) => currentStep(s).ball)
  const selection = useEditor((s) => s.selection)
  const crossings = netCrossings(points)

  return (
    <>
      <section>
        {tool !== 'ball' ? (
          <button className="primary-btn" onClick={() => setTool('ball')}>
            <Spline size={16} /> Desenhar trajetória
          </button>
        ) : (
          <div className="hint-box">
            <strong>Desenhando.</strong> Clique no <b>chão</b> para um quique, no <b>vidro/alambrado</b> para a bola bater na parede ou
            em um <b>jogador</b> para o golpe dele. Arraste os pontos para ajustar.
          </div>
        )}
      </section>

      <section>
        <h3>Clique no chão adiciona</h3>
        <div className="segmented">
          <button className={ballKind === 'bounce' ? 'active' : ''} onClick={() => useEditor.setState({ ballKind: 'bounce' })}>
            Quique (chão)
          </button>
          <button className={ballKind === 'hit' ? 'active' : ''} onClick={() => useEditor.setState({ ballKind: 'hit' })}>
            Golpe (1 m)
          </button>
        </div>
        <h3>Tipo do próximo golpe</h3>
        <div className="grid-3">
          {SHOT_PRESETS.map((s) => (
            <button key={s.label} className={`chip-btn ${defaultArc === s.arc ? 'active' : ''}`} title={s.hint} onClick={() => useEditor.setState({ defaultArc: s.arc })}>
              {s.label}
            </button>
          ))}
        </div>
      </section>

      {crossings.length > 0 && (
        <section>
          {crossings.map((c) => (
            <div key={c.segment} className={`net-check ${c.clears ? 'ok' : 'bad'}`}>
              {c.clears
                ? `✓ Trecho ${c.segment}→${c.segment + 1} passa a rede com ${Math.round(c.margin * 100)} cm de folga`
                : `✗ Trecho ${c.segment}→${c.segment + 1} bate na rede — aumente a altura do arco`}
            </div>
          ))}
        </section>
      )}

      <section>
        <div className="section-head">
          <h3>Pontos da trajetória</h3>
          {points.length > 0 && (
            <button className="link-btn danger" onClick={clearBall}>
              Limpar
            </button>
          )}
        </div>
        {points.length === 0 && <p className="empty">Sem trajetória neste passo.</p>}
        <ol className="list points">
          {points.map((p, i) => (
            <BallPointRow key={p.id} point={p} index={i} selected={selection?.type === 'ball' && selection.id === p.id} />
          ))}
        </ol>
      </section>
    </>
  )
}

function BallPointRow({ point, index, selected }: { point: BallPoint; index: number; selected: boolean }) {
  return (
    <li className={selected ? 'selected' : ''} onClick={() => select({ type: 'ball', id: point.id })}>
      <div className="point-head">
        <span className={`badge kind-${point.kind}`}>{index + 1}</span>
        <select
          value={point.kind}
          aria-label="Tipo do ponto"
          onChange={(e) => {
            const kind = e.target.value as BallPointKind
            updateBallPoint(point.id, { kind, y: kind === 'bounce' ? 0 : point.y || 1 })
          }}
        >
          {(Object.keys(KIND_LABEL) as BallPointKind[]).map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
        <button
          className="icon-btn danger"
          aria-label="Remover ponto"
          title="Remover ponto"
          onClick={(e) => {
            e.stopPropagation()
            removeBallPoint(point.id)
          }}
        >
          <Trash2 size={15} />
        </button>
      </div>
      {point.kind !== 'bounce' && (
        <Slider label="Altura" unit="m" min={0.1} max={4} step={0.05} value={point.y} onChange={(y) => updateBallPoint(point.id, { y }, false)} />
      )}
      {index > 0 && (
        <Slider
          label="Arco até aqui"
          unit="m"
          min={0}
          max={7}
          step={0.1}
          value={point.arc}
          onChange={(arc) => updateBallPoint(point.id, { arc }, false)}
        />
      )}
    </li>
  )
}

/** Slider que grava UMA entrada no histórico por gesto, e não uma por pixel. */
function Slider(props: { label: string; unit: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <label className="slider">
      <span>{props.label}</span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onPointerDown={() => edit(() => {})}
        onKeyDown={() => edit(() => {})}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
      <output>
        {props.value.toFixed(1)} {props.unit}
      </output>
    </label>
  )
}

// ---------------- Quadra ----------------

function CourtTab() {
  const view = useView()
  const tool = useEditor((s) => s.tool)
  const markerKind = useEditor((s) => s.markerKind)
  const markers = useEditor((s) => s.play.markers)

  const toggles: { key: 'showMovement' | 'showTrajectory' | 'showLabels' | 'showNotes'; label: string }[] = [
    { key: 'showMovement', label: 'Setas de movimentação' },
    { key: 'showTrajectory', label: 'Trajetória da bola' },
    { key: 'showLabels', label: 'Nomes dos jogadores' },
    { key: 'showNotes', label: 'Anotação do passo na tela' },
  ]

  return (
    <>
      <section>
        <h3>Cor do piso</h3>
        <div className="swatches">
          {(Object.keys(COURT_THEMES) as CourtTheme[]).map((t) => (
            <button
              key={t}
              className={`swatch ${view.courtTheme === t ? 'active' : ''}`}
              style={{ background: COURT_THEMES[t].surface }}
              title={COURT_THEMES[t].label}
              aria-label={COURT_THEMES[t].label}
              onClick={() => useView.setState({ courtTheme: t })}
            />
          ))}
        </div>
      </section>

      <section>
        <h3>Mostrar</h3>
        {toggles.map((t) => (
          <label key={t.key} className="toggle">
            <input type="checkbox" checked={view[t.key]} onChange={(e) => useView.setState({ [t.key]: e.target.checked })} />
            {t.label}
          </label>
        ))}
      </section>

      <section>
        <h3>Cones e alvos</h3>
        <p className="muted small">Ficam iguais em todos os passos. Ótimos para treinar precisão.</p>
        <div className="segmented">
          <button
            className={tool === 'marker' && markerKind === 'cone' ? 'active' : ''}
            onClick={() => {
              useEditor.setState({ markerKind: 'cone' })
              setTool('marker')
            }}
          >
            <TrafficCone size={15} /> Cone
          </button>
          <button
            className={tool === 'marker' && markerKind === 'target' ? 'active' : ''}
            onClick={() => {
              useEditor.setState({ markerKind: 'target' })
              setTool('marker')
            }}
          >
            <Target size={15} /> Alvo
          </button>
        </div>
        {markers.length > 0 && (
          <button className="link-btn danger" onClick={() => edit((d) => void (d.markers = []))}>
            Remover todos ({markers.length})
          </button>
        )}
      </section>

      <section>
        <h3>Atalhos</h3>
        <dl className="shortcuts">
          <dt>V / B / M</dt>
          <dd>Mover · Bola · Cones</dd>
          <dt>Espaço</dt>
          <dd>Reproduzir / pausar</dd>
          <dt>← →</dt>
          <dd>Passo anterior / próximo</dd>
          <dt>1–5</dt>
          <dd>Ângulos de câmera</dd>
          <dt>Delete</dt>
          <dd>Remover selecionado</dd>
          <dt>Ctrl+Z</dt>
          <dd>Desfazer</dd>
          <dt>F</dt>
          <dd>Tela cheia</dd>
        </dl>
        <p className="muted small">
          <CircleDot size={12} /> Mouse: botão esquerdo gira, direito arrasta, roda dá zoom. No tablet: 1 dedo gira, 2 dedos zoom.
        </p>
      </section>
    </>
  )
}
