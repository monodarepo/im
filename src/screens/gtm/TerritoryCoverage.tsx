import { Link } from 'react-router-dom'
import { DataBadge } from '../../components/DataBadge'
import { FutureButton } from '../../components/FutureButton'
import { KpiCard } from '../../components/KpiCard'
import { Panel } from '../../components/Panel'
import { SemanticDelta } from '../../components/SemanticDelta'
import { StateChip } from '../../components/StateChip'
import { semanticColor, SEMANTIC } from '../../design/tokens'
import { formatDecimal, formatInteger, formatPercent } from '../../domain/format'
import { formatMoney } from '../../domain/money'
import {
  AVERAGE_LOAD_PERCENT,
  BALANCE_RULE_NOTE,
  CAPACITY_ATTESTATION,
  CAPACITY_BASIS_NOTE,
  COVERAGE_ATTESTATION,
  COVERAGE_GAPS,
  COVERAGE_RULE_NOTE,
  COVERAGE_TARGET_PERCENT,
  CYCLE_LABEL,
  FIELD_TERRITORIES,
  GAP_RULE_NOTE,
  LOAD_RANKING,
  LOAD_REFERENCE_PERCENT,
  LOAD_SCALE_MAX,
  LOAD_STATE_LABEL,
  LOAD_STATE_TONE,
  loadState,
  OVERLOADED_COUNT,
  SLACK_COUNT,
  TERRITORY_COVERAGE_KPIS,
  TERRITORY_DECISION,
  type CoverageGap,
  type FieldTerritory,
} from '../../mock/gtmTerritories'

/**
 * Territórios e Cobertura (GTM, módulo 2.4).
 *
 * O Território 360° do HUB pergunta onde está o mercado. Esta tela pergunta se
 * a equipe alcança a carteira que já foi desenhada: quem cobre o quê, com
 * quantas pessoas, e em que território a conta não fecha. A cobertura agregada
 * é a canônica — 82% contra meta de 90% — e cada linha é uma parcela dela.
 */

function TerritoryPortfolioTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] text-left">
        <thead>
          <tr className="border-b border-surface-border text-delta text-neutral">
            <th className="pb-2 font-medium">Território</th>
            <th className="pb-2 font-medium">Responsável</th>
            <th className="pb-2 text-right font-medium">Médicos-alvo</th>
            <th className="pb-2 text-right font-medium">Cobertura</th>
            <th className="pb-2 text-right font-medium">vs. meta</th>
            <th className="pb-2 text-right font-medium">Frequência média</th>
            <th className="pb-2 text-right font-medium">Capacidade da equipe</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {FIELD_TERRITORIES.map((territory) => (
            <tr key={territory.id} className="text-delta-lg transition-colors hover:bg-slate-50">
              <td className="py-2.5 align-top">
                <span className="font-medium text-slate-900">{territory.name}</span>
                <p className="mt-0.5 text-delta text-neutral">
                  {territory.ufLabel} · {formatInteger(territory.cities)} cidades
                </p>
              </td>

              <td className="py-2.5 align-top">
                <span className="text-slate-700">{territory.ownerName}</span>
                <p className="mt-0.5 text-delta text-neutral">{territory.ownerRole}</p>
              </td>

              <td className="py-2.5 text-right align-top tabular-nums text-slate-700">
                {formatInteger(territory.targetDoctors)}
                <p className="mt-0.5 text-delta text-neutral">
                  {formatInteger(territory.coveredDoctors)} cobertos
                </p>
              </td>

              <td className="py-2.5 text-right align-top font-semibold tabular-nums text-slate-900">
                {formatPercent(territory.coveragePercent)}
                <p className="mt-0.5 text-delta font-normal text-neutral">
                  meta {formatPercent(COVERAGE_TARGET_PERCENT, 0)}
                </p>
              </td>

              <td className="py-2.5 text-right align-top">
                <SemanticDelta value={territory.coverageGapPp} unit="points" size="sm" />
              </td>

              <td className="py-2.5 text-right align-top tabular-nums text-slate-700">
                {formatDecimal(territory.visitFrequency)}
                <p className="mt-0.5 text-delta text-neutral">visitas por médico / ciclo</p>
              </td>

              <td className="py-2.5 text-right align-top tabular-nums text-slate-700">
                {formatInteger(territory.reps)} representantes
                <p className="mt-0.5 text-delta text-neutral">
                  {formatInteger(territory.capacityVisits)} visitas / ciclo
                </p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function GapCard({ gap }: { gap: CoverageGap }) {
  const { territory } = gap

  return (
    <li
      className="rounded-card border border-surface-border p-4"
      style={{ borderLeftWidth: 3, borderLeftColor: SEMANTIC.negative }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-delta-lg font-medium text-slate-900">{territory.name}</p>
          <p className="mt-0.5 text-delta text-neutral">
            {territory.ownerName} · {territory.ufLabel}
          </p>
        </div>
        <StateChip label={gap.causeLabel} tone="negative" />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <dt className="text-delta text-neutral">Déficit</dt>
          <dd className="mt-0.5">
            <SemanticDelta value={-gap.deficitPp} unit="points" />
          </dd>
        </div>
        <div>
          <dt className="text-delta text-neutral">Médicos a cobrir</dt>
          <dd className="mt-0.5 text-delta-lg font-semibold tabular-nums text-slate-900">
            {formatInteger(territory.doctorsToTarget)}
          </dd>
        </div>
        <div>
          <dt className="text-delta text-neutral">Cobertura atual</dt>
          <dd className="mt-0.5 text-delta-lg font-semibold tabular-nums text-slate-900">
            {formatPercent(territory.coveragePercent)}
          </dd>
        </div>
        <div>
          <dt className="text-delta text-neutral">Carga da equipe</dt>
          <dd className="mt-0.5 text-delta-lg font-semibold tabular-nums text-slate-900">
            {formatPercent(territory.loadPercent, 0)}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-delta-lg text-slate-700">{gap.detail}</p>

      {territory.decisionId ? (
        <p className="mt-2 text-delta text-neutral">
          Endereçado pela decisão{' '}
          <Link
            to={`/decisoes/${territory.decisionId}`}
            className="font-medium underline decoration-dotted underline-offset-2"
            style={{ color: 'var(--product-accent)' }}
          >
            {territory.decisionId}
          </Link>{' '}
          — {TERRITORY_DECISION.title}, impacto de {formatMoney(TERRITORY_DECISION.impactBrl)}.
        </p>
      ) : null}

      <div className="mt-3 border-t border-surface-border pt-2">
        <DataBadge attestation={territory.attestation} />
      </div>
    </li>
  )
}

function LoadBar({ territory }: { territory: FieldTerritory }) {
  const state = loadState(territory.loadPercent)
  const color = semanticColor(LOAD_STATE_TONE[state])
  const width = Math.min(100, (territory.loadPercent / LOAD_SCALE_MAX) * 100)
  const referenceLeft = (LOAD_REFERENCE_PERCENT / LOAD_SCALE_MAX) * 100
  const slack = territory.capacitySlackVisits

  return (
    <li>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-delta-lg font-medium text-slate-900">{territory.name}</span>
        <span className="flex items-center gap-2">
          <span className="text-delta-lg font-semibold tabular-nums text-slate-900">
            {formatPercent(territory.loadPercent, 0)}
          </span>
          <StateChip label={LOAD_STATE_LABEL[state]} tone={LOAD_STATE_TONE[state]} />
        </span>
      </div>

      <div className="relative mt-1.5 h-3 w-full rounded-full bg-slate-100">
        <div
          className="h-3 rounded-full"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
        <span
          aria-hidden
          className="absolute top-[-3px] h-[18px] w-px bg-slate-500"
          style={{ left: `${referenceLeft}%` }}
        />
      </div>

      <p className="mt-1 text-delta text-neutral">
        {territory.ownerName} · {formatInteger(territory.reps)} representantes ·{' '}
        {formatInteger(territory.requiredVisits)} visitas de demanda contra{' '}
        {formatInteger(territory.capacityVisits)} de capacidade —{' '}
        {formatInteger(Math.abs(slack))} visitas {slack >= 0 ? 'de folga' : 'acima da capacidade'}
      </p>
    </li>
  )
}

export function TerritoryCoverage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Territórios e cobertura
          </h1>
          <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
            A carteira desenhada contra a equipe que existe para cobri-la
          </p>
        </div>

        <FutureButton label="Redesenhar malha de territórios" phase="Fase 3" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {TERRITORY_COVERAGE_KPIS.map((kpi) => (
          <KpiCard
            key={kpi.id}
            label={kpi.label}
            value={kpi.value}
            attestation={kpi.attestation}
            {...(kpi.delta !== undefined ? { delta: kpi.delta } : {})}
            {...(kpi.deltaUnit !== undefined ? { deltaUnit: kpi.deltaUnit } : {})}
            {...(kpi.comparison !== undefined ? { comparison: kpi.comparison } : {})}
          />
        ))}
      </div>

      <Panel
        title="Carteira de territórios"
        description={COVERAGE_RULE_NOTE}
        footer={<DataBadge attestation={COVERAGE_ATTESTATION} variant="full" />}
      >
        <TerritoryPortfolioTable />
      </Panel>

      <Panel
        title="Onde a cobertura não fecha"
        description={GAP_RULE_NOTE}
        action={<FutureButton label="Realocar representantes" phase="Fase 3" />}
      >
        <ul className="space-y-3">
          {COVERAGE_GAPS.map((gap) => (
            <GapCard key={gap.territory.id} gap={gap} />
          ))}
        </ul>
      </Panel>

      <Panel
        title="Balanceamento de carga"
        description={BALANCE_RULE_NOTE}
        footer={
          <div className="space-y-2">
            <p>{CAPACITY_BASIS_NOTE}</p>
            <DataBadge attestation={CAPACITY_ATTESTATION} variant="full" />
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-delta-lg text-slate-700">
            Carga média da malha em {formatPercent(AVERAGE_LOAD_PERCENT, 0)}:{' '}
            {formatInteger(OVERLOADED_COUNT)} territórios sobrecarregados e{' '}
            {formatInteger(SLACK_COUNT)} com folga. O problema não é tamanho de equipe, é
            distribuição — a linha vertical marca a capacidade da equipe.
          </p>

          <ul className="space-y-4">
            {LOAD_RANKING.map((territory) => (
              <LoadBar key={territory.id} territory={territory} />
            ))}
          </ul>

          <p className="text-delta text-neutral">
            Escala das barras até {formatPercent(LOAD_SCALE_MAX, 0)} de carga. Demanda medida no{' '}
            {CYCLE_LABEL}.
          </p>
        </div>
      </Panel>
    </div>
  )
}
