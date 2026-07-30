import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CopilotAnswer, ExplainabilityFooter, QuestionChips } from '../components/CopilotAnswer'
import { SUGGESTED_QUESTIONS } from '../mock/copilotAnswer'
import { useCopilot } from '../state/copilotStore'

/**
 * Copiloto em drawer.
 *
 * Mostra exatamente a mesma resposta da tela cheia — mesmo componente, mesma
 * fonte — em coluna única. O campo livre segue desabilitado com o rótulo da
 * fase: prometer escrita livre que não existe seria a única coisa pior que não
 * ter copiloto nenhum.
 */
export function CopilotDrawer() {
  const { isOpen, close } = useCopilot()
  const [askedId, setAskedId] = useState<string | null>('canonical')
  const asked = SUGGESTED_QUESTIONS.find((question) => question.id === askedId) ?? null

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
      <div className="flex-1 bg-slate-900/30" onClick={close} role="presentation" aria-hidden />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Copiloto"
        className="flex w-full max-w-xl flex-col border-l border-surface-border bg-surface-app shadow-xl"
      >
        <header className="flex items-center justify-between border-b border-surface-border bg-surface-card px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Copiloto</h2>
            <p className="mt-0.5 text-delta text-neutral">
              Pergunta que atravessa os quatro produtos
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/copiloto"
              onClick={close}
              className="text-delta font-medium underline"
              style={{ color: 'var(--product-accent)' }}
            >
              Abrir em tela cheia
            </Link>
            <button
              type="button"
              onClick={close}
              aria-label="Fechar copiloto"
              className="flex h-8 w-8 items-center justify-center rounded-control text-neutral hover:bg-slate-50"
            >
              <span aria-hidden>✕</span>
            </button>
          </div>
        </header>

        <div className="border-b border-surface-border bg-surface-card px-5 py-4">
          <QuestionChips selectedId={askedId} onSelect={setAskedId} />

          <label htmlFor="copilot-question-drawer" className="sr-only">
            Pergunta
          </label>
          <textarea
            id="copilot-question-drawer"
            rows={2}
            disabled
            placeholder="Escrita livre — Fase 2"
            className="mt-3 w-full resize-none rounded-control border border-surface-border bg-slate-50 p-3 text-delta-lg text-slate-700 placeholder:text-neutral"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {asked?.answered ? (
            <CopilotAnswer compact />
          ) : (
            <p className="text-delta-lg text-neutral">
              Esta pergunta entra na Fase 2. Selecione a pergunta canônica para ver a resposta
              montada com dado real.
            </p>
          )}
        </div>

        <div className="border-t border-surface-border bg-surface-card p-5">
          <ExplainabilityFooter />
        </div>
      </aside>
    </div>
  )
}
