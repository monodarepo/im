import { Link, useLocation } from 'react-router-dom'
import { CURRENT_PERSONA } from '../domain/persona'
import { formatInteger } from '../domain/format'
import { SEMANTIC } from '../design/tokens'
import { countBySeverity } from '../mock/notifications'
import { resolveRoute } from '../routes/registry'
import { activeFilters, FILTER_LABEL, useFilters } from '../state/filtersStore'
import { useCopilot } from '../state/copilotStore'

export function Header() {
  const { pathname } = useLocation()
  const route = resolveRoute(pathname)
  const declared = route?.filters ?? []

  const filters = useFilters()
  const openCopilot = useCopilot((state) => state.open)
  const pills = activeFilters(filters, declared)
  const criticalAlerts = countBySeverity('critical')

  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-surface-border bg-surface-card px-6 py-3">
      <span
        className="rounded-control px-3 py-1.5 text-delta-lg font-medium text-white"
        style={{ backgroundColor: 'var(--product-accent)' }}
      >
        Filtros
      </span>

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {pills.map((pill) => (
          <span
            key={pill.id}
            className="inline-flex items-center gap-1.5 rounded-control border border-surface-border bg-slate-50 px-2.5 py-1 text-delta text-slate-700"
          >
            <span className="text-neutral">{FILTER_LABEL[pill.id]}:</span>
            <span className="font-medium">{pill.summary}</span>
          </span>
        ))}
        {pills.length === 0 ? (
          <span className="text-delta text-neutral">Nenhum filtro ativo nesta tela</span>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={openCopilot}
          title="Copiloto (Ctrl+K)"
          className="rounded-control border border-surface-border px-3 py-1.5 text-delta-lg font-medium text-slate-700 hover:bg-slate-50"
        >
          Copiloto
          <kbd className="ml-2 rounded-sm bg-slate-100 px-1.5 py-0.5 text-delta font-sans text-neutral">
            Ctrl K
          </kbd>
        </button>

        <Link
          to="/notificacoes"
          aria-label={`Notificações — ${formatInteger(criticalAlerts)} alertas críticos`}
          title="Central de Notificações"
          className="relative flex h-8 w-8 items-center justify-center rounded-control border border-surface-border bg-surface-card text-slate-600 hover:bg-slate-50"
        >
          <span aria-hidden>🔔</span>
          {criticalAlerts > 0 ? (
            <span
              aria-hidden
              className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white"
              style={{ backgroundColor: SEMANTIC.negative }}
            >
              {formatInteger(criticalAlerts)}
            </span>
          ) : null}
        </Link>

        <button
          type="button"
          disabled
          aria-label="Ajuda — Fase 2"
          title="Ajuda — Fase 2"
          className="flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-control border border-surface-border bg-surface-card text-slate-300"
        >
          <span aria-hidden>?</span>
        </button>

        <span
          className="flex h-8 w-8 items-center justify-center rounded-full text-delta font-semibold text-white"
          style={{ backgroundColor: 'var(--product-accent)' }}
          title={CURRENT_PERSONA.name}
        >
          {CURRENT_PERSONA.initials}
        </span>
      </div>
    </header>
  )
}
