import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  CHART_AXIS,
  CHART_CURSOR,
  CHART_GRID,
  CHART_LINE,
  CHART_TOOLTIP_STYLE,
} from '../../design/chartTheme'
import { DataBadge } from '../../components/DataBadge'
import { KpiCard } from '../../components/KpiCard'
import { Panel } from '../../components/Panel'
import { StateChip } from '../../components/StateChip'
import { formatDecimal, formatInteger, formatPercent, formatPercentDelta } from '../../domain/format'
import { formatMoney } from '../../domain/money'
import { SEMANTIC } from '../../design/tokens'
import {
  ACTIVATED_DOCTORS,
  BASELINE_SHARE_PERCENT,
  CHAIN_ATTESTATION,
  CONFIDENCE_INTERVAL,
  CONVERSION_CHAIN,
  COST_ATTESTATION,
  COST_METRICS,
  EXPERIMENT_ARMS,
  EXPERIMENT_ATTESTATION,
  INCREMENTAL_LIFT_PERCENT,
  INCREMENTAL_PER_DOCTOR,
  SATURATION_CURVE,
  SATURATION_RECOMMENDATION,
  SATURATION_SERIES,
} from '../../mock/conversion'

function Chain() {
  const first = CONVERSION_CHAIN[0]?.value ?? 1

  return (
    <ol className="space-y-3">
      {CONVERSION_CHAIN.map((step, index) => (
        <li key={step.id}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-delta-lg text-slate-700">
              <span className="mr-2 text-delta text-neutral">{index + 1}</span>
              {step.label}
            </span>
            <span className="text-delta-lg font-semibold tabular-nums text-slate-900">
              {formatInteger(step.value)}
              <span className="ml-1.5 text-delta font-normal text-neutral">{step.unitLabel}</span>
              {step.conversionPercent !== null ? (
                <span className="ml-2 text-delta font-normal text-neutral">
                  {formatPercent(step.conversionPercent, 0)} do passo anterior
                </span>
              ) : null}
            </span>
          </div>
          <span className="mt-1 block h-2.5 w-full rounded-full bg-slate-100">
            <span
              className="block h-2.5 rounded-full bg-slate-500"
              style={{ width: `${Math.max(6, (step.value / first) * 100)}%` }}
            />
          </span>
        </li>
      ))}
    </ol>
  )
}

/**
 * Teste × controle.
 *
 * A barra do controle é a parte da prescrição do grupo teste que teria
 * acontecido sem amostra. Só o que passa dela é resultado da campanha — e é
 * essa separação que um ROI sem controle não consegue fazer.
 */
function Incrementality() {
  const test = EXPERIMENT_ARMS[0]
  const control = EXPERIMENT_ARMS[1]
  const max = Math.max(test?.prescriptionsPerDoctor ?? 0, control?.prescriptionsPerDoctor ?? 0)

  return (
    <div className="space-y-4">
      {EXPERIMENT_ARMS.map((arm) => (
        <div key={arm.id}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-delta-lg font-medium text-slate-900">{arm.label}</span>
            <span className="text-delta-lg font-semibold tabular-nums text-slate-900">
              {formatDecimal(arm.prescriptionsPerDoctor, 1)}
              <span className="ml-1.5 text-delta font-normal text-neutral">
                prescrições por médico
              </span>
            </span>
          </div>
          <span className="mt-1 block h-3 w-full rounded-full bg-slate-100">
            <span
              className="block h-3 rounded-full"
              style={{
                width: `${(arm.prescriptionsPerDoctor / max) * 100}%`,
                backgroundColor: arm.id === 'test' ? SEMANTIC.positive : '#94A3B8',
              }}
            />
          </span>
          <p className="mt-1 text-delta text-neutral">
            {arm.description} · {formatInteger(arm.doctors)} médicos
          </p>
        </div>
      ))}

      <div className="rounded-control border border-surface-border bg-slate-50 px-4 py-3">
        <p className="text-delta font-semibold uppercase tracking-wide text-neutral">
          Efeito incremental
        </p>
        <p className="mt-1 text-kpi tabular-nums" style={{ color: SEMANTIC.positive }}>
          +{formatDecimal(INCREMENTAL_PER_DOCTOR, 1)}
          <span className="ml-2 text-delta-lg font-normal text-slate-600">
            prescrições por médico
          </span>
        </p>
        <p className="mt-1 text-delta-lg text-slate-700">
          {formatPercentDelta(INCREMENTAL_LIFT_PERCENT)} sobre o controle. Intervalo de confiança de{' '}
          {formatPercent(CONFIDENCE_INTERVAL.lowPercent)} a{' '}
          {formatPercent(CONFIDENCE_INTERVAL.highPercent)}, a{' '}
          {formatPercent(CONFIDENCE_INTERVAL.level, 0)}.
        </p>
        <p className="mt-2 text-delta text-neutral">
          {formatPercent(BASELINE_SHARE_PERCENT)} da prescrição do grupo teste teria acontecido sem
          amostra. Um ROI sem controle contaria essa parte como resultado da campanha.
        </p>
      </div>
    </div>
  )
}

