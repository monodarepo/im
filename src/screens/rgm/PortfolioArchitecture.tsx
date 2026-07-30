import { Link } from 'react-router-dom'
import { DataBadge } from '../../components/DataBadge'
import { FutureButton } from '../../components/FutureButton'
import { KpiCard } from '../../components/KpiCard'
import { Panel } from '../../components/Panel'
import { PerimeterMark, PerimeterNote } from '../../components/PerimeterNote'
import { SemanticDelta } from '../../components/SemanticDelta'
import { StateChip } from '../../components/StateChip'
import { formatDecimal, formatInteger, formatPercent } from '../../domain/format'
import { formatMoney } from '../../domain/money'
import { semanticColor, type SemanticTone } from '../../design/tokens'
import {
  CANNIBALIZATION,
  CANNIBALIZATION_ATTESTATION,
  CANNIBALIZATION_LEVEL_LABEL,
  CANNIBALIZATION_THRESHOLD,
  cannibalizationBetween,
  CRITICAL_PAIR_COUNT,
  CRITICAL_PAIRS,
  MAX_CANNIBALIZATION_PERCENT,
  PORTFOLIO_ATTESTATION,
  PORTFOLIO_MARGIN_RATE,
  PORTFOLIO_PRESSURE,
  PORTFOLIO_RECOMMENDATION,
  PORTFOLIO_SELLOUT_BRL,
  PORTFOLIO_SKUS,
  pressureOf,
  ROLE_DESCRIPTION,
  ROLE_LABEL,
  ROLE_SUMMARY,
  TOTAL_OVERLAP_BRL,
  type CannibalizationLevel,
  type PortfolioRole,
} from '../../mock/portfolio'

/** Canibalização alta é resultado negativo: a escala é semântica, não decorativa. */
const LEVEL_TONE: Record<CannibalizationLevel, SemanticTone> = {
  low: 'neutral',
  watch: 'attention',
  critical: 'negative',
}

/**
 * Papel não é bom nem ruim: a rampa é monocromática de propósito, para não
 * competir com a cor semântica do dado nem com a identidade do produto.
 */
const ROLE_SHADE: Record<PortfolioRole, string> = {
  'volume-anchor': '#334155',
  'price-defense': '#475569',
  entry: '#64748B',
  premium: '#94A3B8',
  tail: '#CBD5E1',
}

const HEATMAP = {
  labelWidth: 108,
  headerHeight: 42,
  cellWidth: 68,
  cellHeight: 42,
  gap: 3,
  minOpacity: 0.12,
  opacityRange: 0.48,
} as const

const AXIS_TEXT = '#64748B'
const CELL_TEXT = '#0F172A'
const DIAGONAL_FILL = '#F8FAFC'
const DIAGONAL_TEXT = '#CBD5E1'

function RoleBadge({ role }: { role: PortfolioRole }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-control bg-slate-100 px-2 py-0.5 text-delta font-medium text-slate-700"
      title={ROLE_DESCRIPTION[role]}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: ROLE_SHADE[role] }}
        aria-hidden
      />
      {ROLE_LABEL[role]}
    </span>
  )
}

