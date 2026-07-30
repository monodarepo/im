import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { DataBadge } from '../../components/DataBadge'
import { FutureButton } from '../../components/FutureButton'
import { Panel } from '../../components/Panel'
import { SemanticDelta } from '../../components/SemanticDelta'
import { StateChip } from '../../components/StateChip'
import { ConfidenceMeter } from '../../components/ConfidenceMeter'
import { DECISION_STATE_LABEL, DECISION_STATE_TONE } from '../../domain/decision'
import { formatDecimal, formatInteger, formatPercent, formatPointsDelta } from '../../domain/format'
import { formatMoney, formatMoneyDelta } from '../../domain/money'
import { SEMANTIC, semanticColor } from '../../design/tokens'
import type { ScenarioInputs, ScenarioOutcome } from '../../domain/elasticity'
import {
  APPROVAL_DECISION_ID,
  BASELINE,
  CURRENT_PARAMETERS,
  RECOMMENDED,
  RECOMMENDED_IMPACT,
  resolveScenario,
  SCENARIO_ATTESTATION,
  SCENARIO_FILTERS,
  SCENARIO_RECOMMENDATION,
  SCENARIOS,
  type Scenario,
  type ScenarioId,
} from '../../mock/scenarios'
import { useDecisionWorkflow } from '../../state/decisionWorkflowStore'

const REVENUE_COLOR = '#334155'
const SHARE_COLOR = '#0E7490'

type Edits = Partial<Record<ScenarioId, ScenarioInputs>>

const money2 = (value: number) => formatMoney(value, 2)
const price = (value: number) => `R$ ${formatDecimal(value, 2)}`

function CurrentParameters() {
  return (
    <dl className="divide-y divide-surface-border">
      {CURRENT_PARAMETERS.map((parameter) => (
        <div key={parameter.label} className="flex items-baseline justify-between gap-4 py-2.5">
          <dt className="text-delta-lg text-slate-600">{parameter.label}</dt>
          <dd className="text-delta-lg font-semibold tabular-nums text-slate-900">
            {parameter.format === 'currency' ? price(parameter.value) : null}
            {parameter.format === 'percent' ? formatPercent(parameter.value) : null}
            {parameter.format === 'index' ? formatDecimal(parameter.value, 1) : null}
            {parameter.format === 'integer' ? formatInteger(parameter.value) : null}
          </dd>
        </div>
      ))}
    </dl>
  )
}

type Row = {
  readonly label: string
  readonly render: (outcome: ScenarioOutcome) => string
  /** Verde quando o cenário supera o atual — vale para sell-out e share. */
  readonly positiveAgainstBaseline?: (outcome: ScenarioOutcome) => boolean
  readonly emphasis?: boolean
}

const ROWS: readonly Row[] = [
  { label: 'Preço (R$)', render: (o) => price(o.priceBrl) },
  { label: 'Desconto (%)', render: (o) => formatPercent(o.discountRate * 100, 0) },
  { label: 'Índice de Preço (IPR)', render: (o) => formatDecimal(o.relativePriceIndex, 1) },
  { label: 'Volume Estimado (unid.)', render: (o) => formatInteger(o.volume) },
  {
    label: 'Sell-out Estimado (R$)',
    render: (o) => formatMoney(o.sellOutBrl),
    positiveAgainstBaseline: (o) => o.sellOutBrl > BASELINE.canonical.sellOutBrl,
  },
  {
    label: 'Market Share Estimado',
    render: (o) => formatPercent(o.sharePercent),
    positiveAgainstBaseline: (o) => o.sharePercent > BASELINE.canonical.sharePercent,
  },
  { label: 'Receita Líquida (R$)', render: (o) => formatMoney(o.netRevenueBrl) },
  { label: 'Margem de Contribuição (R$)', render: (o) => money2(o.contributionBrl), emphasis: true },
  {
    label: 'ROI Promocional',
    render: (o) => (o.promoRoiPercent === null ? '—' : formatPercent(o.promoRoiPercent)),
  },
]

function ParameterInput({
  label,
  value,
  step,
  onChange,
}: {
  label: string
  value: number
  step: number
  onChange: (next: number) => void
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        min={0}
        onChange={(event) => {
          const next = Number(event.target.value)
          if (Number.isFinite(next)) onChange(next)
        }}
        className="w-24 rounded-control border border-surface-border bg-surface-card px-2 py-1 text-right text-delta-lg tabular-nums text-slate-900"
      />
    </label>
  )
}

