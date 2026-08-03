import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { DataBadge } from '../../components/DataBadge'
import { CHART_AXIS, CHART_CURSOR, CHART_GRID, CHART_LINE } from '../../design/chartTheme'
import { DegradedBanner } from '../../components/DegradedBanner'
import { FutureButton } from '../../components/FutureButton'
import { KpiCard } from '../../components/KpiCard'
import { Panel } from '../../components/Panel'
import { PerimeterMark, PerimeterNote } from '../../components/PerimeterNote'
import { SemanticDelta } from '../../components/SemanticDelta'
import { StateChip } from '../../components/StateChip'
import { SEMANTIC } from '../../design/tokens'
import { isStale } from '../../domain/attestation'
import { formatDecimal, formatPercent, formatPointsDelta } from '../../domain/format'
import { formatMoney } from '../../domain/money'
import { formatDate, formatRelative } from '../../domain/today'
import {
  formatIndex,
  MOVE_KIND_LABEL,
  PRICE_POSITION_LABEL,
  PRICE_POSITION_TONE,
} from '../../mock/competitive'
import {
  CONSOLIDATED,
  CRITICAL_CUT,
  CRITICAL_CUT_LABEL,
  CRITICAL_DECISION,
  CRITICAL_MOVE,
  CRITICAL_SHARE_IMPACT_PP,
  indexDrivers,
  INDEX_ATTESTATION,
  INDEX_CUT_DESCRIPTION,
  INDEX_CUT_LABEL,
  INDEX_CUTS,
  INDEX_DOMAIN,
  INDEX_GAP_PP,
  INDEX_KPI,
  INDEX_SERIES,
  INDEX_TICKS,
  PARITY_BAND,
  PARITY_LINE,
  PREVIOUS_INDEX,
  pullScale,
  SELLOUT_KPI,
  SERIES_ATTESTATION,
  SHARE_KPI,
  sliceIndex,
  sliceSpreadPp,
  SLICE_ORDER_LABEL,
  SLICE_ORDERS,
  type IndexCut,
  type IndexSlice,
  type SliceOrder,
} from '../../mock/competitiveness'
import { formatKpiValue } from '../../mock/kpis'

/**
 * A série do índice é uma métrica só, então anda em cinza escuro. A cor entra
 * apenas onde significa dado: âmbar no recorte que empurra o índice acima da
 * paridade, neutro no que puxa para baixo.
 */
const SERIES_COLOR = '#334155'
const BAND_COLOR = '#E2E8F0'

const PULL_UP_COLOR = SEMANTIC.attention
const PULL_DOWN_COLOR = SEMANTIC.neutral

function pullColor(value: number): string {
  return value >= 0 ? PULL_UP_COLOR : PULL_DOWN_COLOR
}

function PullBar({ value, scale }: { value: number; scale: number }) {
  const width = scale === 0 ? 0 : (Math.abs(value) / scale) * 46

  return (
    <span
      className="relative block h-2 w-28 rounded-full bg-slate-100"
      title={`${formatPointsDelta(value)} sobre o índice consolidado`}
    >
      <span className="absolute inset-y-0 left-1/2 w-px bg-slate-300" aria-hidden />
      <span
        className="absolute inset-y-0 rounded-full"
        style={{
          left: value >= 0 ? '50%' : `${50 - width}%`,
          width: `${width}%`,
          backgroundColor: pullColor(value),
        }}
      />
    </span>
  )
}

function DriverChip({
  caption,
  slice,
}: {
  caption: string
  slice: IndexSlice | null
}) {
  if (!slice) return null

  return (
    <span className="inline-flex items-baseline gap-2 rounded-control border border-surface-border px-2.5 py-1 text-delta">
      <span className="text-neutral">{caption}</span>
      <span className="font-semibold text-slate-900">{slice.shortLabel}</span>
      <span
        className="font-medium tabular-nums"
        style={{ color: pullColor(slice.contributionPp) }}
      >
        {formatPointsDelta(slice.contributionPp)}
      </span>
    </span>
  )
}

