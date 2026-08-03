import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { LineDot } from 'recharts/types/cartesian/Line'
import { CHART_AXIS, CHART_CURSOR, CHART_GRID, CHART_LINE, endpointDot } from '../design/chartTheme'
import { formatDecimal } from '../domain/format'
import { formatMoney } from '../domain/money'
import { SELLOUT_SERIES } from '../mock/sellout'

/**
 * Evolução do sell-out: período corrente em azul cheio, 7 dias anteriores em
 * azul claro tracejado.
 *
 * As duas séries são a mesma métrica em janelas diferentes, então compartilham
 * o matiz e se distinguem por peso e traço — não por cores concorrentes.
 */

const CURRENT_COLOR = '#1E4FD8'
const PREVIOUS_COLOR = '#93B4F7'

const toMillions = (value: number) => value / 1_000_000

/** Passo de eixo legível: só 1, 2, 2,5 ou 5 vezes uma potência de dez. */
function niceStep(raw: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const normalized = raw / magnitude
  const factor = [1, 2, 2.5, 5, 10].find((candidate) => normalized <= candidate) ?? 10
  return factor * magnitude
}

function AxisTickMoney({ x, y, payload }: { x?: number; y?: number; payload?: { value: number } }) {
  return (
    <text x={x} y={y} dy={4} dx={-8} textAnchor="end" className="fill-neutral text-delta tabular-nums">
      {formatDecimal(payload?.value ?? 0, 0)}
    </text>
  )
}

type TooltipEntry = { name?: string; value?: number; color?: string }

function SelloutTooltip({
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
      <p className="text-delta font-medium text-slate-900">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="mt-1 flex items-center gap-2 text-delta text-slate-700">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
            aria-hidden
          />
          <span>{entry.name}</span>
          <span className="ml-auto font-medium tabular-nums">
            {formatMoney((entry.value ?? 0) * 1_000_000)}
          </span>
        </p>
      ))}
    </div>
  )
}

export function SelloutChart() {
  const data = SELLOUT_SERIES.map((point) => ({
    label: point.label,
    atual: toMillions(point.current),
    anterior: toMillions(point.previous),
  }))

  /** Último ponto com valor: se ficar antes do fim do eixo, a série é parcial. */
  const lastDefined = data.reduce(
    (last, point, index) => (Number.isFinite(point.atual) ? index : last),
    0,
  )
  const isPartial = lastDefined < data.length - 1

  // Base em zero — é dinheiro —, teto logo acima da série para não sobrar vão.
  const peak = Math.max(...data.map((point) => Math.max(point.atual, point.anterior)))
  const step = niceStep((peak * 1.15) / 5)
  const ceiling = Math.ceil((peak * 1.15) / step) * step
  const ticks = Array.from({ length: ceiling / step + 1 }, (_, index) => index * step)

  return (
    <div className="flex h-full min-h-[280px] w-full flex-col">
      <div className="mb-2 flex gap-4 text-micro uppercase text-neutral">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: CURRENT_COLOR }} aria-hidden />
          Período atual
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: PREVIOUS_COLOR }} aria-hidden />
          7 dias anteriores
        </span>
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
            <Tooltip content={<SelloutTooltip />} cursor={CHART_CURSOR} />
            <Line
              {...CHART_LINE}
              type="linear"
              dataKey="anterior"
              name="7 dias anteriores"
              stroke={PREVIOUS_COLOR}
              strokeDasharray="6 4"
            />
            <Line
              {...CHART_LINE}
              type="linear"
              dataKey="atual"
              name="Período atual"
              stroke={CURRENT_COLOR}
              strokeWidth={2.5}
              dot={endpointDot(CURRENT_COLOR, lastDefined, { partial: isPartial }) as LineDot}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
