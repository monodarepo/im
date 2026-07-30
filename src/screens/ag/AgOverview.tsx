import { Link } from 'react-router-dom'
import { DataBadge } from '../../components/DataBadge'
import { KpiCard } from '../../components/KpiCard'
import { Panel } from '../../components/Panel'
import { SemanticDelta } from '../../components/SemanticDelta'
import { StateChip } from '../../components/StateChip'
import { DECISION_STATE_LABEL, DECISION_STATE_TONE } from '../../domain/decision'
import { formatInteger, formatMultiple, formatPercent } from '../../domain/format'
import { formatMoney } from '../../domain/money'
import { formatRelative } from '../../domain/today'
import { SEMANTIC } from '../../design/tokens'
import { DECISIONS } from '../../mock/decisions'
import {
  AG_OVERVIEW_ATTESTATION,
  AG_PLAN_ATTESTATION,
  AG_RESULT_ATTESTATION,
  AG_STOCK_ATTESTATION,
  ANNUAL_SAMPLE_BUDGET_BRL,
  BUSINESS_UNITS,
  CAMPAIGN_ROWS,
  COMMITTED_SHARE_PERCENT,
  EXPIRY_LOSSES,
  TOTAL_BUDGET_BRL,
  TOTAL_COMMITTED_BRL,
  TOTAL_EXPIRY_COST_BRL,
  TOTAL_EXPIRY_UNITS,
} from '../../mock/agOverview'
import { useDecisionWorkflow } from '../../state/decisionWorkflowStore'

function BudgetBar({ committed, budget }: { committed: number; budget: number }) {
  return (
    <span className="block h-2 w-full rounded-full bg-slate-100">
      <span
        className="block h-2 rounded-full bg-slate-500"
        style={{ width: `${Math.min(100, (committed / budget) * 100)}%` }}
      />
    </span>
  )
}

