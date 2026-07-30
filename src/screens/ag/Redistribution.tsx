import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { DataBadge } from '../../components/DataBadge'
import { DegradedBanner } from '../../components/DegradedBanner'
import { FutureButton } from '../../components/FutureButton'
import { KpiCard } from '../../components/KpiCard'
import { Panel } from '../../components/Panel'
import { SemanticDelta } from '../../components/SemanticDelta'
import { StateChip } from '../../components/StateChip'
import { SEMANTIC } from '../../design/tokens'
import { isStale } from '../../domain/attestation'
import {
  DECISION_STATE_LABEL,
  DECISION_STATE_TONE,
  transition,
  type DecisionState,
} from '../../domain/decision'
import { formatInteger } from '../../domain/format'
import { formatMoney, formatMoneyFull } from '../../domain/money'
import { HOLDER_KIND_LABEL } from '../../mock/agInventory'
import { findDecision } from '../../mock/decisions'
import {
  AUTHORITY_APPROVER,
  AUTHORITY_CEILING_BRL,
  AUTHORITY_LABEL,
  AUTHORITY_ORDER,
  AVOIDED_LOSS_CYCLE_BRL,
  isWithinUserAuthority,
  LOSS_ATTESTATION,
  LOSS_SERIES,
  OPEN_SUGGESTIONS,
  REALIZED_LOSS_CYCLE_BRL,
  REALIZED_LOSS_TREND_PERCENT,
  RECOVERABLE_UNITS,
  RECOVERABLE_VALUE_BRL,
  REDISTRIBUTION_ATTESTATION,
  REDISTRIBUTION_DECISION_ID,
  RESIDUAL_VALUE_BRL,
  SUGGESTIONS_ABOVE_USER_AUTHORITY,
  TRANSFER_SUGGESTIONS,
  USER_AUTHORITY,
  type TransferSuggestion,
} from '../../mock/redistribution'
import { useDecisionWorkflow } from '../../state/decisionWorkflowStore'

/**
 * Redistribuição Inteligente (AG, módulo 4.8).
 *
 * A fila é preventiva: cada linha sai antes da perda, não depois. O primeiro
 * item é o lote que o bloqueio de ruptura deixou parado no Nordeste — o mesmo
 * que a tela de Estoque lista — e daqui se chega tanto ao lote quanto ao
 * diagnóstico do HUB que originou o bloqueio.
 */

const INITIAL_STATE: DecisionState = 'proposed'

/** Séries neutras: o painel compara duas leituras da mesma perda, não bem contra mal. */
const AVOIDED_COLOR = '#334155'
const REALIZED_COLOR = '#94A3B8'

function AuthorityChip({ suggestion }: { suggestion: TransferSuggestion }) {
  const within = isWithinUserAuthority(suggestion.authority)
  return (
    <span className="inline-flex items-center gap-1.5 rounded-control border border-surface-border bg-surface-card px-2.5 py-1 text-delta">
      <span className="text-neutral">Alçada:</span>
      <span className="font-medium text-slate-900">{AUTHORITY_LABEL[suggestion.authority]}</span>
      {within ? null : (
        <span className="font-medium" style={{ color: SEMANTIC.attention }}>
          acima da sua
        </span>
      )}
    </span>
  )
}

function Figure({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint?: string
  tone?: 'attention' | 'negative'
}) {
  return (
    <div>
      <p className="text-delta text-neutral">{label}</p>
      <p
        className="mt-0.5 text-delta-lg font-semibold tabular-nums text-slate-900"
        style={tone ? { color: SEMANTIC[tone] } : undefined}
      >
        {value}
      </p>
      {hint ? <p className="text-delta text-neutral">{hint}</p> : null}
    </div>
  )
}

type SuggestionCardProps = {
  suggestion: TransferSuggestion
  rank: number
  state: DecisionState
  onApprove: (suggestion: TransferSuggestion) => void
  onEscalate: (suggestion: TransferSuggestion) => void
  onReject: (suggestion: TransferSuggestion) => void
}

