import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfidenceMeter } from '../../components/ConfidenceMeter'
import { DataBadge } from '../../components/DataBadge'
import { FutureButton } from '../../components/FutureButton'
import { KpiCard } from '../../components/KpiCard'
import { Panel } from '../../components/Panel'
import { SemanticDelta } from '../../components/SemanticDelta'
import { StateChip } from '../../components/StateChip'
import { semanticColor, toneForDelta } from '../../design/tokens'
import { formatDecimal, formatInteger, formatPercent } from '../../domain/format'
import { formatMoney, formatMoneyFull } from '../../domain/money'
import {
  COVERAGE_ATTESTATION,
  COVERAGE_BASELINE,
  COVERAGE_FILTERS,
  COVERAGE_FUTURE_ACTIONS,
  COVERAGE_PARAMETERS,
  COVERAGE_RECOMMENDATION,
  COVERAGE_SCENARIOS,
  COVERAGE_SIMULATION_ATTESTATION,
  COVERAGE_TARGETS,
  CURRENT_KPI_SOURCE,
  DOCTOR_PANEL,
  INPUT_BOUNDS,
  RECOMMENDED_COVERAGE_IMPACT,
  RECOMMENDED_SCENARIO,
  resolveCoverageScenario,
  SEGMENT_PLAN,
  type CoverageInputs,
  type CoverageOutcome,
  type CoverageScenario,
  type CoverageScenarioId,
} from '../../mock/coverageScenarios'
import { findDecision } from '../../mock/decisions'

type Edits = Partial<Record<CoverageScenarioId, CoverageInputs>>

/** Coluna do cenário: quanto maior é melhor, ou quanto menor é melhor. */
type Direction = 'higher' | 'lower'

type Editor = 'team' | 'priority'

type Row = {
  readonly id: string
  readonly label: string
  readonly render: (outcome: CoverageOutcome) => string
  readonly metricOf?: (outcome: CoverageOutcome) => number
  readonly direction?: Direction
  readonly targetLabel?: string
  readonly editor?: Editor
  readonly emphasis?: boolean
}

const ROWS: readonly Row[] = [
  {
    id: 'team',
    label: 'Representantes em campo',
    render: (o) => formatInteger(o.fieldTeamSize),
    editor: 'team',
  },
  {
    id: 'frequency',
    label: 'Frequência média por médico',
    render: (o) => `${formatDecimal(o.averageFrequency, 2)} visitas/ciclo`,
  },
  {
    id: 'priority',
    label: 'Capacidade em território prioritário',
    render: (o) => formatPercent(o.priorityTerritorySharePercent, 0),
    editor: 'priority',
  },
  {
    id: 'planned',
    label: 'Visitas planejadas no ciclo',
    render: (o) => formatInteger(o.plannedVisits),
  },
  {
    id: 'completed',
    label: 'Visitas realizadas',
    render: (o) => formatInteger(o.completedVisits),
  },
  {
    id: 'covered',
    label: 'Médicos cobertos',
    render: (o) => formatInteger(o.coveredDoctors),
    metricOf: (o) => o.coveredDoctors,
    direction: 'higher',
  },
  {
    id: 'coverage',
    label: 'Cobertura de médicos',
    render: (o) => formatPercent(o.coveragePercent),
    metricOf: (o) => o.coveragePercent,
    direction: 'higher',
    targetLabel: `Meta ${formatPercent(COVERAGE_TARGETS.coveragePercent ?? 0, 0)}`,
    emphasis: true,
  },
  {
    id: 'productive',
    label: 'Visitas produtivas',
    render: (o) => formatPercent(o.productiveVisitPercent),
    metricOf: (o) => o.productiveVisitPercent,
    direction: 'higher',
    targetLabel: `Meta ${formatPercent(COVERAGE_TARGETS.productiveVisitPercent ?? 0, 0)}`,
  },
  {
    id: 'conversion',
    label: 'Conversão por visita',
    render: (o) => formatPercent(o.conversionPercent),
    metricOf: (o) => o.conversionPercent,
    direction: 'higher',
    targetLabel: `Meta ${formatPercent(COVERAGE_TARGETS.conversionPercent ?? 0, 0)}`,
  },
  {
    id: 'sellout',
    label: 'Sell-out incremental',
    render: (o) => formatMoney(o.incrementalSellOutBrl),
    metricOf: (o) => o.incrementalSellOutBrl,
    direction: 'higher',
    emphasis: true,
  },
  {
    id: 'cost',
    label: 'Custo do ciclo',
    render: (o) => formatMoney(o.cycleCostBrl),
    metricOf: (o) => o.cycleCostBrl,
    direction: 'lower',
  },
  {
    id: 'cost-per-doctor',
    label: 'Custo por médico coberto',
    render: (o) => formatMoneyFull(Math.round(o.costPerCoveredDoctorBrl)),
    metricOf: (o) => o.costPerCoveredDoctorBrl,
    direction: 'lower',
  },
  {
    id: 'efficiency',
    label: 'Sell-out por R$ de custo',
    render: (o) => `R$ ${formatDecimal(o.sellOutPerCostBrl, 2)}`,
    metricOf: (o) => o.sellOutPerCostBrl,
    direction: 'higher',
    emphasis: true,
  },
]

