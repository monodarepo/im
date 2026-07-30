import { Link } from 'react-router-dom'
import { DataBadge } from '../../components/DataBadge'
import { FutureButton } from '../../components/FutureButton'
import { KpiCard } from '../../components/KpiCard'
import { Panel } from '../../components/Panel'
import { PerimeterMark, PerimeterNote } from '../../components/PerimeterNote'
import { StateChip } from '../../components/StateChip'
import { WaterfallChart } from '../../components/WaterfallChart'
import { semanticColor, toneForDelta } from '../../design/tokens'
import { formatInteger, formatPercent } from '../../domain/format'
import { formatMoney, formatMoneyFull } from '../../domain/money'
import { formatDate, formatRelative } from '../../domain/today'
import {
  END_LABEL,
  ERODING_PROMOTIONS,
  FUNNEL_ATTESTATION,
  FUNNEL_LEAK_RATE_PERCENT,
  FUNNEL_PLANNED_BRL,
  FUNNEL_PROVEN_BRL,
  FUNNEL_PROVEN_RATE_PERCENT,
  FUNNEL_STAGES,
  FUNNEL_TOTAL_LEAK_BRL,
  FUNNEL_WATERFALL_STEPS,
  FUNNEL_WATERFALL_UNIT_LABEL,
  FUNNEL_WORST_STAGE,
  MARGIN_SCALE_BRL,
  PORTFOLIO_CANNIBALIZATION_RATE_PERCENT,
  PORTFOLIO_GROSS_ROI_PERCENT,
  PORTFOLIO_NET_ROI_PERCENT,
  PORTFOLIO_ROI_GAP_POINTS,
  PROMOTION_ATTESTATION,
  PROMOTION_RECOMMENDATION,
  PROMOTIONS,
  STATUS_LABEL,
  STATUS_TONE,
  TOTAL_CANNIBALIZED_MARGIN_BRL,
  TOTAL_GROSS_MARGIN_GAIN_BRL,
  TOTAL_INVESTMENT_BRL,
  TOTAL_NET_MARGIN_GAIN_BRL,
  TOTAL_NET_UPLIFT_UNITS,
  TOTAL_UPLIFT_UNITS,
  VERDICT_LABEL,
  VERDICT_TONE,
  findPromotion,
  type Promotion,
} from '../../mock/promotions'

const UNIT_SUFFIX = 'un'

function units(value: number): string {
  return `${formatInteger(value)} ${UNIT_SUFFIX}`
}

function RoiValue({ value }: { value: number }) {
  return (
    <span
      className="font-semibold tabular-nums"
      style={{ color: semanticColor(toneForDelta(value)) }}
    >
      {formatPercent(value)}
    </span>
  )
}

function PromotionTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1080px] text-left">
        <thead>
          <tr className="border-b border-surface-border text-delta text-neutral">
            <th className="pb-2 font-medium">Promoção</th>
            <th className="pb-2 font-medium">Período</th>
            <th className="pb-2 text-right font-medium">Desconto</th>
            <th className="pb-2 text-right font-medium">Uplift</th>
            <th className="pb-2 text-right font-medium">Canibalização</th>
            <th className="pb-2 text-right font-medium">Uplift líquido</th>
            <th className="pb-2 text-right font-medium">Investimento</th>
            <th className="pb-2 text-right font-medium">ROI bruto</th>
            <th className="pb-2 text-right font-medium">ROI líquido</th>
            <th className="pb-2 font-medium">Veredito</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {PROMOTIONS.map((promotion) => (
            <tr key={promotion.id} className="text-delta-lg transition-colors hover:bg-slate-50">
              <td className="py-2.5">
                <span className="block font-medium text-slate-900">{promotion.name}</span>
                <span className="block text-delta text-neutral">
                  {promotion.mechanic} · {promotion.presentation} · {promotion.account} ·{' '}
                  {promotion.channel} · {promotion.region}
                </span>
                {promotion.decisionId ? (
                  <Link
                    to={`/decisoes/${promotion.decisionId}`}
                    className="mt-0.5 inline-block text-delta font-medium underline"
                    style={{ color: 'var(--product-accent)' }}
                  >
                    {promotion.decisionId}
                  </Link>
                ) : null}
              </td>

              <td className="py-2.5">
                <StateChip
                  label={STATUS_LABEL[promotion.status]}
                  tone={STATUS_TONE[promotion.status]}
                  muted={promotion.status === 'closed'}
                />
                <span className="mt-1 block text-delta tabular-nums text-neutral">
                  {formatDate(promotion.startDate)} a {formatDate(promotion.endDate)}
                </span>
                <span className="block text-delta text-neutral">
                  {END_LABEL[promotion.status]} {formatRelative(promotion.endDate)}
                </span>
              </td>

              <td className="py-2.5 text-right tabular-nums text-slate-600">
                {formatPercent(promotion.discountRate * 100, 0)}
              </td>

              <td className="py-2.5 text-right tabular-nums text-slate-900">
                {units(promotion.upliftUnits)}
              </td>

              <td className="py-2.5 text-right tabular-nums">
                <span className="block font-medium text-negative">
                  {units(promotion.cannibalizedUnits)}
                </span>
                <span className="block text-delta text-neutral">
                  {formatPercent(promotion.cannibalizationRatePercent)} do uplift
                </span>
              </td>

              <td className="py-2.5 text-right font-medium tabular-nums text-slate-900">
                {units(promotion.netUpliftUnits)}
              </td>

              <td className="py-2.5 text-right tabular-nums text-slate-600">
                {formatMoney(promotion.investmentBrl)}
                <PerimeterMark />
              </td>

              <td className="py-2.5 text-right tabular-nums text-slate-600">
                {formatPercent(promotion.grossRoiPercent)}
              </td>

              <td className="py-2.5 text-right">
                <RoiValue value={promotion.netRoiPercent} />
              </td>

              <td className="py-2.5">
                <StateChip
                  label={VERDICT_LABEL[promotion.verdict]}
                  tone={VERDICT_TONE[promotion.verdict]}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ErosionRow({ promotion }: { promotion: Promotion }) {
  const width = (value: number) => `${Math.min(100, (value / MARGIN_SCALE_BRL) * 100)}%`

  return (
    <li className="py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-delta-lg font-medium text-slate-900">{promotion.name}</p>
          <p className="mt-0.5 text-delta text-neutral">
            Volume retirado de {promotion.cannibalizedFrom}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StateChip
            label={VERDICT_LABEL[promotion.verdict]}
            tone={VERDICT_TONE[promotion.verdict]}
          />
          <span
            className="text-delta-lg font-semibold tabular-nums"
            style={{ color: semanticColor(toneForDelta(promotion.netMarginGainBrl)) }}
          >
            {formatMoneyFull(promotion.netMarginGainBrl)}
            <PerimeterMark />
          </span>
        </div>
      </div>

      <div className="mt-2.5 space-y-1.5">
        <div className="grid grid-cols-[136px_1fr_112px] items-center gap-3">
          <span className="text-delta text-neutral">Ganho de margem</span>
          <span className="block h-2.5 rounded-sm bg-slate-50">
            <span
              className="block h-2.5 rounded-sm"
              style={{
                width: width(promotion.grossMarginGainBrl),
                backgroundColor: semanticColor('positive'),
              }}
            />
          </span>
          <span className="text-right text-delta tabular-nums text-slate-700">
            {formatMoneyFull(promotion.grossMarginGainBrl)}
            <PerimeterMark />
          </span>
        </div>

        <div className="grid grid-cols-[136px_1fr_112px] items-center gap-3">
          <span className="text-delta text-neutral">Margem canibalizada</span>
          <span className="block h-2.5 rounded-sm bg-slate-50">
            <span
              className="block h-2.5 rounded-sm"
              style={{
                width: width(promotion.cannibalizedMarginBrl),
                backgroundColor: semanticColor('negative'),
              }}
            />
          </span>
          <span className="text-right text-delta tabular-nums text-slate-700">
            {formatMoneyFull(promotion.cannibalizedMarginBrl)}
            <PerimeterMark />
          </span>
        </div>
      </div>

      <p className="mt-2 text-delta text-neutral">
        A canibalização devolve {formatPercent(promotion.marginErosionPercent)} do ganho de margem ·
        ROI cai de {formatPercent(promotion.grossRoiPercent)} para{' '}
        {formatPercent(promotion.netRoiPercent)}
      </p>
    </li>
  )
}

function FunnelTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left">
        <thead>
          <tr className="border-b border-surface-border text-delta text-neutral">
            <th className="pb-2 font-medium">Estágio</th>
            <th className="pb-2 text-right font-medium">Valor</th>
            <th className="pb-2 text-right font-medium">Retenção do planejado</th>
            <th className="pb-2 text-right font-medium">Perda no estágio</th>
            <th className="pb-2 font-medium">Onde vaza</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {FUNNEL_STAGES.map((stage) => (
            <tr key={stage.id} className="text-delta-lg transition-colors hover:bg-slate-50">
              <td className="py-2.5">
                <span className="block font-medium text-slate-900">{stage.label}</span>
                <span className="block text-delta text-neutral">{stage.description}</span>
              </td>
              <td className="py-2.5 text-right font-semibold tabular-nums text-slate-900">
                {formatMoney(stage.valueBrl)}
                <PerimeterMark />
              </td>
              <td className="py-2.5 text-right tabular-nums text-slate-600">
                {formatPercent(stage.retentionPercent)}
              </td>
              <td className="py-2.5 text-right tabular-nums">
                {stage.lossFromPreviousBrl > 0 ? (
                  <span className="font-medium text-negative">
                    {formatMoney(stage.lossFromPreviousBrl)}
                    <PerimeterMark />
                  </span>
                ) : (
                  <span className="text-neutral">—</span>
                )}
              </td>
              <td className="py-2.5 text-delta text-neutral">{stage.leakReason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Recommendation() {
  const promotion = findPromotion(PROMOTION_RECOMMENDATION.promotionId)

  return (
    <div className="space-y-3">
      <p className="text-delta-lg font-medium text-slate-900">{PROMOTION_RECOMMENDATION.title}</p>
      <p className="text-delta-lg leading-relaxed text-slate-700">
        {PROMOTION_RECOMMENDATION.rationale}
      </p>

      {promotion ? (
        <p className="text-delta text-neutral">
          Verba envolvida: {formatMoney(promotion.investmentBrl)}
          <PerimeterMark /> · margem canibalizada de{' '}
          {formatMoney(promotion.cannibalizedMarginBrl)}
          <PerimeterMark /> contra ganho bruto de {formatMoney(promotion.grossMarginGainBrl)}
          <PerimeterMark />
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <StateChip
          label={`Confiança ${formatPercent(PROMOTION_RECOMMENDATION.confidencePercent, 0)}`}
          tone="attention"
        />
        <Link
          to={`/decisoes/${PROMOTION_RECOMMENDATION.decisionId}`}
          className="text-delta-lg font-medium underline"
          style={{ color: 'var(--product-accent)' }}
        >
          Ver decisão {PROMOTION_RECOMMENDATION.decisionId} →
        </Link>
        <FutureButton label="Write-back da verba promocional ao ERP" phase="Fase 3" />
      </div>
    </div>
  )
}

export function PromotionMonitor() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Monitor de promoções
        </h1>
        <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
          Uplift, canibalização e retorno de cada mecânica
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Uplift bruto no ciclo"
          value={units(TOTAL_UPLIFT_UNITS)}
          attestation={PROMOTION_ATTESTATION}
        />
        <KpiCard
          label="Uplift líquido de canibalização"
          value={units(TOTAL_NET_UPLIFT_UNITS)}
          delta={-PORTFOLIO_CANNIBALIZATION_RATE_PERCENT}
          deltaUnit="percent"
          comparison="do uplift volta como canibalização"
          attestation={PROMOTION_ATTESTATION}
        />
        <KpiCard
          label="ROI líquido da carteira"
          value={formatPercent(PORTFOLIO_NET_ROI_PERCENT)}
          delta={PORTFOLIO_ROI_GAP_POINTS}
          deltaUnit="points"
          comparison={`contra ${formatPercent(PORTFOLIO_GROSS_ROI_PERCENT)} antes da canibalização`}
          attestation={PROMOTION_ATTESTATION}
          size="lg"
        />
        <KpiCard
          label="Promoções que destroem valor"
          value={`${formatInteger(ERODING_PROMOTIONS.length)} de ${formatInteger(PROMOTIONS.length)}`}
          attestation={PROMOTION_ATTESTATION}
        />
      </div>

      <Panel
        title="Uplift, canibalização e ROI por promoção"
        description="O uplift é bruto; o retorno só fecha depois de devolver o volume tirado de outros SKUs da casa"
        footer={<DataBadge attestation={PROMOTION_ATTESTATION} variant="full" />}
      >
        <PromotionTable />
      </Panel>

      <Panel
        title="Quanto a canibalização devolve do ganho"
        description="Ganho de margem da mecânica contra a margem perdida nos SKUs canibalizados, na mesma escala"
        action={
          <span className="text-delta-lg font-semibold tabular-nums text-negative">
            {formatMoney(TOTAL_CANNIBALIZED_MARGIN_BRL)}
            <PerimeterMark />
          </span>
        }
        footer={
          <span>
            No agregado, {formatMoney(TOTAL_INVESTMENT_BRL)}
            <PerimeterMark /> de verba geram {formatMoney(TOTAL_GROSS_MARGIN_GAIN_BRL)}
            <PerimeterMark /> de margem bruta e {formatMoneyFull(TOTAL_NET_MARGIN_GAIN_BRL)}
            <PerimeterMark /> depois da canibalização — o sinal do retorno vira.
          </span>
        }
      >
        <ul className="divide-y divide-surface-border">
          {PROMOTIONS.map((promotion) => (
            <ErosionRow key={promotion.id} promotion={promotion} />
          ))}
        </ul>
      </Panel>

      <Panel
        title="Funil de verba: planejado, negociado, executado, comprovado"
        description="O que foi planejado raramente é o que foi comprovado. Cada degrau vermelho é o vazamento entre dois estágios"
        action={
          <span className="text-delta-lg font-semibold tabular-nums text-negative">
            {formatMoney(FUNNEL_TOTAL_LEAK_BRL)}
            <PerimeterMark /> de vazamento
          </span>
        }
        footer={<DataBadge attestation={FUNNEL_ATTESTATION} variant="full" />}
      >
        <div className="space-y-4">
          <WaterfallChart steps={FUNNEL_WATERFALL_STEPS} />
          <p className="text-delta text-neutral">{FUNNEL_WATERFALL_UNIT_LABEL}</p>
          <FunnelTable />
          <p className="text-delta-lg text-slate-700">
            De {formatMoney(FUNNEL_PLANNED_BRL)}
            <PerimeterMark /> planejados chegam {formatMoney(FUNNEL_PROVEN_BRL)}
            <PerimeterMark /> ao comprovado — {formatPercent(FUNNEL_PROVEN_RATE_PERCENT)} do plano,
            com {formatPercent(FUNNEL_LEAK_RATE_PERCENT)} perdidos no caminho. O maior vazamento
            isolado está na passagem para o estágio{' '}
            {FUNNEL_WORST_STAGE.label.toLowerCase()}, com{' '}
            {formatMoney(FUNNEL_WORST_STAGE.lossFromPreviousBrl)}
            <PerimeterMark /> — {FUNNEL_WORST_STAGE.leakReason.toLowerCase()}.
          </p>
        </div>
      </Panel>

      <Panel
        title="Recomendação"
        description="A recomendação referencia a decisão já aberta, em vez de abrir uma decisão paralela"
        footer={<DataBadge attestation={PROMOTION_RECOMMENDATION.attestation} />}
      >
        <Recommendation />
      </Panel>

      <PerimeterNote />
    </div>
  )
}
