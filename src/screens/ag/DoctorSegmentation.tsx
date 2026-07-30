import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { CHART_AXIS, CHART_CURSOR, CHART_GRID } from '../../design/chartTheme'
import { DataBadge } from '../../components/DataBadge'
import { FutureButton } from '../../components/FutureButton'
import { KpiCard } from '../../components/KpiCard'
import { Panel } from '../../components/Panel'
import { StateChip } from '../../components/StateChip'
import { SEMANTIC, semanticColor, toneForDelta } from '../../design/tokens'
import { formatDecimal, formatInteger, formatPercent } from '../../domain/format'
import { formatRelative } from '../../domain/today'
import { POTENTIAL_TIER_LABEL } from '../../mock/doctors'
import {
  AVERAGE_PROPENSITY,
  AXIS_LABEL,
  BLOCKED_DOCTORS,
  CONVERT_SEGMENT,
  CYCLE_ENDS_ON,
  DEFAULT_HCP_ID,
  dominantFactor,
  ELIGIBILITY_ATTESTATION,
  ELIGIBILITY_BLOCKS,
  ELIGIBILITY_STATUS_LABEL,
  ELIGIBILITY_STATUS_TONE,
  ELIGIBLE_DOCTORS,
  ELIGIBLE_SHARE_PERCENT,
  findHcp,
  HCP_ATTESTATION,
  HCP_SEGMENTATION_DECISION_ID,
  HCP_SEGMENTATION_FILTERS,
  HCP_SEGMENTATIONS,
  NOMINAL_RELEASABLE_SAMPLES,
  PORTFOLIO_TARGET_DOCTORS,
  POTENTIAL_ATTESTATION,
  POTENTIAL_THRESHOLD,
  PROPENSITY_ATTESTATION,
  PROPENSITY_THRESHOLD,
  SCORE_MAX,
  SCORE_MIN,
  SEGMENT_ATTESTATION,
  SEGMENT_COLOR,
  SEGMENT_DESCRIPTION,
  SEGMENT_DISTRIBUTION,
  SEGMENT_LABEL,
  SEGMENT_ORDER,
  type EligibilityReason,
  type HcpSegmentation,
  type PropensityFactorScore,
  type SegmentId,
} from '../../mock/doctorSegmentation'

/**
 * Segmentação de Médicos (AG, módulo 4.3).
 *
 * A matriz posiciona; a explicação do score e a elegibilidade decidem. As duas
 * leituras andam juntas de propósito: um médico no quadrante de conversão com
 * consentimento pendente, cota esgotada ou território em ruptura não recebe
 * amostra — e a tela precisa dizer isso na mesma linha em que diz que ele
 * converteria.
 */

const THRESHOLD_STROKE = '#94A3B8'
const AXIS_TICK_FILL = '#64748B'
const LABEL_FILL = '#475569'
const SELECTED_STROKE = '#0F172A'
const QUADRANT_FILL_OPACITY = 0.08

const SELECTED_POINT_WEIGHT = 1
const UNSELECTED_POINT_WEIGHT = 0.42
const POINT_AREA_RANGE: [number, number] = [110, 300]

/** Rótulo curto do quadrante, para caber dentro da área do gráfico. */
const SEGMENT_SHORT_LABEL: Record<SegmentId, string> = {
  convert: 'Converter agora',
  cultivate: 'Cultivar',
  sustain: 'Sustentar',
  withhold: 'Não amostrar',
}

type LabelPosition = 'insideTopLeft' | 'insideTopRight' | 'insideBottomLeft' | 'insideBottomRight'

type QuadrantArea = {
  readonly id: SegmentId
  readonly x1: number
  readonly x2: number
  readonly y1: number
  readonly y2: number
  readonly labelPosition: LabelPosition
}

