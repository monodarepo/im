import { ThreadRibbon } from '../../components/ThreadRibbon'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CHART_AXIS, CHART_BAR, CHART_CURSOR, CHART_GRID } from '../../design/chartTheme'
import { DataBadge } from '../../components/DataBadge'
import { DegradedBanner } from '../../components/DegradedBanner'
import { FutureButton } from '../../components/FutureButton'
import { KpiCard } from '../../components/KpiCard'
import { Panel } from '../../components/Panel'
import { StateChip } from '../../components/StateChip'
import { isStale } from '../../domain/attestation'
import { DECISION_STATE_LABEL, DECISION_STATE_TONE } from '../../domain/decision'
import { formatInteger, formatPercent } from '../../domain/format'
import { formatMoneyFull } from '../../domain/money'
import { formatDate, formatRelative } from '../../domain/today'
import { SEMANTIC, semanticColor } from '../../design/tokens'
import { POTENTIAL_TIER_LABEL, SPECIALTY_LABEL } from '../../mock/doctors'
import {
  ACCEPTANCE_ATTESTATION,
  ACCEPTANCE_FIELDS,
  ACCEPTANCE_FUTURE,
  ACCEPTANCE_RECORD,
  ACCEPTANCE_STATE_LABEL,
  ACCEPTANCE_STATE_TONE,
  acceptanceRateOf,
  AVAILABILITY_ATTESTATION,
  AWAITING_ACCEPTANCE,
  COVERAGE_ATTESTATION,
  coverageOf,
  CYCLE,
  DECISION_NOTE,
  DELIVERY_ATTESTATION,
  DELIVERY_QUEUE,
  DELIVERY_STATUS_DESCRIPTION,
  DELIVERY_STATUS_LABEL,
  DELIVERY_STATUS_ORDER,
  DELIVERY_STATUS_TONE,
  doctorOfDelivery,
  FIELD_APP,
  FIELD_ATTESTATIONS,
  FIELD_DECISION,
  FIELD_MANAGER,
  FIELD_REP,
  FIELD_REP_TERRITORY,
  FUTURE_ACTIONS,
  isTraceabilityGap,
  LOCAL_STOCK_ATTESTATION,
  NON_DELIVERY_BY_REASON,
  QUEUE_NOTE,
  QUEUE_SUMMARY,
  REASON_ATTESTATION,
  REASON_CHART_NOTE,
  REASON_LABEL,
  RECOMMENDATION_ATTESTATION,
  RECOMMENDATION_SCORE_PERCENT,
  recommendationDoctor,
  REP_EXECUTIONS,
  REP_TABLE_NOTE,
  SAMPLE_FACTORS,
  SAMPLE_RECOMMENDATION,
  TEAM_EXECUTION,
  TOTAL_NON_DELIVERIES,
  TRACEABILITY_PARCEL,
  UNRECORDED_DELIVERIES,
  UNRECORDED_REASON_DETAIL,
  UNRECORDED_REASON_LABEL,
  UNRECORDED_SHARE_PERCENT,
  UNTRACED_VALUE_BRL,
  type Delivery,
  type ReasonBar,
  type RepExecution,
  type SampleFactor,
} from '../../mock/agFieldExecution'
import { useDecisionWorkflow } from '../../state/decisionWorkflowStore'

const NEUTRAL_BAR = '#64748B'
const GAP_COLOR = SEMANTIC.attention

function CycleHeader() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Execução em campo
        </h1>
        <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
          A amostra só conta quando a entrega tem aceite — e a não entrega tem motivo
        </p>
      </div>
      <div className="text-right">
        <p className="text-delta-lg font-medium text-slate-700">{CYCLE.label}</p>
        <p className="text-delta tabular-nums text-neutral">
          {formatDate(CYCLE.startsOn)} a {formatDate(CYCLE.endsOn)} · dia{' '}
          {formatInteger(CYCLE.elapsedDays)} de {formatInteger(CYCLE.lengthDays)}
        </p>
      </div>
    </div>
  )
}

