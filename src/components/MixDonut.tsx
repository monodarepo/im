import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { formatPercent } from '../domain/format'
import { formatMoney } from '../domain/money'
import { MIX_TOTAL_BRL, SALES_MIX } from '../mock/mix'

/**
 * Mix de vendas por marca.
 *
 * As fatias são categorias sem ordem de mérito, então usam uma rampa neutra de
 * intensidade decrescente — nem a paleta semântica, que significaria bom e ruim,
 * nem a cor do produto, que é chrome.
 */
const SLICE_COLORS = ['#334155', '#64748B', '#94A3B8', '#CBD5E1']

type TooltipEntry = { name?: string; value?: number }

function MixTooltip({ active, payload }: { active?: boolean; payload?: TooltipEntry[] }) {
  const entry = payload?.[0]
  if (!active || !entry) return null

  const share = entry.value ?? 0
  return (
    <div className="rounded-control border border-surface-border bg-surface-card px-3 py-2 shadow-sm">
      <p className="text-delta font-medium text-slate-900">{entry.name}</p>
      <p className="mt-0.5 text-delta tabular-nums text-slate-700">
        {formatPercent(share, 0)} · {formatMoney((MIX_TOTAL_BRL * share) / 100)}
      </p>
    </div>
  )
}

export function MixDonut() {
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative h-48 w-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={[...SALES_MIX]}
              dataKey="share"
              nameKey="label"
              innerRadius={62}
              outerRadius={88}
              paddingAngle={2}
              startAngle={90}
              endAngle={-270}
              stroke="none"
            >
              {SALES_MIX.map((slice, index) => (
                <Cell key={slice.id} fill={SLICE_COLORS[index % SLICE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<MixTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-semibold tabular-nums text-slate-900">
            {formatMoney(MIX_TOTAL_BRL)}
          </span>
          <span className="text-delta text-neutral">Total</span>
        </div>
      </div>

      <ul className="w-full space-y-2">
        {SALES_MIX.map((slice, index) => (
          <li key={slice.id} className="flex items-center gap-2 text-delta-lg">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: SLICE_COLORS[index % SLICE_COLORS.length] }}
              aria-hidden
            />
            <span className="text-slate-700">{slice.label}</span>
            <span className="ml-auto font-medium tabular-nums text-slate-900">
              {formatPercent(slice.share, 0)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