function SuggestionCard({
  suggestion,
  rank,
  state,
  onApprove,
  onEscalate,
  onReject,
}: SuggestionCardProps) {
  const within = isWithinUserAuthority(suggestion.authority)
  const open = state === 'proposed'
  const approver = AUTHORITY_APPROVER[suggestion.authority]
  const lot = suggestion.lot

  return (
    <li
      className="rounded-card border border-surface-border bg-surface-card p-5"
      style={
        rank === 1 ? { borderLeftWidth: 3, borderLeftColor: 'var(--product-accent)' } : undefined
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-delta font-semibold tabular-nums text-slate-600">
              {rank}
            </span>
            <p className="text-delta-lg font-semibold text-slate-900">
              {lot.skuName} · lote {lot.batchCode}
            </p>
            <StateChip label={DECISION_STATE_LABEL[state]} tone={DECISION_STATE_TONE[state]} />
            {suggestion.blockedByStockout ? (
              <StateChip label="Parado por bloqueio de ruptura" tone="attention" />
            ) : null}
          </div>

          <p className="mt-1.5 text-delta-lg text-slate-700">
            <span className="text-neutral">De</span>{' '}
            <span className="font-medium text-slate-900">{lot.holderName}</span> (
            {HOLDER_KIND_LABEL[lot.holderKind]} · {lot.region}){' '}
            <span aria-hidden className="mx-1 text-neutral">
              →
            </span>
            <span className="text-neutral">para</span>{' '}
            <span className="font-medium text-slate-900">{suggestion.destination.holderName}</span> (
            {suggestion.destination.region})
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-delta text-neutral">Valor recuperado</p>
          <p className="text-kpi tabular-nums text-slate-900">
            {formatMoneyFull(suggestion.recoveredValueBrl)}
          </p>
          <AuthorityChip suggestion={suggestion} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 border-t border-surface-border pt-4 sm:grid-cols-3 xl:grid-cols-5">
        <Figure
          label="Unidades a transferir"
          value={`${formatInteger(suggestion.unitsToTransfer)} unid.`}
          hint={`de ${formatInteger(suggestion.unitsAtRisk)} em risco`}
        />
        <Figure
          label="Vence em"
          value={`${formatInteger(suggestion.daysToExpiry)} dias`}
          tone="attention"
        />
        <Figure
          label="Prazo de trânsito"
          value={`${formatInteger(suggestion.destination.transitDays)} dias`}
        />
        <Figure
          label="Janela restante no destino"
          value={`${formatInteger(suggestion.windowDays)} dias`}
          hint={`absorve ${formatInteger(suggestion.absorptionUnits)} unid.`}
        />
        <Figure
          label="Segue em risco"
          value={
            suggestion.residualUnitsAtRisk > 0
              ? `${formatInteger(suggestion.residualUnitsAtRisk)} unid.`
              : 'nada'
          }
          hint={
            suggestion.residualUnitsAtRisk > 0
              ? formatMoneyFull(suggestion.residualValueBrl)
              : 'lote recuperado por inteiro'
          }
          {...(suggestion.residualUnitsAtRisk > 0 ? { tone: 'negative' as const } : {})}
        />
      </div>

      <div className="mt-4 border-t border-surface-border pt-4">
        <p className="text-delta font-medium uppercase tracking-wide text-neutral">
          Por que este destino
        </p>
        <ul className="mt-1.5 space-y-1">
          {suggestion.reasons.map((reason) => (
            <li key={reason} className="flex gap-2 text-delta-lg text-slate-700">
              <span aria-hidden className="text-neutral">
                ·
              </span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-surface-border pt-4">
        <Link
          to={suggestion.inventoryRoute}
          className="text-delta-lg font-medium underline underline-offset-2"
          style={{ color: 'var(--product-accent)' }}
        >
          Ver o lote no estoque →
        </Link>

        {suggestion.stockoutSourceRoute && suggestion.stockoutSourceLabel ? (
          <Link
            to={suggestion.stockoutSourceRoute}
            className="text-delta-lg font-medium underline underline-offset-2"
            style={{ color: 'var(--product-accent)' }}
          >
            {suggestion.stockoutSourceLabel} →
          </Link>
        ) : null}

        <span className="ml-auto">
          <DataBadge attestation={suggestion.attestation} variant="full" />
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {open ? (
          <>
            <button
              type="button"
              onClick={() => (within ? onApprove(suggestion) : onEscalate(suggestion))}
              className="rounded-control px-3 py-2 text-delta-lg font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--product-accent)' }}
            >
              {within
                ? 'Aprovar transferência'
                : `Encaminhar à ${AUTHORITY_LABEL[suggestion.authority]}`}
            </button>
            <button
              type="button"
              onClick={() => onReject(suggestion)}
              className="rounded-control border border-surface-border bg-surface-card px-3 py-2 text-delta-lg font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Recusar
            </button>
          </>
        ) : null}

        {state === 'in_approval' ? (
          <>
            <button
              type="button"
              disabled
              title={`Fora da sua alçada (${AUTHORITY_LABEL[USER_AUTHORITY]}): a aprovação cabe a ${approver}.`}
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-control border border-surface-border bg-slate-50 px-3 py-2 text-delta-lg font-medium text-neutral"
            >
              Aprovar transferência
              <span className="rounded-sm bg-slate-200 px-1.5 py-0.5 text-delta text-slate-600">
                fora da sua alçada
              </span>
            </button>
            <p className="text-delta-lg text-slate-700">
              Encaminhada a {approver} — {AUTHORITY_LABEL[suggestion.authority]}.
            </p>
          </>
        ) : null}

        {state === 'approved' ? (
          <>
            <FutureButton label="Emitir ordem de transferência ao ERP" phase="Fase 3" />
            <p className="text-delta-lg text-slate-700">
              Aprovada por {approver}. Trânsito de {formatInteger(suggestion.destination.transitDays)}{' '}
              dias até {suggestion.destination.holderName}.
            </p>
          </>
        ) : null}

        {state === 'rejected' ? (
          <p className="text-delta-lg" style={{ color: SEMANTIC.negative }}>
            Recusada. O lote segue no estoque de {lot.holderName} com{' '}
            {formatInteger(suggestion.unitsAtRisk)} unidades em risco.
          </p>
        ) : null}

        {state !== 'proposed' ? (
          <span className="ml-auto text-delta text-neutral">
            Parcela em{' '}
            <Link
              to={`/decisoes/${suggestion.decisionId}`}
              className="font-medium underline"
              style={{ color: 'var(--product-accent)' }}
            >
              {suggestion.decisionId}
            </Link>
          </span>
        ) : null}
      </div>
    </li>
  )
}

function LossChart() {
  const data = LOSS_SERIES.map((point) => ({
    label: point.label,
    evitada: point.avoidedBrl,
    realizada: point.realizedBrl,
  }))

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={4} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
          <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: '#E2E8F0' }}
            tick={{ fill: '#64748B', fontSize: 12 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={70}
            tick={{ fill: '#64748B', fontSize: 12 }}
            tickFormatter={(value: number) => formatMoney(value, 0)}
          />
          <Tooltip
            cursor={{ fill: '#F1F5F9' }}
            formatter={(value: number, name: string) => [formatMoneyFull(value), name]}
            contentStyle={{ fontSize: 12, borderRadius: 12, borderColor: '#E2E8F0' }}
          />
          <Legend
            iconType="square"
            wrapperStyle={{ fontSize: 12, color: '#64748B', paddingTop: 8 }}
          />
          <Bar dataKey="evitada" name="Perda evitada" fill={AVOIDED_COLOR} radius={[3, 3, 0, 0]} />
          <Bar
            dataKey="realizada"
            name="Perda realizada"
            fill={REALIZED_COLOR}
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function AuthorityLadder() {
  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {AUTHORITY_ORDER.map((level) => {
        const ceiling = AUTHORITY_CEILING_BRL[level]
        const pending = TRANSFER_SUGGESTIONS.filter(
          (suggestion) => suggestion.authority === level,
        ).length
        return (
          <li
            key={level}
            className="rounded-card border border-surface-border p-4"
            style={
              level === USER_AUTHORITY
                ? { borderLeftWidth: 3, borderLeftColor: 'var(--product-accent)' }
                : undefined
            }
          >
            <p className="text-delta-lg font-semibold text-slate-900">{AUTHORITY_LABEL[level]}</p>
            <p className="mt-1 text-delta text-neutral">
              {ceiling === null
                ? `Acima de ${formatMoneyFull(AUTHORITY_CEILING_BRL.regional_operations ?? 0)} recuperados`
                : `Até ${formatMoneyFull(ceiling)} recuperados`}
            </p>
            <p className="mt-2 text-delta-lg text-slate-700">{AUTHORITY_APPROVER[level]}</p>
            <p className="mt-1 text-delta tabular-nums text-neutral">
              {formatInteger(pending)} {pending === 1 ? 'sugestão na faixa' : 'sugestões na faixa'}
              {level === USER_AUTHORITY ? ' · sua alçada' : ''}
            </p>
          </li>
        )
      })}
    </ul>
  )
}

export function Redistribution() {
  const [states, setStates] = useState<Readonly<Record<string, DecisionState>>>({})
  const submitForApproval = useDecisionWorkflow((store) => store.submitForApproval)
  const decisionState = useDecisionWorkflow((store) => store.stateOf(REDISTRIBUTION_DECISION_ID))

  const stateOf = (id: string): DecisionState => states[id] ?? INITIAL_STATE

  const move = (id: string, ...steps: readonly DecisionState[]) =>
    setStates((previous) => {
      const current = previous[id] ?? INITIAL_STATE
      const next = steps.reduce((state, step) => transition(state, step), current)
      return { ...previous, [id]: next }
    })

  const attachParcel = (suggestion: TransferSuggestion) =>
    submitForApproval(suggestion.decisionId, {
      id: `ag-transfer-${suggestion.id}`,
      source: 'ag',
      label: `Transferência de ${formatInteger(suggestion.unitsToTransfer)} amostras — ${suggestion.lot.batchCode} para ${suggestion.destination.holderName}`,
      amountBrl: suggestion.recoveredValueBrl,
      attestation: suggestion.attestation,
    })

  const approve = (suggestion: TransferSuggestion) => {
    attachParcel(suggestion)
    move(suggestion.id, 'in_approval', 'approved')
  }

  const escalate = (suggestion: TransferSuggestion) => {
    attachParcel(suggestion)
    move(suggestion.id, 'in_approval')
  }

  const reject = (suggestion: TransferSuggestion) => move(suggestion.id, 'rejected')

  const decision = findDecision(REDISTRIBUTION_DECISION_ID)
  const staleSources = [REDISTRIBUTION_ATTESTATION, LOSS_ATTESTATION].filter(isStale)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Redistribuição inteligente
          </h1>
          <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
            Mover a amostra antes do vencimento, não contabilizar a perda depois
          </p>
        </div>

        <span className="inline-flex items-center gap-2">
          <span className="text-delta text-neutral">{REDISTRIBUTION_DECISION_ID}</span>
          <StateChip
            label={DECISION_STATE_LABEL[decisionState]}
            tone={DECISION_STATE_TONE[decisionState]}
          />
        </span>
      </div>

      <DegradedBanner
        attestations={staleSources}
        consequence="A fila segue operável: as sugestões continuam ordenadas por valor recuperado, com confiança reduzida."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Valor total recuperável"
          value={formatMoneyFull(RECOVERABLE_VALUE_BRL)}
          attestation={REDISTRIBUTION_ATTESTATION}
          size="lg"
        />
        <KpiCard
          label="Unidades recuperáveis"
          value={formatInteger(RECOVERABLE_UNITS)}
          attestation={REDISTRIBUTION_ATTESTATION}
        />
        <KpiCard
          label="Sugestões abertas"
          value={formatInteger(OPEN_SUGGESTIONS)}
          attestation={REDISTRIBUTION_ATTESTATION}
        />
        <KpiCard
          label="Pendentes de alçada superior"
          value={formatInteger(SUGGESTIONS_ABOVE_USER_AUTHORITY)}
          attestation={REDISTRIBUTION_ATTESTATION}
        />
        <KpiCard
          label="Perda evitada no ciclo"
          value={formatMoneyFull(AVOIDED_LOSS_CYCLE_BRL)}
          attestation={LOSS_ATTESTATION}
        />
      </div>

      <Panel
        title="Fila preventiva de transferências"
        description="Ordenada por valor recuperado. Cada sugestão sai enquanto o lote ainda tem janela — não depois da baixa por vencimento"
        footer={
          <span>
            Aprovar ou encaminhar anexa a parcela de valor recuperado a{' '}
            <Link
              to={`/decisoes/${REDISTRIBUTION_DECISION_ID}`}
              className="font-medium underline"
              style={{ color: 'var(--product-accent)' }}
            >
              {REDISTRIBUTION_DECISION_ID}
            </Link>
            {decision ? ` — ${decision.title}` : ''}. Nenhuma sugestão vive fora de uma decisão.
          </span>
        }
      >
        <ol className="space-y-4">
          {TRANSFER_SUGGESTIONS.map((suggestion, index) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              rank={index + 1}
              state={stateOf(suggestion.id)}
              onApprove={approve}
              onEscalate={escalate}
              onReject={reject}
            />
          ))}
        </ol>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Panel
            title="Perda evitada × perda realizada"
            description="A curva que importa é a inversão: o que a fila preventiva recupera contra o que vence sem ninguém tocar"
            footer={<DataBadge attestation={LOSS_ATTESTATION} variant="full" />}
          >
            <LossChart />
            <p className="mt-3 text-delta-lg text-slate-700">
              Perda realizada no ciclo: {formatMoneyFull(REALIZED_LOSS_CYCLE_BRL)}{' '}
              <SemanticDelta
                value={REALIZED_LOSS_TREND_PERCENT}
                inverted
                size="sm"
                comparison="vs. o primeiro mês da série"
              />
            </p>
          </Panel>
        </div>

        <div className="lg:col-span-5">
          <Panel
            title="Alçada de aprovação"
            description="A faixa do valor recuperado define quem aprova"
            footer={
              <span>
                Acima da sua alçada a sugestão não é aprovada aqui: é encaminhada, e a tela diz para
                quem. Saldo que segue em risco mesmo com a fila inteira aprovada:{' '}
                {formatMoneyFull(RESIDUAL_VALUE_BRL)}.
              </span>
            }
          >
            <AuthorityLadder />
          </Panel>
        </div>
      </div>

      <Panel title="Ações">
        <div className="flex flex-wrap items-center gap-3">
          <FutureButton label="Dividir sugestão entre múltiplos destinos" phase="Fase 2" />
          <FutureButton label="Write-back da ordem de transferência ao ERP" phase="Fase 3" />
          <FutureButton label="Exportar fila de redistribuição" phase="Fase 2" />
          <span className="ml-auto">
            <DataBadge attestation={REDISTRIBUTION_ATTESTATION} variant="full" />
          </span>
        </div>
      </Panel>
    </div>
  )
}
