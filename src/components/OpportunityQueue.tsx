import { Link } from 'react-router-dom'
import { formatMoney } from '../domain/money'
import { OPPORTUNITIES } from '../mock/opportunities'
import { DataBadge } from './DataBadge'

/**
 * Top oportunidades por impacto. Cada linha leva à Decisão que a executa —
 * nenhuma recomendação fica solta na tela.
 */
export function OpportunityQueue() {
  return (
    <ol className="divide-y divide-surface-border">
      {OPPORTUNITIES.map((opportunity) => (
        <li key={opportunity.decisionId}>
          <Link
            to={`/decisoes/${opportunity.decisionId}`}
            className="-mx-2 flex items-start gap-3 rounded-control px-2 py-3 transition-colors hover:bg-slate-50"
          >
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-delta font-semibold tabular-nums text-slate-600">
              {opportunity.rank}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-delta-lg font-medium text-slate-900">
                {opportunity.title}
              </span>
              <span className="mt-1 block">
                <DataBadge attestation={opportunity.attestation} />
              </span>
            </span>

            <span className="shrink-0 text-right">
              <span className="block text-delta-lg font-semibold tabular-nums text-slate-900">
                {formatMoney(opportunity.impactBrl)}
              </span>
              <span className="mt-0.5 block text-delta tabular-nums text-neutral">
                {opportunity.decisionId}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  )
}
