import { Link } from 'react-router-dom'
import { DataBadge } from '../../components/DataBadge'
import { FutureButton } from '../../components/FutureButton'
import { KpiCard } from '../../components/KpiCard'
import { Panel } from '../../components/Panel'
import { SemanticDelta } from '../../components/SemanticDelta'
import { StateChip } from '../../components/StateChip'
import { SEMANTIC, semanticColor } from '../../design/tokens'
import { formatInteger, formatPercent } from '../../domain/format'
import { formatMoney } from '../../domain/money'
import { formatDate, formatRelative } from '../../domain/today'
import {
  AGENDA_ATTESTATION,
  AGENDA_EVIDENCE_COUNT,
  AGENDA_MINUTES,
  AGENDA_ORIGIN_NOTE,
  AGENDA_TOPICS,
  CYCLE_MEETING,
  MEETING_PARTICIPANTS,
  METRIC_STATUS_LABEL,
  METRIC_STATUS_TONE,
  REP_ABOVE_COUNT,
  REP_BELOW_COUNT,
  REP_DECISION_LINE,
  REP_FACTS,
  REP_METRICS,
  REP_METRICS_ATTESTATION,
  REP_OPEN_FIELDS,
  REP_ORIGIN_NOTE,
  REP_REPORT,
  REP_SUMMARY_COMMENT,
  REP_TERRITORIES,
  type AgendaEvidence,
  type AgendaTopic,
  type RepMetric,
} from '../../mock/gtmReports'

const MEETING_FACTS: readonly { label: string; value: string }[] = [
  { label: 'Ciclo e recorte', value: `${CYCLE_MEETING.cycleLabel} · ${CYCLE_MEETING.scopeLabel}` },
  {
    label: 'Especialidade e produto',
    value: `${CYCLE_MEETING.specialtyLabel} · ${CYCLE_MEETING.productLabel}`,
  },
  {
    label: 'Reunião',
    value: `${formatDate(CYCLE_MEETING.heldOn)} (${formatRelative(CYCLE_MEETING.heldOn)})`,
  },
  {
    label: 'Período apurado',
    value: `${formatDate(CYCLE_MEETING.cycleStart)} a ${formatDate(CYCLE_MEETING.generatedOn)}`,
  },
  {
    label: 'Participantes',
    value: MEETING_PARTICIPANTS.map((persona) => `${persona.name} (${persona.area})`).join(' · '),
  },
  {
    label: 'Gerada por',
    value: `${CYCLE_MEETING.facilitator.name} · ${formatDate(CYCLE_MEETING.generatedOn)}`,
  },
]

const REPORT_FACTS: readonly { label: string; value: string }[] = [
  { label: 'Representante', value: `${REP_REPORT.rep.name} · ${REP_REPORT.rep.area}` },
  { label: 'Gestor na conversa', value: `${REP_REPORT.manager.name} · ${REP_REPORT.manager.area}` },
  { label: 'Recorte', value: REP_REPORT.scopeLabel },
  { label: 'Territórios sob responsabilidade', value: REP_TERRITORIES.join(' · ') },
  {
    label: 'Período',
    value: `${formatDate(REP_REPORT.periodStart)} a ${formatDate(REP_REPORT.periodEnd)}`,
  },
  { label: 'Emitido em', value: formatDate(REP_REPORT.issuedOn) },
]