export function ScenarioSimulator() {
  const [edits, setEdits] = useState<Edits>({})
  const [metric, setMetric] = useState<'revenue' | 'share'>('revenue')

  const submitForApproval = useDecisionWorkflow((state) => state.submitForApproval)
  const decisionState = useDecisionWorkflow((state) => state.stateOf(APPROVAL_DECISION_ID))
  const parcels = useDecisionWorkflow((state) => state.parcelsOf(APPROVAL_DECISION_ID))
  const submitted = parcels.some((parcel) => parcel.id === 'rgm-scenario-3')

  const inputsOf = (scenario: Scenario): ScenarioInputs => edits[scenario.id] ?? scenario.inputs

  const resolved = useMemo(
    () =>
      SCENARIOS.map((scenario) => ({
        scenario,
        inputs: inputsOf(scenario),
        outcome: resolveScenario(scenario, inputsOf(scenario)),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [edits],
  )

  const edited = (scenario: Scenario) => edits[scenario.id] !== undefined

  const update = (scenario: Scenario, patch: Partial<ScenarioInputs>) =>
    setEdits((previous) => ({
      ...previous,
      [scenario.id]: { ...(previous[scenario.id] ?? scenario.inputs), ...patch },
    }))

  const restore = (scenario: Scenario) =>
    setEdits((previous) => {
      const next = { ...previous }
      delete next[scenario.id]
      return next
    })

  const chartData = resolved.map(({ scenario, outcome }) => ({
    label: scenario.label,
    receita: outcome.netRevenueBrl / 1_000_000,
    share: outcome.sharePercent,
  }))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Simulador de cenários
          </h1>
          <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
            Elasticidade de preço e desconto
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {SCENARIO_FILTERS.map((filter) => (
            <span
              key={filter.label}
              className="inline-flex items-center gap-1.5 rounded-control border border-surface-border bg-surface-card px-2.5 py-1 text-delta"
            >
              <span className="text-neutral">{filter.label}:</span>
              <span className="font-medium text-slate-900">{filter.value}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="xl:col-span-3">
          <Panel
            title="Parâmetros atuais"
            footer={<DataBadge attestation={SCENARIO_ATTESTATION} />}
          >
            <CurrentParameters />
          </Panel>
        </div>

        <div className="xl:col-span-6">
          <Panel
            title="Cenários"
            description="Altere preço e desconto para recalcular volume, receita, margem e share"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead>
                  <tr className="border-b border-surface-border">
                    <th className="pb-2 text-delta font-medium text-neutral">Métrica</th>
                    {resolved.map(({ scenario }) => (
                      <th key={scenario.id} className="pb-2 text-right text-delta font-semibold text-slate-900">
                        {scenario.label}
                        {edited(scenario) ? (
                          <button
                            type="button"
                            onClick={() => restore(scenario)}
                            className="ml-1.5 rounded-sm px-1 text-delta font-medium text-neutral underline hover:bg-slate-50"
                            title="Voltar aos parâmetros do ESCOPO"
                          >
                            restaurar
                          </button>
                        ) : null}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-surface-border">
                  <tr>
                    <td className="py-2 text-delta-lg text-slate-600">Preço (R$)</td>
                    {resolved.map(({ scenario, inputs, outcome }) => (
                      <td key={scenario.id} className="py-2 text-right">
                        {scenario.editable ? (
                          <span className="inline-block">
                            <ParameterInput
                              label={`Preço do ${scenario.label}`}
                              value={inputs.priceBrl}
                              step={0.1}
                              onChange={(next) => update(scenario, { priceBrl: next })}
                            />
                          </span>
                        ) : (
                          <span className="text-delta-lg font-semibold tabular-nums text-slate-900">
                            {price(outcome.priceBrl)}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="py-2 text-delta-lg text-slate-600">Desconto (%)</td>
                    {resolved.map(({ scenario, inputs, outcome }) => (
                      <td key={scenario.id} className="py-2 text-right">
                        {scenario.editable ? (
                          <span className="inline-block">
                            <ParameterInput
                              label={`Desconto do ${scenario.label}`}
                              value={Math.round(inputs.discountRate * 1000) / 10}
                              step={1}
                              onChange={(next) =>
                                update(scenario, { discountRate: Math.max(0, next) / 100 })
                              }
                            />
                          </span>
                        ) : (
                          <span className="text-delta-lg font-semibold tabular-nums text-slate-900">
                            {formatPercent(outcome.discountRate * 100, 0)}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {ROWS.slice(2).map((row) => (
                    <tr key={row.label}>
                      <td className="py-2 text-delta-lg text-slate-600">{row.label}</td>
                      {resolved.map(({ scenario, outcome }) => {
                        const positive = row.positiveAgainstBaseline?.(outcome) ?? false
                        return (
                          <td
                            key={scenario.id}
                            className={`py-2 text-right text-delta-lg tabular-nums ${
                              row.emphasis ? 'font-semibold' : 'font-medium'
                            }`}
                            style={positive ? { color: semanticColor('positive') } : undefined}
                          >
                            {row.render(outcome)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div className="xl:col-span-3">
          <Panel
            title="Comparativo"
            action={
              <div className="inline-flex rounded-control border border-surface-border p-0.5">
                {(
                  [
                    { id: 'revenue', label: 'Receita' },
                    { id: 'share', label: 'Share' },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setMetric(option.id)}
                    className="rounded-[10px] px-2.5 py-1 text-delta font-medium text-slate-600 transition-colors hover:bg-slate-50"
                    style={
                      metric === option.id
                        ? { backgroundColor: 'var(--product-accent)', color: '#FFFFFF' }
                        : undefined
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            }
          >
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {metric === 'revenue' ? (
                  <BarChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
                    <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} />
                    <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(value: number) => [formatMoney(value * 1_000_000), 'Receita líquida']}
                      contentStyle={{ fontSize: 12, borderRadius: 12, borderColor: '#E2E8F0' }}
                    />
                    <Bar dataKey="receita" fill={REVENUE_COLOR} radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <LineChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
                    <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} />
                    <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(value: number) => [formatPercent(value), 'Market share']}
                      contentStyle={{ fontSize: 12, borderRadius: 12, borderColor: '#E2E8F0' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="share"
                      stroke={SHARE_COLOR}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: SHARE_COLOR, strokeWidth: 0 }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Panel title="Recomendação" description="Gerada por IA sobre os cenários simulados">
            <p className="text-delta-lg font-semibold text-slate-900">{RECOMMENDED.label}</p>
            <p className="mt-1 text-delta-lg text-slate-700">{SCENARIO_RECOMMENDATION.rationale}</p>
            <div className="mt-3 flex items-center gap-3">
              <ConfidenceMeter confidence="medium" />
              <span className="text-delta tabular-nums text-neutral">
                Confiança {formatPercent(SCENARIO_RECOMMENDATION.confidencePercent, 0)}
              </span>
            </div>
          </Panel>
        </div>

        <div className="lg:col-span-7">
          <Panel
            title="Impacto estimado"
            description={`${RECOMMENDED.label} contra o cenário atual`}
            footer={<DataBadge attestation={SCENARIO_ATTESTATION} />}
          >
            <div className="grid gap-4 sm:grid-cols-4">
              <Impact label="Receita líquida" value={formatMoneyDelta(RECOMMENDED_IMPACT.netRevenueBrl)} />
              <Impact
                label="Volume"
                value={`+${formatInteger(RECOMMENDED_IMPACT.volume)} unid.`}
              />
              <Impact label="Market share" value={formatPointsDelta(RECOMMENDED_IMPACT.sharePoints)} />
              <Impact
                label="Margem de contribuição"
                value={<SemanticDelta value={RECOMMENDED_IMPACT.contributionPercent} />}
              />
            </div>
          </Panel>
        </div>
      </div>

      <Panel
        title="Ações"
        footer={
          submitted ? (
            <span>
              Parcela de {formatMoney(RECOMMENDED_IMPACT.netRevenueBrl)} anexada a{' '}
              <Link
                to={`/decisoes/${APPROVAL_DECISION_ID}`}
                className="font-medium underline"
                style={{ color: 'var(--product-accent)' }}
              >
                {APPROVAL_DECISION_ID}
              </Link>
              .
            </span>
          ) : (
            <span>
              Enviar para aprovação cria a parcela do cenário em {APPROVAL_DECISION_ID}, sem abrir
              decisão paralela.
            </span>
          )
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <FutureButton label="Salvar cenário" phase="Fase 2" />

          <button
            type="button"
            disabled={submitted}
            onClick={() =>
              submitForApproval(APPROVAL_DECISION_ID, {
                id: 'rgm-scenario-3',
                source: 'rgm',
                label: `${RECOMMENDED.label} — revisão de preço e desconto`,
                amountBrl: RECOMMENDED_IMPACT.netRevenueBrl,
                attestation: SCENARIO_ATTESTATION,
              })
            }
            className={`rounded-control px-3 py-2 text-delta-lg font-medium transition-colors ${
              submitted
                ? 'cursor-default border border-surface-border bg-slate-50 text-neutral'
                : 'text-white'
            }`}
            style={submitted ? undefined : { backgroundColor: 'var(--product-accent)' }}
          >
            {submitted ? 'Enviado para aprovação' : 'Enviar para aprovação'}
          </button>

          <FutureButton label="Exportar análise" phase="Fase 2" />

          <span className="ml-auto inline-flex items-center gap-2">
            <span className="text-delta text-neutral">{APPROVAL_DECISION_ID}</span>
            <StateChip
              label={DECISION_STATE_LABEL[decisionState]}
              tone={DECISION_STATE_TONE[decisionState]}
            />
          </span>
        </div>
      </Panel>
    </div>
  )
}

function Impact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-control border border-surface-border px-3 py-2.5">
      <p className="text-delta text-neutral">{label}</p>
      <p
        className="mt-0.5 text-delta-lg font-semibold tabular-nums"
        style={{ color: SEMANTIC.positive }}
      >
        {value}
      </p>
    </div>
  )
}
