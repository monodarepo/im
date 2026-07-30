import { useState } from 'react'
import { DataBadge } from '../../components/DataBadge'
import { FutureButton } from '../../components/FutureButton'
import { KpiCard } from '../../components/KpiCard'
import { Panel } from '../../components/Panel'
import { SemanticDelta } from '../../components/SemanticDelta'
import { StateChip } from '../../components/StateChip'
import { ICON_SIZE, ICON_STROKE, iconUi } from '../../design/icons'
import { SEMANTIC, semanticColor, toneForDelta } from '../../design/tokens'
import { formatInteger, formatPercent, formatPointsDelta } from '../../domain/format'
import { formatMoney, formatMoneyFull } from '../../domain/money'
import { formatDate } from '../../domain/today'
import {
  BOTTOM_UP_TARGET_BRL,
  CAPACITY_COLUMNS,
  CYCLE,
  DEVIATION_COLUMNS,
  EXPECTED_CONVERSIONS_TOTAL,
  FORECAST_ATTESTATION,
  FUTURE_ACTIONS,
  GAP_CAUSES,
  GAP_UNLOCK_TOTAL_BRL,
  IMPLIED_TICKET_BRL,
  NATIONAL_QUOTA,
  PLAN_ATTESTATION,
  QUOTA_ATTESTATION,
  QUOTA_COPY,
  QUOTA_DECISION,
  QUOTA_NARRATIVE,
  QUOTA_RECOMMENDATION,
  QUOTA_STATUS_LABEL,
  RESULT_ATTESTATION,
  ROLLUP_COLUMNS,
  ROLLUP_GAP_BRL,
  ROLLUP_GAP_PERCENT,
  TEAM_QUOTAS,
  TERRITORY_QUOTAS,
  TOP_DOWN_GROWTH_PERCENT,
  TOP_DOWN_TARGET_BRL,
  type QuotaNode,
  type QuotaStatus,
  type TeamQuota,
} from '../../mock/quotas'

const STATUS_TONE: Record<QuotaStatus, 'positive' | 'neutral' | 'negative'> = {
  above: 'positive',
  on: 'neutral',
  below: 'negative',
}

/** Barra de proporção. Cinza porque mede tamanho, não desempenho. */
function ShareBar({ percent }: { percent: number }) {
  return (
    <span className="block h-1.5 w-full rounded-full bg-slate-100">
      <span
        className="block h-1.5 rounded-full bg-slate-400"
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
      />
    </span>
  )
}

function HeadCell({ label, align = 'right' }: { label: string; align?: 'left' | 'right' }) {
  return (
    <th
      scope="col"
      className={`whitespace-nowrap px-3 py-2 text-delta font-medium text-neutral ${
        align === 'left' ? 'text-left' : 'text-right'
      }`}
    >
      {label}
    </th>
  )
}

type RollupRowProps = {
  node: QuotaNode
  level: 0 | 1 | 2
  expandable: boolean
  expanded: boolean
  onToggle?: () => void
}

