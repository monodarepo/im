import { Link, useParams } from 'react-router-dom'
import { FutureButton } from '../components/FutureButton'
import { Panel } from '../components/Panel'
import { StateChip } from '../components/StateChip'
import { formatMoney } from '../domain/money'
import { formatRelative } from '../domain/today'
import { PRODUCTS } from '../design/tokens'
import { findDecision } from '../mock/decisions'
import { OPPORTUNITIES } from '../mock/opportunities'
import { useDecisions } from '../state/decisionsStore'
import { useRadarDecisions } from '../state/radarDecisionsStore'
import { useDecisionWorkflow } from '../state/decisionWorkflowStore'
import { DECISION_STATE_LABEL, DECISION_STATE_TONE, parcelTotal } from '../domain/decision'

/**
 * Detalhe da Decisão.
 *
 * Estados, transições e trilha de auditoria são a seção 8.1 do ESCOPO; aqui
 * ficam a identificação, o impacto e a oportunidade que originou a decisão.
 */
export function DecisionDetail() {
  const { decisionId = '' } = useParams()
  const createdFromRadar = useRadarDecisions((state) => state.findCreated(decisionId))
  const decision = findDecision(decisionId) ?? createdFromRadar
  const origin = OPPORTUNITIES.find((opportunity) => opportunity.decisionId === decisionId)
  const links = useDecisions((state) => state.links).filter(
    (link) => link.decisionId === decisionId,
  )
  const state = useDecisionWorkflow((store) => store.stateOf(decisionId))
  const parcels = useDecisionWorkflow((store) => store.parcelsOf(decisionId))

  if (!decision) {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-lg font-semibold text-slate-900">Decisão não encontrada</h1>
        <p className="text-delta-lg text-neutral">
          Nenhuma decisão com o identificador {decisionId}.
        </p>
        <Link to="/decisoes" className="text-delta-lg font-medium" style={{ color: 'var(--product-accent)' }}>
          ← Voltar para a fila de decisões
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <p className="text-delta font-medium tabular-nums text-neutral">{decision.id}</p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">{decision.title}</h1>
        <div className="mt-2">
          <StateChip label={DECISION_STATE_LABEL[state]} tone={DECISION_STATE_TONE[state]} />
        </div>
      </div>

      <Panel title="Impacto estimado">
        <p className="text-kpi tabular-nums text-slate-900">{formatMoney(decision.impactBrl)}</p>
        {origin ? (
          <p className="mt-2 text-delta-lg text-neutral">
            Originada da oportunidade #{origin.rank} do HUB.
          </p>
        ) : null}

        {parcels.length > 0 ? (
          <div className="mt-4 border-t border-surface-border pt-3">
            <p className="text-delta font-medium text-neutral">Parcelas anexadas</p>
            <ul className="mt-2 divide-y divide-surface-border">
              {parcels.map((parcel) => (
                <li key={parcel.id} className="flex items-center gap-3 py-2">
                  <span
                    className="rounded-control px-2 py-0.5 text-delta font-medium text-white"
                    style={{ backgroundColor: PRODUCTS[parcel.source].accent }}
                  >
                    {PRODUCTS[parcel.source].shortName}
                  </span>
                  <span className="min-w-0 flex-1 text-delta-lg text-slate-700">{parcel.label}</span>
                  <span className="shrink-0 text-delta-lg font-semibold tabular-nums text-slate-900">
                    {formatMoney(parcel.amountBrl)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-delta text-neutral">
              Soma das parcelas: {formatMoney(parcelTotal(parcels))} de{' '}
              {formatMoney(decision.impactBrl)}.
            </p>
          </div>
        ) : null}
      </Panel>

      <Panel
        title="Encaminhamentos"
        description="Vínculos criados a partir do diagnóstico de causa-raiz"
      >
        {links.length > 0 ? (
          <ul className="divide-y divide-surface-border">
            {links.map((link) => (
              <li key={link.target} className="flex items-center gap-3 py-2.5">
                <span
                  className="rounded-control px-2 py-0.5 text-delta font-medium text-white"
                  style={{ backgroundColor: PRODUCTS[link.target].accent }}
                >
                  {PRODUCTS[link.target].shortName}
                </span>
                <span className="text-delta-lg text-slate-700">{link.reason}</span>
                <span className="ml-auto text-delta text-neutral">
                  {formatRelative(link.createdOn)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-delta-lg text-neutral">
            Nenhum encaminhamento ainda. O diagnóstico de causa-raiz cria os vínculos.
          </p>
        )}
      </Panel>

      <Panel
        title="Execução"
        description="A trilha de aprovação e o write-back dependem das fases seguintes."
      >
        <div className="flex flex-wrap gap-2">
          <FutureButton label="Aprovar decisão" phase="Fase 2" />
          <FutureButton label="Write-back ao ERP" phase="Fase 3" />
        </div>
      </Panel>

      <Link to="/hub" className="inline-block text-delta-lg font-medium" style={{ color: 'var(--product-accent)' }}>
        ← Voltar para a Visão Geral
      </Link>
    </div>
  )
}
