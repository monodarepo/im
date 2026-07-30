import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
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

  // Base em zero — é dinheiro —, teto logo acima da série para não sobrar vão.
  const peak = Math.max(...data.map((point) => Math.max(point.atual, point.anterior)))
  const step = niceStep((peak * 1.15) / 5)
  const ceiling = Math.ceil((peak * 1.15) / step) * step
  const ticks = Array.from({ length: ceiling / step + 1 }, (_, index) => index * step)

  return (
    <div className="h-full min-h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: '#E2E8F0' }}
            tick={{ fill: '#64748B', fontSize: 12 }}
          />
          <YAxis
            width={56}
            domain={[0, ceiling]}
            ticks={ticks}
            tickLine={false}
            axisLine={false}
            tick={<AxisTickMoney />}
            label={{
              value: 'R$ milhões',
              angle: -90,
              position: 'insideLeft',
              fill: '#64748B',
              fontSize: 12,
            }}
          />
          <Tooltip content={<SelloutTooltip />} cursor={{ stroke: '#CBD5E1' }} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, color: '#64748B', paddingBottom: 8 }}
          />
          <Line
            type="monotone"
            dataKey="anterior"
            name="7 dias anteriores"
            stroke={PREVIOUS_COLOR}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="atual"
            name="Período atual"
            stroke={CURRENT_COLOR}
            strokeWidth={2.5}
            dot={{ r: 3, fill: CURRENT_COLOR, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
