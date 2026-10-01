import { Box, Footprints, MousePointer2, RectangleHorizontal, Spline, Square, TrafficCone, ZoomIn, ZoomOut } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Tool } from '../types'
import { setTool, useEditor } from '../store'
import { goToPreset, zoom, type CameraPreset } from '../lib/camera'
import { IconButton } from './IconButton'

const TOOLS: { id: Tool; label: string; icon: LucideIcon; key: string }[] = [
  { id: 'select', label: 'Mover jogadores e objetos', icon: MousePointer2, key: 'V' },
  { id: 'ball', label: 'Desenhar trajetória da bola', icon: Spline, key: 'B' },
  { id: 'marker', label: 'Colocar cones e alvos', icon: TrafficCone, key: 'M' },
]

const VIEWS: { id: CameraPreset; label: string; icon: LucideIcon; key: string }[] = [
  { id: '3d', label: 'Visão 3D', icon: Box, key: '1' },
  { id: 'top', label: 'De cima', icon: Square, key: '2' },
  { id: 'side', label: 'Lateral', icon: RectangleHorizontal, key: '3' },
  { id: 'behindA', label: 'Atrás do time A', icon: Footprints, key: '4' },
]

export function ToolDock() {
  const tool = useEditor((s) => s.tool)
  return (
    <div className="dock">
      <div className="dock-group">
        {TOOLS.map((t) => (
          <IconButton key={t.id} icon={t.icon} label={`${t.label} (${t.key})`} active={tool === t.id} onClick={() => setTool(t.id)} />
        ))}
      </div>
      <div className="dock-group">
        {VIEWS.map((v) => (
          <IconButton key={v.id} icon={v.icon} label={`${v.label} (${v.key})`} onClick={() => goToPreset(v.id)} />
        ))}
        <IconButton
          icon={Footprints}
          className="flip"
          label="Atrás do time B (5)"
          onClick={() => goToPreset('behindB')}
        />
      </div>
      <div className="dock-group">
        <IconButton icon={ZoomIn} label="Aproximar (+)" onClick={() => zoom(3)} />
        <IconButton icon={ZoomOut} label="Afastar (−)" onClick={() => zoom(-3)} />
      </div>
    </div>
  )
}
