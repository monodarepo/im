import { ThreadRibbon } from '../../components/ThreadRibbon'
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
import { DataBadge } from '../../components/DataBadge'
import { CHART_AXIS, CHART_CURSOR, CHART_GRID } from '../../design/chartTheme'
import { FutureButton } from '../../components/FutureButton'
import { KpiCard } from '../../components/KpiCard'
import { Panel } from '../../components/Panel'
import { StateChip } from '../../components/StateChip'
import { semanticColor, toneForDelta } from '../../design/tokens'
import { formatDecimal, formatInteger, formatPercent } from '../../domain/format'
import { formatMoney } from '../../domain/money'
import { daysAgo, formatRelative } from '../../domain/today'
import { POTENTIAL_TIER_LABEL, SPECIALTY_LABEL } from '../../mock/doctors'
import {
  AXIS_LABEL,
  COVERAGE_ATTESTATION,
  COVERAGE_GAP_PP,
  COVERAGE_PERCENT,
  COVERAGE_TARGET_PERCENT,
  defaultSelectedDoctorId,
  dominantFactor,
  findSegmentation,
  HIGH_POTENTIAL_BRL,
  MATRIX_ATTESTATION,
  POTENTIAL_SCORE_ATTESTATION,
  POTENTIAL_THRESHOLD,
  PROPENSITY_SCORE_ATTESTATION,
  PROPENSITY_THRESHOLD,
  QUADRANT_COLOR,
  QUADRANT_DESCRIPTION,
  QUADRANT_LABEL,
  QUADRANT_ORDER,
  SCORE_MAX,
  SCORE_MIN,
  SEGMENTATION_FILTERS,
  SEGMENTATION_OPPORTUNITY,
  SEGMENTATIONS,
  SEGMENTS,
  TARGET_DOCTORS,
  type DoctorSegmentation,
  type FactorScore,
  type QuadrantId,
  type Segment,
} from '../../mock/segmentation'

/**
 * Segmentação e targeting (GTM, módulo 2.3).
 *
 * A matriz é o resumo; a explicação dos fatores é o produto. Um quadrante sem
 * decomposição volta a ser opinião — por isso o score aparece sempre como uma
 * soma visível: base da faixa canônica mais a contribuição de cada fator, com
 * sinal e peso à vista.
 */

const SELECTED_STROKE = '#334155'
const THRESHOLD_STROKE = '#94A3B8'
const AXIS_TICK_FILL = '#64748B'
const LABEL_FILL = '#475569'
const QUADRANT_FILL_OPACITY = 0.08

const SELECTED_POINT_WEIGHT = 1
const UNSELECTED_POINT_WEIGHT = 0.42
const POINT_AREA_RANGE: [number, number] = [110, 280]

type LabelPosition = 'insideTopLeft' | 'insideTopRight' | 'insideBottomLeft' | 'insideBottomRight'

type QuadrantArea = {
  readonly id: QuadrantId
  readonly x1: number
  readonly x2: number
  readonly y1: number
  readonly y2: number
  readonly labelPosition: LabelPosition
}

