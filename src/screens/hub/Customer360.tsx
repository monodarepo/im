import { Link } from 'react-router-dom'
import { ConfidenceMeter } from '../../components/ConfidenceMeter'
import { DataBadge } from '../../components/DataBadge'
import { DegradedBanner } from '../../components/DegradedBanner'
import { FutureButton } from '../../components/FutureButton'
import { Panel } from '../../components/Panel'
import { SemanticDelta } from '../../components/SemanticDelta'
import { StateChip } from '../../components/StateChip'
import { UF_NAME } from '../../assets/brazil-uf'
import { formatDecimal, formatInteger, formatPercent, formatPointsDelta } from '../../domain/format'
import { formatMoney, formatMoneyFull } from '../../domain/money'
import { SEMANTIC, semanticColor, type SemanticTone } from '../../design/tokens'
import {
  ACCOUNT_KIND_LABEL,
  ACCOUNTS,
  accountCoverageGap,
  ALERT_POINTS_OF_SALE,
  ALERT_STOCKOUT_DELTA_POINTS,
  ALERT_STOCKOUT_PERCENT,
  ALERT_STOCKOUT_SPREAD_POINTS,
  ANOMALY_ACCOUNT,
  ANOMALY_ATTESTATION,
  ANOMALY_BASELINE_SELL_IN_BRL,
  ANOMALY_EVIDENCE,
  ANOMALY_EXCESS_BRL,
  ANOMALY_OUT_OF_AREA_UFS,
  ANOMALY_SELL_IN_MULTIPLE,
  ANOMALY_SUMMARY,
  CHANNEL_TIERS,
  COVERAGE_GAP_DAYS,
  DC_TIER,
  DEGRADED_ATTESTATIONS,
  EXPLAINED_GAP_BRL,
  GAP_CAUSES,
  NATIONAL_STOCKOUT_PERCENT,
  RECONCILIATION_ATTESTATION,
  RECONCILIATION_GAP_BRL,
  RECONCILIATION_GAP_PERCENT,
  RECONCILIATION_STEPS,
  STOCKOUT_DECISION_ID,
  STOCKOUT_IMPACT_BRL,
  STORE_TIER,
  TOTAL_POINTS_OF_SALE,
  UNEXPLAINED_RESIDUAL_BRL,
  UNEXPLAINED_RESIDUAL_PERCENT,
  type AnomalyEvidence,
  type ChannelTier,
} from '../../mock/customers'

function formatDays(days: number, decimals = 1): string {
  return `${formatDecimal(days, decimals)} dias`
}

/** Abaixo da faixa é ruptura iminente; acima é capital parado; dentro é saúde. */
function coverageTone(days: number, min: number, max: number): SemanticTone {
  if (days < min) return 'negative'
  if (days > max) return 'attention'
  return 'positive'
}

// ---------------------------------------------------------------------------
// 1. Cruzamento CD × loja
// ---------------------------------------------------------------------------

function TierCard({ tier }: { tier: ChannelTier }) {
  const tone = coverageTone(tier.coverageDays, tier.targetMinDays, tier.targetMaxDays)
  const color = semanticColor(tone)

  return (
    <article
      className="rounded-card border bg-surface-card p-5"
      style={{ borderColor: `${color}59`, backgroundColor: `${color}0A` }}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-delta-lg font-medium text-neutral">{tier.label}</h3>
        <StateChip label={tier.statusLabel} tone={tone} />
      </div>

      <p className="mt-2 text-kpi-lg tabular-nums" style={{ color }}>
        {formatDays(tier.coverageDays)}
      </p>

      <p className="mt-1">
        <SemanticDelta
          value={tier.coverageDeltaPercent}
          unit="percent"
          comparison="vs. período anterior"
        />
      </p>

      <p className="mt-2 text-delta text-neutral">
        {tier.description} · faixa alvo {tier.targetMinDays} a {tier.targetMaxDays} dias
      </p>

      <div className="mt-3 border-t border-surface-border pt-3">
        <DataBadge attestation={tier.attestation} />
      </div>
    </article>
  )
}

function AccountsTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left">
        <thead>
          <tr className="border-b border-surface-border text-delta text-neutral">
            <th className="pb-2 font-medium">Conta</th>
            <th className="pb-2 text-right font-medium">Pontos de venda</th>
            <th className="pb-2 text-right font-medium">DDE no CD</th>
            <th className="pb-2 text-right font-medium">DDE na loja</th>
            <th className="pb-2 text-right font-medium">Vão</th>
            <th className="pb-2 text-right font-medium">Ruptura na loja</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {ACCOUNTS.map((account) => {
            const dcTone = coverageTone(
              account.dcCoverageDays,
              DC_TIER.targetMinDays,
              DC_TIER.targetMaxDays,
            )
            const storeTone = coverageTone(
              account.storeCoverageDays,
              STORE_TIER.targetMinDays,
              STORE_TIER.targetMaxDays,
            )

            return (
              <tr key={account.id} className="text-delta-lg transition-colors hover:bg-slate-50">
                <td className="py-2.5">
                  <span className="font-medium text-slate-900">{account.name}</span>
                  <span className="ml-2 text-delta text-neutral">
                    {ACCOUNT_KIND_LABEL[account.kind]} · {UF_NAME[account.uf]}
                  </span>
                </td>
                <td className="py-2.5 text-right tabular-nums text-slate-600">
                  {formatInteger(account.pointsOfSale)}
                </td>
                <td
                  className="py-2.5 text-right font-medium tabular-nums"
                  style={{ color: semanticColor(dcTone) }}
                >
                  {formatDays(account.dcCoverageDays, 0)}
                </td>
                <td
                  className="py-2.5 text-right font-medium tabular-nums"
                  style={{ color: semanticColor(storeTone) }}
                >
                  {formatDays(account.storeCoverageDays)}
                </td>
                <td className="py-2.5 text-right tabular-nums text-neutral">
                  {formatDays(accountCoverageGap(account))}
                </td>
                <td className="py-2.5 text-right">
                  <span className="tabular-nums text-slate-900">
                    {formatPercent(account.storeStockoutPercent)}
                  </span>
                  <span className="ml-2">
                    <SemanticDelta
                      value={account.storeStockoutDeltaPoints}
                      unit="points"
                      inverted
                      size="sm"
                    />
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function CrossReadingFooter() {
  return (
    <div className="space-y-2">
      <p className="text-delta-lg text-slate-700">
        O vão médio entre os dois elos é de {formatDays(COVERAGE_GAP_DAYS)}: há estoque suficiente no
        centro de distribuição para {formatDays(DC_TIER.coverageDays)} de venda enquanto a gôndola
        opera com {formatDays(STORE_TIER.coverageDays)}. Não é falta de produto, é produto parado no
        elo errado.
      </p>
      <p className="text-delta-lg text-slate-700">
        Nas contas em alerta — {formatInteger(ALERT_POINTS_OF_SALE)} dos{' '}
        {formatInteger(TOTAL_POINTS_OF_SALE)} pontos de venda do recorte — a ruptura na loja está em{' '}
        {formatPercent(ALERT_STOCKOUT_PERCENT)} ({formatPointsDelta(ALERT_STOCKOUT_DELTA_POINTS)}),{' '}
        {formatPointsDelta(ALERT_STOCKOUT_SPREAD_POINTS)} acima da ruptura estimada nacional de{' '}
        {formatPercent(NATIONAL_STOCKOUT_PERCENT)}. O impacto de {formatMoney(STOCKOUT_IMPACT_BRL)}{' '}
        já está dimensionado em{' '}
        <Link
          to={`/decisoes/${STOCKOUT_DECISION_ID}`}
          className="font-medium underline"
          style={{ color: 'var(--product-accent)' }}
        >
          {STOCKOUT_DECISION_ID}
        </Link>
        .
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 2. Reconciliação sell-in × sell-out × estoque
// ---------------------------------------------------------------------------

function ReconciliationTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left">
        <thead>
          <tr className="border-b border-surface-border text-delta text-neutral">
            <th className="pb-2 font-medium">Linha</th>
            <th className="pb-2 text-right font-medium">Valor</th>
            <th className="pb-2 text-right font-medium">Procedência</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {RECONCILIATION_STEPS.map((step) => {
            const isGap = step.id === 'gap'

            return (
              <tr
                key={step.id}
                className={`text-delta-lg ${step.closing ? 'bg-slate-50/70' : ''}`}
              >
                <td className="py-2.5 pr-4">
                  <span
                    className={
                      step.closing ? 'font-semibold text-slate-900' : 'font-medium text-slate-900'
                    }
                  >
                    {step.label}
                  </span>
                  <span className="block text-delta text-neutral">{step.description}</span>
                </td>
                <td
                  className={`py-2.5 text-right tabular-nums text-slate-900 ${
                    step.closing ? 'font-semibold' : 'font-medium'
                  }`}
                  {...(isGap ? { style: { color: SEMANTIC.negative } } : {})}
                >
                  {formatMoneyFull(step.valueBrl)}
                </td>
                <td className="py-2.5 text-right">
                  <DataBadge attestation={step.attestation} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function GapExplanation() {
  return (
    <div className="mt-4 space-y-3">
      <ul className="divide-y divide-surface-border rounded-card border border-surface-border">
        {GAP_CAUSES.map((cause) => (
          <li key={cause.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-delta-lg font-medium text-slate-900">{cause.label}</p>
              <p className="mt-0.5 text-delta text-neutral">{cause.note}</p>
              <div className="mt-1.5">
                <DataBadge attestation={cause.attestation} />
              </div>
            </div>
            <div className="text-right">
              <p
                className="text-delta-lg font-semibold tabular-nums"
                style={{ color: cause.explained ? SEMANTIC.neutral : SEMANTIC.attention }}
              >
                {formatMoney(cause.amountBrl)}
              </p>
              <div className="mt-1">
                <StateChip
                  label={cause.explained ? 'Explicado' : 'Sem origem'}
                  tone={cause.explained ? 'neutral' : 'attention'}
                  muted={cause.explained}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="text-delta-lg leading-relaxed text-slate-700">
        A diferença de {formatMoney(Math.abs(RECONCILIATION_GAP_BRL))} equivale a{' '}
        {formatPercent(RECONCILIATION_GAP_PERCENT)} do sell-in do período.{' '}
        {formatMoney(EXPLAINED_GAP_BRL)} têm origem conhecida — cobertura parcial do painel de leitura
        e defasagem entre as capturas. Sobram {formatMoney(UNEXPLAINED_RESIDUAL_BRL)}, ou{' '}
        {formatPercent(UNEXPLAINED_RESIDUAL_PERCENT)} do sell-in, sem nenhuma leitura de ponta que os
        explique. É esse resíduo que sustenta o alerta abaixo.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 3. Anomalia de canal paralelo
// ---------------------------------------------------------------------------

function formatEvidenceValue(evidence: AnomalyEvidence): string {
  switch (evidence.format) {
    case 'money':
      return formatMoney(evidence.value)
    case 'percent':
      return formatPercent(evidence.value)
    case 'days':
      return formatDays(evidence.value, 0)
    case 'integer':
      return formatInteger(evidence.value)
  }
}

function AnomalyAlert() {
  const outOfAreaUfs = ANOMALY_OUT_OF_AREA_UFS.map((uf) => UF_NAME[uf]).join(', ')

  return (
    <div className="space-y-4">
      <div
        className="rounded-card border px-4 py-3"
        style={{
          borderColor: `${SEMANTIC.attention}66`,
          backgroundColor: `${SEMANTIC.attention}0F`,
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <StateChip label="Anomalia de canal paralelo" tone="attention" />
          <span className="text-delta-lg font-medium text-slate-900">
            {ANOMALY_ACCOUNT ? ANOMALY_ACCOUNT.name : 'Conta não identificada'}
            {ANOMALY_ACCOUNT ? ` · ${UF_NAME[ANOMALY_ACCOUNT.uf]}` : ''}
          </span>
          <span className="ml-auto">
            <ConfidenceMeter confidence={ANOMALY_ATTESTATION.confidence} showLabel />
          </span>
        </div>

        <p className="mt-2 text-delta-lg leading-relaxed text-slate-700">{ANOMALY_SUMMARY}</p>

        <p className="mt-2 text-delta-lg leading-relaxed text-slate-700">
          O sell-in da conta ficou {formatDecimal(ANOMALY_SELL_IN_MULTIPLE, 1)}x acima da média de{' '}
          {formatMoney(ANOMALY_BASELINE_SELL_IN_BRL)} das doze semanas anteriores —{' '}
          {formatMoney(ANOMALY_EXCESS_BRL)} de excedente. Lotes da conta foram identificados em{' '}
          {outOfAreaUfs}, fora da área contratada.
        </p>
      </div>

      <ul className="divide-y divide-surface-border">
        {ANOMALY_EVIDENCE.map((evidence) => (
          <li key={evidence.id} className="flex flex-wrap items-start gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-delta-lg font-medium text-slate-900">{evidence.label}</p>
              <p className="mt-0.5 text-delta text-neutral">{evidence.detail}</p>
              <div className="mt-1.5">
                <DataBadge attestation={evidence.attestation} />
              </div>
            </div>
            <div className="text-right">
              <p className="text-delta-lg font-semibold tabular-nums text-slate-900">
                {formatEvidenceValue(evidence)}
              </p>
              {evidence.delta !== undefined ? (
                <p className="mt-0.5">
                  <SemanticDelta
                    value={evidence.delta}
                    size="sm"
                    {...(evidence.deltaUnit ? { unit: evidence.deltaUnit } : {})}
                    {...(evidence.deltaInverted ? { inverted: true } : {})}
                  />
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------------------

export function Customer360() {
  return (
    <div className="space-y-5">
      <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Cliente e canal 360°
      </h1>

      <DegradedBanner
        attestations={DEGRADED_ATTESTATIONS}
        consequence="A leitura de ponta das grandes redes está parada, então o DDE de loja entra com confiança baixa. O cruzamento segue operável: o contraste com o centro de distribuição não depende da precisão do decimal."
      />

      <Panel
        title="Cruzamento CD × loja"
        description="O mesmo estoque visto nos dois elos da cadeia, em dias de cobertura (DDE)"
        footer={<CrossReadingFooter />}
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {CHANNEL_TIERS.map((tier) => (
              <TierCard key={tier.id} tier={tier} />
            ))}
          </div>

          <AccountsTable />
        </div>
      </Panel>

      <Panel
        title="Reconciliação sell-in × sell-out × estoque"
        description="O que saiu da fábrica, o que ficou no canal e o que a gôndola registrou"
        footer={<DataBadge attestation={RECONCILIATION_ATTESTATION} variant="full" />}
      >
        <ReconciliationTable />
        <GapExplanation />
      </Panel>

      <Panel
        title="Alerta de anomalia de canal"
        description="Detecção aberta, com a evidência que a sustenta"
        action={
          <FutureButton label="Abrir investigação com a conta" phase="Fase 2" />
        }
        footer={
          <div className="flex flex-wrap items-center gap-3">
            <DataBadge attestation={ANOMALY_ATTESTATION} />
            <span className="ml-auto">
              <FutureButton label="Bloquear pedido no ERP" phase="Fase 3" />
            </span>
          </div>
        }
      >
        <AnomalyAlert />
      </Panel>
    </div>
  )
}
