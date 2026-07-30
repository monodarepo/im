import { Link } from 'react-router-dom'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
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
import { StateChip } from '../../components/StateChip'
import { isStale } from '../../domain/attestation'
import { formatDecimal, formatInteger, formatPercent } from '../../domain/format'
import { formatMoney, formatMoneyFull } from '../../domain/money'
import { formatDate, formatRelative } from '../../domain/today'
import { SEMANTIC } from '../../design/tokens'
import type { SemanticTone } from '../../design/tokens'
import {
  BUDGET_USE_PERCENT,
  CAMPAIGN_PRODUCTS,
  CURRENT_CYCLE,
  CYCLE_ATTESTATION,
  CYCLE_STATE_LABEL,
  cycleState,
  FORECAST_ATTESTATION,
  FORECAST_SERIES,
  FORECAST_TOTAL_SAMPLES,
  PLAN_CONSTRAINTS,
  PLAN_LOCK_DAYS,
  PLANNED_SAMPLES,
  PLANNING_ATTESTATIONS,
  PLANNING_CYCLES,
  PLANNING_DECISION_ID,
  PLANNING_KPIS,
  PRODUCT_TOTALS,
  SPECIALTY_DEMAND,
  SPECIALTY_DEMAND_TOTAL,
  SPECIALTY_DEMAND_ATTESTATION,
  TERRITORY_DEMAND,
  TERRITORY_DEMAND_ATTESTATION,
  TERRITORY_DEMAND_TOTAL,
  type ConstraintStatus,
  type CycleState,
  type PlanConstraint,
  type PlanningKpi,
} from '../../mock/campaignPlanning'
import { BLOCKED_SAMPLES, CAMPAIGNS, STOCKOUT_BLOCK } from '../../mock/sampleAllocation'

/** A previsão é leitura de volume, não de resultado: série em cinza. */
const FORECAST_COLOR = '#334155'
const ACTUAL_COLOR = '#64748B'
const BAND_COLOR = '#CBD5E1'

const CYCLE_STATE_TONE: Record<CycleState, SemanticTone> = {
  closed: 'neutral',
  running: 'positive',
  planned: 'neutral',
}

const CONSTRAINT_TONE: Record<ConstraintStatus, SemanticTone> = {
  ok: 'positive',
  tight: 'attention',
  blocked: 'attention',
}

const CONSTRAINT_STATUS_LABEL: Record<ConstraintStatus, string> = {
  ok: 'Folga',
  tight: 'No limite',
  blocked: 'Retido',
}

function kpiValue(kpi: PlanningKpi): string {
  switch (kpi.format) {
    case 'integer':
      return formatInteger(kpi.value)
    case 'percent':
      return formatPercent(kpi.value, 0)
    case 'money_full':
      return formatMoneyFull(kpi.value)
  }
}

function CampaignStrip() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {CAMPAIGNS.map((campaign) => (
        <article
          key={campaign.id}
          className="rounded-card border border-surface-border bg-surface-card px-5 py-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-delta-lg font-semibold text-slate-900">
                {campaign.name} · {campaign.businessUnit}
              </p>
              <p className="mt-0.5 text-delta text-neutral">Produto: {campaign.product}</p>
            </div>
            <StateChip
              label={campaign.planned ? 'Plano dimensionado' : 'Em dimensionamento'}
              tone={campaign.planned ? 'positive' : 'attention'}
            />
          </div>

          <p className="mt-2 text-delta-lg text-slate-700">{campaign.note}</p>

          <p className="mt-2 text-delta text-neutral">
            {campaign.planned
              ? `Previsão de ${formatInteger(FORECAST_TOTAL_SAMPLES)} amostras no ciclo ${CURRENT_CYCLE?.label ?? ''}, das quais ${formatInteger(PLANNED_SAMPLES)} liberadas.`
              : 'Sem previsão de demanda neste ciclo. O piloto entra na grade quando o dimensionamento fechar — a campanha fica no plano, com o estado à vista.'}
          </p>
        </article>
      ))}
    </div>
  )
}