const QUADRANT_AREAS: readonly QuadrantArea[] = [
  {
    id: 'priority',
    x1: POTENTIAL_THRESHOLD,
    x2: SCORE_MAX,
    y1: PROPENSITY_THRESHOLD,
    y2: SCORE_MAX,
    labelPosition: 'insideTopRight',
  },
  {
    id: 'develop',
    x1: POTENTIAL_THRESHOLD,
    x2: SCORE_MAX,
    y1: SCORE_MIN,
    y2: PROPENSITY_THRESHOLD,
    labelPosition: 'insideBottomRight',
  },
  {
    id: 'maintain',
    x1: SCORE_MIN,
    x2: POTENTIAL_THRESHOLD,
    y1: PROPENSITY_THRESHOLD,
    y2: SCORE_MAX,
    labelPosition: 'insideTopLeft',
  },
  {
    id: 'low',
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

/** Contribuição em pontos de score, sempre assinada. */
function formatPoints(value: number): string {
  return `${formatDecimal(value, 1, 'always')} pt`
}

function formatWeight(weight: number): string {
  return formatPercent(weight * 100, 0)
}

type MatrixPoint = {
  readonly id: string
  readonly label: string
  readonly name: string
  readonly specialty: string
  readonly tier: string
  readonly quadrant: QuadrantId
  readonly x: number
  readonly y: number
  readonly z: number
}

function toPoint(item: DoctorSegmentation, selected: boolean): MatrixPoint {
  return {
    id: item.doctor.id,
    label: item.shortName,
    name: item.doctor.name,
    specialty: SPECIALTY_LABEL[item.doctor.specialty],
    tier: POTENTIAL_TIER_LABEL[item.doctor.potentialTier],
    quadrant: item.quadrant,
    x: item.potentialScore,
    y: item.propensityScore,
    z: selected ? SELECTED_POINT_WEIGHT : UNSELECTED_POINT_WEIGHT,
  }
}

/** Extrai o médico do ponto clicado sem confiar no formato do evento do gráfico. */
function pointId(point: unknown): string | null {
  if (typeof point !== 'object' || point === null) return null
  const candidate = 'payload' in point ? (point as { payload?: unknown }).payload : point
  if (typeof candidate !== 'object' || candidate === null || !('id' in candidate)) return null
  const id = (candidate as { id?: unknown }).id
  return typeof id === 'string' ? id : null
}

function MatrixTooltip({ active, payload }: { active?: boolean; payload?: { payload?: MatrixPoint }[] }) {
  const point = active ? payload?.[0]?.payload : undefined
  if (!point) return null

  return (
    <div className="rounded-control border border-surface-border bg-surface-card px-3 py-2 shadow-sm">
      <p className="text-delta-lg font-semibold text-slate-900">{point.name}</p>
      <p className="text-delta text-neutral">
        {point.specialty} · {point.tier}
      </p>
      <p className="mt-1.5 text-delta tabular-nums text-slate-700">
        {AXIS_LABEL.potential} {formatScore(point.x)} · {AXIS_LABEL.propensity}{' '}
        {formatScore(point.y)}
      </p>
      <p className="mt-1 text-delta font-medium" style={{ color: QUADRANT_COLOR[point.quadrant] }}>
        {QUADRANT_LABEL[point.quadrant]}
      </p>
    </div>
  )
}

function SegmentationMatrix({
  selectedId,
  onSelect,
}: {
  selectedId: string
  onSelect: (doctorId: string) => void
}) {
  const points = SEGMENTATIONS.map((item) => toPoint(item, item.doctor.id === selectedId))

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
              fill={QUADRANT_COLOR[area.id]}
              fillOpacity={QUADRANT_FILL_OPACITY}
              stroke="none"
              label={{
                value: QUADRANT_LABEL[area.id],
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
                fill={QUADRANT_COLOR[point.quadrant]}
                stroke={point.id === selectedId ? SELECTED_STROKE : '#FFFFFF'}
                strokeWidth={point.id === selectedId ? 2 : 1}
              />
            ))}
            <LabelList dataKey="label" position="top" offset={10} fill={LABEL_FILL} fontSize={12} />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

function QuadrantLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {QUADRANT_ORDER.map((id) => (
        <span key={id} className="inline-flex items-center gap-1.5" title={QUADRANT_DESCRIPTION[id]}>
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: QUADRANT_COLOR[id] }}
            aria-hidden
          />
          <span className="text-delta text-neutral">{QUADRANT_LABEL[id]}</span>
        </span>
      ))}
    </div>
  )
}

