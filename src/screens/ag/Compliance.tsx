import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { DataBadge } from '../../components/DataBadge'
import { FutureButton } from '../../components/FutureButton'
import { KpiCard } from '../../components/KpiCard'
import { Panel } from '../../components/Panel'
import { StateChip } from '../../components/StateChip'
import { SEMANTIC, type SemanticTone } from '../../design/tokens'
import { formatDecimal, formatInteger, formatPercent } from '../../domain/format'
import { formatDate, formatRelative } from '../../domain/today'
import {
  AUDIT_EXPORT_PHASE,
  AVERAGE_REGULARIZATION_DAYS,
  COMPLIANCE_ATTESTATION,
  COMPLIANCE_OWNER,
  CONSENT_ATTESTATION,
  CONSENT_BUCKETS,
  CONSENT_INELIGIBLE_DOCTORS,
  CONSENT_STATUS_LABEL,
  CONSENT_STATUS_ORDER,
  CONSENT_TARGET_DOCTORS,
  CONSENT_VALID_DOCTORS,
  CONSENT_VALID_PERCENT,
  CONSENT_VALIDITY_DAYS,
  CONSENTS_REQUIRING_ACTION,
  CRITICAL_DEVIATIONS,
  CYCLE_TRACEABILITY,
  DEFAULT_TRACE_LOT_ID,
  DEVIATION_ALERTS,
  DEVIATION_ATTESTATION,
  DEVIATION_SEVERITY_LABEL,
  DEVIATION_TYPE_LABEL,
  DOCTOR_CONSENTS,
  LOT_TRACES,
  LOTS_IN_CYCLE,
  LOTS_WITH_GAP,
  missingSteps,
  OPEN_DEVIATIONS,
  TRACE_ATTESTATION,
  TRACE_INTEGRITY_LABEL,
  TRACE_STAGE_LABEL,
  TRACE_STEP_STATUS_LABEL,
  TRACEABILITY_ATTESTATION,
  TRACEABILITY_PERCENT,
  traceOf,
  type ConsentStatus,
  type DeviationAlert,
  type DeviationSeverity,
  type DoctorConsent,
  type LotTrace,
  type TraceIntegrity,
  type TraceStepStatus,
} from '../../mock/compliance'

const STEP_TONE: Record<TraceStepStatus, SemanticTone> = {
  registered: 'positive',
  pending: 'attention',
  divergent: 'negative',
}

const INTEGRITY_TONE: Record<TraceIntegrity, SemanticTone> = {
  complete: 'positive',
  gap: 'attention',
  divergent: 'negative',
  blocked: 'neutral',
}

const SEVERITY_TONE: Record<DeviationSeverity, SemanticTone> = {
  critical: 'negative',
  attention: 'attention',
  informative: 'neutral',
}

const CONSENT_TONE: Record<ConsentStatus, SemanticTone> = {
  valid: 'positive',
  expiring: 'attention',
  expired: 'negative',
  missing: 'negative',
}

/** Série neutra: a barra mede rastreabilidade, não desempenho de produto. */
const CYCLE_BAR_COLOR = '#334155'

const CONSENT_VALIDITY_MONTHS = Math.round(CONSENT_VALIDITY_DAYS / 30.4)

function StepDate({ date }: { date: string | null }) {
  if (!date) {
    return <span className="text-neutral">sem registro</span>
  }
  return (
    <span className="tabular-nums text-slate-600">
      {formatDate(date)}
      <span className="ml-2 text-delta text-neutral">{formatRelative(date)}</span>
    </span>
  )
}

function TraceTimeline({ trace }: { trace: LotTrace }) {
  return (
    <ol className="ml-1 space-y-5 border-l border-surface-border pl-6">
      {trace.steps.map((step, index) => (
        <li key={step.stage} className="relative">
          <span
            className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-surface-card"
            style={{ backgroundColor: SEMANTIC[STEP_TONE[step.status]] }}
            aria-hidden
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-delta-lg font-semibold text-slate-900">
              <span className="mr-2 tabular-nums text-neutral">{index + 1}.</span>
              {TRACE_STAGE_LABEL[step.stage]}
            </p>
            <StateChip
              label={TRACE_STEP_STATUS_LABEL[step.status]}
              tone={STEP_TONE[step.status]}
            />
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-delta-lg">
            <span className="font-medium text-slate-700">{step.owner}</span>
            <span aria-hidden className="text-neutral">
              ·
            </span>
            <span className="text-slate-600">{step.place}</span>
            <span aria-hidden className="text-neutral">
              ·
            </span>
            <StepDate date={step.date} />
            {step.units !== null ? (
              <>
                <span aria-hidden className="text-neutral">
                  ·
                </span>
                <span className="tabular-nums text-slate-600">
                  {formatInteger(step.units)} unid.
                </span>
              </>
            ) : null}
          </div>

          <p className="mt-1 text-delta text-neutral">{step.note}</p>
        </li>
      ))}
    </ol>
  )
}