function CutTabs({
  active,
  onChange,
}: {
  active: IndexCut
  onChange: (next: IndexCut) => void
}) {
  return (
    <div className="inline-flex rounded-control border border-surface-border p-0.5">
      {INDEX_CUTS.map((cut) => {
        const selected = cut === active
        return (
          <button
            key={cut}
            type="button"
            onClick={() => onChange(cut)}
            className={`rounded-control px-3 py-1.5 text-delta-lg font-medium transition-colors ${
              selected ? 'text-white' : 'text-neutral hover:bg-slate-50'
            }`}
            style={selected ? { backgroundColor: 'var(--product-accent)' } : undefined}
          >
            {INDEX_CUT_LABEL[cut]}
          </button>
        )
      })}
    </div>
  )
}

function OrderSelect({
  value,
  onChange,
}: {
  value: SliceOrder
  onChange: (next: SliceOrder) => void
}) {
  return (
    <label className="text-delta-lg">
      <span className="mr-2 text-neutral">Ordenar por</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as SliceOrder)}
        className="rounded-control border border-surface-border bg-surface-card px-3 py-1.5 font-medium text-slate-900"
      >
        {SLICE_ORDERS.map((order) => (
          <option key={order} value={order}>
            {SLICE_ORDER_LABEL[order]}
          </option>
        ))}
      </select>
    </label>
  )
}

function SliceRow({ slice, scale }: { slice: IndexSlice; scale: number }) {
  return (
    <tr className="transition-colors hover:bg-slate-50">
      <td className="py-2.5 pr-3">
        <span className="block text-delta-lg font-medium text-slate-900">{slice.label}</span>
        {slice.detail ? (
          <span className="block text-delta text-neutral">{slice.detail}</span>
        ) : null}
      </td>
      <td className="px-3 py-2.5 text-right text-delta-lg tabular-nums text-slate-600">
        {formatPercent(slice.weight * 100, 0)}
      </td>
      <td className="px-3 py-2.5 text-right text-delta-lg font-semibold tabular-nums text-slate-900">
        {formatIndex(slice.ipr)}
      </td>
      <td className="px-3 py-2.5 text-right text-delta-lg tabular-nums text-slate-600">
        {formatPointsDelta(slice.gapPp)}
      </td>
      <td className="px-3 py-2.5">
        <span className="flex items-center gap-2">
          <PullBar value={slice.contributionPp} scale={scale} />
          <span
            className="text-delta font-medium tabular-nums"
            style={{ color: pullColor(slice.contributionPp) }}
          >
            {formatPointsDelta(slice.contributionPp)}
          </span>
        </span>
      </td>
      <td className="px-3 py-2.5">
        <StateChip
          label={PRICE_POSITION_LABEL[slice.position]}
          tone={PRICE_POSITION_TONE[slice.position]}
        />
      </td>
      <td className="py-2.5 pl-3 text-right tabular-nums">
        {slice.exposureBrl === null ? (
          <span className="text-delta text-slate-400">Em apuração</span>
        ) : slice.decisionId ? (
          <Link
            to={`/decisoes/${slice.decisionId}`}
            className="text-delta-lg font-medium underline"
            style={{ color: 'var(--product-accent)' }}
          >
            {formatMoney(slice.exposureBrl)}
            <PerimeterMark />
          </Link>
        ) : (
          <span className="text-delta-lg font-medium text-slate-900">
            {formatMoney(slice.exposureBrl)}
            <PerimeterMark />
          </span>
        )}
      </td>
    </tr>
  )
}

type TooltipEntry = { value?: number }

function IndexTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string
}) {
  const entry = payload?.[0]
  if (!active || !entry) return null

  const value = entry.value ?? 0

  return (
    <div className="rounded-control border border-surface-border bg-surface-card px-3 py-2 shadow-sm">
      <p className="text-delta font-medium text-slate-900">Semana de {label}</p>
      <p className="mt-1 text-delta text-slate-700">
        Índice <span className="font-semibold tabular-nums">{formatIndex(value)}</span>
      </p>
      <p className="text-delta text-neutral">
        Paridade <span className="tabular-nums">{formatPointsDelta(value - PARITY_LINE)}</span>
      </p>
    </div>
  )
}

