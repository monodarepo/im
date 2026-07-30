import { DataBadge } from '../../components/DataBadge'
import { FutureButton } from '../../components/FutureButton'
import { KpiCard } from '../../components/KpiCard'
import { Panel } from '../../components/Panel'
import { StateChip } from '../../components/StateChip'
import { formatDecimal, formatInteger, formatPercent } from '../../domain/format'
import { formatMoney } from '../../domain/money'
import { formatDate, formatRelative } from '../../domain/today'
import { SEMANTIC, semanticColor, toneForDelta, type SemanticTone } from '../../design/tokens'
import {
  ALLOCATED_BUDGET_BRL,
  ALLOCATED_VISITS,
  ALLOCATION_CRITERION,
  CAPACITY_ATTESTATION,
  CAPACITY_COVERAGE_PERCENT,
  CAPACITY_GAP_VISITS,
  CAPACITY_VERDICT,
  CURRENT_COVERAGE_PERCENT,
  CYCLE_DECISION,
  DOCTORS_TO_COVER,
  FIELD_BRIEF,
  FIELD_TEAM_SIZE,
  PLANNED_CAPACITY_PER_REP,
  PLANNING_ATTESTATION,
  PLANNING_CYCLE,
  PLANNING_STAGE_STATUS_LABEL,
  PLANNING_STAGES,
  PREMISES,
  REALIZABLE_CAPACITY_PER_REP,
  REQUIRED_VISITS,
  ROUTE_ADHERENCE_PERCENT,
  SEGMENT_PLANS,
  TARGET_COVERAGE_PERCENT,
  TEAM_CAPACITY_VISITS,
  TERRITORY_ALLOCATIONS,
  UNCOVERED_POTENTIAL_ATTESTATION,
  UNIVERSE_ATTESTATION,
  type PlanningStageStatus,
} from '../../mock/gtmPlanning'

const STAGE_TONE: Record<PlanningStageStatus, SemanticTone> = {
  done: 'positive',
  active: 'attention',
  pending: 'neutral',
  at_risk: 'negative',
}

const GAP_TONE = toneForDelta(CAPACITY_GAP_VISITS)

function CycleHeader() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Planejamento GTM
        </h1>
        <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
          Do objetivo do período à alocação de esforço de campo
        </p>
      </div>

      <div className="text-right">
        <p className="text-delta-lg font-semibold text-slate-900">{PLANNING_CYCLE.label}</p>
        <p className="text-delta tabular-nums text-neutral">
          {formatDate(PLANNING_CYCLE.startsOn)} a {formatDate(PLANNING_CYCLE.endsOn)} ·{' '}
          {formatInteger(PLANNING_CYCLE.weeks)} semanas ·{' '}
          {formatInteger(PLANNING_CYCLE.workingDays)} dias úteis
        </p>
      </div>
    </div>
  )
}

