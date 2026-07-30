import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { CHART_AXIS, CHART_BAR, CHART_GRID } from '../design/chartTheme'
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
          <CartesianGrid {...CHART_GRID} />
          <XAxis
            {...CHART_AXIS}
            dataKey="label"
            interval={0}
            angle={-20}
            textAnchor="end"
            height={64}
          />
          <YAxis
            {...CHART_AXIS}
            width={56}
            tickFormatter={(value: number) => formatPointsDelta(value).replace(' pp', '')}
          />
          <Bar
            {...CHART_BAR}
            dataKey="base"
            stackId="waterfall"
            fill="transparent"
            isAnimationActive={false}
          />
          <Bar {...CHART_BAR} dataKey="span" stackId="waterfall" isAnimationActive={false}>
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