function RollupRow({ node, level, expandable, expanded, onToggle }: RollupRowProps) {
  const weight = level === 0 ? 'font-semibold text-slate-900' : 'text-slate-700'

  return (
    <tr className={level === 0 ? 'bg-slate-50' : undefined}>
      <td className="px-3 py-2.5" style={{ paddingLeft: `${12 + level * 20}px` }}>
        {expandable ? (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            className={`inline-flex items-center gap-2 text-delta-lg ${weight}`}
          >
            {expanded ? (
              <iconUi.chevronDown
                size={ICON_SIZE.sm}
                strokeWidth={ICON_STROKE}
                className="shrink-0 text-neutral"
                aria-hidden
              />
            ) : (
              <iconUi.chevronRight
                size={ICON_SIZE.sm}
                strokeWidth={ICON_STROKE}
                className="shrink-0 text-neutral"
                aria-hidden
              />
            )}
            {node.label}
          </button>
        ) : (
          <span className={`text-delta-lg ${weight}`}>{node.label}</span>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-delta text-neutral">{node.owner}</td>
      <td className="px-3 py-2.5 text-right text-delta-lg tabular-nums text-slate-700">
        {formatInteger(node.reps)}
      </td>
      <td className="px-3 py-2.5 text-right text-delta-lg tabular-nums text-slate-700">
        {formatInteger(node.plannedVisits)}
      </td>
      <td className={`px-3 py-2.5 text-right text-delta-lg tabular-nums ${weight}`}>
        {formatMoneyFull(node.quotaBrl)}
      </td>
      <td className="w-40 px-3 py-2.5">
        <span className="flex items-center gap-2">
          <ShareBar percent={node.sharePercent} />
          <span className="w-12 shrink-0 text-right text-delta tabular-nums text-neutral">
            {formatPercent(node.sharePercent, 1)}
          </span>
        </span>
      </td>
    </tr>
  )
}

function BottomUpRollup({ teams }: { teams: readonly TeamQuota[] }) {
  const [openTeams, setOpenTeams] = useState<readonly string[]>(() => teams.map((team) => team.id))

  const toggle = (id: string) =>
    setOpenTeams((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]))

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-surface-border">
            <HeadCell label={ROLLUP_COLUMNS.node} align="left" />
            <HeadCell label={ROLLUP_COLUMNS.owner} align="left" />
            <HeadCell label={ROLLUP_COLUMNS.reps} />
            <HeadCell label={ROLLUP_COLUMNS.plannedVisits} />
            <HeadCell label={ROLLUP_COLUMNS.contribution} />
            <HeadCell label={ROLLUP_COLUMNS.share} align="left" />
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {teams.map((team) => {
            const expanded = openTeams.includes(team.id)
            return [
              <RollupRow
                key={team.id}
                node={team}
                level={1}
                expandable
                expanded={expanded}
                onToggle={() => toggle(team.id)}
              />,
              ...(expanded
                ? team.territories.map((territory) => (
                    <RollupRow
                      key={territory.id}
                      node={territory}
                      level={2}
                      expandable={false}
                      expanded={false}
                    />
                  ))
                : []),
            ]
          })}
          <RollupRow node={NATIONAL_QUOTA} level={0} expandable={false} expanded />
        </tbody>
      </table>
    </div>
  )
}

function Confrontation() {
  const bottomShare = (BOTTOM_UP_TARGET_BRL / TOP_DOWN_TARGET_BRL) * 100
  const gapShare = 100 - bottomShare

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-delta-lg text-slate-700">{QUOTA_COPY.bottomUpLabel}</span>
          <span className="text-delta-lg font-semibold tabular-nums text-slate-900">
            {formatMoneyFull(BOTTOM_UP_TARGET_BRL)}
          </span>
        </div>
        <span className="mt-1.5 flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <span className="block h-3 bg-slate-400" style={{ width: `${bottomShare}%` }} />
          <span
            className="block h-3"
            style={{ width: `${gapShare}%`, backgroundColor: SEMANTIC.negative }}
          />
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-4">
        <span className="text-delta-lg text-slate-700">{QUOTA_COPY.topDownLabel}</span>
        <span className="text-delta-lg font-semibold tabular-nums text-slate-900">
          {formatMoneyFull(TOP_DOWN_TARGET_BRL)}
        </span>
      </div>

      <div className="rounded-card border border-surface-border p-3">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-delta-lg font-medium text-slate-900">{QUOTA_COPY.gapLabel}</span>
          <span
            className="text-delta-lg font-semibold tabular-nums"
            style={{ color: SEMANTIC.negative }}
          >
            {formatMoneyFull(ROLLUP_GAP_BRL)}
          </span>
        </div>
        <p className="mt-1">
          <SemanticDelta
            value={-ROLLUP_GAP_PERCENT}
            size="sm"
            comparison={QUOTA_COPY.bottomUpLabel.toLowerCase()}
          />
        </p>
      </div>

      <div className="rounded-card border border-surface-border p-3">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-delta-lg text-slate-700">{QUOTA_COPY.gapUnlockLabel}</span>
          <span
            className="text-delta-lg font-semibold tabular-nums"
            style={{ color: SEMANTIC.positive }}
          >
            {formatMoneyFull(GAP_UNLOCK_TOTAL_BRL)}
          </span>
        </div>
        <p className="mt-1 text-delta text-neutral">{QUOTA_COPY.gapUnlockNote}</p>
      </div>
    </div>
  )
}