const QUADRANT_AREAS: readonly QuadrantArea[] = [
  {
    id: 'convert',
    x1: POTENTIAL_THRESHOLD,
    x2: SCORE_MAX,
    y1: PROPENSITY_THRESHOLD,
    y2: SCORE_MAX,
    labelPosition: 'insideTopRight',
  },
  {
    id: 'cultivate',
    x1: POTENTIAL_THRESHOLD,
    x2: SCORE_MAX,
    y1: SCORE_MIN,
    y2: PROPENSITY_THRESHOLD,
    labelPosition: 'insideBottomRight',
  },
  {
    id: 'sustain',
    x1: SCORE_MIN,
    x2: POTENTIAL_THRESHOLD,
    y1: PROPENSITY_THRESHOLD,
    y2: SCORE_MAX,
    labelPosition: 'insideTopLeft',
  },
  {
    id: 'withhold',
    x1: SCORE_MIN,
    x2: POTENTIAL_THRESHOLD,
    y1: SCORE_MIN,
    y2: PROPENSITY_THRESHOLD,
    labelPosition: 'insideBottomLeft',
  },
]

function formatScore(value: number): string {
  return formatDecimal(value, 1)
}

/** Contribuição em pontos de score. Zero não recebe sinal — não empurra nada. */
function formatPoints(value: number): string {
  return `${formatDecimal(value, 1, value === 0 ? 'negative-only' : 'always')} pt`
}

function formatLevel(value: number): string {
  return formatDecimal(value, 1, value === 0 ? 'negative-only' : 'always')
}

/* -------------------------------------------------------------------------- */
/* Matriz                                                                      */
/* -------------------------------------------------------------------------- */

type MatrixPoint = {
  readonly id: string
  readonly label: string
  readonly name: string
  readonly specialty: string
  readonly region: string
  readonly segment: SegmentId
  readonly eligibility: string
  readonly blocked: boolean
  readonly x: number
  readonly y: number
  readonly z: number
}

function toPoint(item: HcpSegmentation, selected: boolean): MatrixPoint {
  return {
    id: item.profile.id,
    label: item.profile.shortName,
    name: item.profile.name,
    specialty: item.profile.specialtyLabel,
    region: `${item.profile.uf} · ${item.profile.regionLabel}`,
    segment: item.segment,
    eligibility: ELIGIBILITY_STATUS_LABEL[item.eligibility.status],
    blocked: item.eligibility.status === 'blocked',
    x: item.potentialScore,
    y: item.propensityScore,
    z: selected ? SELECTED_POINT_WEIGHT : UNSELECTED_POINT_WEIGHT,
  }
}

/** Lê o médico do ponto clicado sem confiar no formato do evento do gráfico. */
function pointId(point: unknown): string | null {
  if (typeof point !== 'object' || point === null) return null
  const candidate = 'payload' in point ? (point as { payload?: unknown }).payload : point
  if (typeof candidate !== 'object' || candidate === null || !('id' in candidate)) return null
  const id = (candidate as { id?: unknown }).id
  return typeof id === 'string' ? id : null
}

function MatrixTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload?: MatrixPoint }[]
}) {
  const point = active ? payload?.[0]?.payload : undefined
  if (!point) return null

  return (
    <div className="rounded-control border border-surface-border bg-surface-card px-3 py-2 shadow-sm">
      <p className="text-delta-lg font-semibold text-slate-900">{point.name}</p>
      <p className="text-delta text-neutral">
        {point.specialty} · {point.region}
      </p>
      <p className="mt-1.5 text-delta tabular-nums text-slate-700">
        Potencial {formatScore(point.x)} · Propensão {formatScore(point.y)}
      </p>
      <p className="mt-1 text-delta font-medium" style={{ color: SEGMENT_COLOR[point.segment] }}>
        {SEGMENT_LABEL[point.segment]}
      </p>
      <p
        className="text-delta font-medium"
        style={point.blocked ? { color: SEMANTIC.negative } : undefined}
      >
        {point.eligibility}
      </p>
    </div>
  )
}