function CannibalizationHeatmap() {
  const width = HEATMAP.labelWidth + PORTFOLIO_SKUS.length * HEATMAP.cellWidth
  const height = HEATMAP.headerHeight + PORTFOLIO_SKUS.length * HEATMAP.cellHeight
  const innerWidth = HEATMAP.cellWidth - HEATMAP.gap
  const innerHeight = HEATMAP.cellHeight - HEATMAP.gap

  return (
    <div className="overflow-x-auto">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Matriz de canibalização entre SKUs do portfólio"
      >
        <text x={0} y={HEATMAP.headerHeight - 24} fontSize={10} fill={AXIS_TEXT}>
          captura ↓
        </text>
        <text x={0} y={HEATMAP.headerHeight - 11} fontSize={10} fill={AXIS_TEXT}>
          canibalizado →
        </text>

        {PORTFOLIO_SKUS.map((prey, column) => (
          <text
            key={prey.id}
            x={HEATMAP.labelWidth + column * HEATMAP.cellWidth + innerWidth / 2}
            y={HEATMAP.headerHeight - 11}
            textAnchor="middle"
            fontSize={11}
            fontWeight={500}
            fill={AXIS_TEXT}
          >
            {prey.shortName}
          </text>
        ))}

        {PORTFOLIO_SKUS.map((captor, row) => (
          <g key={captor.id}>
            <text
              x={0}
              y={HEATMAP.headerHeight + row * HEATMAP.cellHeight + innerHeight / 2 + 4}
              fontSize={11}
              fontWeight={500}
              fill={AXIS_TEXT}
            >
              {captor.shortName}
            </text>

            {PORTFOLIO_SKUS.map((prey, column) => {
              const x = HEATMAP.labelWidth + column * HEATMAP.cellWidth
              const y = HEATMAP.headerHeight + row * HEATMAP.cellHeight
              const cell = cannibalizationBetween(captor.id, prey.id)

              if (cell === null) {
                return (
                  <g key={prey.id}>
                    <rect x={x} y={y} width={innerWidth} height={innerHeight} rx={6} fill={DIAGONAL_FILL} />
                    <text
                      x={x + innerWidth / 2}
                      y={y + innerHeight / 2 + 4}
                      textAnchor="middle"
                      fontSize={11}
                      fill={DIAGONAL_TEXT}
                    >
                      —
                    </text>
                  </g>
                )
              }

              const ratio =
                MAX_CANNIBALIZATION_PERCENT === 0 ? 0 : cell.percent / MAX_CANNIBALIZATION_PERCENT

              return (
                <g key={prey.id}>
                  <rect
                    x={x}
                    y={y}
                    width={innerWidth}
                    height={innerHeight}
                    rx={6}
                    fill={semanticColor(LEVEL_TONE[cell.level])}
                    fillOpacity={HEATMAP.minOpacity + HEATMAP.opacityRange * ratio}
                  >
                    <title>
                      {`${cell.captorName} tira ${formatPercent(cell.percent)} do volume de ${cell.preyName} · ${CANNIBALIZATION_LEVEL_LABEL[cell.level]}`}
                    </title>
                  </rect>
                  <text
                    x={x + innerWidth / 2}
                    y={y + innerHeight / 2 + 4}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={cell.level === 'critical' ? 600 : 400}
                    fill={CELL_TEXT}
                    className="tabular-nums"
                  >
                    {formatPercent(cell.percent)}
                  </text>
                </g>
              )
            })}
          </g>
        ))}
      </svg>
    </div>
  )
}

function PortfolioRoleTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] text-left">
        <thead>
          <tr className="border-b border-surface-border text-delta text-neutral">
            <th className="pb-2 font-medium">SKU</th>
            <th className="pb-2 font-medium">Papel no portfólio</th>
            <th className="pb-2 text-right font-medium">Preço</th>
            <th className="pb-2 text-right font-medium">Margem</th>
            <th className="pb-2 text-right font-medium">Volume</th>
            <th className="pb-2 text-right font-medium">Variação</th>
            <th className="pb-2 text-right font-medium">Sell-out</th>
            <th className="pb-2 text-right font-medium">Participação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {PORTFOLIO_SKUS.map((sku) => (
            <tr key={sku.id} className="text-delta-lg transition-colors hover:bg-slate-50">
              <td className="py-2.5">
                <span className="block font-medium text-slate-900">{sku.name}</span>
                <span className="mt-0.5 flex items-center gap-2 text-delta text-neutral">
                  {sku.therapeuticClass}
                  {sku.declared ? <StateChip label="Declarado" /> : null}
                </span>
              </td>
              <td className="py-2.5">
                <RoleBadge role={sku.role} />
              </td>
              <td className="py-2.5 text-right tabular-nums text-slate-900">
                R$ {formatDecimal(sku.priceBrl, 2)}
              </td>
              <td className="py-2.5 text-right tabular-nums text-slate-900">
                {formatPercent(sku.contributionMarginRate * 100)}
              </td>
              <td className="py-2.5 text-right tabular-nums text-slate-600">
                {formatInteger(sku.volume)}
              </td>
              <td className="py-2.5 text-right">
                <SemanticDelta value={sku.volumeDeltaPercent} size="sm" />
              </td>
              <td className="py-2.5 text-right font-medium tabular-nums text-slate-900">
                {formatMoney(sku.selloutBrl)}
                <PerimeterMark />
              </td>
              <td className="py-2.5 text-right tabular-nums text-slate-600">
                {formatPercent(sku.portfolioSharePercent)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RoleComposition() {
  return (
    <>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
        {ROLE_SUMMARY.filter((summary) => summary.sharePercent > 0).map((summary) => (
          <span
            key={summary.role}
            className="h-full"
            style={{ width: `${summary.sharePercent}%`, backgroundColor: ROLE_SHADE[summary.role] }}
            title={`${ROLE_LABEL[summary.role]} · ${formatPercent(summary.sharePercent)}`}
          />
        ))}
      </div>

      <ul className="mt-4 divide-y divide-surface-border">
        {ROLE_SUMMARY.map((summary) => (
          <li key={summary.role} className="flex items-start gap-3 py-3">
            <span
              className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: ROLE_SHADE[summary.role] }}
              aria-hidden
            />
            <span className="min-w-0 flex-1">
              <span className="block text-delta-lg font-medium text-slate-900">
                {ROLE_LABEL[summary.role]}
              </span>
              <span className="block text-delta text-neutral">
                {ROLE_DESCRIPTION[summary.role]}
              </span>
              <span className="mt-0.5 block text-delta text-neutral">
                {formatInteger(summary.skuCount)} SKU · margem {formatPercent(summary.marginRate * 100)}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-delta-lg font-semibold tabular-nums text-slate-900">
                {formatMoney(summary.selloutBrl)}
                <PerimeterMark />
              </span>
              <span className="block text-delta tabular-nums text-neutral">
                {formatPercent(summary.sharePercent)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}

function InternalPressure() {
  const maxPressure = PORTFOLIO_PRESSURE.reduce(
    (max, item) => Math.max(max, item.pressurePercent),
    0,
  )

  return (
    <ul className="space-y-3">
      {PORTFOLIO_PRESSURE.map((item) => (
        <li key={item.skuId}>
          <span className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-delta-lg text-slate-900">{item.skuName}</span>
            <span className="shrink-0 text-delta-lg font-semibold tabular-nums text-slate-900">
              {formatPercent(item.pressurePercent)}
            </span>
          </span>
          <span className="mt-1 block h-1.5 w-full rounded-full bg-slate-100">
            <span
              className="block h-full rounded-full"
              style={{
                width: `${maxPressure === 0 ? 0 : (item.pressurePercent / maxPressure) * 100}%`,
                backgroundColor: semanticColor(LEVEL_TONE[item.level]),
              }}
            />
          </span>
          <span className="mt-1 block text-delta text-neutral">
            {formatMoney(item.pressureBrl)}
            <PerimeterMark /> de sell-out em disputa com o próprio portfólio
          </span>
        </li>
      ))}
    </ul>
  )
}

function CriticalPairs() {
  const recommendedPairId = PORTFOLIO_RECOMMENDATION?.pairId ?? null
  const recommendedDecisionId = PORTFOLIO_RECOMMENDATION?.decisionId ?? null

  return (
    <ol className="divide-y divide-surface-border">
      {CRITICAL_PAIRS.map((pair) => (
        <li key={pair.id} className="flex items-start gap-3 py-3">
          <span className="min-w-0 flex-1">
            <span className="block text-delta-lg text-slate-900">
              <span className="font-medium">{pair.captorName}</span> tira de{' '}
              <span className="font-medium">{pair.preyName}</span>
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-2">
              <StateChip
                label={CANNIBALIZATION_LEVEL_LABEL[pair.level]}
                tone={LEVEL_TONE[pair.level]}
              />
              <span className="text-delta tabular-nums text-neutral">
                {formatPercent(pair.percent)} do volume canibalizado
              </span>
            </span>
          </span>
          <span className="shrink-0 text-right text-delta-lg font-semibold tabular-nums">
            {pair.id === recommendedPairId && recommendedDecisionId ? (
              <Link
                to={`/decisoes/${recommendedDecisionId}`}
                className="underline"
                style={{ color: 'var(--product-accent)' }}
              >
                {formatMoney(pair.overlapBrl)}
              </Link>
            ) : (
              <span className="text-slate-900">{formatMoney(pair.overlapBrl)}</span>
            )}
            <PerimeterMark />
          </span>
        </li>
      ))}
    </ol>
  )
}

export function PortfolioArchitecture() {
  const overlapSharePercent =
    Math.round((TOTAL_OVERLAP_BRL / PORTFOLIO_SELLOUT_BRL) * 1000) / 10
  const anchorPressure = pressureOf(PORTFOLIO_SKUS[0]?.id ?? '')

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Arquitetura de portfólio
          </h1>
          <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
            Papel de cada SKU e sobreposição entre linhas próprias
          </p>
        </div>
        <FutureButton label="Simular racionalização de portfólio" phase="Fase 3" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="SKUs no portfólio"
          value={formatInteger(PORTFOLIO_SKUS.length)}
          attestation={PORTFOLIO_ATTESTATION}
        />
        <KpiCard
          label="Margem de contribuição média"
          value={formatPercent(PORTFOLIO_MARGIN_RATE * 100)}
          attestation={PORTFOLIO_ATTESTATION}
        />
        <KpiCard
          label="Pares em canibalização crítica"
          value={`${formatInteger(CRITICAL_PAIR_COUNT)} de ${formatInteger(CANNIBALIZATION.length)}`}
          attestation={CANNIBALIZATION_ATTESTATION}
        />
        <KpiCard
          label="Sell-out em disputa interna"
          value={formatPercent(overlapSharePercent)}
          attestation={CANNIBALIZATION_ATTESTATION}
        />
      </div>

      <Panel
        title="Papel de cada SKU no portfólio"
        description="O papel define o que pode ser feito com o preço da linha"
        footer={
          <span className="flex flex-wrap items-center justify-between gap-3">
            <DataBadge attestation={PORTFOLIO_ATTESTATION} variant="full" />
            <span>
              Perímetro coberto: {formatMoney(PORTFOLIO_SELLOUT_BRL)}
              <PerimeterMark /> de sell-out
            </span>
          </span>
        }
      >
        <PortfolioRoleTable />
      </Panel>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Panel
            title="Composição por papel"
            description="Participação de cada papel no sell-out do perímetro"
          >
            <RoleComposition />
          </Panel>
        </div>

        <div className="lg:col-span-5">
          <Panel
            title="Pressão interna por SKU"
            description="Quanto do volume de cada linha é disputado pelas outras"
            footer={<DataBadge attestation={CANNIBALIZATION_ATTESTATION} />}
          >
            <InternalPressure />
          </Panel>
        </div>
      </div>

      <Panel
        title="Canibalização entre SKUs"
        description="A linha captura volume da coluna. Quanto mais intenso, mais uma linha cresce às custas da outra"
        footer={<DataBadge attestation={CANNIBALIZATION_ATTESTATION} variant="full" />}
      >
        <CannibalizationHeatmap />

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <StateChip label={CANNIBALIZATION_LEVEL_LABEL.low} tone={LEVEL_TONE.low} />
          <span className="text-delta text-neutral">
            até {formatPercent(CANNIBALIZATION_THRESHOLD.watch, 0)}
          </span>
          <StateChip label={CANNIBALIZATION_LEVEL_LABEL.watch} tone={LEVEL_TONE.watch} />
          <span className="text-delta text-neutral">
            de {formatPercent(CANNIBALIZATION_THRESHOLD.watch, 0)} a{' '}
            {formatPercent(CANNIBALIZATION_THRESHOLD.critical, 0)}
          </span>
          <StateChip label={CANNIBALIZATION_LEVEL_LABEL.critical} tone={LEVEL_TONE.critical} />
          <span className="text-delta text-neutral">
            acima de {formatPercent(CANNIBALIZATION_THRESHOLD.critical, 0)}
          </span>
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Panel
            title="Pares com maior sell-out em disputa"
            description="Ordenados pelo valor que a sobreposição coloca em risco"
          >
            <CriticalPairs />
          </Panel>
        </div>

        <div className="lg:col-span-5">
          {PORTFOLIO_RECOMMENDATION ? (
            <Panel
              title="Recomendação"
              description="Gerada por IA sobre a matriz de sobreposição"
              footer={
                PORTFOLIO_RECOMMENDATION.decisionId ? (
                  <span>
                    Anexada à decisão{' '}
                    <Link
                      to={`/decisoes/${PORTFOLIO_RECOMMENDATION.decisionId}`}
                      className="font-medium underline"
                      style={{ color: 'var(--product-accent)' }}
                    >
                      {PORTFOLIO_RECOMMENDATION.decisionId}
                    </Link>
                    {PORTFOLIO_RECOMMENDATION.decisionTitle
                      ? ` — ${PORTFOLIO_RECOMMENDATION.decisionTitle}`
                      : ''}
                    .
                  </span>
                ) : (
                  <DataBadge attestation={PORTFOLIO_RECOMMENDATION.attestation} />
                )
              }
            >
              <p className="text-delta-lg font-semibold text-slate-900">
                {PORTFOLIO_RECOMMENDATION.headline}
              </p>
              <p className="mt-2 text-delta-lg text-slate-700">
                {PORTFOLIO_RECOMMENDATION.rationale}
              </p>
              {anchorPressure ? (
                <p className="mt-3 text-delta text-neutral">
                  {anchorPressure.skuName} concentra {formatPercent(anchorPressure.pressurePercent)}{' '}
                  de pressão interna, equivalente a {formatMoney(anchorPressure.pressureBrl)}
                  <PerimeterMark /> de sell-out disputado dentro da própria casa.
                </p>
              ) : null}
              <div className="mt-4">
                <DataBadge attestation={PORTFOLIO_RECOMMENDATION.attestation} />
              </div>
            </Panel>
          ) : null}
        </div>
      </div>

      <PerimeterNote />
    </div>
  )
}
