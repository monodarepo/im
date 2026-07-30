import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { DataBadge } from '../../components/DataBadge'
import { DegradedBanner } from '../../components/DegradedBanner'
import { FutureButton } from '../../components/FutureButton'
import { KpiCard } from '../../components/KpiCard'
import { Panel } from '../../components/Panel'
import { SemanticDelta } from '../../components/SemanticDelta'
import { StateChip } from '../../components/StateChip'
import { isStale } from '../../domain/attestation'
import { formatDecimal, formatPointsDelta } from '../../domain/format'
import { formatMoney } from '../../domain/money'
import { formatDate, formatRelative } from '../../domain/today'
import {
  CONSOLIDATED_GAP_PP,
  formatIndex,
  formatPriceGapBrl,
  formatUnitPrice,
  groupPrices,
  MARKET_SHARE_KPI,
  MOLECULE_TIMELINES,
  MOVE_KIND_LABEL,
  MOVES_ATTESTATION,
  optionsFor,
  PRICE_ATTESTATION,
  PRICE_DIMENSION_LABEL,
  PRICE_DIMENSIONS,
  PRICE_POSITION_LABEL,
  PRICE_POSITION_TONE,
  pricePosition,
  PRESSURED_CUT,
  RELATIVE_PRICE_KPI,
  summarizePrices,
  type CompetitiveMove,
  type PriceDimension,
  type PriceFilter,
  type PriceGroup,
} from '../../mock/competitive'
import { findDecision } from '../../mock/decisions'
import { formatKpiValue } from '../../mock/kpis'

/**
 * Hypera e concorrente são a mesma métrica em dois donos: dividem a escala e se
 * distinguem por peso, em cinza neutro. A cor de identidade do produto não entra
 * em série de dado.
 */
const HYPERA_COLOR = '#475569'
const COMPETITOR_COLOR = '#CBD5E1'

const ALL_OPTION = 'todos'

type TooltipEntry = { name?: string; value?: number; color?: string }

function PriceTooltip({
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
            {formatUnitPrice(entry.value ?? 0)}
          </span>
        </p>
      ))}
    </div>
  )
}