function IndexEvolutionChart() {
  const data = INDEX_SERIES.map((point) => ({ label: point.label, indice: point.index }))

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
          <CartesianGrid {...CHART_GRID} />
          <ReferenceArea
            y1={PARITY_BAND.floor}
            y2={PARITY_BAND.ceiling}
            fill={BAND_COLOR}
            fillOpacity={0.7}
          />
          <ReferenceLine
            y={PARITY_LINE}
            stroke="#94A3B8"
            strokeDasharray="4 4"
            label={{
              value: `Paridade ${formatDecimal(PARITY_LINE, 0)}`,
              position: 'insideTopLeft',
              fill: '#64748B',
              fontSize: 12,
            }}
          />
          <XAxis {...CHART_AXIS} dataKey="label" />
          <YAxis
            {...CHART_AXIS}
            width={44}
            domain={[INDEX_DOMAIN[0], INDEX_DOMAIN[1]]}
            ticks={[...INDEX_TICKS]}
          />
          <Tooltip content={<IndexTooltip />} cursor={CHART_CURSOR} />
          <Line
            {...CHART_LINE}
            type="linear"
            dataKey="indice"
            name="Índice de competitividade"
            stroke={SERIES_COLOR}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CompetitivenessIndex() {
  const [cut, setCut] = useState<IndexCut>('molecule')
  const [order, setOrder] = useState<SliceOrder>('pull')

  const slices = sliceIndex(cut, order)
  const scale = pullScale(cut)
  const drivers = indexDrivers(cut)
  const spread = sliceSpreadPp(cut)

  const staleAttestations = [INDEX_ATTESTATION, SERIES_ATTESTATION].filter(isStale)

  return (
    <div className="space-y-5">
      <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Índice de competitividade
      </h1>

      <DegradedBanner
        attestations={staleAttestations}
        consequence="A decomposição do índice segue disponível com confiança reduzida no recorte afetado."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Índice consolidado"
          value={formatIndex(INDEX_KPI.value)}
          delta={INDEX_KPI.delta}
          deltaUnit={INDEX_KPI.deltaUnit}
          comparison={INDEX_KPI.comparison}
          attestation={INDEX_KPI.attestation}
          size="lg"
        />
        <KpiCard
          label="Distância para a paridade"
          value={formatPointsDelta(INDEX_GAP_PP)}
          attestation={INDEX_ATTESTATION}
        />
        <KpiCard
          label={SHARE_KPI.label}
          value={formatKpiValue(SHARE_KPI)}
          delta={SHARE_KPI.delta}
          deltaUnit={SHARE_KPI.deltaUnit}
          comparison={SHARE_KPI.comparison}
          attestation={SHARE_KPI.attestation}
        />
        <KpiCard
          label={SELLOUT_KPI.label}
          value={formatKpiValue(SELLOUT_KPI)}
          delta={SELLOUT_KPI.delta}
          deltaUnit={SELLOUT_KPI.deltaUnit}
          comparison={SELLOUT_KPI.comparison}
          attestation={SELLOUT_KPI.attestation}
        />
      </div>

      <Panel
        title="Decomposição do índice"
        description={INDEX_CUT_DESCRIPTION[cut]}
        action={<FutureButton label="Assinar alerta de competitividade" phase="Fase 2" />}
        footer={<DataBadge attestation={INDEX_ATTESTATION} variant="full" />}
      >
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <span className="text-delta-lg text-neutral">Abrir por</span>
          <CutTabs active={cut} onChange={setCut} />
          <OrderSelect value={order} onChange={setOrder} />

          {cut !== CRITICAL_CUT ? (
            <button
              type="button"
              onClick={() => setCut(CRITICAL_CUT)}
              className="rounded-control border border-surface-border px-3 py-1.5 text-delta-lg font-medium transition-colors hover:bg-slate-50"
              style={{ color: 'var(--product-accent)' }}
            >
              {CRITICAL_CUT_LABEL}
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <DriverChip caption="Puxa para cima" slice={drivers.up} />
          <DriverChip caption="Puxa para baixo" slice={drivers.down} />
          <span className="text-delta text-neutral">
            {slices.length} recortes · amplitude de{' '}
            <span className="font-medium tabular-nums text-slate-600">
              {formatDecimal(spread, 1)} pp
            </span>{' '}
            · índice consolidado{' '}
            <span className="font-medium tabular-nums text-slate-600">
              {formatIndex(CONSOLIDATED.ipr)}
            </span>
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse">
            <thead>
              <tr className="border-b border-surface-border text-delta uppercase tracking-wide text-neutral">
                <th className="py-2 pr-3 text-left font-medium">{INDEX_CUT_LABEL[cut]}</th>
                <th className="px-3 py-2 text-right font-medium">Peso</th>
                <th className="px-3 py-2 text-right font-medium">Índice</th>
                <th className="px-3 py-2 text-right font-medium">Gap</th>
                <th className="px-3 py-2 text-left font-medium">Puxada sobre o consolidado</th>
                <th className="px-3 py-2 text-left font-medium">Posição</th>
                <th className="py-2 pl-3 text-right font-medium">Impacto financeiro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {slices.map((slice) => (
                <SliceRow key={slice.id} slice={slice} scale={scale} />
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-delta text-neutral">
          A puxada é a contribuição do recorte para o índice consolidado, em pontos. Como os
          recortes cobrem a malha inteira sem sobreposição, as puxadas somam zero.
        </p>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Panel
            title="Evolução do índice"
            description="Faixa de paridade operacional destacada; a linha tracejada é a paridade exata com o concorrente."
            footer={<DataBadge attestation={SERIES_ATTESTATION} variant="full" />}
          >
            <IndexEvolutionChart />

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-delta text-neutral">
              <span className="inline-flex items-center gap-2">
                <span
                  className="h-2 w-6 rounded-sm"
                  style={{ backgroundColor: BAND_COLOR }}
                  aria-hidden
                />
                Faixa de paridade {formatDecimal(PARITY_BAND.floor, 0)} a{' '}
                {formatDecimal(PARITY_BAND.ceiling, 0)}
              </span>
              <span className="tabular-nums">
                Semana anterior {formatIndex(PREVIOUS_INDEX)} · semana corrente{' '}
                {formatIndex(INDEX_KPI.value)}
              </span>
            </div>
          </Panel>
        </div>

        <div className="lg:col-span-5">
          <Panel
            title="Diagnóstico do período"
            description="O que move o índice e o que já virou decisão"
            footer={<DataBadge attestation={CRITICAL_MOVE.attestation} variant="full" />}
          >
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-delta font-medium tabular-nums text-slate-600">
                {formatDate(CRITICAL_MOVE.date)}
              </span>
              <span className="text-delta text-neutral">{formatRelative(CRITICAL_MOVE.date)}</span>
              <StateChip label={MOVE_KIND_LABEL[CRITICAL_MOVE.kind]} />
              <span className="text-delta text-neutral">{CRITICAL_MOVE.competitor}</span>
            </div>

            <p className="mt-2 text-delta-lg font-medium text-slate-900">
              {CRITICAL_MOVE.description}
            </p>
            <p className="text-delta text-neutral">{CRITICAL_MOVE.scope}</p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-control border border-surface-border px-3 py-2.5">
                <p className="text-delta text-neutral">{CRITICAL_MOVE.impactLabel}</p>
                <p className="mt-0.5">
                  <SemanticDelta value={CRITICAL_SHARE_IMPACT_PP} unit="points" />
                </p>
              </div>
              <div className="rounded-control border border-surface-border px-3 py-2.5">
                <p className="text-delta text-neutral">Impacto financeiro da decisão</p>
                <p className="mt-0.5 text-delta-lg font-semibold tabular-nums text-slate-900">
                  {formatMoney(CRITICAL_DECISION.impactBrl)}
                  <PerimeterMark />
                </p>
              </div>
            </div>

            <Link
              to={`/decisoes/${CRITICAL_DECISION.id}`}
              className="mt-3 inline-block text-delta-lg font-medium underline"
              style={{ color: 'var(--product-accent)' }}
            >
              {CRITICAL_DECISION.id} · {CRITICAL_DECISION.title} →
            </Link>
          </Panel>
        </div>
      </div>

      <PerimeterNote />
    </div>
  )
}