function SegmentationMatrix({
  selectedId,
  onSelect,
}: {
  selectedId: string
  onSelect: (id: string) => void
}) {
  const points = HCP_SEGMENTATIONS.map((item) => toPoint(item, item.profile.id === selectedId))

  return (
    <div className="h-[340px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 12, right: 16, bottom: 24, left: 4 }}>
          <CartesianGrid {...CHART_GRID} />

          {QUADRANT_AREAS.map((area) => (
            <ReferenceArea
              key={area.id}
              x1={area.x1}
              x2={area.x2}
              y1={area.y1}
              y2={area.y2}
              fill={SEGMENT_COLOR[area.id]}
              fillOpacity={QUADRANT_FILL_OPACITY}
              stroke="none"
              label={{
                value: SEGMENT_SHORT_LABEL[area.id],
                position: area.labelPosition,
                fill: AXIS_TICK_FILL,
                fontSize: 11,
              }}
            />
          ))}

          <XAxis
            {...CHART_AXIS}
            type="number"
            dataKey="x"
            domain={[SCORE_MIN, SCORE_MAX]}
            label={{
              value: AXIS_LABEL.potential,
              position: 'insideBottom',
              offset: -14,
              fill: AXIS_TICK_FILL,
              fontSize: 12,
            }}
          />
          <YAxis
            {...CHART_AXIS}
            type="number"
            dataKey="y"
            domain={[SCORE_MIN, SCORE_MAX]}
            width={44}
            label={{
              value: AXIS_LABEL.propensity,
              angle: -90,
              position: 'insideLeft',
              fill: AXIS_TICK_FILL,
              fontSize: 12,
            }}
          />
          <ZAxis type="number" dataKey="z" range={POINT_AREA_RANGE} />

          <ReferenceLine x={POTENTIAL_THRESHOLD} stroke={THRESHOLD_STROKE} strokeDasharray="4 4" />
          <ReferenceLine y={PROPENSITY_THRESHOLD} stroke={THRESHOLD_STROKE} strokeDasharray="4 4" />

          <Tooltip content={<MatrixTooltip />} cursor={CHART_CURSOR} />

          <Scatter
            data={[...points]}
            className="cursor-pointer"
            onClick={(point: unknown) => {
              const id = pointId(point)
              if (id) onSelect(id)
            }}
          >
            {points.map((point) => (
              <Cell
                key={point.id}
                fill={SEGMENT_COLOR[point.segment]}
                stroke={
                  point.id === selectedId
                    ? SELECTED_STROKE
                    : point.blocked
                      ? SEMANTIC.negative
                      : '#FFFFFF'
                }
                strokeWidth={point.id === selectedId ? 3 : point.blocked ? 2 : 1}
              />
            ))}
            <LabelList dataKey="label" position="top" offset={10} fill={LABEL_FILL} fontSize={12} />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

function MatrixLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {SEGMENT_ORDER.map((id) => (
        <span key={id} className="inline-flex items-center gap-1.5" title={SEGMENT_DESCRIPTION[id]}>
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: SEGMENT_COLOR[id] }}
            aria-hidden
          />
          <span className="text-delta text-neutral">{SEGMENT_LABEL[id]}</span>
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span
          className="h-3 w-3 rounded-full bg-white"
          style={{ border: `2px solid ${SEMANTIC.negative}` }}
          aria-hidden
        />
        <span className="text-delta text-neutral">Contorno: inelegível no ciclo</span>
      </span>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Score explicado                                                             */
/* -------------------------------------------------------------------------- */

function ContributionBar({ points, maxAbs }: { points: number; maxAbs: number }) {
  const width = maxAbs === 0 ? 0 : (Math.abs(points) / maxAbs) * 50
  const color = semanticColor(toneForDelta(points))

  return (
    <span className="relative block h-2 w-full min-w-[72px] rounded-full bg-slate-100">
      <span className="absolute inset-y-0 left-1/2 w-px bg-slate-300" aria-hidden />
      <span
        className="absolute inset-y-0 rounded-full"
        style={{
          left: points >= 0 ? '50%' : `${50 - width}%`,
          width: `${width}%`,
          backgroundColor: color,
        }}
        aria-hidden
      />
    </span>
  )
}

function FactorRow({ score, maxAbs }: { score: PropensityFactorScore; maxAbs: number }) {
  return (
    <tr className="align-top">
      <td className="py-2 pr-3">
        <span className="block text-slate-900">{score.factor.label}</span>
        <span className="mt-0.5 block text-delta text-neutral">{score.factor.basis}</span>
      </td>
      <td className="py-2 px-2 text-right tabular-nums text-slate-600">
        {formatPercent(score.factor.weight * 100, 0)}
      </td>
      <td className="py-2 px-2 text-right tabular-nums text-slate-600">{formatLevel(score.level)}</td>
      <td className="w-24 py-2 px-2 align-middle">
        <ContributionBar points={score.contributionPoints} maxAbs={maxAbs} />
      </td>
      <td
        className="py-2 pl-2 text-right font-semibold tabular-nums"
        style={{ color: semanticColor(toneForDelta(score.contributionPoints)) }}
      >
        {formatPoints(score.contributionPoints)}
      </td>
    </tr>
  )
}

function ScoreExplanation({ selection }: { selection: HcpSegmentation }) {
  const { profile, eligibility } = selection
  const ordered = [...selection.propensityFactors].sort(
    (a, b) => Math.abs(b.contributionPoints) - Math.abs(a.contributionPoints),
  )
  const maxAbs = ordered.reduce((max, item) => Math.max(max, Math.abs(item.contributionPoints)), 0)
  const leader = dominantFactor(selection.propensityFactors)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-delta-lg font-semibold text-slate-900">{profile.name}</p>
          <p className="text-delta text-neutral">
            {profile.specialtyLabel} · {profile.uf} ·{' '}
            {POTENTIAL_TIER_LABEL[profile.potentialTier]}
          </p>
          <p className="mt-0.5 text-delta text-neutral">
            {formatInteger(profile.monthlyPrescriptions)} prescrições/mês · visita a cada{' '}
            {formatInteger(profile.visitFrequencyDays)} dias ·{' '}
            {formatDecimal(selection.responseRatio, 1)} unidades por amostra entregue
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StateChip
            label={SEGMENT_LABEL[selection.segment]}
            tone={selection.segment === 'convert' ? 'positive' : 'neutral'}
          />
          <StateChip
            label={ELIGIBILITY_STATUS_LABEL[eligibility.status]}
            tone={ELIGIBILITY_STATUS_TONE[eligibility.status]}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-delta-lg">
          <thead>
            <tr className="border-b border-surface-border text-delta text-neutral">
              <th className="pb-2 pr-3 font-medium">Fator</th>
              <th className="pb-2 px-2 text-right font-medium">Peso</th>
              <th className="pb-2 px-2 text-right font-medium">Nível</th>
              <th className="pb-2 px-2 font-medium" />
              <th className="pb-2 pl-2 text-right font-medium">Contribuição</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            <tr>
              <td className="py-2 pr-3 text-slate-700" colSpan={4}>
                Base da carteira — todo médico parte daqui
              </td>
              <td className="py-2 pl-2 text-right font-medium tabular-nums text-slate-900">
                {formatScore(selection.propensityBase)}
              </td>
            </tr>
            {ordered.map((item) => (
              <FactorRow key={item.factor.id} score={item} maxAbs={maxAbs} />
            ))}
            <tr className="border-t-2 border-surface-border">
              <td className="py-2 pr-3 font-medium text-slate-900" colSpan={4}>
                Soma dos cinco fatores
              </td>
              <td
                className="py-2 pl-2 text-right font-semibold tabular-nums"
                style={{ color: semanticColor(toneForDelta(selection.factorsTotal)) }}
              >
                {formatPoints(selection.factorsTotal)}
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-3 font-semibold text-slate-900" colSpan={4}>
                {AXIS_LABEL.propensity}
              </td>
              <td className="py-2 pl-2 text-right text-kpi tabular-nums text-slate-900">
                {formatScore(selection.propensityScore)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {leader ? (
        <p className="rounded-control bg-slate-50 px-3 py-2 text-delta-lg text-slate-700">
          Fator dominante: <span className="font-semibold">{leader.factor.label}</span>, que{' '}
          {leader.contributionPoints >= 0 ? 'empurra para cima' : 'empurra para baixo'} em{' '}
          <span
            className="font-semibold tabular-nums"
            style={{ color: semanticColor(toneForDelta(leader.contributionPoints)) }}
          >
            {formatPoints(leader.contributionPoints)}
          </span>
          . {leader.factor.meaning}
        </p>
      ) : null}

      <p className="text-delta text-neutral">
        {AXIS_LABEL.potential}:{' '}
        <span className="tabular-nums text-slate-700">{formatScore(selection.potentialScore)}</span>{' '}
        — âncora da faixa {POTENTIAL_TIER_LABEL[profile.potentialTier].toLowerCase()} em{' '}
        <span className="tabular-nums">{formatScore(selection.potentialAnchor)}</span>, modulada em{' '}
        <span className="tabular-nums">{formatPoints(selection.potentialModulation)}</span> pela
        prescrição observada. A faixa é canônica: os fatores modulam em torno dela, nunca a
        atravessam.
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-surface-border pt-3">
        <DataBadge attestation={PROPENSITY_ATTESTATION} />
        <DataBadge attestation={POTENTIAL_ATTESTATION} />
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Elegibilidade                                                               */
/* -------------------------------------------------------------------------- */

function LimitCell({
  label,
  value,
  emphasis = false,
  tone,
}: {
  label: string
  value: string
  emphasis?: boolean
  tone?: string | undefined
}) {
  return (
    <div className="rounded-control border border-surface-border px-3 py-2">
      <p className="text-delta text-neutral">{label}</p>
      <p
        className={`mt-0.5 tabular-nums ${emphasis ? 'text-kpi' : 'text-delta-lg font-medium'} text-slate-900`}
        style={tone ? { color: tone } : undefined}
      >
        {value}
      </p>
    </div>
  )
}

function ReasonItem({ reason }: { reason: EligibilityReason }) {
  const color = reason.blocking ? SEMANTIC.negative : SEMANTIC.attention

  return (
    <li
      className="rounded-control border px-3 py-2"
      style={{ borderColor: `${color}66`, backgroundColor: `${color}0F` }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-delta-lg font-semibold text-slate-900">{reason.label}</p>
        <StateChip
          label={reason.blocking ? 'Bloqueia a entrega' : 'Limita a entrega'}
          tone={reason.blocking ? 'negative' : 'attention'}
        />
      </div>
      <p className="mt-1 text-delta-lg text-slate-700">{reason.detail}</p>
      {reason.route && reason.routeLabel ? (
        <Link
          to={reason.route}
          className="mt-1.5 inline-block text-delta font-medium"
          style={{ color: 'var(--product-accent)' }}
        >
          {reason.routeLabel} →
        </Link>
      ) : null}
      <div className="mt-2">
        <DataBadge attestation={reason.attestation} />
      </div>
    </li>
  )
}

function EligibilityPanelBody({ selection }: { selection: HcpSegmentation }) {
  const { eligibility, profile } = selection
  const capped = eligibility.releasable < eligibility.recommended

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-delta-lg text-slate-700">
          <span className="font-semibold text-slate-900">{profile.name}</span> · limite por faixa{' '}
          {POTENTIAL_TIER_LABEL[profile.potentialTier].toLowerCase()} · ciclo encerra{' '}
          {formatRelative(CYCLE_ENDS_ON)}
        </p>
        <StateChip
          label={ELIGIBILITY_STATUS_LABEL[eligibility.status]}
          tone={ELIGIBILITY_STATUS_TONE[eligibility.status]}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <LimitCell label="Limite do ciclo" value={formatInteger(eligibility.cycleLimit)} />
        <LimitCell label="Já entregues" value={formatInteger(eligibility.delivered)} />
        <LimitCell label="Saldo" value={formatInteger(eligibility.balance)} />
        <LimitCell label="Recomendação do plano" value={formatInteger(eligibility.recommended)} />
        <LimitCell
          label="Liberável neste ciclo"
          value={formatInteger(eligibility.releasable)}
          emphasis
          tone={eligibility.releasable === 0 ? SEMANTIC.negative : undefined}
        />
      </div>

      {capped ? (
        <p className="text-delta-lg text-slate-700">
          A recomendação do modelo é de {formatInteger(eligibility.recommended)} amostras, mas o que
          sai para o campo é {formatInteger(eligibility.releasable)}. A diferença de{' '}
          {formatInteger(eligibility.recommended - eligibility.releasable)} amostras volta ao
          estoque do ciclo — a regra de compliance vence o modelo, não o contrário.
        </p>
      ) : (
        <p className="text-delta-lg text-slate-700">
          A recomendação do modelo cabe dentro do limite do ciclo: as{' '}
          {formatInteger(eligibility.releasable)} amostras saem integralmente para o campo.
        </p>
      )}

      {eligibility.reasons.length > 0 ? (
        <ul className="space-y-2">
          {eligibility.reasons.map((reason) => (
            <ReasonItem key={`${reason.id}-${reason.label}`} reason={reason} />
          ))}
        </ul>
      ) : (
        <p className="rounded-control bg-slate-50 px-3 py-2 text-delta-lg text-slate-700">
          Sem restrição de elegibilidade no ciclo: consentimento registrado, saldo suficiente e
          território liberado.
        </p>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Distribuição da carteira                                                    */
/* -------------------------------------------------------------------------- */

function SegmentDistribution() {
  const max = SEGMENT_DISTRIBUTION.reduce((top, segment) => Math.max(top, segment.doctors), 0)

  return (
    <ol className="space-y-3.5">
      {SEGMENT_DISTRIBUTION.map((segment) => (
        <li key={segment.id}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-delta-lg font-medium text-slate-900">{segment.label}</span>
            <span className="text-delta-lg tabular-nums text-slate-900">
              {formatInteger(segment.doctors)}
              <span className="ml-2 text-delta text-neutral">
                {formatPercent(segment.share * 100, 0)}
              </span>
            </span>
          </div>

          <span className="mt-1 block h-2.5 w-full rounded-full bg-slate-100">
            <span
              className="block h-2.5 rounded-full"
              style={{
                width: `${max === 0 ? 0 : (segment.doctors / max) * 100}%`,
                backgroundColor: segment.color,
              }}
            />
          </span>

          <p className="mt-1 text-delta text-neutral">{segment.action}</p>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {segment.namedDoctors.map((item) => (
              <span
                key={item.profile.id}
                title={item.profile.name}
                className="rounded-control border border-surface-border px-1.5 py-0.5 text-delta text-slate-600"
              >
                {item.profile.shortName}
              </span>
            ))}
            {segment.decisionId ? (
              <Link
                to={`/decisoes/${segment.decisionId}`}
                className="ml-auto text-delta font-medium tabular-nums"
                style={{ color: 'var(--product-accent)' }}
              >
                {segment.decisionId} →
              </Link>
            ) : (
              <span className="ml-auto text-delta text-neutral">Política de cota</span>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}

function EligibilitySummary() {
  return (
    <ul className="space-y-2">
      {ELIGIBILITY_BLOCKS.map((block) => (
        <li key={block.id} className="flex items-baseline justify-between gap-3 text-delta-lg">
          <span className="text-slate-700">{block.label}</span>
          <span className="tabular-nums text-slate-900">
            {formatInteger(block.doctors)}
            <span className="ml-2 text-delta text-neutral">{formatPercent(block.share, 1)}</span>
          </span>
        </li>
      ))}
      <li className="flex items-baseline justify-between gap-3 border-t border-surface-border pt-2 text-delta-lg font-semibold">
        <span className="text-slate-900">Elegíveis no ciclo</span>
        <span className="tabular-nums text-slate-900">
          {formatInteger(ELIGIBLE_DOCTORS)}
          <span className="ml-2 text-delta font-normal text-neutral">
            {formatPercent(ELIGIBLE_SHARE_PERCENT, 1)}
          </span>
        </span>
      </li>
    </ul>
  )
}

/* -------------------------------------------------------------------------- */
/* Tabela                                                                      */
/* -------------------------------------------------------------------------- */

const TIER_TONE: Record<'high' | 'medium' | 'low', 'positive' | 'attention' | 'neutral'> = {
  high: 'positive',
  medium: 'attention',
  low: 'neutral',
}

function HcpTable({
  selectedId,
  onSelect,
}: {
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1040px] text-left">
        <thead>
          <tr className="border-b border-surface-border text-delta text-neutral">
            <th className="pb-2 font-medium">Médico</th>
            <th className="pb-2 font-medium">Especialidade</th>
            <th className="pb-2 font-medium">Região</th>
            <th className="pb-2 font-medium">Potencial</th>
            <th className="pb-2 text-right font-medium">Propensão</th>
            <th className="pb-2 font-medium">Segmento</th>
            <th className="pb-2 text-right font-medium">Entregues</th>
            <th className="pb-2 text-right font-medium">Recomendadas</th>
            <th className="pb-2 font-medium">Elegibilidade</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {HCP_SEGMENTATIONS.map((item) => {
            const selected = item.profile.id === selectedId
            return (
              <tr
                key={item.profile.id}
                onClick={() => onSelect(item.profile.id)}
                className={`cursor-pointer text-delta-lg transition-colors ${
                  selected ? 'bg-slate-50' : 'hover:bg-slate-50'
                }`}
              >
                <td className="py-2.5">
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onSelect(item.profile.id)}
                    className={`text-left ${selected ? 'font-semibold' : 'font-medium'} text-slate-900`}
                  >
                    {item.profile.name}
                  </button>
                </td>
                <td className="py-2.5 text-slate-600">{item.profile.specialtyLabel}</td>
                <td className="py-2.5 text-slate-600">
                  {item.profile.uf} · {item.profile.regionLabel}
                </td>
                <td className="py-2.5">
                  <StateChip
                    label={POTENTIAL_TIER_LABEL[item.profile.potentialTier].replace(
                      ' potencial',
                      '',
                    )}
                    tone={TIER_TONE[item.profile.potentialTier]}
                  />
                </td>
                <td className="py-2.5 text-right">
                  <span className="inline-flex items-center justify-end gap-2">
                    <span className="hidden h-1.5 w-16 rounded-full bg-slate-100 sm:block">
                      <span
                        className="block h-1.5 rounded-full"
                        style={{
                          width: `${item.propensityScore}%`,
                          backgroundColor: SEGMENT_COLOR[item.segment],
                        }}
                      />
                    </span>
                    <span className="font-semibold tabular-nums text-slate-900">
                      {formatScore(item.propensityScore)}
                    </span>
                  </span>
                </td>
                <td className="py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-slate-700">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: SEGMENT_COLOR[item.segment] }}
                      aria-hidden
                    />
                    {SEGMENT_LABEL[item.segment]}
                  </span>
                </td>
                <td className="py-2.5 text-right tabular-nums text-slate-700">
                  {formatInteger(item.profile.samplesDelivered)}
                </td>
                <td className="py-2.5 text-right tabular-nums text-slate-700">
                  {formatInteger(item.profile.recommendedSamples)}
                  {item.eligibility.releasable < item.profile.recommendedSamples ? (
                    <span className="ml-1.5 text-delta" style={{ color: SEMANTIC.attention }}>
                      libera {formatInteger(item.eligibility.releasable)}
                    </span>
                  ) : null}
                </td>
                <td className="py-2.5">
                  <StateChip
                    label={ELIGIBILITY_STATUS_LABEL[item.eligibility.status]}
                    tone={ELIGIBILITY_STATUS_TONE[item.eligibility.status]}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Tela                                                                        */
/* -------------------------------------------------------------------------- */

export function DoctorSegmentation() {
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_HCP_ID)
  const selection = findHcp(selectedId)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Segmentação de médicos
          </h1>
          <p className="mt-1 max-w-3xl text-delta-lg text-neutral">
            Duas perguntas encadeadas: quem converte amostra em prescrição e a quem a amostra pode
            ser entregue. O score de propensão é a soma visível de cinco fatores sobre a base da
            carteira; a elegibilidade viaja na mesma linha e cancela a recomendação quando falta
            consentimento, saldo de ciclo ou produto na praça.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {HCP_SEGMENTATION_FILTERS.map((filter) => (
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
        <KpiCard
          label="Médicos-alvo segmentados"
          value={formatInteger(PORTFOLIO_TARGET_DOCTORS)}
          attestation={SEGMENT_ATTESTATION}
        />
        <KpiCard
          label="Elegíveis no ciclo"
          value={formatInteger(ELIGIBLE_DOCTORS)}
          comparison={`${formatPercent(ELIGIBLE_SHARE_PERCENT, 1)} da carteira`}
          attestation={ELIGIBILITY_ATTESTATION}
        />
        <KpiCard
          label="Bloqueados por compliance ou limite"
          value={formatInteger(BLOCKED_DOCTORS)}
          comparison="consentimento, cota do ciclo e ruptura"
          attestation={ELIGIBILITY_ATTESTATION}
        />
        <KpiCard
          label="Prioridade de conversão"
          value={formatInteger(CONVERT_SEGMENT.doctors)}
          comparison={`${formatPercent(CONVERT_SEGMENT.share * 100, 0)} da carteira · propensão média ${formatScore(AVERAGE_PROPENSITY)}`}
          attestation={PROPENSITY_ATTESTATION}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Panel
            title="Matriz potencial × propensão a converter amostra"
            description="Cada ponto é um médico da carteira nominal em acompanhamento. Clique para abrir a decomposição do score e os limites de entrega."
            footer={
              <div className="flex flex-wrap items-center justify-between gap-3">
                <DataBadge attestation={HCP_ATTESTATION} variant="full" />
                <FutureButton label="Exportar carteira elegível ao CRM/SFA" phase="Fase 3" />
              </div>
            }
          >
            <div className="space-y-3">
              <SegmentationMatrix selectedId={selectedId} onSelect={setSelectedId} />
              <MatrixLegend />
              <p className="text-delta text-neutral">
                Os cortes ficam em <span className="tabular-nums">{formatScore(POTENTIAL_THRESHOLD)}</span>{' '}
                de potencial e <span className="tabular-nums">{formatScore(PROPENSITY_THRESHOLD)}</span>{' '}
                de propensão. Posição alta não é permissão de entrega: o contorno vermelho marca
                quem está inelegível no ciclo, e a cota desses médicos volta ao estoque.
              </p>
            </div>
          </Panel>
        </div>

        <div className="xl:col-span-5">
          <Panel
            title="Score explicado"
            description="Base da carteira mais a contribuição de cada fator, com peso e direção à vista. A soma fecha exatamente no score exibido."
          >
            {selection ? (
              <ScoreExplanation selection={selection} />
            ) : (
              <p className="text-delta-lg text-neutral">
                Selecione um médico na matriz para ver a decomposição do score.
              </p>
            )}
          </Panel>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Panel
            title="Elegibilidade e limites do ciclo"
            description="O que a regra permite entregar a este médico, antes de o plano opinar."
            footer={
              <div className="flex flex-wrap items-center justify-between gap-3">
                <DataBadge attestation={ELIGIBILITY_ATTESTATION} variant="full" />
                <div className="flex flex-wrap gap-2">
                  <FutureButton label="Registrar consentimento no CRM/SFA" phase="Fase 3" />
                  <FutureButton label="Solicitar exceção de limite" phase="Fase 2" />
                </div>
              </div>
            }
          >
            {selection ? (
              <EligibilityPanelBody selection={selection} />
            ) : (
              <p className="text-delta-lg text-neutral">
                Selecione um médico para ver limite, saldo e motivos de inelegibilidade.
              </p>
            )}
          </Panel>
        </div>

        <div className="xl:col-span-5">
          <Panel
            title="Carteira por segmento"
            description="Distribuição dos médicos-alvo e a cota que cada segmento recebe."
            footer={<DataBadge attestation={SEGMENT_ATTESTATION} variant="full" />}
          >
            <div className="space-y-4">
              <SegmentDistribution />
              <div className="border-t border-surface-border pt-3">
                <p className="mb-2 text-delta font-semibold uppercase tracking-wide text-neutral">
                  Resumo de elegibilidade
                </p>
                <EligibilitySummary />
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <Panel
        title="Carteira nominal em acompanhamento"
        description="Score, segmento e elegibilidade na mesma linha. Clique para abrir o médico nos painéis acima."
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <DataBadge attestation={HCP_ATTESTATION} variant="full" />
            <span>
              {formatInteger(NOMINAL_RELEASABLE_SAMPLES)} amostras liberáveis nesta carteira, dentro
              do plano de{' '}
              <Link
                to={`/decisoes/${HCP_SEGMENTATION_DECISION_ID}`}
                className="font-medium underline"
                style={{ color: 'var(--product-accent)' }}
              >
                {HCP_SEGMENTATION_DECISION_ID}
              </Link>
              .
            </span>
          </div>
        }
      >
        <HcpTable selectedId={selectedId} onSelect={setSelectedId} />
      </Panel>

      <p className="max-w-3xl text-delta text-neutral">
        Prescrição e aderência de especialidade vêm do painel médico e chegam com semanas de
        defasagem; visita, resposta a amostra e consentimento vêm do CRM/SFA e chegam em dias;
        entrega e saldo de cota vêm do SAP. O score composto carrega sempre o elo mais fraco entre
        elas — o número segue na tela, apenas não se apresenta como fresco.
      </p>
    </div>
  )
}