function ConsentBuckets() {
  return (
    <ul className="space-y-3">
      {CONSENT_STATUS_ORDER.map((status) => {
        const bucket = CONSENT_BUCKETS.find((item) => item.status === status)
        if (!bucket) return null
        const share = (bucket.doctors / CONSENT_TARGET_DOCTORS) * 100

        return (
          <li key={status} className="rounded-card border border-surface-border p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <StateChip label={CONSENT_STATUS_LABEL[status]} tone={CONSENT_TONE[status]} />
              <span className="text-delta-lg font-semibold tabular-nums text-slate-900">
                {formatInteger(bucket.doctors)}
                <span className="ml-2 text-delta font-normal text-neutral">
                  {formatPercent(share, 1)} da base
                </span>
              </span>
            </div>
            <p className="mt-1.5 text-delta text-slate-600">{bucket.note}</p>
            <span className="mt-2 block h-1.5 w-full rounded-full bg-slate-100">
              <span
                className="block h-1.5 rounded-full"
                style={{
                  width: `${Math.max(1, share)}%`,
                  backgroundColor: SEMANTIC[CONSENT_TONE[status]],
                }}
              />
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function consentRank(consent: DoctorConsent): number {
  return CONSENT_STATUS_ORDER.indexOf(consent.status)
}

function ConsentTable() {
  const rows = [...DOCTOR_CONSENTS].sort((left, right) => consentRank(left) - consentRank(right))

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left">
        <thead>
          <tr className="border-b border-surface-border text-delta text-neutral">
            <th className="pb-2 font-medium">Médico</th>
            <th className="pb-2 font-medium">Especialidade</th>
            <th className="pb-2 font-medium">UF</th>
            <th className="pb-2 font-medium">Registro</th>
            <th className="pb-2 font-medium">Validade</th>
            <th className="pb-2 font-medium">Situação</th>
            <th className="pb-2 font-medium">Elegível</th>
            <th className="pb-2 font-medium">Ação exigida</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {rows.map((consent) => (
            <tr key={consent.doctorId} className="text-delta-lg transition-colors hover:bg-slate-50">
              <td className="py-2.5 font-medium text-slate-900">{consent.doctorName}</td>
              <td className="py-2.5 text-slate-600">{consent.specialtyLabel}</td>
              <td className="py-2.5 text-slate-600">{consent.uf}</td>
              <td className="py-2.5 text-slate-600">
                {consent.signedOn ? (
                  <span className="tabular-nums">{formatDate(consent.signedOn)}</span>
                ) : (
                  <span className="text-neutral">sem termo</span>
                )}
                <span className="ml-2 text-delta text-neutral">{consent.channel}</span>
              </td>
              <td className="py-2.5 text-slate-600">
                {consent.validUntil ? (
                  <>
                    <span className="tabular-nums">{formatDate(consent.validUntil)}</span>
                    <span className="ml-2 text-delta text-neutral">
                      {formatRelative(consent.validUntil)}
                    </span>
                  </>
                ) : (
                  <span className="text-neutral">—</span>
                )}
              </td>
              <td className="py-2.5">
                <StateChip
                  label={CONSENT_STATUS_LABEL[consent.status]}
                  tone={CONSENT_TONE[consent.status]}
                />
              </td>
              <td
                className="py-2.5 font-medium"
                style={{ color: consent.eligible ? SEMANTIC.positive : SEMANTIC.negative }}
              >
                {consent.eligible ? 'Sim' : 'Não'}
              </td>
              <td className="py-2.5 text-delta text-slate-600">{consent.requiredAction}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DeviationCard({ alert }: { alert: DeviationAlert }) {
  const tone = SEVERITY_TONE[alert.severity]

  return (
    <li
      className="rounded-card border border-surface-border p-4"
      style={{ borderLeftWidth: 3, borderLeftColor: SEMANTIC[tone] }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-delta-lg font-semibold text-slate-900">{alert.detected}</p>
          <p className="mt-0.5 text-delta text-neutral">
            {DEVIATION_TYPE_LABEL[alert.type]} · {alert.holder}
            {alert.lotCode ? ` · lote ${alert.lotCode}` : ''} · detectado{' '}
            {formatRelative(alert.detectedOn)}
          </p>
        </div>
        <StateChip label={DEVIATION_SEVERITY_LABEL[alert.severity]} tone={tone} />
      </div>

      <p className="mt-2 text-delta-lg text-slate-700">{alert.detail}</p>

      <dl className="mt-3 flex flex-wrap items-baseline gap-2 text-delta-lg">
        <dt className="shrink-0 text-neutral">Ação sugerida:</dt>
        <dd className="text-slate-900">{alert.suggestedAction}</dd>
      </dl>

      {alert.link || alert.decisionId ? (
        <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-surface-border pt-3">
          {alert.link ? (
            <Link
              to={alert.link.route}
              className="text-delta-lg font-medium underline"
              style={{ color: 'var(--product-accent)' }}
            >
              {alert.link.label} →
            </Link>
          ) : null}
          {alert.decisionId ? (
            <span className="text-delta text-neutral">
              Ação vinculada a{' '}
              <Link
                to={`/decisoes/${alert.decisionId}`}
                className="font-medium underline"
                style={{ color: 'var(--product-accent)' }}
              >
                {alert.decisionId}
              </Link>
            </span>
          ) : null}
          <span className="ml-auto">
            <DataBadge attestation={alert.attestation} />
          </span>
        </div>
      ) : (
        <div className="mt-3 border-t border-surface-border pt-3">
          <DataBadge attestation={alert.attestation} />
        </div>
      )}
    </li>
  )
}

function CycleChart() {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={[...CYCLE_TRACEABILITY]}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: '#E2E8F0' }}
            tick={{ fill: '#64748B', fontSize: 12 }}
          />
          <YAxis
            width={48}
            domain={[80, 100]}
            ticks={[80, 85, 90, 95, 100]}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#64748B', fontSize: 12 }}
            tickFormatter={(value: number) => formatPercent(value, 0)}
          />
          <Tooltip
            cursor={{ fill: '#F1F5F9' }}
            formatter={(value: number) => [formatPercent(value, 1), 'Trilhas íntegras']}
            contentStyle={{ fontSize: 12, borderRadius: 12, borderColor: '#E2E8F0' }}
          />
          <Bar dataKey="traceabilityPercent" fill={CYCLE_BAR_COLOR} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function Compliance() {
  const [lotId, setLotId] = useState<string>(DEFAULT_TRACE_LOT_ID)
  const trace = traceOf(lotId) ?? LOT_TRACES[0]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Compliance e rastreabilidade
          </h1>
          <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
            Onde a amostra esteve, quem respondeu por ela e o que ficou sem registro
          </p>
        </div>
        <p className="text-delta text-neutral">
          Regularização sob {COMPLIANCE_OWNER.name} · {COMPLIANCE_OWNER.area}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Rastreabilidade completa"
          value={formatPercent(TRACEABILITY_PERCENT)}
          attestation={TRACEABILITY_ATTESTATION}
          size="lg"
        />
        <KpiCard
          label="Consentimentos vigentes"
          value={formatInteger(CONSENT_VALID_DOCTORS)}
          attestation={CONSENT_ATTESTATION}
        />
        <KpiCard
          label="Desvios abertos"
          value={formatInteger(OPEN_DEVIATIONS)}
          attestation={DEVIATION_ATTESTATION}
        />
        <KpiCard
          label="Desvios críticos"
          value={formatInteger(CRITICAL_DEVIATIONS)}
          attestation={DEVIATION_ATTESTATION}
        />
        <KpiCard
          label="Tempo médio de regularização"
          value={`${formatDecimal(AVERAGE_REGULARIZATION_DAYS, 1)} dias`}
          attestation={COMPLIANCE_ATTESTATION}
        />
      </div>

      <p className="text-delta text-neutral">
        {formatInteger(LOTS_WITH_GAP)} dos {formatInteger(LOTS_IN_CYCLE)} lotes do ciclo têm ao
        menos um elo sem registro. Consentimento vigente cobre{' '}
        {formatPercent(CONSENT_VALID_PERCENT)} dos {formatInteger(CONSENT_TARGET_DOCTORS)}{' '}
        médicos-alvo.
      </p>

      <Panel
        title="Trilha do lote"
        description="Do recebimento ao aceite do médico: cinco elos, cada um com data e responsável"
        action={
          <label className="text-delta-lg">
            <span className="mr-2 text-neutral">Lote</span>
            <select
              value={lotId}
              onChange={(event) => setLotId(event.target.value)}
              className="rounded-control border border-surface-border bg-surface-card px-3 py-1.5 font-medium text-slate-900"
            >
              {LOT_TRACES.map((option) => (
                <option key={option.lot.id} value={option.lot.id}>
                  {option.lot.batchCode} · {option.lot.skuName} · {option.lot.holderName}
                </option>
              ))}
            </select>
          </label>
        }
        footer={<DataBadge attestation={TRACE_ATTESTATION} variant="full" />}
      >
        {trace ? (
          <>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-delta-lg font-semibold text-slate-900">
                  {trace.lot.batchCode} · {trace.lot.skuName} ·{' '}
                  {formatInteger(trace.lot.units)} unid. · {trace.lot.region}
                </p>
                <p className="mt-1 text-delta-lg text-slate-700">{trace.headline}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <StateChip
                  label={TRACE_INTEGRITY_LABEL[trace.integrity]}
                  tone={INTEGRITY_TONE[trace.integrity]}
                />
                <span className="text-delta text-neutral">
                  {missingSteps(trace) === 0
                    ? 'Cinco elos registrados'
                    : `${formatInteger(missingSteps(trace))} de ${formatInteger(trace.steps.length)} elos sem registro íntegro`}
                </span>
              </div>
            </div>

            <TraceTimeline trace={trace} />
          </>
        ) : null}
      </Panel>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <Panel
            title="Consentimento do médico"
            description={`Termo válido por ${formatInteger(CONSENT_VALIDITY_MONTHS)} meses, sobre a base de médicos-alvo da campanha`}
            footer={
              <span>
                Médico sem consentimento vigente é inelegível: expirados e ausentes somam{' '}
                {formatInteger(CONSENT_INELIGIBLE_DOCTORS)} médicos que a alocação não libera.{' '}
                <DataBadge attestation={CONSENT_ATTESTATION} />
              </span>
            }
          >
            <ConsentBuckets />
          </Panel>
        </div>

        <div className="lg:col-span-6">
          <Panel
            title="Rastreabilidade por ciclo"
            description="Participação dos lotes com os cinco elos registrados"
            footer={<DataBadge attestation={TRACEABILITY_ATTESTATION} variant="full" />}
          >
            <CycleChart />
            <p className="mt-3 text-delta text-neutral">
              A curva sobe porque a baixa em campo passou a ser exigida na visita. O que resta é
              quase todo elo de entrega ao médico — o mesmo buraco que a trilha acima mostra.
            </p>
          </Panel>
        </div>
      </div>

      <Panel
        title="Consentimento — casos nominais em acompanhamento"
        description="A base agregada está ao lado; aqui ficam os médicos que a força de campo visita neste ciclo"
        action={
          <span className="text-delta text-neutral">
            {formatInteger(CONSENTS_REQUIRING_ACTION)} de{' '}
            {formatInteger(DOCTOR_CONSENTS.length)} exigem ação
          </span>
        }
        footer={<DataBadge attestation={CONSENT_ATTESTATION} variant="full" />}
      >
        <ConsentTable />
      </Panel>

      <Panel
        title="Fila de desvios"
        description="Priorizada por severidade: primeiro a amostra sem destino conhecido, depois a que tem destino e não tem prazo"
        action={
          <span className="text-delta text-neutral">
            {formatInteger(CRITICAL_DEVIATIONS)} críticos de {formatInteger(OPEN_DEVIATIONS)} abertos
          </span>
        }
        footer={<DataBadge attestation={DEVIATION_ATTESTATION} variant="full" />}
      >
        <ul className="space-y-3">
          {DEVIATION_ALERTS.map((alert) => (
            <DeviationCard key={alert.id} alert={alert} />
          ))}
        </ul>
      </Panel>

      <Panel
        title="Ações"
        footer={
          <span>
            A exportação entrega o dossiê completo do lote — os cinco elos, os responsáveis, os
            aceites e os desvios abertos — no formato que a auditoria interna recebe hoje.
          </span>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <FutureButton label="Exportar trilha para auditoria" phase={AUDIT_EXPORT_PHASE} />
          <FutureButton label="Notificar responsáveis pelos desvios" phase={AUDIT_EXPORT_PHASE} />
          <FutureButton label="Write-back da baixa ao ERP" phase="Fase 3" />
        </div>
      </Panel>
    </div>
  )
}
