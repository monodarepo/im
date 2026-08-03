import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  CHART_AREA,
  CHART_AXIS,
  CHART_CURSOR,
  CHART_GRID,
  CHART_LINE,
} from '../../design/chartTheme'
import { DataBadge } from '../../components/DataBadge'
import { FutureButton } from '../../components/FutureButton'
import { Panel } from '../../components/Panel'
import { SemanticDelta } from '../../components/SemanticDelta'
import { StateChip } from '../../components/StateChip'
import { ConfidenceMeter } from '../../components/ConfidenceMeter'
import { METHOD_LABEL, type Attestation } from '../../domain/attestation'
import { formatDecimal, formatInteger, formatPercent } from '../../domain/format'
import { formatMoney } from '../../domain/money'
import type { SemanticTone } from '../../design/tokens'
import {
  COVERAGE_ATTESTATION,
  COVERAGE_SEGMENTS,
  FORECAST_ATTESTATION,
  FORECAST_BOUNDARY_LABEL,
  FORECAST_FIRST_LABEL,
  FORECAST_HIGH_BRL,
  FORECAST_HORIZON_DAYS,
  FORECAST_LAST_LABEL,
  FORECAST_LOW_BRL,
  FORECAST_TOTAL_BRL,
  PULSE_COMPARISON,
  PULSE_SERIES,
  PULSE_SIGNALS,
  UNIVERSE_OUTLETS,
  type CoverageSegment,
} from '../../mock/pulse'

/**
 * Paleta do bloco de cobertura e da projeção: cinzas de intensidade. A distinção
 * é entre medido e extrapolado, não entre bom e ruim, e a cor de produto nunca
 * entra em série de dado.
 */
const OBSERVED_INK = '#334155'
const ESTIMATED_INK = '#CBD5E1'
const BAND_INK = '#94A3B8'

const HATCH = 'repeating-linear-gradient(45deg, #FFFFFF 0 2px, transparent 2px 6px)'

function segmentStyle(segment: CoverageSegment) {
  return segment.id === 'observed'
    ? { backgroundColor: OBSERVED_INK }
    : { backgroundColor: ESTIMATED_INK, backgroundImage: HATCH }
}

function CoverageBar() {
  return (
    <div className="space-y-4">
      <div
        className="flex h-7 w-full overflow-hidden rounded-control border border-surface-border"
        role="img"
        aria-label={COVERAGE_SEGMENTS.map(
          (segment) =>
            `${segment.label}: ${formatInteger(segment.outlets)} PDVs, ${formatPercent(segment.share)}`,
        ).join('; ')}
      >
        {COVERAGE_SEGMENTS.map((segment) => (
          <div key={segment.id} style={{ width: `${segment.share}%`, ...segmentStyle(segment) }} />
        ))}
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        {COVERAGE_SEGMENTS.map((segment) => (
          <div key={segment.id} className="rounded-card border border-surface-border p-4">
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-sm border border-surface-border"
                style={segmentStyle(segment)}
                aria-hidden
              />
              <dt className="text-delta-lg font-medium text-slate-900">{segment.label}</dt>
              <span className="ml-auto text-delta text-neutral">
                {METHOD_LABEL[segment.attestation.method]}
              </span>
            </div>

            <dd className="mt-2 text-kpi tabular-nums text-slate-900">
              {formatInteger(segment.outlets)}
            </dd>

            <p className="text-delta-lg text-neutral">
              {formatPercent(segment.share)} do universo · {segment.description}
            </p>

            <div className="mt-3 border-t border-surface-border pt-3">
              <DataBadge attestation={segment.attestation} />
            </div>
          </div>
        ))}
      </dl>
    </div>
  )
}

const METHOD_TONE: Record<Attestation['method'], SemanticTone> = {
  observed: 'neutral',
  estimated: 'attention',
  extrapolated: 'attention',
  reprocessed: 'attention',
}

function SignalFeed() {
  return (
    <ul className="space-y-3">
      {PULSE_SIGNALS.map((signal) => (
        <li key={signal.id} className="rounded-card border border-surface-border p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="text-delta-lg font-medium text-slate-900">{signal.metric}</p>
            <SemanticDelta
              value={signal.delta}
              unit={signal.deltaUnit}
              inverted={signal.inverted}
              size="sm"
            />
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-delta text-neutral">{signal.scope}</span>
            <StateChip
              label={METHOD_LABEL[signal.attestation.method]}
              tone={METHOD_TONE[signal.attestation.method]}
              muted={signal.attestation.method === 'observed'}
            />
          </div>

          <p className="mt-2 text-delta-lg text-slate-700">{signal.explanation}</p>

          <div className="mt-3 border-t border-surface-border pt-2">
            <DataBadge attestation={signal.attestation} />
          </div>
        </li>
      ))}
    </ul>
  )
}

const toMillions = (value: number | null): number | null =>
  value === null ? null : value / 1_000_000

/** Passo de eixo legível: só 1, 2, 2,5 ou 5 vezes uma potência de dez. */
function niceStep(raw: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const normalized = raw / magnitude
  const factor = [1, 2, 2.5, 5, 10].find((candidate) => normalized <= candidate) ?? 10
  return factor * magnitude
}

type TooltipEntry = { name?: string; value?: number | number[] | null; color?: string }

function ForecastTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  const entries = payload.filter((entry) => entry.value !== null && entry.value !== undefined)
  if (entries.length === 0) return null

  return (
    <div className="rounded-control border border-surface-border bg-surface-card px-3 py-2 shadow-sm">
      <p className="text-delta font-medium text-slate-900">{label}</p>
      {entries.map((entry) => (
        <p key={entry.name} className="mt-1 flex items-center gap-2 text-delta text-slate-700">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
            aria-hidden
          />
          <span>{entry.name}</span>
          <span className="ml-auto font-medium tabular-nums">
            {Array.isArray(entry.value)
              ? `${formatMoney((entry.value[0] ?? 0) * 1_000_000)} a ${formatMoney((entry.value[1] ?? 0) * 1_000_000)}`
              : formatMoney((entry.value ?? 0) * 1_000_000)}
          </span>
        </p>
      ))}
    </div>
  )
}

function AxisTickMoney({ x, y, payload }: { x?: number; y?: number; payload?: { value: number } }) {
  return (
    <text
      x={x}
      y={y}
      dy={4}
      dx={-8}
      textAnchor="end"
      className="fill-neutral text-delta tabular-nums"
    >
      {formatDecimal(payload?.value ?? 0, 0)}
    </text>
  )
}

function ForecastChart() {
  const data = PULSE_SERIES.map((point) => ({
    label: point.label,
    observado: toMillions(point.observed),
    projetado: toMillions(point.median),
    faixa: point.band
      ? [point.band[0] / 1_000_000, point.band[1] / 1_000_000]
      : null,
  }))

  const peak = Math.max(
    ...data.map((point) =>
      Math.max(point.observado ?? 0, point.projetado ?? 0, point.faixa?.[1] ?? 0),
    ),
  )
  // Teto logo acima do topo da faixa: a banda projetada precisa caber sem
  // sobrar vão morto no alto do gráfico.
  const headroom = peak * 1.08
  const step = niceStep(headroom / 5)
  const ceiling = Math.ceil(headroom / step) * step
  const ticks = Array.from({ length: ceiling / step + 1 }, (_, index) => index * step)

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-4 text-micro uppercase text-neutral">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: OBSERVED_INK }} aria-hidden />
          Observado
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: BAND_INK }} aria-hidden />
          Projeção (mediana)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-sm"
            style={{ backgroundColor: BAND_INK, opacity: 0.35 }}
            aria-hidden
          />
          Faixa de confiança
        </span>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid {...CHART_GRID} />

            <XAxis {...CHART_AXIS} dataKey="label" />
            <YAxis
              {...CHART_AXIS}
              width={56}
              domain={[0, ceiling]}
              ticks={ticks}
              tick={<AxisTickMoney />}
              label={{
                value: 'R$ milhões',
                angle: -90,
                position: 'insideLeft',
                fill: '#64748B',
                fontSize: 12,
              }}
            />

            <ReferenceArea
              x1={FORECAST_FIRST_LABEL}
              x2={FORECAST_LAST_LABEL}
              fill={BAND_INK}
              fillOpacity={0.07}
            />
            <ReferenceLine
              x={FORECAST_BOUNDARY_LABEL}
              stroke={BAND_INK}
              strokeDasharray="4 4"
              label={{
                value: 'fim do observado',
                position: 'insideTopRight',
                fill: '#64748B',
                fontSize: 11,
              }}
            />

            <Tooltip content={<ForecastTooltip />} cursor={CHART_CURSOR} />

            <Area
              {...CHART_AREA}
              type="linear"
              dataKey="faixa"
              name="Faixa de confiança"
              stroke="none"
              fill={BAND_INK}
              fillOpacity={0.22}
              isAnimationActive={false}
              connectNulls={false}
            />
            <Line
              {...CHART_LINE}
              type="linear"
              dataKey="observado"
              name="Observado"
              stroke={OBSERVED_INK}
              strokeWidth={2.5}
              connectNulls={false}
            />
            <Line
              {...CHART_LINE}
              type="linear"
              dataKey="projetado"
              name="Projeção (mediana)"
              stroke={BAND_INK}
              strokeDasharray="6 4"
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function MarketPulse() {
  return (
    <div className="space-y-5">
      <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Pulso de mercado
      </h1>

      <Panel
        title="Cobertura do universo"
        description="Números aproximados. O que é medido loja a loja e o que é extrapolado nunca se confundem na leitura."
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Universo indireto: {formatInteger(UNIVERSE_OUTLETS)} PDVs</span>
            <ConfidenceMeter confidence={COVERAGE_ATTESTATION.confidence} showLabel />
          </div>
        }
      >
        <CoverageBar />
      </Panel>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Panel
            title="Projeção de sell-out"
            description={`Próximos ${FORECAST_HORIZON_DAYS} dias, com faixa que abre à medida que se afasta do último dado observado`}
            action={<FutureButton label="Reprojetar com cenário" phase="Fase 2" />}
            footer={<DataBadge attestation={FORECAST_ATTESTATION} variant="full" />}
          >
            <div className="space-y-3">
              <p className="text-delta-lg text-slate-700">
                Total projetado{' '}
                <span className="font-semibold tabular-nums text-slate-900">
                  {formatMoney(FORECAST_TOTAL_BRL)}
                </span>{' '}
                <span className="text-neutral">
                  · faixa de {formatMoney(FORECAST_LOW_BRL)} a {formatMoney(FORECAST_HIGH_BRL)}
                </span>
              </p>
              <ForecastChart />
            </div>
          </Panel>
        </div>

        <div className="lg:col-span-5">
          <Panel
            title="Variações do período"
            description="Cada movimento vem com a leitura que o explica"
            action={<span className="text-delta text-neutral">{PULSE_COMPARISON}</span>}
          >
            <SignalFeed />
          </Panel>
        </div>
      </div>
    </div>
  )
}