export function AgOverview() {
  const stateOf = useDecisionWorkflow((state) => state.stateOf)
  const pending = DECISIONS.filter((decision) => decision.product === 'ag')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Visão geral do Amostra Grátis
        </h1>
        <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
          Cockpit do investimento em amostra
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Verba anual sob governança"
          value={formatMoney(ANNUAL_SAMPLE_BUDGET_BRL)}
          attestation={AG_PLAN_ATTESTATION}
          size="lg"
        />
        <KpiCard
          label="Comprometido no ano"
          value={formatMoney(TOTAL_COMMITTED_BRL)}
          delta={COMMITTED_SHARE_PERCENT}
          deltaUnit="points"
          comparison="da verba"
          attestation={AG_PLAN_ATTESTATION}
        />
        <KpiCard
          label="Perda por vencimento"
          value={formatMoney(TOTAL_EXPIRY_COST_BRL)}
          comparison={`${formatInteger(TOTAL_EXPIRY_UNITS)} amostras`}
          attestation={AG_STOCK_ATTESTATION}
        />
        <KpiCard
          label="Decisões pendentes"
          value={formatInteger(pending.length)}
          attestation={AG_OVERVIEW_ATTESTATION}
        />
      </div>

      <Panel
        title="Verba por unidade de negócio"
        description="Skincare é onde o piloto começa, e é a BU com maior folga de verba"
        footer={<DataBadge attestation={AG_PLAN_ATTESTATION} variant="full" />}
      >
        <ul className="space-y-3">
          {BUSINESS_UNITS.map((unit) => (
            <li key={unit.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <span className="text-delta-lg font-medium text-slate-900">{unit.name}</span>
                <span className="text-delta text-neutral">
                  {formatInteger(unit.campaigns)} campanhas
                </span>
                <span className="ml-auto text-delta-lg tabular-nums text-slate-900">
                  {formatMoney(unit.committedBrl)}{' '}
                  <span className="text-neutral">de {formatMoney(unit.budgetBrl)}</span>
                </span>
              </div>
              <div className="mt-1.5">
                <BudgetBar committed={unit.committedBrl} budget={unit.budgetBrl} />
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-4 border-t border-surface-border pt-3 text-delta text-neutral">
          Total planejado {formatMoney(TOTAL_BUDGET_BRL)} · comprometido{' '}
          {formatPercent(COMMITTED_SHARE_PERCENT)}.
        </p>
      </Panel>

      <Panel
        title="Campanhas"
        description="Conversão esperada contra realizada, e o retorno de cada campanha"
        footer={<DataBadge attestation={AG_RESULT_ATTESTATION} variant="full" />}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-surface-border text-delta text-neutral">
                <th className="pb-2 font-medium">Campanha</th>
                <th className="pb-2 font-medium">BU</th>
                <th className="pb-2 text-right font-medium">Amostras</th>
                <th className="pb-2 text-right font-medium">Custo</th>
                <th className="pb-2 text-right font-medium">Cobertura</th>
                <th className="pb-2 text-right font-medium">Esperado</th>
                <th className="pb-2 text-right font-medium">Realizado</th>
                <th className="pb-2 text-right font-medium">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {CAMPAIGN_ROWS.map((row) => {
                const gap =
                  row.realizedUnits === null
                    ? null
                    : Math.round((row.realizedUnits / row.expectedUnits - 1) * 100 * 10) / 10
                return (
                  <tr key={row.id} className="text-delta-lg transition-colors hover:bg-slate-50">
                    <td className="py-2.5 font-medium text-slate-900">{row.name}</td>
                    <td className="py-2.5 text-slate-600">{row.businessUnit}</td>
                    <td className="py-2.5 text-right tabular-nums text-slate-700">
                      {formatInteger(row.samples)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-slate-700">
                      {formatMoney(row.costBrl)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-slate-700">
                      {formatPercent(row.coveragePercent, 0)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-slate-700">
                      {formatInteger(row.expectedUnits)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {row.realizedUnits === null ? (
                        <span className="text-neutral">em campo</span>
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <span className="text-slate-900">{formatInteger(row.realizedUnits)}</span>
                          {gap !== null ? <SemanticDelta value={gap} size="sm" /> : null}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-slate-900">
                      {row.roi === null ? (
                        <span className="text-neutral">—</span>
                      ) : (
                        formatMultiple(row.roi)
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Panel
            title="Perda por vencimento"
            description="Amostra vencida é verba gasta sem nenhuma chance de retorno"
            footer={<DataBadge attestation={AG_STOCK_ATTESTATION} />}
          >
            <ul className="divide-y divide-surface-border">
              {EXPIRY_LOSSES.map((loss) => (
                <li key={loss.id} className="flex items-start gap-3 py-3">
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: SEMANTIC.negative }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-delta-lg text-slate-700">{loss.reason}</span>
                    <span className="block text-delta text-neutral">
                      detectado {formatRelative(loss.detectedOn)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-delta-lg font-semibold tabular-nums text-negative">
                      {formatMoney(loss.costBrl)}
                    </span>
                    <span className="block text-delta tabular-nums text-neutral">
                      {formatInteger(loss.units)} amostras
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="lg:col-span-5">
          <Panel
            title="Decisões do AG"
            action={
              <Link
                to="/decisoes"
                className="rounded-control px-2 py-1 text-delta font-medium transition-colors hover:bg-slate-50"
                style={{ color: 'var(--product-accent)' }}
              >
                Ver a Central →
              </Link>
            }
          >
            {pending.length === 0 ? (
              <p className="text-delta-lg text-neutral">Nenhuma decisão do AG na fila.</p>
            ) : (
              <ul className="divide-y divide-surface-border">
                {pending.map((decision) => (
                  <li key={decision.id} className="flex items-start gap-3 py-3">
                    <span className="min-w-0 flex-1">
                      <Link
                        to={`/decisoes/${decision.id}`}
                        className="block text-delta font-medium tabular-nums underline"
                        style={{ color: 'var(--product-accent)' }}
                      >
                        {decision.id}
                      </Link>
                      <span className="mt-0.5 block text-delta-lg text-slate-700">
                        {decision.title}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-delta-lg font-semibold tabular-nums text-slate-900">
                        {formatMoney(decision.impactBrl)}
                      </span>
                      <span className="mt-1 block">
                        <StateChip
                          label={DECISION_STATE_LABEL[stateOf(decision.id)]}
                          tone={DECISION_STATE_TONE[stateOf(decision.id)]}
                        />
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
