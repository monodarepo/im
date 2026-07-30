import { Link } from 'react-router-dom'
import { DataBadge } from '../../components/DataBadge'
import { FutureButton } from '../../components/FutureButton'
import { KpiCard } from '../../components/KpiCard'
import { Panel } from '../../components/Panel'
import { StateChip } from '../../components/StateChip'
import { formatInteger } from '../../domain/format'
import { formatDate, formatRelative } from '../../domain/today'
import {
  ACTIVE_SCHEDULE_COUNT,
  AUDIENCE_LABEL,
  AUDIT_REPORT_COUNT,
  CADENCE_LABEL,
  CATALOG_ATTESTATION,
  CATALOG_DECISION,
  CATALOG_FOOTER_NOTE,
  CATALOG_ORIGIN_NOTE,
  DONE_RUN_COUNT,
  EXPORT_ACTIONS,
  RECENT_RUNS,
  RECIPIENT_COUNT,
  REPORT_CATALOG,
  RUN_STATUS_LABEL,
  RUN_STATUS_TONE,
  RUNS_ATTESTATION,
  RUNS_ORIGIN_NOTE,
  RUNS_SUMMARY,
  SCHEDULE_ACTIONS,
  SCHEDULE_ATTESTATION,
  SCHEDULE_ORIGIN_NOTE,
  SCHEDULE_STATE_LABEL,
  SCHEDULE_STATE_TONE,
  SCHEDULED_REPORTS,
  TOTAL_ROWS_GENERATED,
  type CatalogReport,
  type ReportRun,
  type ScheduledReport,
} from '../../mock/agReports'

function OriginLink({ report }: { report: CatalogReport }) {
  return (
    <Link
      to={report.originRoute}
      className="font-medium underline"
      style={{ color: 'var(--product-accent)' }}
    >
      {report.originLabel} →
    </Link>
  )
}

function CatalogRow({ report }: { report: CatalogReport }) {
  return (
    <tr className="text-delta-lg align-top">
      <td className="py-2.5 pr-3">
        <span className="block font-medium text-slate-900">{report.title}</span>
        <span className="mt-0.5 block text-delta text-neutral">{report.purpose}</span>
        <span className="mt-1 block text-delta text-neutral">
          Origem: <OriginLink report={report} />
          {report.decisionId ? (
            <>
              {' · acompanha '}
              <Link
                to={`/decisoes/${report.decisionId}`}
                className="font-medium underline"
                style={{ color: 'var(--product-accent)' }}
              >
                {report.decisionId}
              </Link>
            </>
          ) : null}
        </span>
      </td>
      <td className="py-2.5 text-slate-600">{CADENCE_LABEL[report.cadence]}</td>
      <td className="py-2.5 text-slate-600">{AUDIENCE_LABEL[report.audience]}</td>
      <td className="py-2.5 text-right tabular-nums text-slate-700">
        <span className="block">{formatDate(report.lastGeneratedOn)}</span>
        <span className="block text-delta text-neutral">
          {formatRelative(report.lastGeneratedOn)}
        </span>
      </td>
      <td className="py-2.5 text-right">
        <span className="block font-semibold tabular-nums text-slate-900">
          {formatInteger(report.rowCount)}
        </span>
        <span className="block text-delta text-neutral">{report.rowLabel}</span>
      </td>
      <td className="py-2.5 pl-3 text-right">
        <DataBadge attestation={report.attestation} />
      </td>
    </tr>
  )
}

function CatalogTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] text-left">
        <thead>
          <tr className="border-b border-surface-border text-delta text-neutral">
            <th className="pb-2 font-medium">Relatório</th>
            <th className="pb-2 font-medium">Periodicidade</th>
            <th className="pb-2 font-medium">Público</th>
            <th className="pb-2 text-right font-medium">Última geração</th>
            <th className="pb-2 text-right font-medium">Linhas</th>
            <th className="pb-2 pl-3 text-right font-medium">Procedência</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {REPORT_CATALOG.map((report) => (
            <CatalogRow key={report.id} report={report} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ScheduleRow({ schedule }: { schedule: ScheduledReport }) {
  return (
    <tr className="text-delta-lg align-top">
      <td className="py-2.5 pr-3">
        <span className="block font-medium text-slate-900">{schedule.reportTitle}</span>
        <span className="mt-0.5 block text-delta text-neutral">{schedule.note}</span>
      </td>
      <td className="py-2.5 text-slate-600">
        {CADENCE_LABEL[schedule.cadence]}
        <span className="block text-delta text-neutral">{AUDIENCE_LABEL[schedule.audience]}</span>
      </td>
      <td className="py-2.5 text-right tabular-nums text-slate-700">
        <span className="block">{formatDate(schedule.nextRunOn)}</span>
        <span className="block text-delta text-neutral">{formatRelative(schedule.nextRunOn)}</span>
      </td>
      <td className="py-2.5 pl-3">
        <ul className="space-y-0.5">
          {schedule.recipients.map((persona) => (
            <li key={persona.name} className="text-slate-700">
              {persona.name}
              <span className="ml-1.5 text-delta text-neutral">{persona.area}</span>
            </li>
          ))}
        </ul>
      </td>
      <td className="py-2.5 pl-3">
        <StateChip
          label={SCHEDULE_STATE_LABEL[schedule.state]}
          tone={SCHEDULE_STATE_TONE[schedule.state]}
        />
      </td>
    </tr>
  )
}

function ScheduleTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left">
        <thead>
          <tr className="border-b border-surface-border text-delta text-neutral">
            <th className="pb-2 font-medium">Relatório agendado</th>
            <th className="pb-2 font-medium">Periodicidade</th>
            <th className="pb-2 text-right font-medium">Próxima execução</th>
            <th className="pb-2 pl-3 font-medium">Destinatários</th>
            <th className="pb-2 pl-3 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {SCHEDULED_REPORTS.map((schedule) => (
            <ScheduleRow key={schedule.id} schedule={schedule} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RunRow({ run }: { run: ReportRun }) {
  return (
    <tr className="text-delta-lg align-top">
      <td className="py-2.5 pr-3">
        <span className="block font-medium text-slate-900">{run.reportTitle}</span>
        <span className="mt-0.5 block text-delta text-neutral">{run.note}</span>
      </td>
      <td className="py-2.5 text-right tabular-nums text-slate-700">
        <span className="block">{formatDate(run.ranOn)}</span>
        <span className="block text-delta text-neutral">{formatRelative(run.ranOn)}</span>
      </td>
      <td className="py-2.5 pl-3">
        <StateChip label={RUN_STATUS_LABEL[run.status]} tone={RUN_STATUS_TONE[run.status]} />
      </td>
      <td className="py-2.5 text-right">
        {run.rowCount === null ? (
          <span className="text-neutral">—</span>
        ) : (
          <>
            <span className="block font-semibold tabular-nums text-slate-900">
              {formatInteger(run.rowCount)}
            </span>
            <span className="block text-delta text-neutral">{run.rowLabel}</span>
          </>
        )}
      </td>
      <td className="py-2.5 pl-3 text-right">
        <DataBadge attestation={run.attestation} />
      </td>
    </tr>
  )
}

function RunTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left">
        <thead>
          <tr className="border-b border-surface-border text-delta text-neutral">
            <th className="pb-2 font-medium">Execução</th>
            <th className="pb-2 text-right font-medium">Rodou em</th>
            <th className="pb-2 pl-3 font-medium">Estado</th>
            <th className="pb-2 text-right font-medium">Linhas</th>
            <th className="pb-2 pl-3 text-right font-medium">Procedência</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {RECENT_RUNS.map((run) => (
            <RunRow key={run.id} run={run} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Reports() {
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
          label="Relatórios no catálogo"
          value={formatInteger(REPORT_CATALOG.length)}
          comparison={`${formatInteger(AUDIT_REPORT_COUNT)} para auditoria`}
          attestation={CATALOG_ATTESTATION}
        />
        <KpiCard
          label="Agendamentos ativos"
          value={`${formatInteger(ACTIVE_SCHEDULE_COUNT)} de ${formatInteger(SCHEDULED_REPORTS.length)}`}
          comparison={`${formatInteger(RECIPIENT_COUNT)} destinatários distintos`}
          attestation={SCHEDULE_ATTESTATION}
        />
        <KpiCard
          label="Execuções concluídas na janela"
          value={`${formatInteger(DONE_RUN_COUNT)} de ${formatInteger(RECENT_RUNS.length)}`}
          comparison={RUNS_SUMMARY}
          attestation={RUNS_ATTESTATION}
        />
        <KpiCard
          label="Linhas publicadas nas execuções concluídas"
          value={formatInteger(TOTAL_ROWS_GENERATED)}
          attestation={RUNS_ATTESTATION}
        />
      </div>

      <Panel
        title="Catálogo de relatórios"
        description={CATALOG_ORIGIN_NOTE}
        action={
          CATALOG_DECISION ? (
            <Link
              to={`/decisoes/${CATALOG_DECISION.id}`}
              className="text-delta font-medium underline"
              style={{ color: 'var(--product-accent)' }}
            >
              {CATALOG_DECISION.id} · {CATALOG_DECISION.title}
            </Link>
          ) : null
        }
        footer={
          <div className="flex flex-wrap items-center gap-3">
            {EXPORT_ACTIONS.map((action) => (
              <FutureButton key={action.id} label={action.label} phase={action.phase} />
            ))}
            <span className="ml-auto">
              <DataBadge attestation={CATALOG_ATTESTATION} variant="full" />
            </span>
          </div>
        }
      >
        <CatalogTable />
      </Panel>

      <Panel
        title="Relatórios agendados"
        description={SCHEDULE_ORIGIN_NOTE}
        action={
          <StateChip
            label={`${formatInteger(ACTIVE_SCHEDULE_COUNT)} ativos`}
            tone="positive"
          />
        }
        footer={
          <div className="flex flex-wrap items-center gap-3">
            {SCHEDULE_ACTIONS.map((action) => (
              <FutureButton key={action.id} label={action.label} phase={action.phase} />
            ))}
            <span className="ml-auto">
              <DataBadge attestation={SCHEDULE_ATTESTATION} variant="full" />
            </span>
          </div>
        }
      >
        <ScheduleTable />
      </Panel>

      <Panel
        title="Execuções recentes"
        description={RUNS_ORIGIN_NOTE}
        footer={<DataBadge attestation={RUNS_ATTESTATION} variant="full" />}
      >
        <RunTable />
      </Panel>

      <p className="text-delta text-neutral">{CATALOG_FOOTER_NOTE}</p>
    </div>
  )
}