function DoctorSelector({
  selectedId,
  onSelect,
}: {
  selectedId: string
  onSelect: (doctorId: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-control bg-slate-100 p-1">
      {SEGMENTATIONS.map((item) => {
        const active = item.doctor.id === selectedId
        return (
          <button
            key={item.doctor.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(item.doctor.id)}
            title={`${item.doctor.name} · ${SPECIALTY_LABEL[item.doctor.specialty]}`}
            className={`rounded-control px-2.5 py-1 text-delta font-medium transition-colors ${
              active ? 'text-white' : 'text-slate-600 hover:bg-white'
            }`}
            style={active ? { backgroundColor: 'var(--product-accent)' } : undefined}
          >
            {item.shortName}
          </button>
        )
      })}
    </div>
  )
}

function FactorBar({ score, maxAbs }: { score: FactorScore; maxAbs: number }) {
  const magnitude = Math.abs(score.contributionPoints)
  const width = maxAbs === 0 ? 0 : (magnitude / maxAbs) * 50
  const positive = score.contributionPoints >= 0
  const color = semanticColor(toneForDelta(score.contributionPoints))

  return (
    <li className="py-2" title={score.factor.meaning}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-delta-lg text-slate-700">{score.factor.label}</span>
        <span className="shrink-0 text-delta-lg font-semibold tabular-nums" style={{ color }}>
          {formatPoints(score.contributionPoints)}
        </span>
      </div>

      <div className="relative mt-1.5 h-2 w-full rounded-full bg-slate-100">
        <span
          className="absolute inset-y-0 w-px bg-slate-300"
          style={{ left: '50%' }}
          aria-hidden
        />
        <span
          className="absolute inset-y-0 rounded-full"
          style={{
            left: positive ? '50%' : `${50 - width}%`,
            width: `${width}%`,
            backgroundColor: color,
          }}
          aria-hidden
        />
      </div>

      <p className="mt-1 text-delta text-neutral">
        Peso {formatWeight(score.factor.weight)} · {score.factor.meaning}
      </p>
    </li>
  )
}

function FactorAxisPanel({
  title,
  baseLabel,
  baseValue,
  score,
  factors,
}: {
  title: string
  baseLabel: string
  baseValue: number
  score: number
  factors: readonly FactorScore[]
}) {
  const ordered = [...factors].sort(
    (a, b) => Math.abs(b.contributionPoints) - Math.abs(a.contributionPoints),
  )
  const maxAbs = ordered.reduce((max, item) => Math.max(max, Math.abs(item.contributionPoints)), 0)
  const leader = dominantFactor(factors)

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-delta font-semibold uppercase tracking-wide text-neutral">{title}</h3>
        <span className="text-kpi tabular-nums text-slate-900">{formatScore(score)}</span>
      </div>

      <p className="mt-0.5 text-delta text-neutral">
        {baseLabel}: <span className="tabular-nums">{formatScore(baseValue)}</span>
      </p>

      <ul className="mt-2 divide-y divide-surface-border">
        {ordered.map((item) => (
          <FactorBar key={item.factor.id} score={item} maxAbs={maxAbs} />
        ))}
      </ul>

      {leader ? (
        <p className="mt-2 rounded-control bg-slate-50 px-3 py-2 text-delta-lg text-slate-700">
          Fator dominante: <span className="font-semibold">{leader.factor.label}</span>, que{' '}
          {leader.contributionPoints >= 0 ? 'empurra para cima' : 'empurra para baixo'} em{' '}
          <span
            className="font-semibold tabular-nums"
            style={{ color: semanticColor(toneForDelta(leader.contributionPoints)) }}
          >
            {formatPoints(leader.contributionPoints)}
          </span>
          .
        </p>
      ) : null}
    </div>
  )
}

