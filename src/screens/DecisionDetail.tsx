import { Link, useParams } from 'react-router-dom'
import { ThreadRibbon } from '../components/ThreadRibbon'
import { THREAD_DECISION_ID } from '../mock/thread'
import { ConfidenceMeter } from '../components/ConfidenceMeter'
import { DataBadge } from '../components/DataBadge'
import { FutureButton } from '../components/FutureButton'
import { Panel } from '../components/Panel'
import { ProductBadge } from '../components/ProductBadge'
import { StateChip } from '../components/StateChip'
import { PRODUCTS, SEMANTIC } from '../design/tokens'
import {
  AUTHORITY_LABEL,
  AUTONOMY_DESCRIPTION,
  AUTONOMY_LABEL,
  DECISION_STATE_LABEL,
  DECISION_ACTION_LABEL,
  DECISION_STATE_TONE,
  DECISION_TRANSITIONS,
  EFFORT_LABEL,
  URGENCY_LABEL,
  URGENCY_TONE,
  isAuditTrailConsistent,
  parcelTotal,
  type DecisionRecord,
  type DecisionState,
} from '../domain/decision'
import { formatPercent } from '../domain/format'
import { formatMoney } from '../domain/money'
import { formatDate, formatRelative } from '../domain/today'
import { findDecisionRecord, PARCEL_ROUTES } from '../mock/decisionRecords'
import { findDecision } from '../mock/decisions'
import { OPPORTUNITIES } from '../mock/opportunities'
import { useDecisions } from '../state/decisionsStore'
import { useDecisionWorkflow } from '../state/decisionWorkflowStore'
import { useRadarDecisions } from '../state/radarDecisionsStore'

/**
 * Detalhe da Decisão — o objeto da seção 8.1 aberto.
 *
 * É a tela que sustenta a tese da plataforma: um número de R$ 4,8M que se
 * decompõe em três produtos, e cada parcela devolve o clique para a tela que a
 * apurou. Sem esse caminho de volta, o valor consolidado é só um slide.
 */
export function DecisionDetail() {
  const { decisionId = '' } = useParams()
  const record = findDecisionRecord(decisionId)
  const createdFromRadar = useRadarDecisions((state) => state.findCreated(decisionId))
  const fallback = findDecision(decisionId) ?? createdFromRadar

  if (!record) {
    return <MinimalDetail decisionId={decisionId} title={fallback?.title} impactBrl={fallback?.impactBrl} />
  }

  return <FullDetail record={record} />
}