function GapCauses() {
  return (
    <ul className="space-y-3.5">
      {GAP_CAUSES.map((cause) => (
        <li key={cause.id}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="text-delta-lg font-medium text-slate-900">{cause.label}</span>
            <span className="text-delta-lg font-semibold tabular-nums text-slate-900">
              {formatMoneyFull(cause.gapBrl)}
            </span>
          </div>

          <span className="mt-1.5 block h-1.5 w-full rounded-full bg-slate-100">
            <span
              className="block h-1.5 rounded-full"
              style={{
                width: `${cause.gapSharePercent}%`,
                backgroundColor: SEMANTIC.negative,
              }}
            />
          </span>

          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-delta tabular-nums text-neutral">
            <span>
              {QUOTA_COPY.shortfallColumn}: {formatPointsDelta(-cause.shortfallPoints)} (
              {formatPercent(cause.currentPercent, 0)} → {formatPercent(cause.targetPercent, 0)})
            </span>
            <span>
              {QUOTA_COPY.gapShareColumn}: {formatPercent(cause.gapSharePercent, 0)}
            </span>
            <span>
              {QUOTA_COPY.gapUnlockColumn}: {formatMoneyFull(cause.unlockBrl)}
            </span>
          </div>

          <p className="mt-1 text-delta text-neutral">{cause.note}</p>
        </li>
      ))}
    </ul>
  )
}

function TeamGapTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-surface-border">
            <HeadCell label={ROLLUP_COLUMNS.node} align="left" />
            <HeadCell label={QUOTA_COPY.teamTopDownColumn} />
            <HeadCell label={QUOTA_COPY.teamBottomUpColumn} />
            <HeadCell label={QUOTA_COPY.teamGapColumn} />
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {TEAM_QUOTAS.map((team) => (
            <tr key={team.id}>
              <td className="px-3 py-2.5 text-delta-lg text-slate-700">{team.label}</td>
              <td className="px-3 py-2.5 text-right text-delta-lg tabular-nums text-slate-700">
                {formatMoneyFull(team.topDownBrl)}
              </td>
              <td className="px-3 py-2.5 text-right text-delta-lg tabular-nums text-slate-700">
                {formatMoneyFull(team.quotaBrl)}
              </td>
              <td className="px-3 py-2.5 text-right">
                <SemanticDelta value={-team.rollupGapBrl} unit="money" size="sm" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DeviationRow({ node, level }: { node: QuotaNode; level: 1 | 2 }) {
  const tone = toneForDelta(node.deviationBrl)

  return (
    <tr className={level === 1 ? 'bg-slate-50' : undefined}>
      <td
        className={`px-3 py-2.5 text-delta-lg ${
          level === 1 ? 'font-semibold text-slate-900' : 'text-slate-700'
        }`}
        style={{ paddingLeft: `${12 + (level - 1) * 20}px` }}
      >
        {node.label}
      </td>
      <td className="px-3 py-2.5 text-right text-delta-lg tabular-nums text-slate-700">
        {formatMoneyFull(node.quotaBrl)}
      </td>
      <td className="px-3 py-2.5 text-right text-delta-lg tabular-nums text-neutral">
        {formatMoneyFull(node.quotaToDateBrl)}
      </td>
      <td className="px-3 py-2.5 text-right text-delta-lg font-medium tabular-nums text-slate-900">
        {formatMoneyFull(node.achievedBrl)}
      </td>
      <td className="px-3 py-2.5 text-right">
        <SemanticDelta value={node.deviationBrl} unit="money" size="sm" />
      </td>
      <td className="px-3 py-2.5 text-right">
        <SemanticDelta value={node.deviationPercent} size="sm" />
      </td>
      <td className="px-3 py-2.5 text-right text-delta-lg tabular-nums text-slate-700">
        {formatMoneyFull(node.forecastBrl)}
      </td>
      <td className="w-36 px-3 py-2.5">
        <span className="flex items-center gap-2">
          <span className="block h-1.5 w-full rounded-full bg-slate-100">
            <span
              className="block h-1.5 rounded-full"
              style={{
                width: `${Math.max(0, Math.min(100, node.attainmentPercent))}%`,
                backgroundColor: semanticColor(tone),
              }}
            />
          </span>
          <span className="w-14 shrink-0 text-right text-delta tabular-nums text-slate-700">
            {formatPercent(node.attainmentPercent, 0)}
          </span>
        </span>
      </td>
      <td className="px-3 py-2.5 text-right">
        <StateChip label={QUOTA_STATUS_LABEL[node.status]} tone={STATUS_TONE[node.status]} />
      </td>
    </tr>
  )
}

function DeviationTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-surface-border">
            <HeadCell label={DEVIATION_COLUMNS.node} align="left" />
            <HeadCell label={DEVIATION_COLUMNS.quota} />
            <HeadCell label={DEVIATION_COLUMNS.quotaToDate} />
            <HeadCell label={DEVIATION_COLUMNS.achieved} />
            <HeadCell label={DEVIATION_COLUMNS.deviationBrl} />
            <HeadCell label={DEVIATION_COLUMNS.deviationPercent} />
            <HeadCell label={DEVIATION_COLUMNS.forecast} />
            <HeadCell label={DEVIATION_COLUMNS.attainment} align="left" />
            <HeadCell label={DEVIATION_COLUMNS.status} />
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {TEAM_QUOTAS.map((team) => [
            <DeviationRow key={team.id} node={team} level={1} />,
            ...team.territories.map((territory) => (
              <DeviationRow key={territory.id} node={territory} level={2} />
            )),
          ])}
        </tbody>
      </table>
    </div>
  )
}

function CapacityTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-surface-border">
            <HeadCell label={CAPACITY_COLUMNS.node} align="left" />
            <HeadCell label={CAPACITY_COLUMNS.plannedVisits} />
            <HeadCell label={CAPACITY_COLUMNS.productive} />
            <HeadCell label={CAPACITY_COLUMNS.conversion} />
            <HeadCell label={CAPACITY_COLUMNS.coverage} />
            <HeadCell label={CAPACITY_COLUMNS.conversions} />
            <HeadCell label={CAPACITY_COLUMNS.quota} />
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {TERRITORY_QUOTAS.map((territory) => (
            <tr key={territory.id}>
              <td className="px-3 py-2.5 text-delta-lg text-slate-700">{territory.label}</td>
              <td className="px-3 py-2.5 text-right text-delta-lg tabular-nums text-slate-700">
                {formatInteger(territory.plannedVisits)}
              </td>
              <td className="px-3 py-2.5 text-right text-delta-lg tabular-nums text-slate-700">
                {formatPercent(territory.productiveVisitsPercent, 1)}
              </td>
              <td className="px-3 py-2.5 text-right text-delta-lg tabular-nums text-slate-700">
                {formatPercent(territory.conversionPercent, 1)}
              </td>
              <td className="px-3 py-2.5 text-right text-delta-lg tabular-nums text-slate-700">
                {formatPercent(territory.coveragePercent, 1)}
              </td>
              <td className="px-3 py-2.5 text-right text-delta-lg tabular-nums text-slate-700">
                {formatInteger(territory.expectedConversions)}
              </td>
              <td className="px-3 py-2.5 text-right text-delta-lg font-medium tabular-nums text-slate-900">
                {formatMoneyFull(territory.quotaBrl)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function QuotasAndTargets() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {QUOTA_COPY.screenTitle}
          </h1>
          <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
            {QUOTA_COPY.screenSubtitle}
          </p>
          <p className="mt-1 text-delta tabular-nums text-neutral">
            {QUOTA_COPY.cyclePrefix} {formatDate(CYCLE.startsOn)} – {formatDate(CYCLE.endsOn)} ·{' '}
            {formatInteger(CYCLE.elapsedBusinessDays)} {QUOTA_COPY.elapsedLabel}{' '}
            {formatInteger(CYCLE.businessDays)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {FUTURE_ACTIONS.map((action) => (
            <FutureButton key={action.label} label={action.label} phase={action.phase} />
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={QUOTA_COPY.bottomUpLabel}
          value={formatMoney(BOTTOM_UP_TARGET_BRL)}
          comparison={`${formatInteger(TERRITORY_QUOTAS.length)} territórios · ${formatInteger(NATIONAL_QUOTA.reps)} representantes`}
          attestation={QUOTA_ATTESTATION}
        />
        <KpiCard
          label={QUOTA_COPY.topDownLabel}
          value={formatMoney(TOP_DOWN_TARGET_BRL)}
          delta={TOP_DOWN_GROWTH_PERCENT}
          comparison={QUOTA_COPY.bottomUpLabel.toLowerCase()}
          attestation={QUOTA_ATTESTATION}
        />
        <KpiCard
          label={QUOTA_COPY.gapLabel}
          value={formatMoneyFull(ROLLUP_GAP_BRL)}
          delta={-ROLLUP_GAP_PERCENT}
          comparison={QUOTA_COPY.topDownLabel.toLowerCase()}
          attestation={QUOTA_ATTESTATION}
        />
        <KpiCard
          label={QUOTA_COPY.forecastLabel}
          value={formatMoney(NATIONAL_QUOTA.forecastBrl)}
          delta={NATIONAL_QUOTA.attainmentPercent - 100}
          comparison={QUOTA_COPY.bottomUpLabel.toLowerCase()}
          attestation={FORECAST_ATTESTATION}
        />
      </div>

      <Panel
        title={QUOTA_COPY.rollupTitle}
        description={QUOTA_COPY.rollupDescription}
        footer={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <DataBadge attestation={QUOTA_ATTESTATION} variant="full" />
            <span>{QUOTA_COPY.expandHint}</span>
          </span>
        }
      >
        <BottomUpRollup teams={TEAM_QUOTAS} />
      </Panel>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Panel
            title={QUOTA_COPY.confrontationTitle}
            description={QUOTA_COPY.confrontationDescription}
            footer={<DataBadge attestation={QUOTA_ATTESTATION} />}
          >
            <Confrontation />
          </Panel>
        </div>

        <div className="lg:col-span-7">
          <Panel
            title={QUOTA_COPY.causesTitle}
            description={QUOTA_COPY.causesDescription}
            footer={<DataBadge attestation={QUOTA_ATTESTATION} />}
          >
            <GapCauses />
          </Panel>
        </div>
      </div>

      <Panel
        title={QUOTA_COPY.byTeamTitle}
        description={QUOTA_COPY.byTeamDescription}
        footer={<DataBadge attestation={QUOTA_ATTESTATION} />}
      >
        <TeamGapTable />
      </Panel>

      <Panel
        title={QUOTA_COPY.deviationTitle}
        description={QUOTA_COPY.deviationDescription}
        footer={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <DataBadge attestation={RESULT_ATTESTATION} variant="full" />
            <DataBadge attestation={FORECAST_ATTESTATION} />
          </span>
        }
      >
        <DeviationTable />
      </Panel>

      <Panel
        title={QUOTA_COPY.capacityTitle}
        description={QUOTA_COPY.capacityDescription}
        footer={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <DataBadge attestation={PLAN_ATTESTATION} />
            <span className="tabular-nums">
              {QUOTA_COPY.conversionsBridgeLabel}: {formatInteger(EXPECTED_CONVERSIONS_TOTAL)} ·{' '}
              {QUOTA_COPY.ticketBridgeLabel}: {formatMoneyFull(IMPLIED_TICKET_BRL)}
            </span>
          </span>
        }
      >
        <CapacityTable />
      </Panel>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Panel title={QUOTA_COPY.narrativeTitle}>
            <div className="space-y-3">
              {QUOTA_NARRATIVE.map((paragraph) => (
                <p key={paragraph} className="text-delta-lg leading-relaxed text-slate-700">
                  {paragraph}
                </p>
              ))}
            </div>
          </Panel>
        </div>

        <div className="lg:col-span-5">
          <Panel
            title={QUOTA_COPY.recommendationLabel}
            footer={<DataBadge attestation={QUOTA_ATTESTATION} />}
          >
            <p className="text-delta-lg font-medium text-slate-900">
              {QUOTA_RECOMMENDATION.title}
            </p>
            <p className="mt-1.5 text-delta-lg leading-relaxed text-slate-700">
              {QUOTA_RECOMMENDATION.detail}
            </p>
            <p className="mt-2 text-delta text-neutral">{QUOTA_RECOMMENDATION.owner}</p>
            {QUOTA_DECISION ? (
              <div className="mt-3 rounded-card border border-surface-border p-3">
                <p className="text-delta text-neutral">
                  {QUOTA_COPY.decisionLabel} {QUOTA_DECISION.id}
                </p>
                <p className="mt-0.5 text-delta-lg font-medium text-slate-900">
                  {QUOTA_DECISION.title}
                </p>
                <p className="mt-1 text-delta-lg tabular-nums text-slate-700">
                  {formatMoney(QUOTA_DECISION.impactBrl)}
                </p>
              </div>
            ) : null}
          </Panel>
        </div>
      </div>
    </div>
  )
}
