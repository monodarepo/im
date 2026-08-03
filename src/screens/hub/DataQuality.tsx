import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CHART_AXIS, CHART_CURSOR, CHART_GRID, CHART_LINE } from '../../design/chartTheme'
import { DataBadge } from '../../components/DataBadge'
import { DegradedBanner } from '../../components/DegradedBanner'
import { Panel } from '../../components/Panel'
import { StateChip } from '../../components/StateChip'
import { SOURCE_LABEL } from '../../domain/attestation'
import { formatDecimal, formatInteger } from '../../domain/format'
import { formatDate, formatRelative } from '../../domain/today'
import type { SemanticTone } from '../../design/tokens'
import {
  DATA_EXCEPTIONS,
  DEGRADED_ATTESTATIONS,
  INGESTION_ATTESTATION,
  RELIABILITY_SERIES,
  RELIABILITY_SOURCES,
  SOURCE_HEALTH,
  SOURCE_STATUS_LABEL,
  type SourceStatus,
} from '../../mock/dataQuality'
import { useExceptions } from '../../state/exceptionsStore'

const STATUS_TONE: Record<SourceStatus, SemanticTone> = {
  ok: 'positive',
  delayed: 'attention',
  layout_changed: 'attention',
  blocked: 'negative',
}

/**
 * Séries de telemetria: quatro fontes lado a lado. A paleta é qualitativa e
 * deliberadamente fora da semântica de dado e da identidade de produto — aqui
 * a cor separa fontes, não indica bom nem ruim.
 */
const RELIABILITY_COLORS: Record<string, string> = {
  scanntech: '#334155',
  iqvia: '#0E7490',
  neogrid: '#B45309',
  sap: '#86198F',
}

function SourcesTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left">
        <thead>
          <tr className="border-b border-surface-border text-delta text-neutral">
            <th className="pb-2 font-medium">Fonte</th>
            <th className="pb-2 font-medium">Última captura</th>
            <th className="pb-2 text-right font-medium">Defasagem</th>
            <th className="pb-2 text-right font-medium">Volume</th>
            <th className="pb-2 text-right font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {SOURCE_HEALTH.map((health) => (
            <tr key={health.source} className="text-delta-lg transition-colors hover:bg-slate-50">
              <td className="py-2.5 font-medium text-slate-900">{SOURCE_LABEL[health.source]}</td>
              <td className="py-2.5 text-slate-600">
                {formatDate(health.lastCapture)}
                <span className="ml-2 text-delta text-neutral">
                  {formatRelative(health.lastCapture)}
                </span>
              </td>
              <td className="py-2.5 text-right tabular-nums text-slate-600">
                {health.lagDays} dias
              </td>
              <td className="py-2.5 text-right tabular-nums text-slate-600">
                {health.volume === 0 ? '—' : formatInteger(health.volume)}
              </td>
              <td className="py-2.5 text-right">
                <StateChip
                  label={SOURCE_STATUS_LABEL[health.status]}
                  tone={STATUS_TONE[health.status]}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ExceptionQueue() {
  const { accept, isResolved, ruleOf } = useExceptions()

  return (
    <ul className="space-y-3">
      {DATA_EXCEPTIONS.map((exception) => {
        const resolved = isResolved(exception.id)
        const rule = ruleOf(exception.id)

        return (
          <li
            key={exception.id}
            className="rounded-card border border-surface-border p-4 transition-colors"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-delta-lg font-medium text-slate-900">{exception.finding}</p>
                <p className="mt-0.5 text-delta text-neutral">
                  {SOURCE_LABEL[exception.source]} · {formatInteger(exception.affectedRecords)}{' '}
                  registros afetados
                </p>
              </div>
              {resolved ? (
                <StateChip label="Resolvida" tone="positive" />
              ) : (
                <StateChip label="Em aberto" tone="attention" />
              )}
            </div>

            <dl className="mt-3 space-y-1.5">
              <div className="flex gap-2 text-delta-lg">
                <dt className="shrink-0 text-neutral">Causa provável:</dt>
                <dd className="text-slate-700">{exception.probableCause}</dd>
              </div>
              <div className="flex gap-2 text-delta-lg">
                <dt className="shrink-0 text-neutral">Correção proposta:</dt>
                <dd className="text-slate-700">{exception.proposedFix}</dd>
              </div>
            </dl>

            <div className="mt-3">
              {resolved && rule ? (
                <div className="rounded-control border border-positive/30 bg-positive/5 px-3 py-2">
                  <p className="text-delta font-semibold text-positive">Regra criada</p>
                  <p className="mt-0.5 text-delta text-slate-700">{rule.rule}</p>
                  <p className="mt-0.5 text-delta text-neutral">
                    Aplicada a partir de {formatDate(rule.createdOn)}, em toda captura seguinte.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => accept(exception.id, exception.rule)}
                  className="rounded-control px-3 py-1.5 text-delta-lg font-medium text-white transition-colors"
                  style={{ backgroundColor: 'var(--product-accent)' }}
                >
                  Aceitar correção
                </button>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

type TooltipEntry = { name?: string; value?: number; color?: string }

function ReliabilityTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-control border border-surface-border bg-surface-card px-3 py-2 shadow-sm">
      <p className="text-delta font-medium text-slate-900">Dia {label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="mt-1 flex items-center gap-2 text-delta text-slate-700">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} aria-hidden />
          <span>{entry.name}</span>
          <span className="ml-auto font-medium tabular-nums">
            {formatDecimal(entry.value ?? 0, 1)}
          </span>
        </p>
      ))}
    </div>
  )
}

function ReliabilityChart() {
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-4 text-micro uppercase text-neutral">
        {RELIABILITY_SOURCES.map((source) => (
          <span key={source.key} className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-sm"
              style={{ backgroundColor: RELIABILITY_COLORS[source.key] }}
              aria-hidden
            />
            {source.label}
          </span>
        ))}
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={[...RELIABILITY_SERIES]} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid {...CHART_GRID} />
            <XAxis {...CHART_AXIS} dataKey="label" interval={4} />
            <YAxis {...CHART_AXIS} width={44} domain={[50, 100]} ticks={[50, 60, 70, 80, 90, 100]} />
            <Tooltip content={<ReliabilityTooltip />} cursor={CHART_CURSOR} />
            {RELIABILITY_SOURCES.map((source) => (
              <Line
                {...CHART_LINE}
                key={source.key}
                type="linear"
                dataKey={source.key}
                name={source.label}
                stroke={RELIABILITY_COLORS[source.key]}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function DataQuality() {
  const resolvedCount = useExceptions((state) => state.accepted.length)

  return (
    <div className="space-y-5">
      <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Qualidade dos dados
      </h1>

      <DegradedBanner
        attestations={DEGRADED_ATTESTATIONS}
        consequence="A Scanntech mudou o layout do arquivo e três verificações não bateram. Os números seguem na tela com confiança reduzida enquanto as correções não viram regra."
      />

      <Panel title="Fontes" description="Estado da última captura de cada origem">
        <SourcesTable />
      </Panel>

      <Panel
        title="Fila de exceções"
        description="Aceitar uma correção cria uma regra permanente para a fonte"
        action={
          <span className="text-delta text-neutral">
            {resolvedCount} de {DATA_EXCEPTIONS.length} resolvidas
          </span>
        }
      >
        <ExceptionQueue />
      </Panel>

      <Panel
        title="Score de confiabilidade"
        description="Últimos 30 dias, por fonte"
        footer={<DataBadge attestation={INGESTION_ATTESTATION} />}
      >
        <ReliabilityChart />
      </Panel>
    </div>
  )
}