function FullDetail({ record }: { record: DecisionRecord }) {
  const workflowState = useDecisionWorkflow((store) => store.stateOf(record.id))
  const moveTo = useDecisionWorkflow((store) => store.moveTo)
  const sessionParcels = useDecisionWorkflow((store) => store.parcelsOf(record.id))
  const links = useDecisions((state) => state.links).filter((link) => link.decisionId === record.id)
  const origin = OPPORTUNITIES.find((opportunity) => opportunity.decisionId === record.id)

  const state: DecisionState = workflowState
  const nextStates = DECISION_TRANSITIONS[state]
  const parcels = [...record.parcels, ...sessionParcels]
  const total = parcelTotal(record.parcels)
  const reconciles = total === record.impactBrl

  return (
    <div className="space-y-5">
      {record.id === THREAD_DECISION_ID ? <ThreadRibbon step="learning" /> : null}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-delta font-medium tabular-nums text-neutral">{record.id}</p>
            <ProductBadge product={record.product} />
            <StateChip label={DECISION_STATE_LABEL[state]} tone={DECISION_STATE_TONE[state]} />
            <span
              className="rounded-control border px-2 py-0.5 text-delta font-medium"
              style={{ borderColor: 'var(--product-accent)', color: 'var(--product-accent)' }}
              title={AUTONOMY_DESCRIPTION[record.autonomy]}
            >
              {AUTONOMY_LABEL[record.autonomy]}
            </span>
          </div>
          <h1 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">
            {record.title}
          </h1>
          <p className="mt-1 max-w-3xl text-delta-lg text-slate-700">{record.summary}</p>
        </div>

        <Link
          to="/decisoes"
          className="shrink-0 text-delta-lg font-medium underline"
          style={{ color: 'var(--product-accent)' }}
        >
          ← Central de Decisões
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <Attribute label="Impacto" value={formatMoney(record.impactBrl)} emphasis />
        <Attribute label="Confiança" value={<ConfidenceMeter confidence={record.confidence} showLabel />} />
        <Attribute
          label="Urgência"
          value={<StateChip label={URGENCY_LABEL[record.urgency]} tone={URGENCY_TONE[record.urgency]} />}
        />
        <Attribute label="Esforço" value={EFFORT_LABEL[record.effort]} />
        <Attribute label="Alçada necessária" value={AUTHORITY_LABEL[record.authority]} />
        <Attribute
          label="Prazo"
          value={`${formatDate(record.dueOn)} · ${formatRelative(record.dueOn)}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Panel
            title="Decomposição do impacto"
            description="Cada parcela devolve o clique para a tela do produto que a apurou"
            footer={
              reconciles ? (
                <span>
                  A soma das parcelas fecha exatamente o impacto de {formatMoney(record.impactBrl)}.
                </span>
              ) : (
                <span style={{ color: SEMANTIC.attention }}>
                  Parcelas somam {formatMoney(total)} contra impacto de{' '}
                  {formatMoney(record.impactBrl)}.
                </span>
              )
            }
          >
            <ul className="space-y-2">
              {parcels.map((parcel) => {
                const target = PARCEL_ROUTES[parcel.id]
                const share = record.impactBrl === 0 ? 0 : (parcel.amountBrl / record.impactBrl) * 100

                return (
                  <li
                    key={parcel.id}
                    className="rounded-control border border-surface-border px-4 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-2">
                        <ProductBadge product={parcel.source} />
                        <span className="min-w-0 text-delta-lg text-slate-800">{parcel.label}</span>
                      </div>
                      <span className="shrink-0 text-delta-lg font-semibold tabular-nums text-slate-900">
                        {formatMoney(parcel.amountBrl)}
                      </span>
                    </div>

                    <span className="mt-2 block h-2 w-full rounded-full bg-slate-100">
                      <span
                        className="block h-2 rounded-full"
                        style={{
                          width: `${Math.max(4, share)}%`,
                          backgroundColor: PRODUCTS[parcel.source].accent,
                        }}
                      />
                    </span>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-delta text-neutral">
                        {formatPercent(share, 1)} do impacto · {formatRelative(parcel.createdOn)}
                      </span>
                      {target ? (
                        <Link
                          to={target.route}
                          className="text-delta font-medium underline"
                          style={{ color: 'var(--product-accent)' }}
                        >
                          {target.label} →
                        </Link>
                      ) : null}
                    </div>

                    <div className="mt-2">
                      <DataBadge attestation={parcel.attestation} />
                    </div>
                  </li>
                )
              })}
            </ul>
          </Panel>

          <Panel title="Evidências" description="Cada número com procedência e tela de origem">
            <ul className="divide-y divide-surface-border">
              {record.evidence.map((item) => (
                <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-delta-lg font-medium text-slate-900">{item.label}</span>
                    <span className="text-delta-lg font-semibold tabular-nums text-slate-900">
                      {item.value}
                    </span>
                  </div>
                  <p className="mt-1 text-delta-lg text-slate-700">{item.reading}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <DataBadge attestation={item.attestation} />
                    <Link
                      to={item.route}
                      className="text-delta font-medium underline"
                      style={{ color: 'var(--product-accent)' }}
                    >
                      {item.routeLabel} →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Causa provável">
              <p className="text-delta-lg text-slate-700">{record.probableCause}</p>
            </Panel>
            <Panel title="Recomendação">
              <p className="text-delta-lg text-slate-700">{record.recommendation}</p>
            </Panel>
          </div>
        </div>

        <div className="space-y-4">
          <Panel
            title="Dono e execução"
            description={`${record.owner} · ${record.ownerRole}`}
          >
            <div className="space-y-3">
              <p className="text-delta-lg text-slate-700">
                {AUTONOMY_DESCRIPTION[record.autonomy]}
              </p>

              <div>
                <p className="text-delta font-medium uppercase tracking-wide text-neutral">
                  Mover estado
                </p>
                <p className="mt-1 text-delta text-neutral">
                  Estado atual: {DECISION_STATE_LABEL[state]}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {nextStates.length === 0 ? (
                    <span className="text-delta-lg text-neutral">
                      Estado terminal. Não há transição de saída.
                    </span>
                  ) : (
                    nextStates.map((next) => (
                      <button
                        key={next}
                        type="button"
                        onClick={() => moveTo(record.id, next)}
                        className="rounded-control px-3 py-1.5 text-delta font-medium text-white transition-opacity hover:opacity-90"
                        style={{ backgroundColor: 'var(--product-accent)' }}
                      >
                        {DECISION_ACTION_LABEL[next]}
                      </button>
                    ))
                  )}
                </div>
                <p className="mt-2 text-delta text-neutral">
                  Só as transições do mapa aparecem. Estado inválido não chega a ser gravado.
                </p>
              </div>

              <div className="border-t border-surface-border pt-3">
                <FutureButton label="Write-back ao ERP" phase="Fase 3" />
              </div>
            </div>
          </Panel>

          <Panel
            title="Trilha de auditoria"
            description={
              isAuditTrailConsistent(record.audit)
                ? 'Cada elo continua o anterior'
                : 'Trilha inconsistente'
            }
            footer={<DataBadge attestation={record.attestation} />}
          >
            <ol className="space-y-3">
              {record.audit.map((entry) => (
                <li key={entry.id} className="relative pl-4">
                  <span
                    className="absolute left-0 top-1.5 h-2 w-2 rounded-full"
                    style={{ backgroundColor: 'var(--product-accent)' }}
                    aria-hidden
                  />
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-delta-lg font-medium text-slate-900">
                      {entry.from === null
                        ? DECISION_STATE_LABEL[entry.to]
                        : `${DECISION_STATE_LABEL[entry.from]} → ${DECISION_STATE_LABEL[entry.to]}`}
                    </span>
                    <span className="text-delta tabular-nums text-neutral">
                      {formatDate(entry.on)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-delta text-neutral">
                    {entry.actor} · {entry.role}
                  </p>
                  <p className="mt-1 text-delta-lg text-slate-700">{entry.note}</p>
                </li>
              ))}
            </ol>
          </Panel>

          {origin ? (
            <Panel title="Origem">
              <p className="text-delta-lg text-slate-700">
                Oportunidade #{origin.rank} do Radar do HUB.
              </p>
              <Link
                to="/hub/radar"
                className="mt-2 inline-block text-delta font-medium underline"
                style={{ color: 'var(--product-accent)' }}
              >
                Radar de Oportunidades →
              </Link>
            </Panel>
          ) : null}

          {links.length > 0 ? (
            <Panel title="Encaminhamentos" description="Vínculos criados no diagnóstico de causa-raiz">
              <ul className="divide-y divide-surface-border">
                {links.map((link) => (
                  <li key={link.target} className="flex items-center gap-2 py-2">
                    <ProductBadge product={link.target} />
                    <span className="min-w-0 flex-1 text-delta-lg text-slate-700">
                      {link.reason}
                    </span>
                    <span className="shrink-0 text-delta text-neutral">
                      {formatRelative(link.createdOn)}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function Attribute({
  label,
  value,
  emphasis = false,
}: {
  label: string
  value: React.ReactNode
  emphasis?: boolean
}) {
  return (
    <div className="rounded-card border border-surface-border bg-surface-card px-4 py-3">
      <p className="text-delta font-medium text-neutral">{label}</p>
      <div className={`mt-1.5 ${emphasis ? 'font-mono text-kpi tabular-nums text-slate-900' : 'text-delta-lg text-slate-800'}`}>
        {value}
      </div>
    </div>
  )
}

/** Decisão sem registro completo — criada no Radar durante a sessão. */
function MinimalDetail({
  decisionId,
  title,
  impactBrl,
}: {
  decisionId: string
  title: string | undefined
  impactBrl: number | undefined
}) {
  if (!title) {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-lg font-semibold text-slate-900">Decisão não encontrada</h1>
        <p className="text-delta-lg text-neutral">
          Nenhuma decisão com o identificador {decisionId}.
        </p>
        <Link
          to="/decisoes"
          className="text-delta-lg font-medium underline"
          style={{ color: 'var(--product-accent)' }}
        >
          ← Voltar para a Central de Decisões
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <p className="text-delta font-medium tabular-nums text-neutral">{decisionId}</p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">{title}</h1>
      </div>

      <Panel
        title="Impacto estimado"
        description="Decisão criada nesta sessão, ainda sem registro completo"
      >
        <p className="font-mono text-kpi tabular-nums text-slate-900">{formatMoney(impactBrl ?? 0)}</p>
        <p className="mt-2 text-delta-lg text-neutral">
          Evidências, causa provável e trilha de auditoria são preenchidas quando a decisão é
          formalizada.
        </p>
      </Panel>

      <Link
        to="/decisoes"
        className="inline-block text-delta-lg font-medium underline"
        style={{ color: 'var(--product-accent)' }}
      >
        ← Voltar para a Central de Decisões
      </Link>
    </div>
  )
}
