import { useMemo, useState } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ConfidenceMeter } from '../../components/ConfidenceMeter'
import {
  CHART_AREA,
  CHART_AXIS,
  CHART_CURSOR,
  CHART_GRID,
  CHART_LINE,
} from '../../design/chartTheme'
import { DataBadge } from '../../components/DataBadge'
import { FutureButton } from '../../components/FutureButton'
import { KpiCard } from '../../components/KpiCard'
import { Panel } from '../../components/Panel'
import { PerimeterMark, PerimeterNote } from '../../components/PerimeterNote'
import { SemanticDelta } from '../../components/SemanticDelta'
import { StateChip } from '../../components/StateChip'
import { SEMANTIC } from '../../design/tokens'
import { MARKET } from '../../domain/elasticity'
import {
  formatDecimal,
  formatInteger,
  formatMultiple,
  formatPercent,
} from '../../domain/format'
import { formatMoney } from '../../domain/money'
import {
  attestationFor,
  buildCurve,
  CANONICAL_ADHERENCE,
  CANONICAL_POINTS,
  CURVE_CAPTION,
  DEFAULT_DISCOUNT_RATE,
  DEFAULT_PRICE_BRL,
  DISCOUNT_LEVELS,
  ELASTICITY_ATTESTATION,
  ELASTICITY_LABEL,
  ELASTICITY_NOTE,
  ELASTICITY_READING,
  isExtrapolated,
  OBSERVED_PRICE_RANGE,
  PRICE_SWEEP,
  PRICE_TICKS,
  pointAt,
  PROMO_LIFT_BY_LEVEL,
  revenuePeak,
} from '../../mock/elasticityCurve'
import { SCENARIO_FILTERS } from '../../mock/scenarios'

const CURVE_COLOR = '#334155'
const BAND_COLOR = '#94A3B8'
const ANCHOR_COLOR = '#0F172A'
const CURSOR_COLOR = '#0F172A'

const price = (value: number) => `R$ ${formatDecimal(value, 2)}`
const thousands = (value: number) => formatDecimal(value / 1000, 0)
const discountLabel = (rate: number) => formatPercent(rate * 100, 0)

type CurveDatum = {
  priceBrl: number
  volume: number
  bandLow: number
  bandSpan: number
  volumeHigh: number
  netRevenueBrl: number
  contributionBrl: number
  bandHalfWidthRate: number
  extrapolated: boolean
}

function CurveTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: readonly { payload?: CurveDatum }[]
}) {
  const datum = payload?.[0]?.payload
  if (!active || !datum) return null

  return (
    <div className="rounded-control border border-surface-border bg-surface-card px-3 py-2 shadow-sm">
      <p className="text-delta font-medium text-slate-900">{price(datum.priceBrl)}</p>

      <p className="mt-1 text-delta text-slate-700">
        Volume mediano{' '}
        <span className="font-medium tabular-nums">{formatInteger(datum.volume)}</span> unid.
      </p>

      <p className="text-delta text-neutral">
        Intervalo <span className="tabular-nums">{formatInteger(datum.bandLow)}</span> a{' '}
        <span className="tabular-nums">{formatInteger(datum.volumeHigh)}</span> (
        {formatPercent(datum.bandHalfWidthRate * 100, 1)})
      </p>

      <p className="mt-1 text-delta text-slate-700">
        Receita líquida{' '}
        <span className="font-medium tabular-nums">{formatMoney(datum.netRevenueBrl)}</span>
        <PerimeterMark />
      </p>

      <p className="text-delta text-slate-700">
        Margem de contribuição{' '}
        <span className="font-medium tabular-nums">{formatMoney(datum.contributionBrl)}</span>
        <PerimeterMark />
      </p>

      {datum.extrapolated ? (
        <p className="mt-1 text-delta font-medium" style={{ color: SEMANTIC.attention }}>
          Fora da faixa observada — extrapolação
        </p>
      ) : null}
    </div>
  )
}

function Readout({
  label,
  value,
  hint,
}: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
}) {
  return (
    <div className="rounded-control border border-surface-border px-3 py-2.5">
      <p className="text-delta text-neutral">{label}</p>
      <p className="mt-0.5 text-delta-lg font-semibold tabular-nums text-slate-900">{value}</p>
      {hint ? <p className="mt-0.5 text-delta text-neutral">{hint}</p> : null}
    </div>
  )
}

