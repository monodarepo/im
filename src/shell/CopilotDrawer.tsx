import { useEffect } from 'react'
import { FutureButton } from '../components/FutureButton'
import { useCopilot } from '../state/copilotStore'

/**
 * Casca do copiloto: campo de pergunta, área de resposta e rodapé de
 * explicabilidade. Sem lógica nesta fase — o campo fica desabilitado para não
 * prometer uma resposta que ainda não existe.
 */
export function CopilotDrawer() {
  const { isOpen, close } = useCopilot()

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, close])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="flex-1 bg-slate-900/30"
        onClick={close}
        role="presentation"
        aria-hidden
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Copiloto"
        className="flex w-full max-w-md flex-col border-l border-surface-border bg-surface-card shadow-xl"
      >
        <header className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Copiloto</h2>
            <p className="mt-0.5 text-delta text-neutral">
              Pergunte sobre os números desta tela
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Fechar copiloto"
            className="flex h-8 w-8 items-center justify-center rounded-control text-neutral hover:bg-slate-50"
          >
            <span aria-hidden>✕</span>
          </button>
        </header>

        <div className="border-b border-surface-border p-5">
          <label htmlFor="copilot-question" className="sr-only">
            Pergunta
          </label>
          <textarea
            id="copilot-question"
            rows={3}
            disabled
            placeholder="Ex.: por que a participação caiu no canal farma independente?"
            className="w-full resize-none rounded-control border border-surface-border bg-slate-50 p-3 text-delta-lg text-slate-700 placeholder:text-neutral"
          />
          <div className="mt-3">
            <FutureButton label="Perguntar" phase="Fase 2" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-delta-lg text-neutral">
            As respostas aparecem aqui, sempre com os números que as sustentam e a decisão que
            propõem.
          </p>
        </div>

        <footer className="border-t border-surface-border px-5 py-4 text-delta text-neutral">
          Toda resposta cita as fontes consultadas, a data de referência de cada número e o nível de
          confiança. Recomendação sempre vira uma Decisão rastreável.
        </footer>
      </aside>
    </div>
  )
}
