import { useEffect, useState } from 'react'
import { FolderOpen, Save, Trash2, X } from 'lucide-react'
import { loadPlay, useEditor } from '../store'
import { loadLibrary, removeFromLibrary, saveToLibrary, type SavedPlay } from '../lib/storage'
import { toast } from '../lib/actions'

export function LibraryDialog({ onClose }: { onClose: () => void }) {
  const play = useEditor((s) => s.play)
  const [items, setItems] = useState<SavedPlay[]>(loadLibrary)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const saved = items.some((i) => i.id === play.id)

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" role="dialog" aria-label="Minhas jogadas" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Minhas jogadas</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <button
          className="primary-btn"
          onClick={() => {
            setItems(saveToLibrary(play))
            toast(saved ? 'Jogada atualizada' : 'Jogada salva')
          }}
        >
          <Save size={16} /> {saved ? 'Atualizar' : 'Salvar'} “{play.name}”
        </button>
        <p className="muted small">
          As jogadas ficam salvas neste navegador. Para usar em outro aparelho, use “Exportar arquivo” e importe lá.
        </p>
        {items.length === 0 ? (
          <p className="empty">Nenhuma jogada salva ainda.</p>
        ) : (
          <ul className="library-list">
            {items.map((item) => (
              <li key={item.id} className={item.id === play.id ? 'current' : ''}>
                <div>
                  <strong>{item.name}</strong>
                  <span className="muted small">
                    {item.play.steps.length} passo{item.play.steps.length > 1 ? 's' : ''} · {item.play.players.length} jogadores ·{' '}
                    {new Date(item.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <button
                  className="icon-btn"
                  title="Abrir"
                  aria-label={`Abrir ${item.name}`}
                  onClick={() => {
                    loadPlay(structuredClone(item.play))
                    onClose()
                  }}
                >
                  <FolderOpen size={17} />
                </button>
                <button
                  className="icon-btn danger"
                  title="Excluir"
                  aria-label={`Excluir ${item.name}`}
                  onClick={() => {
                    if (confirm(`Excluir a jogada "${item.name}"?`)) setItems(removeFromLibrary(item.id))
                  }}
                >
                  <Trash2 size={17} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