export function ElasticitySimulator() {
  const [discountRate, setDiscountRate] = useState<number>(DEFAULT_DISCOUNT_RATE)
  const [priceBrl, setPriceBrl] = useState<number>(DEFAULT_PRICE_BRL)

  const curve = useMemo(() => buildCurve(discountRate), [discountRate])
  const selected = useMemo(() => pointAt(priceBrl, discountRate), [priceBrl, discountRate])
  const reference = useMemo(() => pointAt(DEFAULT_PRICE_BRL, discountRate), [discountRate])
  const peak = useMemo(() => revenuePeak(curve), [curve])

  const chartData: CurveDatum[] = curve.map((point) => ({
    priceBrl: point.priceBrl,
    volume: point.volume,
    bandLow: point.volumeLow,
    bandSpan: point.bandSpan,
    volumeHigh: point.volumeHigh,
    netRevenueBrl: point.netRevenueBrl,
    contributionBrl: point.contributionBrl,
    bandHalfWidthRate: point.bandHalfWidthRate,
    extrapolated: point.extrapolated,
  }))

  const anchorVolumes = CANONICAL_POINTS.map((point) => point.volume)
  const lowest = Math.min(...chartData.map((point) => point.bandLow), ...anchorVolumes)
  const highest = Math.max(...chartData.map((point) => point.volumeHigh), ...anchorVolumes)
  const floor = Math.floor(lowest / 100_000) * 100_000
  const ceiling = Math.ceil(highest / 100_000) * 100_000

  const deltaPercent = (value: number, base: number) =>
    base === 0 ? 0 : Math.round((value / base - 1) * 100 * 10) / 10

  const selectedAttestation = attestationFor(selected.priceBrl)
  const extrapolating = isExtrapolated(selected.priceBrl)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Simulador de elasticidade
          </h1>
          <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
            Curva de preço × volume com intervalo de confiança
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Elasticidade-preço"
          value={formatDecimal(ELASTICITY_READING.value, 2)}
          attestation={ELASTICITY_ATTESTATION}
        />
        <KpiCard
          label="Volume no preço simulado"
          value={`${formatInteger(selected.volume)} unid.`}
          attestation={selectedAttestation}
        />
        <KpiCard
          label="Faixa observada"
          value={`${price(OBSERVED_PRICE_RANGE.minPriceBrl)} a ${price(OBSERVED_PRICE_RANGE.maxPriceBrl)}`}
          attestation={ELASTICITY_ATTESTATION}
        />
        <KpiCard
          label="Aderência aos pontos canônicos"
          value={`${formatInteger(CANONICAL_ADHERENCE.matched)} de ${formatInteger(CANONICAL_ADHERENCE.total)}`}
          attestation={ELASTICITY_ATTESTATION}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <Panel
            title="Curva preço × volume"
            description={CURVE_CAPTION}
            action={
              <div className="inline-flex rounded-control border border-surface-border p-0.5">
                {DISCOUNT_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDiscountRate(level)}
                    className="rounded-control px-2.5 py-1 text-delta font-medium text-slate-600 transition-colors hover:bg-slate-50"
                    style={
                      Math.abs(level - discountRate) < 0.0005
                        ? { backgroundColor: 'var(--product-accent)', color: '#FFFFFF' }
                        : undefined
                    }
                  >
                    Desconto {discountLabel(level)}
                  </button>
                ))}
              </div>
            }
            footer={<DataBadge attestation={selectedAttestation} variant="full" />}
          >
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 16, right: 16, bottom: 16, left: 8 }}>
                  <CartesianGrid {...CHART_GRID} />

                  <ReferenceArea
                    x1={OBSERVED_PRICE_RANGE.minPriceBrl}
                    x2={OBSERVED_PRICE_RANGE.maxPriceBrl}
                    fill="#0F172A"
                    fillOpacity={0.04}
                  />

                  <XAxis
                    {...CHART_AXIS}
                    dataKey="priceBrl"
                    type="number"
                    domain={[PRICE_SWEEP.minPriceBrl, PRICE_SWEEP.maxPriceBrl]}
                    ticks={[...PRICE_TICKS]}
                    tickFormatter={(value: number) => formatDecimal(value, 2)}
                    label={{
                      value: 'Preço de tabela (R$)',
                      position: 'insideBottom',
                      offset: -8,
                      fill: '#64748B',
                      fontSize: 12,
                    }}
                  />

                  <YAxis
                    {...CHART_AXIS}
                    width={64}
                    domain={[floor, ceiling]}
                    tickFormatter={(value: number) => thousands(value)}
                    label={{
                      value: 'Volume (mil unid.)',
                      angle: -90,
                      position: 'insideLeft',
                      fill: '#64748B',
                      fontSize: 12,
                    }}
                  />

                  <Tooltip content={<CurveTooltip />} cursor={CHART_CURSOR} />

                  <Area
                    {...CHART_AREA}
                    dataKey="bandLow"
                    stackId="band"
                    stroke="none"
                    fill="none"
                    activeDot={false}
                    isAnimationActive={false}
                  />
                  <Area
                    {...CHART_AREA}
                    dataKey="bandSpan"
                    stackId="band"
                    stroke="none"
                    fill={BAND_COLOR}
                    fillOpacity={0.3}
                    activeDot={false}
                    isAnimationActive={false}
                  />

                  <Line
                    {...CHART_LINE}
                    type="monotone"
                    dataKey="volume"
                    stroke={CURVE_COLOR}
                    isAnimationActive={false}
                  />

                  <ReferenceLine
                    x={selected.priceBrl}
                    stroke={CURSOR_COLOR}
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                  />

                  {CANONICAL_POINTS.map((point) => {
                    const onActiveCurve = Math.abs(point.discountRate - discountRate) < 0.0005
                    return (
                      <ReferenceDot
                        key={point.id}
                        x={point.priceBrl}
                        y={point.volume}
                        r={onActiveCurve ? 5 : 4}
                        fill={onActiveCurve ? ANCHOR_COLOR : '#FFFFFF'}
                        stroke={ANCHOR_COLOR}
                        strokeWidth={1.5}
                        {...(onActiveCurve
                          ? {
                              label: {
                                value: point.label,
                                position: 'top' as const,
                                fill: '#334155',
                                fontSize: 11,
                              },
                            }
                          : {})}
                      />
                    )
                  })}

                  <ReferenceDot
                    x={selected.priceBrl}
                    y={selected.volume}
                    r={6}
                    fill={CURSOR_COLOR}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <p className="mt-3 text-delta text-neutral">
              Área sombreada ao fundo: faixa de preço observada ({price(OBSERVED_PRICE_RANGE.minPriceBrl)}{' '}
              a {price(OBSERVED_PRICE_RANGE.maxPriceBrl)}). Pontos cheios são os cenários canônicos do
              desconto ativo; os vazios pertencem à curva do próprio desconto.
            </p>
          </Panel>
        </div>

        <div className="xl:col-span-4">
          <Panel
            title="Ponto simulado"
            description="Mova o preço para ler volume, receita e margem na curva"
            footer={
              extrapolating ? (
                <span className="inline-flex flex-wrap items-center gap-2">
                  <StateChip label="Extrapolação" tone="attention" />
                  <span>
                    Preço fora da faixa observada: os valores seguem na tela com confiança reduzida.
                  </span>
                </span>
              ) : (
                <DataBadge attestation={selectedAttestation} />
              )
            }
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-kpi tabular-nums text-slate-900">{price(selected.priceBrl)}</span>
              <span className="text-delta text-neutral">
                Desconto {discountLabel(selected.discountRate)}
              </span>
            </div>

            <label className="mt-3 block">
              <span className="sr-only">Preço de tabela simulado</span>
              <input
                type="range"
                min={PRICE_SWEEP.minPriceBrl}
                max={PRICE_SWEEP.maxPriceBrl}
                step={PRICE_SWEEP.stepBrl}
                value={selected.priceBrl}
                onChange={(event) => setPriceBrl(Number(event.target.value))}
                className="w-full"
                style={{ accentColor: 'var(--product-accent)' }}
              />
            </label>

            <div className="flex items-center justify-between text-delta tabular-nums text-neutral">
              <span>{price(PRICE_SWEEP.minPriceBrl)}</span>
              <span>{price(PRICE_SWEEP.maxPriceBrl)}</span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Readout
                label="Volume estimado"
                value={`${formatInteger(selected.volume)} unid.`}
                hint={
                  <>
                    {formatInteger(selected.volumeLow)} a {formatInteger(selected.volumeHigh)} (
                    {formatPercent(selected.bandHalfWidthRate * 100, 1)})
                  </>
                }
              />
              <Readout
                label="Market share estimado"
                value={formatPercent(selected.sharePercent)}
                hint={`IPR ${formatDecimal(selected.relativePriceIndex, 1)}`}
              />
              <Readout
                label="Receita líquida"
                value={
                  <>
                    {formatMoney(selected.netRevenueBrl)}
                    <PerimeterMark />
                  </>
                }
                hint={
                  <SemanticDelta
                    value={deltaPercent(selected.netRevenueBrl, reference.netRevenueBrl)}
                    size="sm"
                    comparison={`vs. ${price(DEFAULT_PRICE_BRL)}`}
                  />
                }
              />
              <Readout
                label="Margem de contribuição"
                value={
                  <>
                    {formatMoney(selected.contributionBrl)}
                    <PerimeterMark />
                  </>
                }
                hint={
                  <SemanticDelta
                    value={deltaPercent(selected.contributionBrl, reference.contributionBrl)}
                    size="sm"
                    comparison={`vs. ${price(DEFAULT_PRICE_BRL)}`}
                  />
                }
              />
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Panel
            title="Leitura da elasticidade"
            description="Coeficiente calculado a partir das âncoras, não digitado"
            footer={<DataBadge attestation={ELASTICITY_ATTESTATION} />}
          >
            <div className="flex items-center gap-3">
              <span className="text-kpi tabular-nums text-slate-900">
                {formatDecimal(ELASTICITY_READING.value, 2)}
              </span>
              <StateChip label={ELASTICITY_LABEL} />
              <ConfidenceMeter confidence={ELASTICITY_ATTESTATION.confidence} showLabel />
            </div>

            <p className="mt-3 text-delta-lg text-slate-700">
              Cada 1% de corte no preço de tabela devolve{' '}
              <span className="font-semibold tabular-nums">
                {formatPercent(ELASTICITY_READING.magnitude, 2)}
              </span>{' '}
              de volume. {ELASTICITY_NOTE}
            </p>

            <dl className="mt-4 divide-y divide-surface-border border-t border-surface-border">
              {PROMO_LIFT_BY_LEVEL.map((level) => (
                <div
                  key={level.discountRate}
                  className="flex items-baseline justify-between gap-4 py-2"
                >
                  <dt className="text-delta-lg text-slate-600">
                    Lift promocional em {discountLabel(level.discountRate)}
                  </dt>
                  <dd className="text-delta-lg font-semibold tabular-nums text-slate-900">
                    {formatMultiple(level.lift, 3)}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>

        <div className="lg:col-span-7">
          <Panel
            title="Receita máxima da faixa varrida"
            description={`Desconto ${discountLabel(discountRate)}, entre ${price(PRICE_SWEEP.minPriceBrl)} e ${price(PRICE_SWEEP.maxPriceBrl)}`}
            footer={
              peak ? (
                <span>
                  {peak.atSweepEdge
                    ? 'O máximo caiu na borda da faixa varrida: com demanda elástica a receita não vira dentro do intervalo simulado. O piso de preço é decisão comercial, não resultado do modelo.'
                    : 'O máximo caiu num ponto interior da faixa varrida.'}
                </span>
              ) : null
            }
          >
            {peak ? (
              <div className="grid gap-3 sm:grid-cols-4">
                <Readout label="Preço" value={price(peak.point.priceBrl)} />
                <Readout
                  label="Volume estimado"
                  value={`${formatInteger(peak.point.volume)} unid.`}
                />
                <Readout
                  label="Receita líquida"
                  value={
                    <>
                      {formatMoney(peak.point.netRevenueBrl)}
                      <PerimeterMark />
                    </>
                  }
                />
                <Readout
                  label="Margem de contribuição"
                  value={
                    <>
                      {formatMoney(peak.point.contributionBrl)}
                      <PerimeterMark />
                    </>
                  }
                  hint={`${formatPercent(MARKET.contributionMarginRate * 100)} da receita líquida`}
                />
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <FutureButton label="Recalibrar curva com painel de varejo" phase="Fase 2" />
              <FutureButton label="Exportar curva" phase="Fase 2" />
            </div>
          </Panel>
        </div>
      </div>

      <Panel
        title="Pontos canônicos sobre a curva"
        description="Os quatro cenários da seção 10.3 conferidos contra o volume que o modelo devolve"
        footer={<DataBadge attestation={ELASTICITY_ATTESTATION} variant="full" />}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-surface-border text-delta text-neutral">
                <th className="pb-2 font-medium">Cenário</th>
                <th className="pb-2 text-right font-medium">Preço</th>
                <th className="pb-2 text-right font-medium">Desconto</th>
                <th className="pb-2 text-right font-medium">Volume canônico</th>
                <th className="pb-2 text-right font-medium">Volume do modelo</th>
                <th className="pb-2 text-right font-medium">Share</th>
                <th className="pb-2 font-medium">Aderência</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {CANONICAL_POINTS.map((point) => (
                <tr key={point.id} className="text-delta-lg transition-colors hover:bg-slate-50">
                  <td className="py-2.5 font-medium text-slate-900">{point.label}</td>
                  <td className="py-2.5 text-right tabular-nums text-slate-900">
                    {price(point.priceBrl)}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-slate-600">
                    {discountLabel(point.discountRate)}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-slate-900">
                    {formatInteger(point.volume)}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-slate-900">
                    {formatInteger(point.modelVolume)}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-slate-600">
                    {formatPercent(point.sharePercent)}
                  </td>
                  <td className="py-2.5">
                    <StateChip
                      label={point.onCurve ? 'Sobre a curva' : 'Divergente'}
                      tone={point.onCurve ? 'positive' : 'negative'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <PerimeterNote />
    </div>
  )
}
