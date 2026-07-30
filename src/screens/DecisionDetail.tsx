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

/**
 * Detalhe da Decisão.
 *
 * Estados, transições e trilha de auditoria são a seção 8.1 do ESCOPO; aqui
 * ficam a identificação, o impacto e a oportunidade que originou a decisão.
 */
export function DecisionDetail() {
  const { decisionId = '' } = useParams()
  const decision = findDecision(decisionId)
  const origin = OPPORTUNITIES.find((opportunity) => opportunity.decisionId === decisionId)
  const links = useDecisions((state) => state.links).filter(
    (link) => link.decisionId === decisionId,
  )

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
          <StateChip label="Estado — seção 8.1 do ESCOPO" tone="neutral" muted />
        </div>
      </div>

      <Panel title="Impacto estimado">
        <p className="text-kpi tabular-nums text-slate-900">{formatMoney(decision.impactBrl)}</p>
        {origin ? (
          <p className="mt-2 text-delta-lg text-neutral">
            Originada da oportunidade #{origin.rank} do HUB.
          </p>
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