type ForecastTooltipEntry = {
  readonly dataKey?: string | number
  readonly name?: string
  readonly value?: number | readonly number[]
  readonly color?: string
}

function ForecastTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: ForecastTooltipEntry[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-control border border-surface-border bg-surface-card px-3 py-2 shadow-sm">
      <p className="text-delta font-medium text-slate-900">Ciclo {label}</p>
      {payload.map((entry) => {
        const value = entry.value
        const text = Array.isArray(value)
          ? `${formatInteger(value[0] ?? 0)} a ${formatInteger(value[1] ?? 0)}`
          : formatInteger(typeof value === 'number' ? value : 0)
        return (
          <p
            key={String(entry.dataKey)}
            className="mt-1 flex items-center gap-2 text-delta text-slate-700"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden
            />
            <span>{entry.name}</span>
            <span className="ml-auto font-medium tabular-nums">{text}</span>
          </p>
        )
      })}
    </div>
  )
}

function DemandForecastChart() {
  const data = FORECAST_SERIES.map((point) => ({
    label: point.label,
    banda: [point.band[0], point.band[1]],
    previsto: point.forecast,
    realizado: point.actual,
  }))

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -4 }}>
          <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: '#E2E8F0' }}
            tick={{ fill: '#64748B', fontSize: 12 }}
          />
          <YAxis
            width={56}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#64748B', fontSize: 12 }}
            tickFormatter={(value: number) => formatInteger(value / 1_000)}
            label={{
              value: 'mil amostras',
              angle: -90,
              position: 'insideLeft',
              fill: '#64748B',
              fontSize: 11,
            }}
          />
          <Tooltip content={<ForecastTooltip />} cursor={{ stroke: '#CBD5E1' }} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, color: '#64748B', paddingBottom: 8 }}
          />
          {CURRENT_CYCLE ? (
            <ReferenceLine
              x={CURRENT_CYCLE.label}
              stroke="#94A3B8"
              strokeDasharray="4 4"
              label={{ value: 'ciclo em execução', fill: '#64748B', fontSize: 11, position: 'top' }}
            />
          ) : null}
          <Area
            dataKey="banda"
            name="Faixa de incerteza"
            stroke="none"
            fill={BAND_COLOR}
            fillOpacity={0.55}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="previsto"
            name="Demanda prevista"
            stroke={FORECAST_COLOR}
            strokeWidth={2.5}
            dot={{ r: 3, fill: FORECAST_COLOR, strokeWidth: 0 }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="realizado"
            name="Entregue"
            stroke={ACTUAL_COLOR}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={{ r: 3, fill: ACTUAL_COLOR, strokeWidth: 0 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

function CycleCalendar() {
  return (
    <ol className="space-y-3">
      {PLANNING_CYCLES.map((cycle) => {
        const state = cycleState(cycle)
        return (
          <li
            key={cycle.id}
            className="rounded-control border border-surface-border px-4 py-3"
            style={state === 'running' ? { borderColor: '#94A3B8' } : undefined}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-delta-lg font-semibold text-slate-900">Ciclo {cycle.label}</span>
              <StateChip label={CYCLE_STATE_LABEL[state]} tone={CYCLE_STATE_TONE[state]} muted={state === 'closed'} />
            </div>

            <p className="mt-1 text-delta text-neutral">
              {formatDate(cycle.startsOn)} a {formatDate(cycle.endsOn)} · plano fecha{' '}
              {formatDate(cycle.lockOn)} ({formatRelative(cycle.lockOn)})
            </p>

            <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-delta-lg">
              <span className="text-slate-700">
                Previsto{' '}
                <span className="font-semibold tabular-nums text-slate-900">
                  {formatInteger(cycle.forecastSamples)}
                </span>
              </span>
              <span className="text-neutral">
                faixa {formatInteger(cycle.bandLow)} a {formatInteger(cycle.bandHigh)} (±
                {formatPercent(cycle.bandPercent, 0)})
              </span>
              {cycle.actualSamples !== null ? (
                <span className="text-slate-700">
                  Entregue{' '}
                  <span className="font-semibold tabular-nums text-slate-900">
                    {formatInteger(cycle.actualSamples)}
                  </span>
                </span>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function ConstraintMeter({ constraint }: { constraint: PlanConstraint }) {
  const ratio = constraint.limit > 0 ? constraint.used / constraint.limit : 0
  const tone = CONSTRAINT_TONE[constraint.status]
  const format = (value: number) =>
    constraint.unit === 'money' ? formatMoneyFull(value) : `${formatInteger(value)} amostras`

  return (
    <li className="rounded-control border border-surface-border px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-delta-lg font-medium text-slate-900">{constraint.label}</span>
        <StateChip label={CONSTRAINT_STATUS_LABEL[constraint.status]} tone={tone} />
      </div>

      <p className="mt-1 text-delta-lg tabular-nums text-slate-700">
        {format(constraint.used)}
        <span className="text-neutral"> de {format(constraint.limit)}</span>
        <span className="ml-2 text-delta text-neutral">{formatPercent(ratio * 100, 0)}</span>
      </p>

      <span className="mt-2 block h-2.5 w-full rounded-full bg-slate-100">
        <span
          className="block h-2.5 rounded-full"
          style={{
            width: `${Math.min(100, Math.max(3, ratio * 100))}%`,
            backgroundColor: constraint.status === 'ok' ? '#94A3B8' : SEMANTIC.attention,
          }}
        />
      </span>

      <p className="mt-2 text-delta text-neutral">{constraint.note}</p>
      <div className="mt-2">
        <DataBadge attestation={constraint.attestation} />
      </div>
    </li>
  )
}

function TerritoryDemandTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left">
        <thead>
          <tr className="border-b border-surface-border text-delta text-neutral">
            <th className="pb-2 font-medium">Território</th>
            {CAMPAIGN_PRODUCTS.map((product) => (
              <th key={product.id} className="pb-2 text-right font-medium">
                {product.label}
              </th>
            ))}
            <th className="pb-2 text-right font-medium">Demanda prevista</th>
            <th className="pb-2 text-right font-medium">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {TERRITORY_DEMAND.map((row) => (
            <tr key={row.id} className="text-delta-lg transition-colors hover:bg-slate-50">
              <td className="py-2.5 font-medium text-slate-900">{row.territory}</td>
              {CAMPAIGN_PRODUCTS.map((product, index) => (
                <td
                  key={product.id}
                  className="py-2.5 text-right tabular-nums text-slate-700"
                >
                  {formatInteger(row.byProduct[index] ?? 0)}
                </td>
              ))}
              <td className="py-2.5 text-right font-medium tabular-nums text-slate-900">
                {formatInteger(row.total)}
              </td>
              <td className="py-2.5 text-right">
                <StateChip
                  label={row.blocked ? 'Retido por ruptura' : 'Liberado'}
                  tone={row.blocked ? 'attention' : 'neutral'}
                />
              </td>
            </tr>
          ))}
          <tr className="border-t-2 border-surface-border text-delta-lg font-semibold">
            <td className="py-2.5 text-slate-900">Total</td>
            {CAMPAIGN_PRODUCTS.map((product, index) => (
              <td key={product.id} className="py-2.5 text-right tabular-nums text-slate-900">
                {formatInteger(PRODUCT_TOTALS[index] ?? 0)}
              </td>
            ))}
            <td className="py-2.5 text-right tabular-nums text-slate-900">
              {formatInteger(TERRITORY_DEMAND_TOTAL)}
            </td>
            <td className="py-2.5 text-right text-delta font-normal text-neutral">
              {formatInteger(PLANNED_SAMPLES)} liberadas
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function SpecialtyDemandTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-left">
        <thead>
          <tr className="border-b border-surface-border text-delta text-neutral">
            <th className="pb-2 font-medium">Especialidade</th>
            <th className="pb-2 text-right font-medium">Participação</th>
            <th className="pb-2 text-right font-medium">Médicos-alvo</th>
            <th className="pb-2 text-right font-medium">Amostras previstas</th>
            <th className="pb-2 text-right font-medium">Amostras por médico</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {SPECIALTY_DEMAND.map((row) => (
            <tr key={row.id} className="text-delta-lg transition-colors hover:bg-slate-50">
              <td className="py-2.5 font-medium text-slate-900">{row.label}</td>
              <td className="py-2.5 text-right tabular-nums text-slate-700">
                {formatPercent(row.share, 0)}
              </td>
              <td className="py-2.5 text-right tabular-nums text-slate-700">
                {formatInteger(row.targetDoctors)}
              </td>
              <td className="py-2.5 text-right font-medium tabular-nums text-slate-900">
                {formatInteger(row.samples)}
              </td>
              <td className="py-2.5 text-right tabular-nums text-slate-700">
                {formatDecimal(row.samplesPerDoctor, 1)}
              </td>
            </tr>
          ))}
          <tr className="border-t-2 border-surface-border text-delta-lg font-semibold">
            <td className="py-2.5 text-slate-900">Total</td>
            <td className="py-2.5 text-right tabular-nums text-slate-900">
              {formatPercent(SPECIALTY_DEMAND_TOTAL.share, 0)}
            </td>
            <td className="py-2.5 text-right tabular-nums text-slate-900">
              {formatInteger(SPECIALTY_DEMAND_TOTAL.targetDoctors)}
            </td>
            <td className="py-2.5 text-right tabular-nums text-slate-900">
              {formatInteger(SPECIALTY_DEMAND_TOTAL.samples)}
            </td>
            <td className="py-2.5 text-right tabular-nums text-slate-900">
              {formatDecimal(
                SPECIALTY_DEMAND_TOTAL.targetDoctors > 0
                  ? SPECIALTY_DEMAND_TOTAL.samples / SPECIALTY_DEMAND_TOTAL.targetDoctors
                  : 0,
                1,
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export function CampaignPlanning() {
  const staleAttestations = PLANNING_ATTESTATIONS.filter(isStale)
  const currentCycleLabel = CURRENT_CYCLE?.label ?? ''

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Planejamento de campanhas
          </h1>
          <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
            Quanta amostra cada ciclo vai pedir — e quanto disso o plano pode prometer
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-control border border-surface-border bg-surface-card px-2.5 py-1 text-delta">
            <span className="text-neutral">Ciclo corrente:</span>
            <span className="font-medium text-slate-900">{currentCycleLabel}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-control border border-surface-border bg-surface-card px-2.5 py-1 text-delta">
            <span className="text-neutral">Horizonte:</span>
            <span className="font-medium text-slate-900">{PLANNING_CYCLES.length} ciclos</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-control border border-surface-border bg-surface-card px-2.5 py-1 text-delta">
            <span className="text-neutral">Fechamento do plano:</span>
            <span className="font-medium text-slate-900">
              {PLAN_LOCK_DAYS} dias antes do ciclo
            </span>
          </span>
        </div>
      </div>

      <DegradedBanner
        attestations={staleAttestations}
        consequence="A previsão de demanda segue na tela, com a faixa de incerteza mais larga e confiança reduzida."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {PLANNING_KPIS.map((kpi) => (
          <KpiCard
            key={kpi.id}
            label={kpi.label}
            value={kpiValue(kpi)}
            attestation={kpi.attestation}
          />
        ))}
      </div>

      <CampaignStrip />

      <Panel
        title="Previsão de demanda por ciclo"
        description="A linha é o número que o plano assume; a faixa é o quanto ele pode variar. Ciclo distante tem faixa mais larga — a previsão não fica mais firme por ser desenhada com traço fino"
        action={<StateChip label="Extrapolado" tone="attention" />}
        footer={<DataBadge attestation={FORECAST_ATTESTATION} variant="full" />}
      >
        <DemandForecastChart />

        <p className="mt-3 border-t border-surface-border pt-3 text-delta text-neutral">
          Ciclo {currentCycleLabel}: demanda prevista de {formatInteger(FORECAST_TOTAL_SAMPLES)}{' '}
          amostras, das quais {formatInteger(PLANNED_SAMPLES)} entram no plano de entrega e{' '}
          {formatInteger(BLOCKED_SAMPLES)} ficam retidas pelo bloqueio de ruptura.
        </p>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <Panel
            title="Calendário de ciclos"
            description="Estado de cada ciclo do horizonte, com a data em que o plano fecha"
            footer={<DataBadge attestation={CYCLE_ATTESTATION} variant="full" />}
          >
            <CycleCalendar />
          </Panel>
        </div>

        <div className="lg:col-span-6">
          <Panel
            title="Restrições do plano"
            description="Verba, estoque e o bloqueio de ruptura — o que limita a previsão antes de ela virar entrega"
            footer={
              <span>
                Verba do ciclo comprometida em {formatPercent(BUDGET_USE_PERCENT, 1)}. Acima do teto,
                o plano precisa de aprovação na decisão{' '}
                <Link
                  to={`/decisoes/${PLANNING_DECISION_ID}`}
                  className="font-medium underline"
                  style={{ color: 'var(--product-accent)' }}
                >
                  {PLANNING_DECISION_ID}
                </Link>
                .
              </span>
            }
          >
            <ul className="space-y-3">
              {PLAN_CONSTRAINTS.map((constraint) => (
                <ConstraintMeter key={constraint.id} constraint={constraint} />
              ))}
            </ul>

            <div
              className="mt-3 rounded-control border px-4 py-3"
              style={{
                borderColor: `${SEMANTIC.attention}66`,
                backgroundColor: `${SEMANTIC.attention}0F`,
              }}
            >
              <p className="text-delta-lg font-medium text-slate-900">{STOCKOUT_BLOCK.headline}</p>
              <p className="mt-1 text-delta text-neutral">
                {STOCKOUT_BLOCK.reason} {formatInteger(BLOCKED_SAMPLES)} amostras fora do plano do
                ciclo até a reposição.
              </p>
              <Link
                to={STOCKOUT_BLOCK.sourceRoute}
                className="mt-2 inline-block text-delta-lg font-medium underline"
                style={{ color: 'var(--product-accent)' }}
              >
                {STOCKOUT_BLOCK.sourceLabel} →
              </Link>
            </div>
          </Panel>
        </div>
      </div>

      <Panel
        title="Demanda por produto e território"
        description={`Repartição da demanda prevista do ciclo ${currentCycleLabel}. O Nordeste segue previsto e não liberado: o plano não deixa de enxergar a praça bloqueada`}
        footer={<DataBadge attestation={TERRITORY_DEMAND_ATTESTATION} variant="full" />}
      >
        <TerritoryDemandTable />
      </Panel>

      <Panel
        title="Demanda por especialidade"
        description="A mesma previsão liberada, repartida pelo eixo clínico — participação da seção de alocação, sem redistribuir o total"
        footer={<DataBadge attestation={SPECIALTY_DEMAND_ATTESTATION} variant="full" />}
      >
        <SpecialtyDemandTable />
      </Panel>

      <Panel
        title="Ações"
        footer={
          <span>
            O plano do ciclo não vira entrega sozinho: ele alimenta a alocação por médico e a
            decisão {PLANNING_DECISION_ID}, onde o custo estimado de{' '}
            {formatMoney(PLAN_CONSTRAINTS[0]?.used ?? 0)} é aprovado.
          </span>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <FutureButton label="Publicar plano do ciclo no ERP" phase="Fase 3" />
          <FutureButton label="Simular cenário de demanda" phase="Fase 2" />
          <FutureButton label="Reprogramar ciclo" phase="Fase 2" />
          <FutureButton label="Exportar plano" phase="Fase 2" />
        </div>
      </Panel>
    </div>
  )
}
