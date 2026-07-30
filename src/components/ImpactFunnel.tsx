import { DataBadge } from './DataBadge'
import { SEMANTIC } from '../design/tokens'
import { formatMultiple, formatPercent } from '../domain/format'
import { formatMoney } from '../domain/money'
import {
  DEFAULT_FUNNEL_VIEW,
  FUNNEL_ATTESTATION,
  FUNNEL_STAGE_MEANING,
  FUNNEL_VIEW_FORMAT,
  FUNNEL_VIEW_LABEL,
  FUNNEL_VIEW_ORDER,
  funnelOf,
  type FunnelViewId,
} from '../mock/tower'

/**
 * Funil de impacto financeiro: Identificado → Aprovado → Em execução →
 * Realizado → Validado por Finanças.
 *
 * O seletor de visão troca a unidade da mesma cascata. A leitura que interessa
 * é a última barra: só o que Finanças valida no fechamento é auditável, e a
 * distância entre "Identificado" e "Validado" é a honestidade da plataforma
 * sobre si mesma.
 */
export function ImpactFunnel({
  view,
  onViewChange,
}: {
  view: FunnelViewId
  onViewChange: (view: FunnelViewId) => void
}) {
  const points = funnelOf(view)
  const format = FUNNEL_VIEW_FORMAT[view]
  const top = points[0]?.value ?? 1

  const render = (value: number) =>
    format === 'multiple' ? formatMultiple(value) : formatMoney(value)

  return (
    <div className="flex h-full flex-col">
      <div
        className="mb-4 flex flex-wrap gap-1"
        role="group"
        aria-label="Visão do funil de impacto"
      >
        {FUNNEL_VIEW_ORDER.map((option) => {
          const isActive = option === view
          return (
            <button
              key={option}
              type="button"
              onClick={() => onViewChange(option)}
              aria-pressed={isActive}
              className="rounded-control border px-2.5 py-1 text-delta font-medium transition-colors"
              style={
                isActive
                  ? {
                      backgroundColor: 'var(--product-accent)',
                      borderColor: 'var(--product-accent)',
                      color: '#FFFFFF',
                    }
                  : { borderColor: '#E2E8F0', color: '#475569' }
              }
            >
              {FUNNEL_VIEW_LABEL[option]}
            </button>
          )
        })}
      </div>

      <ol className="flex-1 space-y-3">
        {points.map((point, index) => {
          const width = top === 0 ? 0 : Math.max(8, (point.value / top) * 100)
          const isLast = index === points.length - 1

          return (
            <li key={point.stage}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-delta-lg font-medium text-slate-900">
                  <span className="mr-2 text-delta tabular-nums text-neutral">{index + 1}</span>
                  {point.label}
                </span>
                <span className="text-delta-lg font-semibold tabular-nums text-slate-900">
                  {render(point.value)}
                  {point.conversionPercent !== null ? (
                    <span className="ml-2 text-delta font-normal text-neutral">
                      {formatPercent(point.conversionPercent, 0)} do anterior
                    </span>
                  ) : null}
                </span>
              </div>

              <span className="mt-1 block h-3 w-full rounded-full bg-slate-100">
                <span
                  className="block h-3 rounded-full transition-all"
                  style={{
                    width: `${width}%`,
                    backgroundColor: isLast ? SEMANTIC.positive : '#64748B',
                  }}
                />
              </span>

              <p className="mt-1 text-delta text-neutral">{FUNNEL_STAGE_MEANING[point.stage]}</p>
            </li>
          )
        })}
      </ol>

      <div className="mt-4 border-t border-surface-border pt-3">
        <p className="text-delta-lg text-slate-700">
          De cada real identificado, {formatPercent(points[points.length - 1]?.shareOfIdentifiedPercent ?? 0, 0)}{' '}
          chega validado por Finanças.
        </p>
        <div className="mt-2">
          <DataBadge attestation={FUNNEL_ATTESTATION} />
        </div>
      </div>
    </div>
  )
}

export { DEFAULT_FUNNEL_VIEW }