function KpiRow() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <KpiCard
        label="Entregas registradas no ciclo"
        value={formatInteger(TEAM_EXECUTION.deliveries)}
        attestation={DELIVERY_ATTESTATION}
      />
      <KpiCard
        label="Taxa de aceite"
        value={formatPercent(TEAM_EXECUTION.acceptanceRatePercent)}
        attestation={ACCEPTANCE_ATTESTATION}
      />
      <KpiCard
        label="Amostras sem baixa de entrega"
        value={formatInteger(TEAM_EXECUTION.samplesWithoutReceipt)}
        attestation={LOCAL_STOCK_ATTESTATION}
      />
      <KpiCard
        label="Cobertura de médicos visitados"
        value={formatPercent(TEAM_EXECUTION.coveragePercent)}
        attestation={COVERAGE_ATTESTATION}
      />
      <KpiCard
        label="Representantes ativos"
        value={formatInteger(TEAM_EXECUTION.reps)}
        attestation={DELIVERY_ATTESTATION}
      />
    </div>
  )
}

function ReasonCell({ delivery }: { delivery: Delivery }) {
  if (delivery.reason) {
    return <span className="text-slate-700">{REASON_LABEL[delivery.reason]}</span>
  }

  if (isTraceabilityGap(delivery)) {
    return (
      <span className="font-semibold" style={{ color: GAP_COLOR }}>
        {UNRECORDED_REASON_LABEL}
      </span>
    )
  }

  return (
    <span className="text-neutral" aria-hidden>
      —
    </span>
  )
}

function DeliveryRow({ delivery }: { delivery: Delivery }) {
  const doctor = doctorOfDelivery(delivery)
  if (!doctor) return null

  const gap = isTraceabilityGap(delivery)

  return (
    <tr className="text-delta-lg" style={gap ? { backgroundColor: `${GAP_COLOR}0F` } : undefined}>
      <td className="py-2.5 pr-3 tabular-nums text-neutral">{delivery.id}</td>
      <td className="py-2.5 px-3">
        <span className="block font-medium text-slate-900">{doctor.name}</span>
        <span className="block text-delta text-neutral">{SPECIALTY_LABEL[doctor.specialty]}</span>
      </td>
      <td className="py-2.5 px-3 text-slate-700">{delivery.skuName}</td>
      <td className="py-2.5 px-3 text-right font-medium tabular-nums text-slate-900">
        {formatInteger(delivery.quantity)}
      </td>
      <td className="py-2.5 px-3 text-right tabular-nums text-slate-700">
        <span className="block">{formatDate(delivery.date)}</span>
        <span className="block text-delta text-neutral">{formatRelative(delivery.date)}</span>
      </td>
      <td className="py-2.5 px-3">
        <StateChip
          label={DELIVERY_STATUS_LABEL[delivery.status]}
          tone={DELIVERY_STATUS_TONE[delivery.status]}
        />
      </td>
      <td className="py-2.5 pl-3">
        <ReasonCell delivery={delivery} />
        <span className="mt-0.5 block text-delta leading-snug text-neutral">{delivery.note}</span>
      </td>
    </tr>
  )
}

function DeliveryQueue() {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left">
          <thead>
            <tr className="border-b border-surface-border text-delta text-neutral">
              <th className="pb-2 pr-3 font-medium">Registro</th>
              <th className="pb-2 px-3 font-medium">Médico</th>
              <th className="pb-2 px-3 font-medium">Produto</th>
              <th className="pb-2 px-3 text-right font-medium">Amostras</th>
              <th className="pb-2 px-3 text-right font-medium">Data</th>
              <th className="pb-2 px-3 font-medium">Situação</th>
              <th className="pb-2 pl-3 font-medium">Motivo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {DELIVERY_QUEUE.map((delivery) => (
              <DeliveryRow key={delivery.id} delivery={delivery} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {DELIVERY_STATUS_ORDER.map((status) => (
          <div
            key={status}
            className="rounded-control border border-surface-border px-3 py-2"
            style={{ borderLeftWidth: 3, borderLeftColor: semanticColor(DELIVERY_STATUS_TONE[status]) }}
          >
            <p className="flex items-baseline justify-between gap-2">
              <span className="text-delta-lg font-medium text-slate-900">
                {DELIVERY_STATUS_LABEL[status]}
              </span>
              <span className="text-delta-lg font-semibold tabular-nums text-slate-900">
                {formatInteger(QUEUE_SUMMARY.byStatus[status])}
              </span>
            </p>
            <p className="mt-1 text-delta leading-relaxed text-neutral">
              {DELIVERY_STATUS_DESCRIPTION[status]}
            </p>
          </div>
        ))}
      </div>

      <p className="text-delta leading-relaxed text-neutral">{QUEUE_NOTE}</p>
    </div>
  )
}

function FactorRow({ factor }: { factor: SampleFactor }) {
  return (
    <li className="rounded-control border border-surface-border px-3 py-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="inline-flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: semanticColor(factor.tone) }}
            aria-hidden
          />
          <span className="text-delta-lg font-medium text-slate-900">{factor.label}</span>
        </span>
        <span className="text-delta-lg font-semibold tabular-nums text-slate-900">
          {factor.reading}
        </span>
      </div>

      <p className="mt-1 text-delta leading-relaxed text-neutral">{factor.detail}</p>

      <div className="mt-2 flex items-center gap-2">
        <span className="h-1.5 flex-1 rounded-full bg-slate-100">
          <span
            className="block h-1.5 rounded-full bg-slate-500"
            style={{ width: `${factor.scorePercent}%` }}
          />
        </span>
        <span className="w-28 shrink-0 text-right text-delta tabular-nums text-neutral">
          {formatPercent(factor.scorePercent, 0)} · peso {formatPercent(factor.weightPercent, 0)}
        </span>
      </div>
    </li>
  )
}

