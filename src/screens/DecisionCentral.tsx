import { Link } from 'react-router-dom'
import { Panel } from '../components/Panel'
import { StateChip } from '../components/StateChip'
import {
  DECISION_STATE_LABEL,
  DECISION_STATE_TONE,
  parcelTotal,
  type DecisionState,
} from '../domain/decision'
import { formatInteger } from '../domain/format'
import { formatMoney } from '../domain/money'
import { PRODUCTS } from '../design/tokens'
import { DECISIONS } from '../mock/decisions'
import { useDecisionWorkflow } from '../state/decisionWorkflowStore'
import { useRadarDecisions } from '../state/radarDecisionsStore'

/**
 * Central de Decisões.
 *
 * Reúne as decisões canônicas e as criadas no Radar. O estado e as parcelas vêm
 * do workflow: enviar um cenário para aprovação aparece aqui, não numa tela
 * paralela.
 */
export function DecisionCentral() {
  const created = useRadarDecisions((state) => state.created)
  const stateOf = useDecisionWorkflow((state) => state.stateOf)
  const parcelsOf = useDecisionWorkflow((state) => state.parcelsOf)

  const rows = [
    ...DECISIONS.map((decision) => ({ ...decision, origin: 'Seção 10.2' })),
    ...created.map((decision) => ({ ...decision, origin: 'Radar' })),
  ]

  const byState = rows.reduce<Record<string, number>>((acc, row) => {
    const state = stateOf(row.id)
    acc[state] = (acc[state] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-5">
      <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Central de decisões
      </h1>

      <div className="flex flex-wrap gap-2">
        {Object.entries(byState).map(([state, count]) => (
          <span key={state} className="inline-flex items-center gap-2">
            <StateChip
              label={`${DECISION_STATE_LABEL[state as DecisionState]}: ${formatInteger(count)}`}
              tone={DECISION_STATE_TONE[state as DecisionState]}
            />
          </span>
        ))}
      </div>

      <Panel title="Decisões" description="Estado, origem e parcelas de impacto">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-surface-border text-delta text-neutral">
                <th className="pb-2 font-medium">Identificador</th>
                <th className="pb-2 font-medium">Decisão</th>
                <th className="pb-2 font-medium">Produto</th>
                <th className="pb-2 font-medium">Origem</th>
                <th className="pb-2 text-right font-medium">Impacto</th>
                <th className="pb-2 text-right font-medium">Parcelas</th>
                <th className="pb-2 text-right font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {rows.map((row) => {
                const state = stateOf(row.id)
                const parcels = parcelsOf(row.id)
                return (
                  <tr key={row.id} className="text-delta-lg transition-colors hover:bg-slate-50">
                    <td className="py-2.5">
                      <Link
                        to={`/decisoes/${row.id}`}
                        className="font-medium tabular-nums underline"
                        style={{ color: 'var(--product-accent)' }}
                      >
                        {row.id}
                      </Link>
                    </td>
                    <td className="py-2.5 text-slate-900">{row.title}</td>
                    <td className="py-2.5">
                      <span
                        className="rounded-control px-2 py-0.5 text-delta font-medium text-white"
                        style={{ backgroundColor: PRODUCTS[row.product].accent }}
                      >
                        {PRODUCTS[row.product].shortName}
                      </span>
                    </td>
                    <td className="py-2.5 text-delta text-neutral">{row.origin}</td>
                    <td className="py-2.5 text-right font-medium tabular-nums text-slate-900">
                      {formatMoney(row.impactBrl)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-slate-600">
                      {parcels.length === 0 ? (
                        <span className="text-neutral">—</span>
                      ) : (
                        `${formatInteger(parcels.length)} · ${formatMoney(parcelTotal(parcels))}`
                      )}
                    </td>
                    <td className="py-2.5 text-right">
                      <StateChip
                        label={DECISION_STATE_LABEL[state]}
                        tone={DECISION_STATE_TONE[state]}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