function SaturationChart() {
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-4 text-micro uppercase text-neutral">
        {SATURATION_SERIES.map((series) => (
          <span key={series.key} className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-sm"
              style={{ backgroundColor: series.color }}
              aria-hidden
            />
            {series.label}
          </span>
        ))}
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={[...SATURATION_CURVE]} margin={{ top: 8, right: 8, bottom: 4, left: -8 }}>
            <CartesianGrid {...CHART_GRID} />
            <XAxis
              {...CHART_AXIS}
              dataKey="samplesPerDoctor"
              label={{
                value: 'amostras por médico',
                position: 'insideBottom',
                offset: -2,
                fill: '#64748B',
                fontSize: 11,
              }}
            />
            <YAxis {...CHART_AXIS} tickFormatter={(value: number) => formatPercent(value, 0)} />
            <Tooltip
              formatter={(value: number, name: string) => [formatPercent(value), name]}
              labelFormatter={(value: number) => `${formatInteger(value)} amostras por médico`}
              contentStyle={CHART_TOOLTIP_STYLE}
              cursor={CHART_CURSOR}
            />
            {SATURATION_SERIES.map((series) => (
              <Line
                {...CHART_LINE}
                key={series.key}
                type="linear"
                dataKey={series.key}
                name={series.label}
                stroke={series.color}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function ConversionRoi() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Conversão e ROI
        </h1>
        <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
          O que a amostra causou, não o que ela acompanhou
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {COST_METRICS.map((metric) => (
          <KpiCard
            key={metric.id}
            label={metric.label}
            value={
              metric.format === 'money' ? formatMoney(metric.value) : formatInteger(metric.value)
            }
            comparison={metric.note}
            attestation={COST_ATTESTATION}
          />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <Panel
            title="Cadeia de conversão"
            description="Da amostra ao sell-out incremental"
            footer={<DataBadge attestation={CHAIN_ATTESTATION} variant="full" />}
          >
            <Chain />
          </Panel>
        </div>

        <div className="lg:col-span-6">
          <Panel
            title="Incrementalidade"
            description="Teste contra controle — a resposta que o CFO pede"
            action={<StateChip label="Experimento pareado" tone="neutral" />}
            footer={<DataBadge attestation={EXPERIMENT_ATTESTATION} variant="full" />}
          >
            <Incrementality />
          </Panel>
        </div>
      </div>

      <Panel
        title="Curva de saturação por segmento"
        description="Distribuir mais não é distribuir melhor: a conversão marginal cai, e cada segmento satura em um ponto diferente"
        footer={<DataBadge attestation={EXPERIMENT_ATTESTATION} />}
      >
        <SaturationChart />

        <ul className="mt-4 grid gap-3 border-t border-surface-border pt-4 sm:grid-cols-3">
          {SATURATION_RECOMMENDATION.map((item) => (
            <li key={item.segment} className="rounded-control border border-surface-border p-3">
              <p className="text-delta-lg font-semibold text-slate-900">{item.segment}</p>
              <p className="mt-0.5 text-delta-lg tabular-nums text-slate-700">
                {formatInteger(item.samplesPerDoctor)} amostras por médico
              </p>
              <p className="mt-1 text-delta text-neutral">{item.rationale}</p>
            </li>
          ))}
        </ul>
      </Panel>

      <p className="text-delta text-neutral">
        {formatInteger(ACTIVATED_DOCTORS)} médicos ativados no período. Ativação exige amostra
        entregue e prescrição registrada — receber amostra, sozinho, não conta.
      </p>
    </div>
  )
}