function NextBestSample() {
  const doctor = recommendationDoctor()

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-surface-border bg-slate-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-delta text-neutral">Médico da vez · visita de hoje</p>
            <p className="mt-0.5 text-delta-lg font-semibold text-slate-900">{doctor.name}</p>
            <p className="text-delta text-neutral">
              {SPECIALTY_LABEL[doctor.specialty]} · {POTENTIAL_TIER_LABEL[doctor.potentialTier]}
            </p>
          </div>
          <div className="text-right">
            <p className="text-delta text-neutral">Escore da recomendação</p>
            <p className="text-kpi tabular-nums text-slate-900">
              {formatPercent(RECOMMENDATION_SCORE_PERCENT, 0)}
            </p>
          </div>
        </div>

        <div className="mt-3 border-t border-surface-border pt-3">
          <p className="text-delta text-neutral">Amostra recomendada</p>
          <p className="text-delta-lg font-semibold text-slate-900">
            {SAMPLE_RECOMMENDATION.headline}
          </p>
          <div className="mt-1.5 space-y-0.5">
            {SAMPLE_RECOMMENDATION.reason.map((line) => (
              <p key={line} className="text-delta-lg text-slate-700">
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-delta font-semibold uppercase tracking-wide text-neutral">
          Por que esta amostra, nesta quantidade
        </h3>
        <ul className="mt-3 grid gap-2 xl:grid-cols-2">
          {SAMPLE_FACTORS.map((factor) => (
            <FactorRow key={factor.id} factor={factor} />
          ))}
        </ul>
      </div>

      <div
        className="rounded-control border px-3 py-2.5"
        style={{ borderColor: `${GAP_COLOR}66`, backgroundColor: `${GAP_COLOR}0F` }}
      >
        <p className="text-delta font-semibold uppercase tracking-wide text-neutral">
          O que zera a recomendação
        </p>
        <p className="mt-1 text-delta-lg leading-relaxed text-slate-700">
          {SAMPLE_RECOMMENDATION.blocker}
        </p>
      </div>

      <div className="rounded-control border border-surface-border px-3 py-2.5">
        <p className="text-delta text-neutral">Ação recomendada</p>
        <p className="text-delta-lg font-semibold text-slate-900">{SAMPLE_RECOMMENDATION.action}</p>
        <p className="mt-1 text-delta text-neutral">
          Executa a decisão{' '}
          <Link
            to={`/decisoes/${SAMPLE_RECOMMENDATION.decisionId}`}
            className="font-medium underline"
            style={{ color: 'var(--product-accent)' }}
          >
            {SAMPLE_RECOMMENDATION.decisionId}
          </Link>{' '}
          — {FIELD_DECISION.title}.
        </p>
      </div>
    </div>
  )
}

function AcceptancePanel() {
  const state = ACCEPTANCE_RECORD.state

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-surface-border bg-slate-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-delta font-semibold uppercase tracking-widest text-neutral">
              {ACCEPTANCE_RECORD.deliveryId}
            </p>
            <p className="mt-0.5 text-delta-lg text-slate-700">{ACCEPTANCE_RECORD.method}</p>
          </div>
          <StateChip
            label={ACCEPTANCE_STATE_LABEL[state]}
            tone={ACCEPTANCE_STATE_TONE[state]}
          />
        </div>

        <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {ACCEPTANCE_FIELDS.map((field) => (
            <div key={field.id}>
              <dt className="text-delta text-neutral">{field.label}</dt>
              <dd className="mt-0.5 text-delta-lg font-medium text-slate-900">{field.value}</dd>
              <dd className="text-delta text-neutral">{field.origin}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-3 border-t border-surface-border pt-3 text-delta tabular-nums text-neutral">
          Registrado em {formatDate(ACCEPTANCE_RECORD.registeredOn)} às{' '}
          {ACCEPTANCE_RECORD.capturedAt} · {formatRelative(ACCEPTANCE_RECORD.registeredOn)}
        </p>
      </div>

      <div>
        <h3 className="text-delta font-semibold uppercase tracking-wide text-neutral">
          Entregas aguardando aceite
        </h3>
        <ul className="mt-2 space-y-2">
          {AWAITING_ACCEPTANCE.map((delivery) => {
            const doctor = doctorOfDelivery(delivery)
            return (
              <li
                key={delivery.id}
                className="rounded-control border border-surface-border px-3 py-2"
                style={{ borderLeftWidth: 3, borderLeftColor: GAP_COLOR }}
              >
                <p className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-delta-lg font-medium text-slate-900">
                    {doctor?.name ?? delivery.doctorId}
                  </span>
                  <span className="text-delta tabular-nums text-neutral">
                    {delivery.id} · {formatInteger(delivery.quantity)} amostras
                  </span>
                </p>
                <p className="mt-0.5 text-delta leading-relaxed text-neutral">{delivery.note}</p>
              </li>
            )
          })}
        </ul>
      </div>

      <p className="text-delta leading-relaxed text-neutral">{ACCEPTANCE_RECORD.note}</p>

      <div className="flex flex-wrap items-center gap-3">
        {ACCEPTANCE_FUTURE.map((action) => (
          <FutureButton key={action.label} label={action.label} phase={action.phase} />
        ))}
      </div>
    </div>
  )
}

type ReasonTooltipEntry = { value?: number; payload?: ReasonBar }

function ReasonTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: ReasonTooltipEntry[]
}) {
  const first = payload?.[0]
  if (!active || !first?.payload) return null

  return (
    <div className="max-w-xs rounded-control border border-surface-border bg-surface-card px-3 py-2 shadow-sm">
      <p className="text-delta font-medium text-slate-900">{first.payload.label}</p>
      <p className="mt-0.5 text-delta tabular-nums text-slate-700">
        {formatInteger(first.payload.deliveries)} entregas não concluídas
      </p>
      <p className="mt-1 text-delta leading-relaxed text-neutral">{first.payload.detail}</p>
    </div>
  )
}

function NonDeliveryChart() {
  const data = [...NON_DELIVERY_BY_REASON]

  return (
    <div className="space-y-4">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid {...CHART_GRID} vertical horizontal={false} />
            <XAxis {...CHART_AXIS} type="number" />
            <YAxis {...CHART_AXIS} type="category" dataKey="label" width={180} />
            <Tooltip content={<ReasonTooltip />} cursor={CHART_CURSOR} />
            <Bar {...CHART_BAR} dataKey="deliveries" barSize={18} radius={[0, 2, 2, 0]}>
              {data.map((bar) => (
                <Cell key={bar.id} fill={bar.gap ? GAP_COLOR : NEUTRAL_BAR} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div
        className="rounded-control border px-3 py-2.5"
        style={{ borderColor: `${GAP_COLOR}66`, backgroundColor: `${GAP_COLOR}0F` }}
      >
        <p className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-delta-lg font-medium text-slate-900">
            {UNRECORDED_REASON_LABEL}
          </span>
          <span className="text-delta-lg font-semibold tabular-nums" style={{ color: GAP_COLOR }}>
            {formatInteger(UNRECORDED_DELIVERIES)} de {formatInteger(TOTAL_NON_DELIVERIES)} ·{' '}
            {formatPercent(UNRECORDED_SHARE_PERCENT)}
          </span>
        </p>
        <p className="mt-1 text-delta leading-relaxed text-slate-700">
          {UNRECORDED_REASON_DETAIL}
        </p>
      </div>

      <p className="text-delta leading-relaxed text-neutral">{REASON_CHART_NOTE}</p>
    </div>
  )
}

function FieldAppFrame() {
  return (
    <div>
      <div className="mx-auto w-[272px]">
        <div className="rounded-[2.4rem] border-[10px] border-slate-900 bg-slate-900 shadow-xl">
          <div
            className="pointer-events-none relative select-none overflow-hidden rounded-[1.7rem] bg-slate-50"
            aria-hidden
          >
            <span className="absolute left-1/2 top-0 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-slate-900" />

            <div className="flex items-center justify-between px-4 pb-1 pt-1.5 text-delta font-medium tabular-nums text-slate-900">
              <span>{FIELD_APP.statusTime}</span>
              <span className="flex items-center gap-1.5">
                <span>{FIELD_APP.networkLabel}</span>
                <span>{FIELD_APP.batteryLabel}</span>
              </span>
            </div>

            <div
              className="px-4 py-3 text-white"
              style={{ backgroundColor: 'var(--product-accent)' }}
            >
              <p className="text-delta uppercase tracking-widest opacity-80">
                {FIELD_APP.appName}
              </p>
              <p className="mt-0.5 text-sm font-semibold">{FIELD_APP.screenTitle}</p>
              <p className="mt-0.5 text-delta opacity-90">{FIELD_APP.repName}</p>
            </div>

            <div className="space-y-3 px-3 py-3">
              <div className="rounded-control border border-surface-border bg-surface-card p-3">
                <p className="text-delta tabular-nums text-neutral">
                  {FIELD_APP.visit.positionLabel}
                </p>
                <p className="mt-0.5 text-delta-lg font-semibold leading-snug text-slate-900">
                  {FIELD_APP.visit.doctorName}
                </p>
                <p className="mt-0.5 text-delta text-neutral">
                  {FIELD_APP.visit.specialtyLabel} · {FIELD_APP.visit.placeLabel}
                </p>
                <div className="mt-2 border-t border-surface-border pt-2">
                  <p className="text-delta tabular-nums text-slate-700">
                    {FIELD_APP.visit.windowLabel}
                  </p>
                </div>
              </div>

              <div className="rounded-control border border-surface-border bg-surface-card p-3">
                <p className="text-delta font-semibold uppercase tracking-wide text-neutral">
                  Amostra recomendada
                </p>
                <p className="mt-1 text-delta-lg font-semibold leading-snug text-slate-900">
                  {FIELD_APP.recommendation.title}
                </p>
                <p className="text-delta-lg font-semibold tabular-nums text-slate-900">
                  {FIELD_APP.recommendation.quantityLabel}
                </p>
                <p className="mt-1 text-delta leading-snug text-neutral">
                  {FIELD_APP.recommendation.reasonLabel}
                </p>
                <p className="mt-1 text-delta tabular-nums leading-snug text-neutral">
                  {FIELD_APP.stockLabel}
                </p>
              </div>

              <div>
                <div
                  className="rounded-control px-3 py-2 text-center text-delta-lg font-semibold text-white"
                  style={{ backgroundColor: 'var(--product-accent)' }}
                >
                  {FIELD_APP.primaryActionLabel}
                </div>
                <div className="mt-1.5 rounded-control border border-surface-border bg-surface-card px-3 py-2 text-center text-delta font-medium text-slate-700">
                  {FIELD_APP.secondaryActionLabel}
                </div>
                <p className="mt-2 text-center text-delta leading-snug text-neutral">
                  {FIELD_APP.captureHint}
                </p>
              </div>
            </div>

            <div className="flex justify-center pb-2">
              <span className="h-1 w-20 rounded-full bg-slate-300" />
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 text-delta leading-relaxed text-neutral">{FIELD_APP.readOnlyNote}</p>
    </div>
  )
}

function RepRow({ rep }: { rep: RepExecution }) {
  return (
    <tr className="text-delta-lg">
      <td className="py-3 pr-3">
        <span className="block font-medium text-slate-900">{rep.holderName}</span>
        <span className="block text-delta text-neutral">{rep.region}</span>
      </td>
      <td className="py-3 px-3 text-right tabular-nums text-slate-700">
        {formatInteger(rep.deliveries)}
      </td>
      <td className="py-3 px-3 text-right tabular-nums text-slate-700">
        {formatInteger(rep.samples)}
      </td>
      <td className="py-3 px-3 text-right tabular-nums text-slate-900">
        {formatInteger(rep.acceptedDeliveries)}
      </td>
      <td className="py-3 px-3 text-right font-semibold tabular-nums text-slate-900">
        {formatPercent(acceptanceRateOf(rep))}
      </td>
      <td className="py-3 px-3 text-right tabular-nums text-slate-700">
        {formatInteger(rep.doctorsVisited)} de {formatInteger(rep.doctorsTarget)}
      </td>
      <td className="py-3 px-3 text-right tabular-nums text-slate-700">
        {formatPercent(coverageOf(rep))}
      </td>
      <td className="py-3 pl-3 text-right font-semibold tabular-nums" style={{ color: GAP_COLOR }}>
        {formatInteger(rep.samplesWithoutReceipt)}
      </td>
    </tr>
  )
}

function RepTable() {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left">
          <thead>
            <tr className="border-b border-surface-border text-delta text-neutral">
              <th className="pb-2 pr-3 font-medium">Representante</th>
              <th className="pb-2 px-3 text-right font-medium">Entregas</th>
              <th className="pb-2 px-3 text-right font-medium">Amostras</th>
              <th className="pb-2 px-3 text-right font-medium">Aceites</th>
              <th className="pb-2 px-3 text-right font-medium">Taxa de aceite</th>
              <th className="pb-2 px-3 text-right font-medium">Médicos visitados</th>
              <th className="pb-2 px-3 text-right font-medium">Cobertura</th>
              <th className="pb-2 pl-3 text-right font-medium">Sem baixa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {REP_EXECUTIONS.map((rep) => (
              <RepRow key={rep.holderId} rep={rep} />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-surface-border text-delta-lg font-semibold">
              <td className="py-3 pr-3 text-slate-900">
                Equipe
                <span className="ml-1 text-delta font-normal text-neutral">
                  ({formatInteger(TEAM_EXECUTION.reps)} representantes)
                </span>
              </td>
              <td className="py-3 px-3 text-right tabular-nums text-slate-900">
                {formatInteger(TEAM_EXECUTION.deliveries)}
              </td>
              <td className="py-3 px-3 text-right tabular-nums text-slate-900">
                {formatInteger(TEAM_EXECUTION.samples)}
              </td>
              <td className="py-3 px-3 text-right tabular-nums text-slate-900">
                {formatInteger(TEAM_EXECUTION.acceptedDeliveries)}
              </td>
              <td className="py-3 px-3 text-right tabular-nums text-slate-900">
                {formatPercent(TEAM_EXECUTION.acceptanceRatePercent)}
              </td>
              <td className="py-3 px-3 text-right tabular-nums text-slate-900">
                {formatInteger(TEAM_EXECUTION.doctorsVisited)} de{' '}
                {formatInteger(TEAM_EXECUTION.doctorsTarget)}
              </td>
              <td className="py-3 px-3 text-right tabular-nums text-slate-900">
                {formatPercent(TEAM_EXECUTION.coveragePercent)}
              </td>
              <td className="py-3 pl-3 text-right tabular-nums" style={{ color: GAP_COLOR }}>
                {formatInteger(TEAM_EXECUTION.samplesWithoutReceipt)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-delta leading-relaxed text-neutral">{REP_TABLE_NOTE}</p>
    </div>
  )
}

function DecisionActions() {
  const submitForApproval = useDecisionWorkflow((state) => state.submitForApproval)
  const decisionState = useDecisionWorkflow((state) => state.stateOf(FIELD_DECISION.id))
  const parcels = useDecisionWorkflow((state) => state.parcelsOf(FIELD_DECISION.id))
  const submitted = parcels.some((parcel) => parcel.id === TRACEABILITY_PARCEL.id)

  return (
    <div className="space-y-4">
      <p className="text-delta-lg leading-relaxed text-slate-700">{DECISION_NOTE}</p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={submitted}
          onClick={() =>
            submitForApproval(FIELD_DECISION.id, {
              id: TRACEABILITY_PARCEL.id,
              source: TRACEABILITY_PARCEL.source,
              label: TRACEABILITY_PARCEL.label,
              amountBrl: TRACEABILITY_PARCEL.amountBrl,
              attestation: TRACEABILITY_PARCEL.attestation,
            })
          }
          className={`rounded-control px-3 py-2 text-delta-lg font-medium transition-colors ${
            submitted
              ? 'cursor-default border border-surface-border bg-slate-50 text-neutral'
              : 'text-white'
          }`}
          style={submitted ? undefined : { backgroundColor: 'var(--product-accent)' }}
        >
          {submitted ? 'Exceção anexada à decisão' : 'Anexar exceção de rastreabilidade'}
        </button>

        {FUTURE_ACTIONS.map((action) => (
          <FutureButton key={action.label} label={action.label} phase={action.phase} />
        ))}

        <span className="ml-auto inline-flex items-center gap-2">
          <span className="text-delta text-neutral">{FIELD_DECISION.id}</span>
          <StateChip
            label={DECISION_STATE_LABEL[decisionState]}
            tone={DECISION_STATE_TONE[decisionState]}
          />
        </span>
      </div>

      <p className="text-delta leading-relaxed text-neutral">
        {submitted ? (
          <>
            Parcela de {formatMoneyFull(UNTRACED_VALUE_BRL)} anexada a{' '}
            <Link
              to={`/decisoes/${FIELD_DECISION.id}`}
              className="font-medium underline"
              style={{ color: 'var(--product-accent)' }}
            >
              {FIELD_DECISION.id}
            </Link>
            . Acompanhamento com {FIELD_MANAGER.name} — {FIELD_MANAGER.area}.
          </>
        ) : (
          <>
            Anexar cria a parcela de {formatMoneyFull(UNTRACED_VALUE_BRL)} em {FIELD_DECISION.id}:
            é o custo das {formatInteger(TEAM_EXECUTION.samplesWithoutReceipt)} amostras que saíram
            da filial e não têm registro de entrega.
          </>
        )}
      </p>
    </div>
  )
}

export function FieldExecution() {
  const stale = FIELD_ATTESTATIONS.filter(isStale)

  return (
    <div className="space-y-5">
      <ThreadRibbon step="execution" />
      <CycleHeader />

      <DegradedBanner
        attestations={stale}
        consequence="A fila de entregas segue operável: o que cai é a confiança do número, não o registro de campo."
      />

      <KpiRow />

      <Panel
        title="Fila de entregas do ciclo"
        description={`Carteira de ${FIELD_REP.name} · ${FIELD_REP_TERRITORY}`}
        action={
          <span className="text-delta tabular-nums text-neutral">
            {formatInteger(QUEUE_SUMMARY.concludedSamples)} amostras entregues ·{' '}
            {formatInteger(QUEUE_SUMMARY.openSamples)} em aberto
          </span>
        }
        footer={<DataBadge attestation={DELIVERY_ATTESTATION} variant="full" />}
      >
        <DeliveryQueue />
      </Panel>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <Panel
            title="Copiloto — próxima amostra"
            description="Qual amostra entregar ao médico da vez, quantas, e por quê"
            footer={<DataBadge attestation={RECOMMENDATION_ATTESTATION} variant="full" />}
          >
            <NextBestSample />
          </Panel>
        </div>

        <div className="xl:col-span-4">
          <Panel
            title="App de campo"
            description="Como o representante vê a entrega do dia"
            action={<StateChip label={FIELD_APP.readOnlyLabel} tone="neutral" />}
            footer={<DataBadge attestation={DELIVERY_ATTESTATION} />}
          >
            <FieldAppFrame />
          </Panel>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Panel
            title="Aceite do médico"
            description="Comprovante eletrônico da entrega, capturado em campo"
            footer={<DataBadge attestation={ACCEPTANCE_ATTESTATION} variant="full" />}
          >
            <AcceptancePanel />
          </Panel>
        </div>

        <div className="xl:col-span-5">
          <Panel
            title="Não entregas por motivo"
            description={`${formatInteger(TOTAL_NON_DELIVERIES)} entregas não concluídas no ciclo`}
            footer={
              <div className="flex flex-wrap items-center gap-3">
                <DataBadge attestation={REASON_ATTESTATION} />
                <span className="ml-auto">
                  <DataBadge attestation={AVAILABILITY_ATTESTATION} />
                </span>
              </div>
            }
          >
            <NonDeliveryChart />
          </Panel>
        </div>
      </div>

      <Panel
        title="Execução por representante"
        description="Entregas, aceites e cobertura no ciclo corrente"
        footer={<DataBadge attestation={COVERAGE_ATTESTATION} variant="full" />}
      >
        <RepTable />
      </Panel>

      <Panel title="Ações" footer={<DataBadge attestation={DELIVERY_ATTESTATION} variant="full" />}>
        <DecisionActions />
      </Panel>
    </div>
  )
}