function FactorExplanation({ selection }: { selection: DoctorSegmentation }) {
  const { doctor } = selection

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-delta-lg font-semibold text-slate-900">{doctor.name}</p>
          <p className="text-delta text-neutral">
            {SPECIALTY_LABEL[doctor.specialty]} · {doctor.uf} ·{' '}
            {POTENTIAL_TIER_LABEL[doctor.potentialTier]}
          </p>
          <p className="mt-0.5 text-delta text-neutral">
            Última visita {formatRelative(daysAgo(doctor.lastVisitDaysAgo))} ·{' '}
            {formatInteger(doctor.visits)} visitas no ciclo ·{' '}
            {formatInteger(doctor.prescriptions)} prescrições
          </p>
        </div>
        <StateChip
          label={QUADRANT_LABEL[selection.quadrant]}
          tone={selection.quadrant === 'priority' ? 'positive' : 'neutral'}
        />
      </div>

      <div className="space-y-5">
        <FactorAxisPanel
          title={`${AXIS_LABEL.potential} — o que sustenta o tamanho`}
          baseLabel={`Base da faixa canônica (${POTENTIAL_TIER_LABEL[doctor.potentialTier]})`}
          baseValue={selection.potentialAnchor}
          score={selection.potentialScore}
          factors={selection.potentialFactors}
        />

        <div className="border-t border-surface-border pt-4">
          <FactorAxisPanel
            title={`${AXIS_LABEL.propensity} — o que move a resposta`}
            baseLabel="Base da carteira"
            baseValue={selection.propensityBase}
            score={selection.propensityScore}
            factors={selection.propensityFactors}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-surface-border pt-3">
        <DataBadge attestation={POTENTIAL_SCORE_ATTESTATION} />
        <DataBadge attestation={PROPENSITY_SCORE_ATTESTATION} />
      </div>
    </div>
  )
}

function SegmentRow({ segment }: { segment: Segment }) {
  return (
    <tr className="align-top transition-colors hover:bg-slate-50">
      <td className="py-2.5 pr-3">
        <span className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: segment.color }}
            aria-hidden
          />
          <span className="font-medium text-slate-900">{segment.label}</span>
        </span>
        <span className="mt-0.5 block text-delta text-neutral">{segment.description}</span>
      </td>

      <td className="py-2.5 px-3 text-right">
        <span className="block tabular-nums font-medium text-slate-900">
          {formatInteger(segment.doctors)}
        </span>
        <span className="block text-delta tabular-nums text-neutral">
          {formatPercent(segment.doctorShare * 100, 0)} da carteira
        </span>
      </td>

      <td className="py-2.5 px-3 text-right">
        <span className="block tabular-nums font-medium text-slate-900">
          {formatMoney(segment.potentialBrl)}
        </span>
        <span className="block text-delta tabular-nums text-neutral">
          {formatPercent(segment.potentialShare * 100, 0)} do potencial
        </span>
      </td>

      <td className="py-2.5 pl-3">
        <span className="block text-slate-700">{segment.action}</span>
        {segment.decisionId ? (
          <Link
            to={`/decisoes/${segment.decisionId}`}
            className="mt-0.5 inline-block text-delta font-medium tabular-nums"
            style={{ color: 'var(--product-accent)' }}
          >
            {segment.decisionId} →
          </Link>
        ) : (
          <span className="mt-0.5 block text-delta text-neutral">
            Política de frequência — sem decisão associada
          </span>
        )}
        {segment.namedDoctors.length > 0 ? (
          <span className="mt-1 flex flex-wrap gap-1">
            {segment.namedDoctors.map((item) => (
              <span
                key={item.doctor.id}
                className="rounded-control border border-surface-border px-1.5 py-0.5 text-delta text-slate-600"
                title={item.doctor.name}
              >
                {item.shortName}
              </span>
            ))}
          </span>
        ) : (
          <span className="mt-1 block text-delta text-neutral">
            Sem médico nominal na carteira em acompanhamento
          </span>
        )}
      </td>
    </tr>
  )
}

function SegmentTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-delta-lg">
        <thead>
          <tr className="border-b border-surface-border text-delta text-neutral">
            <th className="py-2 pr-3 text-left font-medium">Segmento</th>
            <th className="py-2 px-3 text-right font-medium">Médicos</th>
            <th className="py-2 px-3 text-right font-medium">Potencial agregado</th>
            <th className="py-2 pl-3 text-left font-medium">Ação recomendada</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {SEGMENTS.map((segment) => (
            <SegmentRow key={segment.id} segment={segment} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Segmentation() {
  const [selectedId, setSelectedId] = useState<string>(defaultSelectedDoctorId)
  const selection = findSegmentation(selectedId)

  return (
    <div className="space-y-5">
      <ThreadRibbon step="prioritization" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Segmentação e targeting
          </h1>
          <p className="mt-1 max-w-3xl text-delta-lg text-neutral">
            A matriz posiciona o médico por potencial e propensão, mas o produto desta tela é a
            explicação: cada score é a soma visível da base da faixa com a contribuição de cada
            fator, com peso e direção à vista.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {SEGMENTATION_FILTERS.map((filter) => (
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
          value={formatInteger(TARGET_DOCTORS)}
          attestation={COVERAGE_ATTESTATION}
        />
        <KpiCard
          label="Cobertura de médicos"
          value={formatPercent(COVERAGE_PERCENT, 0)}
          delta={COVERAGE_GAP_PP}
          deltaUnit="points"
          comparison={`vs. meta ${formatPercent(COVERAGE_TARGET_PERCENT, 0)}`}
          attestation={COVERAGE_ATTESTATION}
        />
        <KpiCard
          label="Potencial em alto potencial"
          value={formatMoney(HIGH_POTENTIAL_BRL)}
          attestation={MATRIX_ATTESTATION}
        />
        <KpiCard
          label="Oportunidade priorizada"
          value={formatMoney(SEGMENTATION_OPPORTUNITY.impactBrl)}
          attestation={SEGMENTATION_OPPORTUNITY.attestation}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Panel
            title="Matriz potencial × propensão"
            description="Cada ponto é um médico da carteira em acompanhamento. Clique para ver a decomposição do score."
            action={<DoctorSelector selectedId={selectedId} onSelect={setSelectedId} />}
            footer={
              <div className="flex flex-wrap items-center justify-between gap-3">
                <DataBadge attestation={MATRIX_ATTESTATION} variant="full" />
                <FutureButton label="Exportar carteira segmentada ao CRM" phase="Fase 3" />
              </div>
            }
          >
            <div className="space-y-3">
              <SegmentationMatrix selectedId={selectedId} onSelect={setSelectedId} />
              <QuadrantLegend />
              <p className="text-delta text-neutral">
                Os cortes da matriz ficam em{' '}
                <span className="tabular-nums">{formatScore(POTENTIAL_THRESHOLD)}</span> de potencial
                e <span className="tabular-nums">{formatScore(PROPENSITY_THRESHOLD)}</span> de
                propensão. A faixa de potencial declarada no cadastro do médico é a âncora do eixo
                horizontal: os fatores modulam em torno dela, nunca atravessam o corte.
              </p>
            </div>
          </Panel>
        </div>

        <div className="xl:col-span-5">
          <Panel
            title="Por que este médico caiu neste quadrante"
            description="Contribuição de cada fator, em pontos de score. Barra à direita empurra para cima; à esquerda, para baixo."
          >
            {selection ? (
              <FactorExplanation selection={selection} />
            ) : (
              <p className="text-delta-lg text-neutral">
                Selecione um médico na matriz para ver a decomposição do score.
              </p>
            )}
          </Panel>
        </div>
      </div>

      <Panel
        title="Segmentos resultantes"
        description="Carteira inteira distribuída pelos quatro quadrantes, com a ação de cobertura de cada um."
        footer={<DataBadge attestation={MATRIX_ATTESTATION} variant="full" />}
      >
        <div className="space-y-3">
          <SegmentTable />
          <p className="text-delta text-neutral">
            Os dois segmentos de alto potencial concentram o valor da carteira e executam a decisão
            de cobertura em Cardiologia no Rio de Janeiro; os demais são política de frequência, sem
            decisão associada. A cauda longa de baixa prioridade existe no agregado, mas não aparece
            na lista nominal em acompanhamento.
          </p>
        </div>
      </Panel>

      <p className="max-w-3xl text-delta text-neutral">
        Prescrição e participação vêm do painel médico e chegam com semanas de defasagem; visita,
        frequência e resposta a amostra vêm do CRM/SFA e chegam em dias. O score composto carrega
        sempre o elo mais fraco entre as duas fontes — o número segue na tela, apenas não se
        apresenta como fresco.
      </p>
    </div>
  )
}