function StageTrack() {
  return (
    <ol className="grid gap-3 lg:grid-cols-5">
      {PLANNING_STAGES.map((stage) => (
        <li
          key={stage.id}
          className="rounded-card border border-surface-border p-4"
          style={{ borderTopWidth: 3, borderTopColor: SEMANTIC[STAGE_TONE[stage.status]] }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-delta font-semibold tabular-nums text-slate-600">
              {stage.order}
            </span>
            <StateChip
              label={PLANNING_STAGE_STATUS_LABEL[stage.status]}
              tone={STAGE_TONE[stage.status]}
            />
          </div>

          <p className="mt-2 text-delta-lg font-semibold text-slate-900">{stage.label}</p>
          <p className="mt-1 text-delta text-slate-600">{stage.description}</p>
          <p className="mt-2 text-delta text-slate-700">
            <span className="text-neutral">Entrega: </span>
            {stage.output}
          </p>

          <div className="mt-3 border-t border-surface-border pt-2">
            <p className="text-delta text-neutral">{stage.owner}</p>
            <p className="text-delta tabular-nums text-neutral">
              {formatDate(stage.date)} · {formatRelative(stage.date)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}

function TerritoryTable() {
  const maxVisits = TERRITORY_ALLOCATIONS.reduce(
    (max, allocation) => Math.max(max, allocation.visits),
    0,
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-left">
        <thead>
          <tr className="border-b border-surface-border text-delta text-neutral">
            <th className="pb-2 font-medium">Território</th>
            <th className="pb-2 text-right font-medium">Médicos a cobrir</th>
            <th className="pb-2 text-right font-medium">Potencial não coberto</th>
            <th className="pb-2 text-right font-medium">Peso no critério</th>
            <th className="pb-2 text-right font-medium">Visitas</th>
            <th className="pb-2 text-right font-medium">Representantes</th>
            <th className="pb-2 text-right font-medium">Freq. por médico</th>
            <th className="pb-2 text-right font-medium">Verba de campo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {TERRITORY_ALLOCATIONS.map((allocation) => (
            <tr key={allocation.region} className="text-delta-lg transition-colors hover:bg-slate-50">
              <td className="py-2.5 font-medium text-slate-900">{allocation.label}</td>
              <td className="py-2.5 text-right tabular-nums text-slate-600">
                {formatInteger(allocation.doctorsToCover)}
              </td>
              <td className="py-2.5 text-right tabular-nums text-slate-600">
                {formatMoney(allocation.uncoveredPotentialBrl)}
              </td>
              <td className="py-2.5 text-right tabular-nums text-slate-600">
                {formatPercent(allocation.weightPercent, 1)}
              </td>
              <td className="py-2.5 text-right">
                <span className="inline-flex items-center justify-end gap-2">
                  <span className="hidden h-1.5 w-20 rounded-full bg-slate-100 sm:block">
                    <span
                      className="block h-1.5 rounded-full bg-slate-400"
                      style={{
                        width: `${maxVisits === 0 ? 0 : (allocation.visits / maxVisits) * 100}%`,
                      }}
                    />
                  </span>
                  <span className="font-semibold tabular-nums text-slate-900">
                    {formatInteger(allocation.visits)}
                  </span>
                </span>
              </td>
              <td className="py-2.5 text-right tabular-nums text-slate-600">
                {formatInteger(allocation.reps)}
              </td>
              <td className="py-2.5 text-right tabular-nums text-slate-600">
                {formatDecimal(allocation.frequencyPerDoctor, 2)}
              </td>
              <td className="py-2.5 text-right font-medium tabular-nums text-slate-900">
                {formatMoney(allocation.budgetBrl)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-surface-border text-delta-lg font-semibold text-slate-900">
            <td className="pt-2.5">Total</td>
            <td className="pt-2.5 text-right tabular-nums">{formatInteger(DOCTORS_TO_COVER)}</td>
            <td className="pt-2.5" />
            <td className="pt-2.5 text-right tabular-nums">{formatPercent(100, 0)}</td>
            <td className="pt-2.5 text-right tabular-nums">{formatInteger(ALLOCATED_VISITS)}</td>
            <td className="pt-2.5 text-right tabular-nums">{formatInteger(FIELD_TEAM_SIZE)}</td>
            <td className="pt-2.5" />
            <td className="pt-2.5 text-right tabular-nums">{formatMoney(ALLOCATED_BUDGET_BRL)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function SegmentPlanList() {
  const maxVisits = SEGMENT_PLANS.reduce((max, plan) => Math.max(max, plan.requiredVisits), 0)

  return (
    <ul className="space-y-3">
      {SEGMENT_PLANS.map((plan) => (
        <li key={plan.tier}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-delta-lg font-medium text-slate-900">{plan.label}</span>
            <span className="text-delta-lg font-semibold tabular-nums text-slate-900">
              {formatInteger(plan.requiredVisits)}
            </span>
          </div>
          <span className="mt-1 block h-1.5 w-full rounded-full bg-slate-100">
            <span
              className="block h-1.5 rounded-full bg-slate-400"
              style={{ width: `${maxVisits === 0 ? 0 : (plan.requiredVisits / maxVisits) * 100}%` }}
            />
          </span>
          <p className="mt-1 text-delta tabular-nums text-neutral">
            {formatPercent(plan.mixPercent, 0)} do universo ·{' '}
            {formatInteger(plan.doctorsToCover)} médicos ·{' '}
            {formatDecimal(plan.frequencyPerCycle, 1)} visita por médico no ciclo
          </p>
        </li>
      ))}
    </ul>
  )
}

function CapacityLine({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <span className="min-w-0">
        <span className="block text-delta-lg text-slate-700">{label}</span>
        <span className="block text-delta text-neutral">{note}</span>
      </span>
      <span className="shrink-0 text-delta-lg font-semibold tabular-nums text-slate-900">
        {value}
      </span>
    </div>
  )
}

function CapacityBalance() {
  return (
    <div>
      <div className="divide-y divide-surface-border">
        <CapacityLine
          label="Visitas exigidas pelo plano"
          value={formatInteger(REQUIRED_VISITS)}
          note={`Cobertura alvo de ${formatPercent(TARGET_COVERAGE_PERCENT, 0)} na frequência declarada`}
        />
        <CapacityLine
          label="Capacidade realizável da equipe"
          value={formatInteger(TEAM_CAPACITY_VISITS)}
          note={`${formatInteger(FIELD_TEAM_SIZE)} representantes × ${formatInteger(REALIZABLE_CAPACITY_PER_REP)} visitas, de ${formatInteger(PLANNED_CAPACITY_PER_REP)} planejadas`}
        />
      </div>

      <div
        className="mt-3 rounded-card p-3"
        style={{ backgroundColor: `${semanticColor(GAP_TONE)}12` }}
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-delta-lg font-medium text-slate-900">Saldo do ciclo</span>
          <span
            className="text-delta-lg font-semibold tabular-nums"
            style={{ color: semanticColor(GAP_TONE) }}
          >
            {formatInteger(CAPACITY_GAP_VISITS, 'always')} visitas
          </span>
        </div>
        <p className="mt-1 text-delta tabular-nums text-neutral">
          A capacidade cobre {formatPercent(CAPACITY_COVERAGE_PERCENT, 1)} do que o plano pede.
        </p>
        <p className="mt-2 text-delta-lg text-slate-700">{CAPACITY_VERDICT.headline}</p>
        <p className="mt-1 text-delta text-slate-600">{CAPACITY_VERDICT.detail}</p>
        <ul className="mt-2 space-y-1">
          {CAPACITY_VERDICT.options.map((option) => (
            <li key={option} className="flex items-start gap-2 text-delta text-slate-700">
              <span className="text-neutral" aria-hidden>
                —
              </span>
              <span>{option}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 border-t border-surface-border pt-3">
        <p className="text-delta text-neutral">
          Aderência histórica ao roteiro por território — média ponderada de{' '}
          {formatPercent(ROUTE_ADHERENCE_PERCENT, 0)}
        </p>
        <ul className="mt-2 space-y-1.5">
          {TERRITORY_ALLOCATIONS.map((allocation) => (
            <li key={allocation.region} className="flex items-baseline justify-between gap-3">
              <span className="text-delta text-slate-600">{allocation.label}</span>
              <span
                className="text-delta font-medium tabular-nums"
                style={{
                  color: semanticColor(
                    toneForDelta(allocation.adherencePercent - ROUTE_ADHERENCE_PERCENT),
                  ),
                }}
              >
                {formatPercent(allocation.adherencePercent, 1)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function PremiseTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left">
        <thead>
          <tr className="border-b border-surface-border text-delta text-neutral">
            <th className="pb-2 font-medium">Premissa</th>
            <th className="pb-2 font-medium">Valor</th>
            <th className="pb-2 font-medium">Base</th>
            <th className="pb-2 text-right font-medium">Origem</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {PREMISES.map((premise) => (
            <tr key={premise.id} className="text-delta-lg transition-colors hover:bg-slate-50">
              <td className="py-2.5 font-medium text-slate-900">{premise.label}</td>
              <td className="py-2.5 font-semibold tabular-nums text-slate-900">{premise.value}</td>
              <td className="py-2.5 text-delta text-slate-600">
                {premise.basis}
                <span className="mt-1 block">
                  <DataBadge attestation={premise.attestation} />
                </span>
              </td>
              <td className="py-2.5 text-right">
                <StateChip
                  label={premise.canonical ? 'Medida' : 'Declarada'}
                  tone={premise.canonical ? 'positive' : 'neutral'}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function GtmPlanning() {
  return (
    <div className="space-y-5">
      <CycleHeader />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Cobertura alvo do ciclo"
          value={formatPercent(TARGET_COVERAGE_PERCENT, 0)}
          comparison={`atual ${formatPercent(CURRENT_COVERAGE_PERCENT, 0)}`}
          attestation={UNIVERSE_ATTESTATION}
        />
        <KpiCard
          label="Médicos a cobrir"
          value={formatInteger(DOCTORS_TO_COVER)}
          attestation={UNIVERSE_ATTESTATION}
        />
        <KpiCard
          label="Visitas exigidas pelo plano"
          value={formatInteger(REQUIRED_VISITS)}
          comparison={`capacidade ${formatInteger(TEAM_CAPACITY_VISITS)}`}
          attestation={CAPACITY_ATTESTATION}
        />
        <KpiCard
          label="Verba de campo alocada"
          value={formatMoney(ALLOCATED_BUDGET_BRL)}
          attestation={PLANNING_ATTESTATION}
        />
      </div>

      <Panel
        title="Ciclo de planejamento"
        description="Cinco estágios entre o objetivo do período e o roteiro na mão do representante"
        action={<FutureButton label="Abrir novo ciclo" phase="Fase 2" />}
      >
        <StageTrack />
      </Panel>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Panel
            title="Alocação de esforço por território"
            description="Quantas visitas e quanta verba cada território recebe no ciclo"
            footer={<DataBadge attestation={PLANNING_ATTESTATION} variant="full" />}
          >
            <TerritoryTable />

            <div className="mt-4 rounded-card border border-surface-border p-4">
              <p className="text-delta-lg font-semibold text-slate-900">
                Critério: {ALLOCATION_CRITERION.title}
              </p>
              <ul className="mt-2 space-y-1">
                {ALLOCATION_CRITERION.rules.map((rule) => (
                  <li key={rule} className="flex items-start gap-2 text-delta-lg text-slate-700">
                    <span className="text-neutral" aria-hidden>
                      —
                    </span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-delta text-slate-600">{ALLOCATION_CRITERION.budgetRule}</p>
              <p className="mt-1 text-delta text-neutral">{ALLOCATION_CRITERION.note}</p>
            </div>
          </Panel>
        </div>

        <div className="space-y-5 lg:col-span-5">
          <Panel
            title="Esforço por segmento de potencial"
            description="A frequência declarada define o tamanho do plano"
            footer={<DataBadge attestation={UNCOVERED_POTENTIAL_ATTESTATION} />}
          >
            <SegmentPlanList />
          </Panel>

          <Panel
            title="Plano contra capacidade"
            description="O que o plano pede e o que a equipe entrega"
            footer={<DataBadge attestation={CAPACITY_ATTESTATION} />}
          >
            <CapacityBalance />
          </Panel>
        </div>
      </div>

      <Panel
        title="Premissas do plano"
        description="Plano sem premissa explícita não é revisável — é número imposto"
      >
        <PremiseTable />
      </Panel>

      <Panel
        title="Publicação ao campo"
        description="O que o representante recebe quando o ciclo é publicado"
        action={<FutureButton label="Publicar plano ao campo" phase="Fase 2" />}
        footer={
          <span className="flex flex-wrap items-center gap-3">
            <DataBadge attestation={PLANNING_ATTESTATION} />
            <FutureButton label="Write-back do plano ao CRM" phase="Fase 3" />
          </span>
        }
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <ul className="space-y-2">
            {FIELD_BRIEF.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 rounded-control border border-surface-border px-3 py-2 text-delta-lg text-slate-700"
              >
                <span className="text-neutral" aria-hidden>
                  —
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="rounded-card border border-surface-border p-4">
            <p className="text-delta text-neutral">Decisão que este ciclo endereça</p>
            <p className="mt-1 text-delta-lg font-semibold text-slate-900">{CYCLE_DECISION.title}</p>
            <p className="mt-1 text-delta tabular-nums text-neutral">{CYCLE_DECISION.id}</p>
            <p className="mt-3 text-kpi tabular-nums text-slate-900">
              {formatMoney(CYCLE_DECISION.impactBrl)}
            </p>
            <p className="text-delta text-neutral">impacto priorizado</p>
            <div className="mt-3 border-t border-surface-border pt-3">
              <DataBadge attestation={UNCOVERED_POTENTIAL_ATTESTATION} />
            </div>
          </div>
        </div>
      </Panel>
    </div>
  )
}
