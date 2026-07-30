import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { formatPointsDelta } from '../domain/format'
import { SEMANTIC, semanticColor, toneForDelta } from '../design/tokens'
import type { WaterfallStep } from '../mock/rootCause'

/**
 * Waterfall de decomposição. Cada fator move o resultado para cima ou para
 * baixo pela cor semântica; a barra de total fecha em neutro, porque é a
 * consequência e não uma contribuição.
 */
export function WaterfallChart({ steps }: { steps: readonly WaterfallStep[] }) {
  const data = steps.map((step) => ({
    label: step.label,
    base: Math.min(step.start, step.end),
    span: Math.abs(step.end - step.start),
    value: step.value,
    isTotal: step.isTotal,
  }))

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: '#E2E8F0' }}
            tick={{ fill: '#64748B', fontSize: 11 }}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={64}
          />
          <YAxis
            width={56}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#64748B', fontSize: 12 }}
            tickFormatter={(value: number) => formatPointsDelta(value).replace(' pp', '')}
          />
          <Bar dataKey="base" stackId="waterfall" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="span" stackId="waterfall" radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {data.map((entry) => (
              <Cell
                key={entry.label}
                fill={entry.isTotal ? SEMANTIC.neutral : semanticColor(toneForDelta(entry.value))}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