function FactGrid({ facts }: { facts: readonly { label: string; value: string }[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
      {facts.map((fact) => (
        <div key={fact.label}>
          <dt className="text-delta text-neutral">{fact.label}</dt>
          <dd className="mt-0.5 text-delta-lg font-medium text-slate-900">{fact.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function EvidenceLine({ evidence }: { evidence: AgendaEvidence }) {
  return (
    <li className="border-l-2 border-surface-border pl-3">
      <p className="text-delta font-semibold uppercase tracking-wide text-neutral">
        {evidence.kindLabel}
      </p>
      <p className="mt-0.5 text-delta-lg text-slate-800">{evidence.finding}</p>

      {evidence.readingLabel && evidence.reading ? (
        <p className="mt-0.5 text-delta text-neutral">
          {evidence.readingLabel}:{' '}
          <span
            className={`font-medium text-slate-700 ${
              evidence.readingEmphasis === 'numeric' ? 'tabular-nums' : ''
            }`}
          >
            {evidence.reading}
          </span>
        </p>
      ) : null}

      {evidence.decisionId ? (
        <p className="mt-0.5 text-delta text-neutral">
          Decisão{' '}
          <Link
            to={`/decisoes/${evidence.decisionId}`}
            className="font-medium underline"
            style={{ color: 'var(--product-accent)' }}
          >
            {evidence.decisionId}
          </Link>
          {evidence.impactBrl === null ? null : (
            <>
              {' · impacto '}
              <span className="font-medium tabular-nums text-slate-700">
                {formatMoney(evidence.impactBrl)}
              </span>
            </>
          )}
        </p>
      ) : null}

      <div className="mt-1">
        <DataBadge attestation={evidence.attestation} />
      </div>
    </li>
  )
}

function AgendaEntry({ topic, position }: { topic: AgendaTopic; position: number }) {
  return (
    <li className="rounded-card border border-surface-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-delta font-semibold tabular-nums text-slate-600">
            {position}
          </span>
          <span className="min-w-0">
            <span className="block text-delta-lg font-semibold text-slate-900">
              {topic.territoryLabel}
            </span>
            <span className="block text-delta text-neutral">
              {topic.owner.name} · {topic.doctorName} · {topic.specialtyLabel}
            </span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StateChip
            label={topic.priorityLabel}
            tone={topic.priority === 'very_high' ? 'negative' : 'attention'}
          />
          <span className="text-delta tabular-nums text-neutral">
            {formatInteger(topic.estimatedMinutes)} min
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-delta font-semibold uppercase tracking-wide text-neutral">
            O que precisa resolver
          </p>
          <p className="mt-2 text-delta-lg text-slate-700">{topic.issue}</p>

          <p className="mt-3 text-delta font-semibold uppercase tracking-wide text-neutral">
            O que sai fechado
          </p>
          <p className="mt-2 text-delta-lg text-slate-700">{topic.commitment}</p>
        </div>

        <div>
          <p className="text-delta font-semibold uppercase tracking-wide text-neutral">
            Por que entrou na pauta
          </p>
          <ul className="mt-2 space-y-3">
            {topic.evidence.map((evidence) => (
              <EvidenceLine key={evidence.id} evidence={evidence} />
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-3 border-t border-surface-border pt-2">
        <DataBadge attestation={topic.attestation} variant="full" />
      </div>
    </li>
  )
}

function MetricRow({ metric }: { metric: RepMetric }) {
  return (
    <tr className="text-delta-lg align-top">
      <td className="py-2.5 pr-3">
        <span className="block font-medium text-slate-900">{metric.label}</span>
        <span className="block text-delta text-neutral">{metric.origin}</span>
      </td>
      <td className="py-2.5 text-right font-semibold tabular-nums text-slate-900">
        {formatPercent(metric.value, 0)}
      </td>
      <td className="py-2.5 text-right tabular-nums text-slate-600">
        {formatPercent(metric.target, 0)}
      </td>
      <td className="py-2.5 text-right tabular-nums text-slate-600">
        {metric.teamValue === null ? '—' : formatPercent(metric.teamValue, 0)}
      </td>
      <td className="py-2.5 text-right">
        <SemanticDelta value={metric.gapPp} unit="points" size="sm" />
      </td>
      <td className="py-2.5 pl-3">
        <StateChip label={METRIC_STATUS_LABEL[metric.status]} tone={METRIC_STATUS_TONE[metric.status]} />
      </td>
    </tr>
  )
}

function RepDocument() {
  return (
    <article className="rounded-card border border-surface-border bg-surface-card p-6">
      <header className="border-b border-surface-border pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-delta font-semibold uppercase tracking-widest text-neutral">
              {REP_REPORT.reference}
            </p>
            <h3 className="mt-1 text-base font-semibold tracking-tight text-slate-900">
              {REP_REPORT.title}
            </h3>
            <p className="mt-1 text-delta-lg text-neutral">
              {REP_REPORT.rep.name} · {REP_REPORT.cycleLabel}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StateChip label={REP_REPORT.statusLabel} tone="attention" />
            {REP_DECISION_LINE ? (
              <Link
                to={`/decisoes/${REP_DECISION_LINE.id}`}
                className="text-delta font-medium underline"
                style={{ color: 'var(--product-accent)' }}
              >
                {REP_DECISION_LINE.id} · {REP_DECISION_LINE.title}
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <section className="border-b border-surface-border py-4">
        <FactGrid facts={REPORT_FACTS} />
      </section>

      <section className="border-b border-surface-border py-4">
        <h4 className="text-delta font-semibold uppercase tracking-wide text-neutral">
          Indicadores do ciclo
        </h4>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left">
            <thead>
              <tr className="border-b border-surface-border text-delta text-neutral">
                <th className="pb-2 font-medium">Indicador</th>
                <th className="pb-2 text-right font-medium">Realizado</th>
                <th className="pb-2 text-right font-medium">Meta</th>
                <th className="pb-2 text-right font-medium">Equipe</th>
                <th className="pb-2 text-right font-medium">Distância</th>
                <th className="pb-2 pl-3 font-medium">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {REP_METRICS.map((metric) => (
                <MetricRow key={metric.id} metric={metric} />
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <DataBadge attestation={REP_METRICS_ATTESTATION} variant="full" />
        </div>
      </section>

      <section className="border-b border-surface-border py-4">
        <h4 className="text-delta font-semibold uppercase tracking-wide text-neutral">
          Execução registrada
        </h4>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {REP_FACTS.map((fact) => (
            <div key={fact.id} className="rounded-control border border-surface-border px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-delta text-neutral">
                {fact.label}
                <span
                  className="rounded-sm px-1 py-px text-delta font-semibold text-white"
                  style={{ backgroundColor: 'var(--product-accent)' }}
                  title="Campo preenchido pela plataforma"
                >
                  auto
                </span>
              </p>
              <p className="mt-0.5 text-delta-lg font-semibold tabular-nums text-slate-900">
                {fact.value}
              </p>
              {fact.detail ? <p className="mt-0.5 text-delta text-neutral">{fact.detail}</p> : null}
              <div className="mt-1.5">
                <DataBadge attestation={fact.attestation} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-surface-border py-4">
        <h4 className="text-delta font-semibold uppercase tracking-wide text-neutral">
          Comentário sugerido para a conversa de feedback
        </h4>
        <p className="mt-3 text-delta-lg text-slate-800">{REP_SUMMARY_COMMENT}</p>
        <ul className="mt-3 space-y-2">
          {REP_METRICS.map((metric) => (
            <li
              key={metric.id}
              className="rounded-control border border-surface-border px-3 py-2"
              style={{ borderLeftWidth: '3px', borderLeftColor: semanticColor(METRIC_STATUS_TONE[metric.status]) }}
            >
              <p className="text-delta font-semibold uppercase tracking-wide text-neutral">
                {metric.label} · {METRIC_STATUS_LABEL[metric.status]}
              </p>
              <p className="mt-1 text-delta-lg text-slate-800">{metric.comment}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="py-4">
        <h4 className="text-delta font-semibold uppercase tracking-wide text-neutral">
          Campos em branco
        </h4>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {REP_OPEN_FIELDS.map((field) => (
            <div
              key={field.id}
              className="rounded-control border border-dashed border-surface-border px-3 py-2"
            >
              <p className="text-delta text-neutral">{field.label}</p>
              <p className="mt-1 text-delta-lg italic text-neutral">{field.note}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-surface-border pt-4">
        <p className="text-delta text-neutral">{REP_ORIGIN_NOTE}</p>
      </footer>
    </article>
  )
}

export function GtmReports() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Relatórios</h1>
        <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
          Documentos gerados a partir do que a plataforma já apurou
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Territórios na pauta do ciclo"
          value={formatInteger(AGENDA_TOPICS.length)}
          attestation={AGENDA_ATTESTATION}
        />
        <KpiCard
          label="Evidências citadas na pauta"
          value={formatInteger(AGENDA_EVIDENCE_COUNT)}
          attestation={AGENDA_ATTESTATION}
        />
        <KpiCard
          label="Tempo de pauta"
          value={`${formatInteger(AGENDA_MINUTES)} min`}
          attestation={AGENDA_ATTESTATION}
        />
        <KpiCard
          label="Indicadores do representante fora da meta"
          value={`${formatInteger(REP_BELOW_COUNT)} de ${formatInteger(REP_METRICS.length)}`}
          comparison={`${formatInteger(REP_ABOVE_COUNT)} acima da meta`}
          attestation={REP_METRICS_ATTESTATION}
        />
      </div>

      <Panel
        title="Pauta da reunião de ciclo"
        description={AGENDA_ORIGIN_NOTE}
        action={
          <span className="inline-flex items-center gap-2 text-delta text-neutral">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: SEMANTIC.attention }}
              aria-hidden
            />
            {CYCLE_MEETING.statusLabel}
          </span>
        }
        footer={
          <div className="flex flex-wrap items-center gap-3">
            <FutureButton label="Exportar pauta em PDF" phase="Fase 2" />
            <FutureButton label="Enviar convite com a pauta à equipe" phase="Fase 3" />
            <span className="ml-auto">
              <DataBadge attestation={AGENDA_ATTESTATION} variant="full" />
            </span>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-card border border-surface-border bg-slate-50 p-4">
            <FactGrid facts={MEETING_FACTS} />
          </div>

          <ol className="space-y-4">
            {AGENDA_TOPICS.map((topic, position) => (
              <AgendaEntry key={topic.id} topic={topic} position={position + 1} />
            ))}
          </ol>
        </div>
      </Panel>

      <Panel
        title="Relatório de desempenho do representante"
        description="Pré-preenchido com os indicadores do ciclo, a execução registrada e o comentário sugerido para a conversa"
        footer={
          <div className="flex flex-wrap items-center gap-3">
            <FutureButton label="Exportar relatório em PDF" phase="Fase 2" />
            <FutureButton label="Enviar ao representante" phase="Fase 3" />
            <FutureButton label="Write-back da avaliação ao CRM" phase="Fase 3" />
            <span className="ml-auto">
              <DataBadge attestation={REP_METRICS_ATTESTATION} variant="full" />
            </span>
          </div>
        }
      >
        <RepDocument />
      </Panel>
    </div>
  )
}