type ImpactRow = {
  readonly id: string
  readonly label: string
  readonly value: number
  readonly unit: 'points' | 'money' | 'count'
  readonly inverted: boolean
}

const IMPACT_ROWS: readonly ImpactRow[] = [
  {
    id: 'coverage',
    label: 'Cobertura de médicos',
    value: RECOMMENDED_COVERAGE_IMPACT.coveragePoints,
    unit: 'points',
    inverted: false,
  },
  {
    id: 'doctors',
    label: 'Médicos cobertos',
    value: RECOMMENDED_COVERAGE_IMPACT.doctorsReached,
    unit: 'count',
    inverted: false,
  },
  {
    id: 'sellout',
    label: 'Sell-out incremental',
    value: RECOMMENDED_COVERAGE_IMPACT.incrementalSellOutBrl,
    unit: 'money',
    inverted: false,
  },
  {
    id: 'cost',
    label: 'Custo do ciclo',
    value: RECOMMENDED_COVERAGE_IMPACT.cycleCostBrl,
    unit: 'money',
    inverted: true,
  },
]

const PARAMETER_ORIGIN = {
  canonical: 'Número da operação',
  declared: 'Premissa do plano',
} as const

function CurrentParameters() {
  return (
    <dl className="divide-y divide-surface-border">
      {COVERAGE_PARAMETERS.map((parameter) => (
        <div key={parameter.id} className="flex items-baseline justify-between gap-4 py-2.5">
          <dt className="text-delta-lg text-slate-600">
            {parameter.label}
            <span className="mt-0.5 block text-delta text-neutral">
              {parameter.canonical ? PARAMETER_ORIGIN.canonical : PARAMETER_ORIGIN.declared}
            </span>
          </dt>
          <dd className="shrink-0 text-delta-lg font-semibold tabular-nums text-slate-900">
            {parameter.format === 'currency' ? formatMoneyFull(parameter.value) : null}
            {parameter.format === 'percent' ? formatPercent(parameter.value, 0) : null}
            {parameter.format === 'decimal' ? formatDecimal(parameter.value, 2) : null}
            {parameter.format === 'integer' ? formatInteger(parameter.value) : null}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function SegmentPlan() {
  return (
    <ul className="space-y-2.5">
      {SEGMENT_PLAN.map((segment) => (
        <li key={segment.id}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-delta-lg font-medium text-slate-900">{segment.label}</span>
            <span className="text-delta-lg font-semibold tabular-nums text-slate-900">
              {formatDecimal(segment.frequency, 0)} visitas/ciclo
            </span>
          </div>
          <span className="mt-1 block h-1.5 w-full rounded-full bg-slate-100">
            <span
              className="block h-1.5 rounded-full bg-slate-400"
              style={{ width: `${segment.panelSharePercent}%` }}
            />
          </span>
          <p className="mt-1 text-delta tabular-nums text-neutral">
            {formatInteger(segment.doctors)} médicos · {formatPercent(segment.panelSharePercent, 0)}{' '}
            do painel
          </p>
        </li>
      ))}
    </ul>
  )
}

function ParameterInput({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (next: number) => void
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          const next = Number(event.target.value)
          if (Number.isFinite(next)) onChange(Math.min(max, Math.max(min, next)))
        }}
        className="w-20 rounded-control border border-surface-border bg-surface-card px-2 py-1 text-right text-delta-lg tabular-nums text-slate-900"
      />
    </label>
  )
}

function cellColor(row: Row, outcome: CoverageOutcome, isBaseline: boolean): string | undefined {
  if (isBaseline || !row.metricOf || !row.direction) return undefined
  const difference = row.metricOf(outcome) - row.metricOf(COVERAGE_BASELINE.canonical)
  if (difference === 0) return undefined
  return semanticColor(toneForDelta(difference, { inverted: row.direction === 'lower' }))
}

export function CoverageSimulator() {
  const [edits, setEdits] = useState<Edits>({})

  const inputsOf = (target: CoverageScenario): CoverageInputs =>
    edits[target.id] ?? target.inputs

  const resolved = useMemo(
    () =>
      COVERAGE_SCENARIOS.map((target) => ({
        scenario: target,
        inputs: inputsOf(target),
        outcome: resolveCoverageScenario(target, inputsOf(target)),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [edits],
  )

  const edited = (target: CoverageScenario) => edits[target.id] !== undefined

  const update = (target: CoverageScenario, patch: Partial<CoverageInputs>) =>
    setEdits((previous) => ({
      ...previous,
      [target.id]: { ...(previous[target.id] ?? target.inputs), ...patch },
    }))

  const restore = (target: CoverageScenario) =>
    setEdits((previous) => {
      const next = { ...previous }
      delete next[target.id]
      return next
    })

  const decision = findDecision(COVERAGE_RECOMMENDATION.decisionId)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Simulador de cobertura
          </h1>
          <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
            Equipe, frequência e alocação de território contra cobertura, custo e sell-out
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {COVERAGE_FILTERS.map((filter) => (
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CURRENT_KPI_SOURCE.map(({ id, metric, attestation }) => {
          const value =
            metric.format === 'money' ? formatMoney(metric.value) : formatPercent(metric.value, 0)
          const comparison =
            metric.target !== null
              ? `meta ${formatPercent(metric.target, 0)}`
              : (metric.comparison ?? undefined)

          return (
            <KpiCard
              key={id}
              label={metric.label}
              value={value}
              {...(metric.delta !== null ? { delta: metric.delta } : {})}
              {...(comparison !== undefined ? { comparison } : {})}
              attestation={attestation}
            />
          )
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-4">
          <Panel
            title="Parâmetros atuais"
            description="Base do ciclo sobre a qual os cenários são construídos"
            footer={<DataBadge attestation={COVERAGE_ATTESTATION} variant="full" />}
          >
            <CurrentParameters />
          </Panel>

          <Panel
            title="Frequência por segmento"
            description={`Painel de ${formatInteger(DOCTOR_PANEL)} médicos no território`}
          >
            <SegmentPlan />
          </Panel>
        </div>

        <div className="xl:col-span-8">
          <Panel
            title="Cenários lado a lado"
            description="Altere equipe e alocação para recalcular cobertura, custo e sell-out"
            footer={<DataBadge attestation={COVERAGE_SIMULATION_ATTESTATION} />}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr className="border-b border-surface-border align-bottom">
                    <th className="pb-2 text-delta font-medium text-neutral">Métrica</th>
                    {resolved.map(({ scenario: target }) => (
                      <th key={target.id} className="pb-2 pl-3 text-right">
                        <span className="flex flex-col items-end gap-1">
                          <span className="text-delta font-semibold text-slate-900">
                            {target.label}
                          </span>
                          {target.id === RECOMMENDED_SCENARIO.id ? (
                            <StateChip label="Recomendado" tone="positive" />
                          ) : null}
                          <span className="max-w-[11rem] text-delta font-normal text-neutral">
                            {target.premise}
                          </span>
                          {edited(target) ? (
                            <button
                              type="button"
                              onClick={() => restore(target)}
                              className="rounded-sm px-1 text-delta font-medium text-neutral underline hover:bg-slate-50"
                              title="Voltar aos parâmetros do cenário"
                            >
                              restaurar
                            </button>
                          ) : null}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-surface-border">
                  {ROWS.map((row) => (
                    <tr key={row.id}>
                      <td className="py-2 pr-3 text-delta-lg text-slate-600">
                        {row.label}
                        {row.targetLabel ? (
                          <span className="mt-0.5 block text-delta tabular-nums text-neutral">
                            {row.targetLabel}
                          </span>
                        ) : null}
                      </td>

                      {resolved.map(({ scenario: target, inputs, outcome }) => {
                        const isBaseline = target.id === COVERAGE_BASELINE.id
                        const color = cellColor(row, outcome, isBaseline)

                        if (row.editor && target.editable) {
                          const bounds =
                            row.editor === 'team'
                              ? INPUT_BOUNDS.fieldTeamSize
                              : INPUT_BOUNDS.priorityTerritorySharePercent
                          const current =
                            row.editor === 'team'
                              ? inputs.fieldTeamSize
                              : inputs.priorityTerritorySharePercent

                          return (
                            <td key={target.id} className="py-2 pl-3 text-right">
                              <span className="inline-flex justify-end">
                                <ParameterInput
                                  label={`${row.label} — ${target.label}`}
                                  value={current}
                                  min={bounds.min}
                                  max={bounds.max}
                                  step={bounds.step}
                                  onChange={(next) =>
                                    update(
                                      target,
                                      row.editor === 'team'
                                        ? { fieldTeamSize: next }
                                        : { priorityTerritorySharePercent: next },
                                    )
                                  }
                                />
                              </span>
                            </td>
                          )
                        }

                        return (
                          <td
                            key={target.id}
                            className={`py-2 pl-3 text-right text-delta-lg tabular-nums ${
                              row.emphasis ? 'font-semibold' : 'font-medium'
                            }`}
                            style={color ? { color } : undefined}
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
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Panel
            title="Recomendação"
            description="Gerada por IA sobre os cenários simulados"
            footer={
              decision ? (
                <span>
                  Vinculada a{' '}
                  <Link
                    to={`/decisoes/${decision.id}`}
                    className="font-medium underline"
                    style={{ color: 'var(--product-accent)' }}
                  >
                    {decision.id}
                  </Link>{' '}
                  — {decision.title}.
                </span>
              ) : null
            }
          >
            <p className="text-delta-lg font-semibold text-slate-900">
              {COVERAGE_RECOMMENDATION.headline}
            </p>
            <p className="mt-1 text-delta-lg text-slate-700">
              {COVERAGE_RECOMMENDATION.rationale}
            </p>
            <p className="mt-2 text-delta-lg text-neutral">
              {COVERAGE_RECOMMENDATION.alternative}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <ConfidenceMeter confidence={COVERAGE_RECOMMENDATION.confidence} showLabel />
              <span className="text-delta tabular-nums text-neutral">
                {formatPercent(COVERAGE_RECOMMENDATION.confidencePercent, 0)}
              </span>
            </div>
          </Panel>
        </div>

        <div className="lg:col-span-7">
          <Panel
            title="Impacto estimado"
            description={`${RECOMMENDED_SCENARIO.label} contra o cenário atual, por ciclo`}
            footer={<DataBadge attestation={COVERAGE_RECOMMENDATION.attestation} variant="full" />}
          >
            <div className="grid gap-4 sm:grid-cols-4">
              {IMPACT_ROWS.map((impact) => (
                <div key={impact.id} className="rounded-control border border-surface-border px-3 py-2.5">
                  <p className="text-delta text-neutral">{impact.label}</p>
                  <p className="mt-0.5">
                    {impact.unit === 'count' ? (
                      <span
                        className="text-delta-lg font-semibold tabular-nums"
                        style={{
                          color: semanticColor(
                            toneForDelta(impact.value, { inverted: impact.inverted }),
                          ),
                        }}
                      >
                        {formatInteger(impact.value, 'always')}
                      </span>
                    ) : (
                      <SemanticDelta
                        value={impact.value}
                        unit={impact.unit}
                        inverted={impact.inverted}
                      />
                    )}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <Panel
        title="Ações"
        footer={
          <span>
            O plano aprovado não abre decisão paralela: ele entra como parcela da decisão de
            cobertura já em curso no GTM.
          </span>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          {COVERAGE_FUTURE_ACTIONS.map((action) => (
            <FutureButton key={action.label} label={action.label} phase={action.phase} />
          ))}
        </div>
      </Panel>
    </div>
  )
}
