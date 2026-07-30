import { Link } from 'react-router-dom'
import { DataBadge } from '../../components/DataBadge'
import { KpiCard } from '../../components/KpiCard'
import { Panel } from '../../components/Panel'
import { SemanticDelta } from '../../components/SemanticDelta'
import { StateChip } from '../../components/StateChip'
import { formatInteger, formatPercent } from '../../domain/format'
import { formatMoney } from '../../domain/money'
import { SEMANTIC } from '../../design/tokens'
import { POTENTIAL_TIER_LABEL, SPECIALTY_LABEL } from '../../mock/doctors'
import {
  DAY_SUMMARY,
  doctorOf,
  NBA_ATTESTATION,
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  RECOMMENDATIONS,
  SUGGESTED_ACTIONS,
  TEAM_PERFORMANCE,
} from '../../mock/nba'
import { BASE_ROUTE, ROUTE_ALERTS, ROUTING_ATTESTATION } from '../../mock/routing'

function PanelLink({ to, children }: { to: string; children: string }) {
  return (
    <Link
      to={to}
      className="rounded-control px-2 py-1 text-delta font-medium transition-colors hover:bg-slate-50"
      style={{ color: 'var(--product-accent)' }}
    >
      {children} →
    </Link>
  )
}

export function GtmOverview() {
  const coverage = TEAM_PERFORMANCE.find((metric) => metric.id === 'coverage')
  const productive = TEAM_PERFORMANCE.find((metric) => metric.id === 'productive-visits')
  const conversion = TEAM_PERFORMANCE.find((metric) => metric.id === 'conversion')
  const incremental = TEAM_PERFORMANCE.find((metric) => metric.id === 'incremental-sellout')

  return (
    <div className="space-y-5">
      <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Visão geral do GTM
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Cobertura de médicos"
          value={formatPercent(coverage?.value ?? 0, 0)}
          comparison={`meta ${formatPercent(coverage?.target ?? 0, 0)}`}
          attestation={NBA_ATTESTATION}
        />
        <KpiCard
          label="Visitas produtivas"
          value={formatPercent(productive?.value ?? 0, 0)}
          comparison={`meta ${formatPercent(productive?.target ?? 0, 0)}`}
          attestation={NBA_ATTESTATION}
        />
        <KpiCard
          label="Conversão por visita"
          value={formatPercent(conversion?.value ?? 0, 0)}
          comparison={`meta ${formatPercent(conversion?.target ?? 0, 0)}`}
          attestation={NBA_ATTESTATION}
        />
        <KpiCard
          label="Sell-out incremental"
          value={formatMoney(incremental?.value ?? 0)}
          delta={incremental?.delta ?? 0}
          comparison={incremental?.comparison ?? ''}
          attestation={NBA_ATTESTATION}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Panel
            title="Recomendações do dia"
            description="O que a força de campo recebe como decisão, não como relatório"
            action={<PanelLink to="/gtm/nba">Abrir Next Best Action</PanelLink>}
            footer={<DataBadge attestation={NBA_ATTESTATION} />}
          >
            <ol className="divide-y divide-surface-border">
              {RECOMMENDATIONS.map((recommendation) => {
                const doctor = doctorOf(recommendation)
                if (!doctor) return null
                return (
                  <li key={recommendation.id} className="flex items-start gap-3 py-3">
                    <span
                      className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: PRIORITY_COLOR[recommendation.priority] }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-delta-lg font-medium text-slate-900">
                        {doctor.name}
                      </span>
                      <span className="block text-delta text-neutral">
                        {SPECIALTY_LABEL[doctor.specialty]} ·{' '}
                        {POTENTIAL_TIER_LABEL[doctor.potentialTier]}
                      </span>
                      <span className="mt-1 block text-delta-lg text-slate-700">
                        {recommendation.action}
                      </span>
                    </span>
                    <StateChip
                      label={PRIORITY_LABEL[recommendation.priority]}
                      tone={recommendation.priority === 'very_high' ? 'negative' : 'attention'}
                    />
                  </li>
                )
              })}
            </ol>
          </Panel>
        </div>

        <div className="lg:col-span-5">
          <Panel
            title="Execução de hoje"
            action={<PanelLink to="/gtm/roteirizacao">Ver roteiro</PanelLink>}
            footer={<DataBadge attestation={ROUTING_ATTESTATION} />}
          >
            <dl className="divide-y divide-surface-border">
              {[
                { label: 'Visitas planejadas', value: formatInteger(DAY_SUMMARY.plannedVisits) },
                { label: 'Visitas concluídas', value: formatInteger(DAY_SUMMARY.completedVisits) },
                {
                  label: 'Aderência ao roteiro',
                  value: formatPercent(DAY_SUMMARY.routeAdherencePercent, 0),
                },
                { label: 'Paradas no roteiro', value: formatInteger(BASE_ROUTE.stops.length) },
                { label: 'Alertas abertos', value: formatInteger(ROUTE_ALERTS.length) },
              ].map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="text-delta-lg text-slate-600">{row.label}</dt>
                  <dd className="text-delta-lg font-semibold tabular-nums text-slate-900">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </div>

      <Panel title="Metas da semana">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {TEAM_PERFORMANCE.map((metric) => {
            const belowTarget = metric.target !== null && metric.value < metric.target
            return (
              <div key={metric.id} className="rounded-card border border-surface-border p-4">
                <p className="text-delta text-neutral">{metric.label}</p>
                <p className="mt-1 text-kpi tabular-nums text-slate-900">
                  {metric.format === 'money'
                    ? formatMoney(metric.value)
                    : formatPercent(metric.value, 0)}
                </p>
                {metric.target !== null ? (
                  <>
                    <span className="mt-2 block h-1.5 w-full rounded-full bg-slate-100">
                      <span
                        className="block h-1.5 rounded-full"
                        style={{
                          width: `${Math.min(100, (metric.value / metric.target) * 100)}%`,
                          backgroundColor: belowTarget ? SEMANTIC.attention : SEMANTIC.positive,
                        }}
                      />
                    </span>
                    <p className="mt-1.5 text-delta tabular-nums text-neutral">
                      Meta {formatPercent(metric.target, 0)}
                    </p>
                  </>
                ) : metric.delta !== null ? (
                  <p className="mt-1.5">
                    <SemanticDelta
                      value={metric.delta}
                      size="sm"
                      {...(metric.comparison ? { comparison: metric.comparison } : {})}
                    />
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>
      </Panel>

      <Panel title="Próximas ações sugeridas">
        <ul className="grid gap-2 sm:grid-cols-2">
          {SUGGESTED_ACTIONS.map((action) => (
            <li
              key={action}
              className="flex items-start gap-2 rounded-control border border-surface-border px-3 py-2 text-delta-lg text-slate-700"
            >
              <span className="text-neutral" aria-hidden>
                —
              </span>
              <span>{action}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