function PriceComparisonChart({ groups }: { groups: readonly PriceGroup[] }) {
  const data = groups.map((group) => ({
    label: group.shortLabel,
    hypera: group.hyperaPriceBrl,
    concorrente: group.competitorPriceBrl,
  }))

  return (
    <div className="w-full" style={{ height: 72 + groups.length * 56 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          barGap={4}
          margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
        >
          <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={{ stroke: '#E2E8F0' }}
            tick={{ fill: '#64748B', fontSize: 12 }}
            tickFormatter={(value: number) => formatDecimal(value, 0)}
            label={{
              value: 'R$ por embalagem',
              position: 'insideBottomRight',
              offset: -4,
              fill: '#64748B',
              fontSize: 12,
            }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={148}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#334155', fontSize: 12 }}
          />
          <Tooltip content={<PriceTooltip />} cursor={{ fill: '#F1F5F9' }} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="square"
            wrapperStyle={{ fontSize: 12, color: '#64748B', paddingBottom: 8 }}
          />
          <Bar dataKey="hypera" name="Hypera" fill={HYPERA_COLOR} barSize={12} radius={[0, 3, 3, 0]} />
          <Bar
            dataKey="concorrente"
            name="Concorrente (referência)"
            fill={COMPETITOR_COLOR}
            barSize={12}
            radius={[0, 3, 3, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function PriceRow({ group, emphasis }: { group: PriceGroup; emphasis: boolean }) {
  const position = pricePosition(group.ipr)

  return (
    <tr className={emphasis ? 'bg-slate-50' : undefined}>
      <td className="py-2 pr-3 text-delta-lg text-slate-900">
        <span className={emphasis ? 'font-semibold' : 'font-medium'}>{group.label}</span>
        <span className="ml-2 text-delta text-neutral tabular-nums">
          {group.cellCount} recortes
        </span>
      </td>
      <td className="py-2 px-3 text-right text-delta-lg tabular-nums text-slate-900">
        {formatUnitPrice(group.hyperaPriceBrl)}
      </td>
      <td className="py-2 px-3 text-right text-delta-lg tabular-nums text-slate-600">
        {formatUnitPrice(group.competitorPriceBrl)}
      </td>
      <td className="py-2 px-3 text-right text-delta-lg tabular-nums text-slate-600">
        {formatPriceGapBrl(group.gapBrl)}
      </td>
      <td className="py-2 px-3 text-right text-delta-lg font-semibold tabular-nums text-slate-900">
        {formatIndex(group.ipr)}
      </td>
      <td className="py-2 px-3 text-right text-delta-lg tabular-nums text-slate-600">
        {formatPointsDelta(group.gapPp)}
      </td>
      <td className="py-2 pl-3 text-right">
        <StateChip label={PRICE_POSITION_LABEL[position]} tone={PRICE_POSITION_TONE[position]} />
      </td>
    </tr>
  )
}

function CutSelect({
  dimension,
  value,
  onChange,
}: {
  dimension: PriceDimension
  value: string | null
  onChange: (next: string | null) => void
}) {
  return (
    <label className="text-delta-lg">
      <span className="mr-2 text-neutral">{PRICE_DIMENSION_LABEL[dimension]}</span>
      <select
        value={value ?? ALL_OPTION}
        onChange={(event) =>
          onChange(event.target.value === ALL_OPTION ? null : event.target.value)
        }
        className="rounded-control border border-surface-border bg-surface-card px-3 py-1.5 font-medium text-slate-900"
      >
        <option value={ALL_OPTION}>Todos</option>
        {optionsFor(dimension).map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function DimensionTabs({
  active,
  onChange,
}: {
  active: PriceDimension
  onChange: (next: PriceDimension) => void
}) {
  return (
    <div className="inline-flex rounded-control border border-surface-border p-0.5">
      {PRICE_DIMENSIONS.map((dimension) => {
        const selected = dimension === active
        return (
          <button
            key={dimension}
            type="button"
            onClick={() => onChange(dimension)}
            className={`rounded-control px-3 py-1.5 text-delta-lg font-medium transition-colors ${
              selected ? 'text-white' : 'text-neutral hover:bg-slate-50'
            }`}
            style={selected ? { backgroundColor: 'var(--product-accent)' } : undefined}
          >
            {PRICE_DIMENSION_LABEL[dimension]}
          </button>
        )
      })}
    </div>
  )
}

function MoveItem({ move, connected }: { move: CompetitiveMove; connected: boolean }) {
  const decision = move.decisionId === null ? undefined : findDecision(move.decisionId)

  return (
    <li className="relative pl-6 pb-4 last:pb-0">
      <span
        className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-300"
        aria-hidden
      />
      {connected ? (
        <span className="absolute bottom-0 left-[4.5px] top-4 w-px bg-surface-border" aria-hidden />
      ) : null}

      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-delta font-medium tabular-nums text-slate-600">
          {formatDate(move.date)}
        </span>
        <span className="text-delta text-neutral">{formatRelative(move.date)}</span>
        <StateChip label={MOVE_KIND_LABEL[move.kind]} />
        <span className="text-delta text-neutral">{move.competitor}</span>
      </div>

      <p className="mt-1 text-delta-lg font-medium text-slate-900">{move.description}</p>
      <p className="text-delta text-neutral">{move.scope}</p>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        {move.impactPp === null ? (
          <span className="text-delta text-slate-400">{move.impactLabel}</span>
        ) : (
          <span className="text-delta-lg">
            <span className="mr-1.5 text-neutral">{move.impactLabel}</span>
            <SemanticDelta value={move.impactPp} unit="points" size="sm" />
          </span>
        )}

        {decision ? (
          <Link
            to={`/decisoes/${decision.id}`}
            className="rounded-control text-delta font-medium transition-colors hover:bg-slate-50"
            style={{ color: 'var(--product-accent)' }}
          >
            {decision.id} · {decision.title} · {formatMoney(decision.impactBrl)} →
          </Link>
        ) : null}
      </div>

      <div className="mt-1.5">
        <DataBadge attestation={move.attestation} />
      </div>
    </li>
  )
}

export function CompetitiveIntel() {
  const [dimension, setDimension] = useState<PriceDimension>('sku')
  const [skuId, setSkuId] = useState<string | null>(null)
  const [channelId, setChannelId] = useState<string | null>(null)
  const [microregionId, setMicroregionId] = useState<string | null>(null)

  const filter: PriceFilter = {
    skuId: dimension === 'sku' ? null : skuId,
    channelId: dimension === 'channel' ? null : channelId,
    microregionId: dimension === 'microregion' ? null : microregionId,
  }

  const groups = groupPrices(dimension, filter)
  const consolidated = summarizePrices(filter)

  const staleAttestations = [PRICE_ATTESTATION, MOVES_ATTESTATION].filter(isStale)

  const openPressuredCut = () => {
    setDimension(PRESSURED_CUT.dimension)
    setSkuId(PRESSURED_CUT.skuId)
    setChannelId(null)
    setMicroregionId(null)
  }

  return (
    <div className="space-y-5">
      <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Inteligência competitiva
      </h1>

      <DegradedBanner
        attestations={staleAttestations}
        consequence="A comparação de preço segue disponível com confiança reduzida no recorte afetado."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label={RELATIVE_PRICE_KPI.label}
          value={formatKpiValue(RELATIVE_PRICE_KPI)}
          delta={RELATIVE_PRICE_KPI.delta}
          deltaUnit={RELATIVE_PRICE_KPI.deltaUnit}
          comparison={RELATIVE_PRICE_KPI.comparison}
          attestation={RELATIVE_PRICE_KPI.attestation}
        />
        <KpiCard
          label="Gap para a paridade de preço"
          value={formatPointsDelta(CONSOLIDATED_GAP_PP)}
          attestation={PRICE_ATTESTATION}
        />
        <KpiCard
          label={MARKET_SHARE_KPI.label}
          value={formatKpiValue(MARKET_SHARE_KPI)}
          delta={MARKET_SHARE_KPI.delta}
          deltaUnit={MARKET_SHARE_KPI.deltaUnit}
          comparison={MARKET_SHARE_KPI.comparison}
          attestation={MARKET_SHARE_KPI.attestation}
        />
      </div>

      <Panel
        title="Preço Hypera x concorrente"
        description="Índice 100 é a paridade: acima, a Hypera está mais cara que o concorrente no recorte."
        action={
          <button
            type="button"
            onClick={openPressuredCut}
            className="rounded-control border border-surface-border px-3 py-1.5 text-delta-lg font-medium transition-colors hover:bg-slate-50"
            style={{ color: 'var(--product-accent)' }}
          >
            {PRESSURED_CUT.label}
          </button>
        }
        footer={<DataBadge attestation={PRICE_ATTESTATION} variant="full" />}
      >
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <span className="text-delta-lg text-neutral">Comparar por</span>
          <DimensionTabs active={dimension} onChange={setDimension} />

          {dimension !== 'sku' ? (
            <CutSelect dimension="sku" value={skuId} onChange={setSkuId} />
          ) : null}
          {dimension !== 'channel' ? (
            <CutSelect dimension="channel" value={channelId} onChange={setChannelId} />
          ) : null}
          {dimension !== 'microregion' ? (
            <CutSelect dimension="microregion" value={microregionId} onChange={setMicroregionId} />
          ) : null}
        </div>

        <div className="mt-4">
          <PriceComparisonChart groups={groups} />
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b border-surface-border text-delta uppercase tracking-wide text-neutral">
                <th className="py-2 pr-3 text-left font-medium">
                  {PRICE_DIMENSION_LABEL[dimension]}
                </th>
                <th className="py-2 px-3 text-right font-medium">Preço Hypera</th>
                <th className="py-2 px-3 text-right font-medium">Preço concorrente</th>
                <th className="py-2 px-3 text-right font-medium">Diferença</th>
                <th className="py-2 px-3 text-right font-medium">IPR</th>
                <th className="py-2 px-3 text-right font-medium">Gap</th>
                <th className="py-2 pl-3 text-right font-medium">Posição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {groups.map((group) => (
                <PriceRow key={group.id} group={group} emphasis={false} />
              ))}
              <PriceRow group={consolidated} emphasis />
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Timeline de movimentos por molécula"
        description="Mudança de preço, lançamento e promoção observados na janela, por molécula."
        action={<FutureButton label="Assinar alerta de movimento" phase="Fase 2" />}
        footer={<DataBadge attestation={MOVES_ATTESTATION} variant="full" />}
      >
        <div className="grid gap-6 lg:grid-cols-3">
          {MOLECULE_TIMELINES.map((timeline) => (
            <section key={timeline.molecule}>
              <header className="flex items-baseline justify-between gap-3 border-b border-surface-border pb-2">
                <h3 className="text-delta-lg font-semibold text-slate-900">{timeline.molecule}</h3>
                <span className="text-delta tabular-nums text-neutral">
                  {timeline.moves.length} movimentos
                </span>
              </header>

              <ol className="mt-3">
                {timeline.moves.map((move, index) => (
                  <MoveItem
                    key={move.id}
                    move={move}
                    connected={index < timeline.moves.length - 1}
                  />
                ))}
              </ol>
            </section>
          ))}
        </div>
      </Panel>
    </div>
  )
}
