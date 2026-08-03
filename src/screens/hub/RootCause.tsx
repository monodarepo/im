import { ThreadRibbon } from '../../components/ThreadRibbon'
import { Link } from 'react-router-dom'
import { DataBadge } from '../../components/DataBadge'
import { Panel } from '../../components/Panel'
import { ProductBadge } from '../../components/ProductBadge'
import { StateChip } from '../../components/StateChip'
import { WaterfallChart } from '../../components/WaterfallChart'
import { CONFIDENCE_LABEL } from '../../domain/attestation'
import { formatPointsDelta } from '../../domain/format'
import { formatMoney } from '../../domain/money'
import { PRODUCTS } from '../../design/tokens'
import {
  buildWaterfallSteps,
  FORWARD_TARGETS,
  HAS_DECOMPOSITION,
  ROOT_CAUSE_ATTESTATION,
  ROOT_CAUSE_CASE,
  ROOT_CAUSE_FACTORS,
  ROOT_CAUSE_NARRATIVE,
} from '../../mock/rootCause'
import { useDecisions } from '../../state/decisionsStore'

function Decomposition() {
  if (HAS_DECOMPOSITION) {
    const steps = buildWaterfallSteps(
      ROOT_CAUSE_FACTORS.map((factor) => ({
        label: factor.label,
        value: factor.contributionPp ?? 0,
      })),
      'Variação total',
    )
    return <WaterfallChart steps={steps} />
  }

  return (
    <div className="divide-y divide-surface-border">
      {ROOT_CAUSE_FACTORS.map((factor) => (
        <div key={factor.id} className="flex flex-wrap items-center gap-3 py-2.5">
          <span className="min-w-0 flex-1 text-delta-lg text-slate-700">{factor.label}</span>

          {factor.owner ? (
            <ProductBadge product={factor.owner} />
          ) : (
            <span className="rounded-control bg-slate-100 px-2 py-0.5 text-delta text-neutral">
              Externo
            </span>
          )}

          <span className="w-20 text-right text-delta-lg font-semibold tabular-nums text-slate-300">
            —
          </span>
          <span className="w-24 text-right text-delta-lg font-semibold tabular-nums text-slate-300">
            —
          </span>
        </div>
      ))}

      <div className="flex items-center justify-between gap-3 pt-3">
        <span className="text-delta-lg font-semibold text-slate-900">Variação total observada</span>
        <span className="text-delta-lg font-semibold tabular-nums text-negative">
          {formatPointsDelta(ROOT_CAUSE_CASE.totalPp)}
        </span>
      </div>
    </div>
  )
}

function ForwardingFooter() {
  const { forward, isForwarded, linksOf } = useDecisions()
  const links = linksOf(ROOT_CAUSE_CASE.decisionId)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {FORWARD_TARGETS.map((target) => {
          const done = isForwarded(ROOT_CAUSE_CASE.decisionId, target.product)
          return (
            <button
              key={target.product}
              type="button"
              disabled={done}
              onClick={() => forward(ROOT_CAUSE_CASE.decisionId, target.product, target.reason)}
              className={`rounded-control px-3 py-2 text-delta-lg font-medium transition-colors ${
                done ? 'cursor-default border border-surface-border bg-slate-50 text-neutral' : 'text-white'
              }`}
              style={done ? undefined : { backgroundColor: PRODUCTS[target.product].accent }}
            >
              {done ? `Encaminhado — ${target.reason}` : `${target.label} (${target.reason.toLowerCase()})`}
            </button>
          )
        })}
      </div>

      {links.length > 0 ? (
        <p className="text-delta text-neutral">
          {links.length} de {FORWARD_TARGETS.length} encaminhamentos vinculados a{' '}
          <Link
            to={`/decisoes/${ROOT_CAUSE_CASE.decisionId}`}
            className="font-medium underline"
            style={{ color: 'var(--product-accent)' }}
          >
            {ROOT_CAUSE_CASE.decisionId}
          </Link>
          .
        </p>
      ) : (
        <p className="text-delta text-neutral">
          Cada encaminhamento cria um vínculo em {ROOT_CAUSE_CASE.decisionId}, sem abrir uma decisão
          paralela.
        </p>
      )}
    </div>
  )
}

export function RootCause() {
  return (
    <div className="max-w-5xl space-y-5">
      <ThreadRibbon step="diagnosis" />
      <div>
        <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Diagnóstico de causa-raiz
        </h1>
        <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
          {ROOT_CAUSE_CASE.title}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StateChip label={CONFIDENCE_LABEL[ROOT_CAUSE_CASE.confidence]} tone="attention" />
          <span className="text-delta text-neutral">
            Oportunidade dimensionada em {formatMoney(ROOT_CAUSE_CASE.opportunityBrl)} ·{' '}
            {ROOT_CAUSE_CASE.decisionId}
          </span>
        </div>
      </div>

      <Panel
        title="Decomposição da variação de share"
        description="Sete fatores, com contribuição em pontos percentuais e em reais"
        footer={
          HAS_DECOMPOSITION ? undefined : (
            <span>A contribuição de cada fator vem da seção 10 do ESCOPO.</span>
          )
        }
      >
        <Decomposition />
      </Panel>

      <Panel title="Narrativa executiva">
        <div className="space-y-3">
          {ROOT_CAUSE_NARRATIVE.map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="text-delta-lg leading-relaxed text-slate-700">
              {paragraph}
            </p>
          ))}
        </div>
      </Panel>

      <Panel
        title="Encaminhamento"
        description="Cada fator vai para o time que o executa, mantendo a rastreabilidade na decisão"
        footer={<DataBadge attestation={ROOT_CAUSE_ATTESTATION} />}
      >
        <ForwardingFooter />
      </Panel>
    </div>
  )
}
