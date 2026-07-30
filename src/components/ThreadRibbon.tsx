import { Link } from 'react-router-dom'
import {
  nextThreadStep,
  previousThreadStep,
  THREAD_STEPS,
  threadPosition,
  threadStep,
  type ThreadStepId,
} from '../mock/thread'

/**
 * Faixa do fio condutor Losartana (seção 8.3).
 *
 * Aparece nas nove etapas do fluxo com a mesma anatomia: onde estamos, o que
 * esta etapa faz e o clique óbvio para a próxima. É o corrimão da demonstração
 * — quem apresenta nunca precisa lembrar a rota seguinte de cabeça.
 */
export function ThreadRibbon({ step }: { step: ThreadStepId }) {
  const current = threadStep(step)
  const previous = previousThreadStep(step)
  const next = nextThreadStep(step)
  const position = threadPosition(step)

  return (
    <nav
      aria-label="Fio condutor Losartana"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card border border-surface-border bg-surface-card px-4 py-2.5"
    >
      <span className="inline-flex items-center gap-2">
        <span
          className="rounded-control px-2 py-0.5 text-delta font-semibold text-white"
          style={{ backgroundColor: 'var(--product-accent)' }}
        >
          Fio Losartana
        </span>
        <span className="text-delta tabular-nums text-neutral">
          etapa {position} de {THREAD_STEPS.length}
        </span>
        <span className="text-delta-lg font-medium text-slate-900">{current.stage}</span>
      </span>

      <span className="hidden min-w-0 flex-1 text-delta text-neutral lg:block">
        {current.narrative}
      </span>

      <span className="ml-auto inline-flex items-center gap-3">
        {previous ? (
          <Link
            to={previous.route}
            className="text-delta font-medium underline"
            style={{ color: 'var(--product-accent)' }}
          >
            ← {previous.stage}
          </Link>
        ) : null}
        {current.alsoRoutes.map((also) => (
          <Link
            key={also.route}
            to={also.route}
            className="text-delta font-medium underline"
            style={{ color: 'var(--product-accent)' }}
          >
            {also.label}
          </Link>
        ))}
        {next ? (
          <Link
            to={next.route}
            className="rounded-control px-2.5 py-1 text-delta font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--product-accent)' }}
          >
            {next.stage}: {next.routeLabel} →
          </Link>
        ) : (
          <span className="text-delta font-medium text-neutral">Fim do fio — decisão APRENDIDA</span>
        )}
      </span>
    </nav>
  )
}
