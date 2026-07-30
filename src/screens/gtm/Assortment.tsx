import { Link } from 'react-router-dom'
import { DataBadge } from '../../components/DataBadge'
import { DegradedBanner } from '../../components/DegradedBanner'
import { FutureButton } from '../../components/FutureButton'
import { KpiCard } from '../../components/KpiCard'
import { Panel } from '../../components/Panel'
import { StateChip } from '../../components/StateChip'
import { formatDecimal, formatInteger, formatPercent } from '../../domain/format'
import { formatMoney, formatMoneyFull } from '../../domain/money'
import { formatDate } from '../../domain/today'
import { SEMANTIC } from '../../design/tokens'
import type { SemanticTone } from '../../design/tokens'
import {
  ASSORTMENT_ATTESTATION,
  DEGRADED_ATTESTATIONS,
  LAUNCH_ATTESTATION,
  LAUNCH_BOTTLENECK,
  LAUNCH_MAX_CUSTOMERS,
  LAUNCH_NOT_REPEATED,
  LAUNCH_NOT_REPEATED_IN_STOCKOUT,
  LAUNCH_NOT_REPEATED_IN_STOCKOUT_PERCENT,
  LAUNCH_SKU_NAME,
  LAUNCH_STAGES,
  LAUNCH_START_DATE,
  LAUNCH_TARGET_CUSTOMERS,
  KPI_COMPARISON,
  LAST_STOCKOUT,
  MIX_ATTESTATION,
  MIX_DECISION_LABEL,
  MIX_ENTRY_THRESHOLD_UNITS,
  MIX_HEADLINE,
  MIX_MAX_MONTHLY_UNITS,
  MIX_OUT_COUNT,
  NATIONAL_STOCKOUT_ATTESTATION,
  NATIONAL_STOCKOUT_DELTA_POINTS,
  NATIONAL_STOCKOUT_PERCENT,
  NE_STOCKOUT_DECISION_ID,
  NE_STOCKOUT_IMPACT_BRL,
  NUMERIC_DISTRIBUTION_ATTESTATION,
  NUMERIC_DISTRIBUTION_DELTA_POINTS,
  NUMERIC_DISTRIBUTION_PERCENT,
  OBSERVED_SHARE_PERCENT,
  OBSERVED_STORES,
  ORDER_ATTESTATION,
  ORDER_REASON_LABEL,
  ORDER_WRITE_BACK_LABEL,
  ORDER_WRITE_BACK_PHASE,
  OUTLET_PROFILES,
  SELL_OUT_BRL,
  SHORTER_ROWS_ABOVE_LAST,
  STOCKOUT_ATTESTATION,
  STOCKOUT_LOST_SALES_BRL,
  STOCKOUT_LOST_UNITS,
  STOCKOUT_ROWS,
  STOCKOUT_STORES_AFFECTED,
  SUGGESTED_ORDERS,
  SUGGESTED_ORDERS_TOTAL_BRL,
  SUGGESTED_ORDERS_TOTAL_UNITS,
  TOP_STOCKOUT,
  TURNOVER_WINDOW_END,
  TURNOVER_WINDOW_START,
  UNIVERSE_STORES,
  type LaunchStage,
  type MixLine,
  type OrderReason,
  type OutletProfile,
  type StockoutRow,
  type SuggestedOrder,
} from '../../mock/assortment'
import { findDecision } from '../../mock/decisions'

const REASON_TONE: Record<OrderReason, SemanticTone> = {
  restock: 'negative',
  enter_mix: 'positive',
  coverage: 'attention',
}

function formatUnits(value: number): string {
  return `${formatInteger(value)} un`
}

/* ------------------------------------------------------------------ */
/* 1. Mix ideal por perfil de PDV                                       */
/* ------------------------------------------------------------------ */

function TurnoverBar({ line }: { line: MixLine }) {
  const width = (line.monthlyUnitsPerStore / MIX_MAX_MONTHLY_UNITS) * 100
  const threshold = (MIX_ENTRY_THRESHOLD_UNITS / MIX_MAX_MONTHLY_UNITS) * 100
  const color = line.decision === 'in' ? SEMANTIC.positive : SEMANTIC.negative

  return (
    <span className="relative mt-1.5 block h-1.5 w-full rounded-full bg-slate-100">
      <span
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ width: `${Math.max(width, 1)}%`, backgroundColor: color }}
      />
      <span
        className="absolute -top-0.5 bottom-[-2px] w-px bg-slate-400"
        style={{ left: `${threshold}%` }}
        title={`Giro mínimo para entrar no mix: ${formatInteger(MIX_ENTRY_THRESHOLD_UNITS)} unidades por loja por mês`}
      />
    </span>
  )
}

function MixLineRow({ line }: { line: MixLine }) {
  const out = line.decision === 'out'

  return (
    <li
      className="py-2.5 pl-3"
      style={{
        borderLeftWidth: 3,
        borderLeftColor: out ? SEMANTIC.negative : SEMANTIC.positive,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`text-delta-lg ${out ? 'text-slate-600' : 'font-medium text-slate-900'}`}>
          {line.skuName}
        </p>
        <StateChip label={MIX_DECISION_LABEL[line.decision]} tone={out ? 'negative' : 'positive'} />
      </div>

      <div className="mt-1 flex items-baseline justify-between gap-2">
        <span
          className="text-delta-lg font-semibold tabular-nums"
          style={{ color: out ? SEMANTIC.negative : SEMANTIC.positive }}
        >
          {formatDecimal(line.monthlyUnitsPerStore, 0)} un/loja/mês
        </span>
        <span className="text-delta tabular-nums text-neutral">
          índice {formatInteger(line.turnoverIndex)}
        </span>
      </div>

      <TurnoverBar line={line} />

      <p className="mt-1.5 text-delta text-neutral">{line.rationale}</p>
    </li>
  )
}

function ProfileCard({ profile }: { profile: OutletProfile }) {
  return (
    <article className="flex h-full flex-col rounded-card border border-surface-border p-4">
      <header>
        <p className="text-delta-lg font-semibold text-slate-900">{profile.label}</p>
        <p className="mt-0.5 text-delta text-neutral">{profile.description}</p>
        <p className="mt-2 text-delta tabular-nums text-neutral">
          {formatInteger(profile.observedStores)} lojas observadas ·{' '}
          {formatInteger(profile.universeStores)} PDVs no universo
        </p>
        <p className="mt-1 text-delta font-medium text-slate-700">
          {formatInteger(profile.skusInMix)} de {formatInteger(profile.lines.length)} SKUs no mix
          recomendado
        </p>
      </header>

      <ul className="mt-3 flex-1 divide-y divide-surface-border">
        {profile.lines.map((line) => (
          <MixLineRow key={line.skuId} line={line} />
        ))}
      </ul>
    </article>
  )
}

/* ------------------------------------------------------------------ */
/* 2. Ruptura na ponta, priorizada                                      */
/* ------------------------------------------------------------------ */

function StockoutTableRow({ row, position }: { row: StockoutRow; position: number }) {
  const decision = row.decisionId ? findDecision(row.decisionId) : undefined

  return (
    <tr className="text-delta-lg align-top transition-colors hover:bg-slate-50">
      <td className="py-2.5 pr-2 tabular-nums text-neutral">{position}</td>

      <td className="py-2.5 pr-3">
        <span className="block font-medium text-slate-900">{row.accountName}</span>
        <span className="mt-0.5 block text-delta text-neutral">
          {row.scope} · {row.uf} · {row.profileLabel}
        </span>
        <span className="mt-0.5 block text-delta text-neutral">{row.cause}</span>
        {decision ? (
          <Link
            to={`/decisoes/${decision.id}`}
            className="mt-1 inline-block text-delta font-medium underline"
            style={{ color: 'var(--product-accent)' }}
          >
            {decision.id} · {decision.title}
          </Link>
        ) : null}
      </td>

      <td className="py-2.5 pr-3 text-slate-700">{row.skuName}</td>

      <td className="py-2.5 pr-3 text-right tabular-nums text-slate-900">
        {formatInteger(row.daysOut)}
      </td>

      <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">
        {formatInteger(row.storesAffected)}
      </td>

      <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">
        {formatUnits(row.lostUnits)}
      </td>

      <td className="py-2.5 text-right font-semibold tabular-nums text-negative">
        {formatMoneyFull(row.lostSalesBrl)}
      </td>
    </tr>
  )
}

function StockoutTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left">
        <thead>
          <tr className="border-b border-surface-border text-delta text-neutral">
            <th className="pb-2 pr-2 font-medium">#</th>
            <th className="pb-2 pr-3 font-medium">Rede / loja</th>
            <th className="pb-2 pr-3 font-medium">SKU</th>
            <th className="pb-2 pr-3 text-right font-medium">Dias em ruptura</th>
            <th className="pb-2 pr-3 text-right font-medium">Lojas afetadas</th>
            <th className="pb-2 pr-3 text-right font-medium">Unidades perdidas</th>
            <th className="pb-2 text-right font-medium">Venda perdida</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {STOCKOUT_ROWS.map((row, index) => (
            <StockoutTableRow key={row.id} row={row} position={index + 1} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StockoutFooter() {
  return (
    <div className="space-y-2">
      <p className="text-delta-lg text-slate-700">
        A fila é ordenada por venda perdida, não por dias em ruptura nem por nome da conta.{' '}
        {LAST_STOCKOUT && TOP_STOCKOUT ? (
          <>
            A última linha, {LAST_STOCKOUT.accountName}, está em ruptura há{' '}
            {formatInteger(LAST_STOCKOUT.daysOut)} dias — mais tempo que{' '}
            {formatInteger(SHORTER_ROWS_ABOVE_LAST)} das rupturas acima dela — e vale{' '}
            {formatMoneyFull(LAST_STOCKOUT.lostSalesBrl)}. O topo da fila,{' '}
            {TOP_STOCKOUT.accountName}, vale {formatMoneyFull(TOP_STOCKOUT.lostSalesBrl)}: é o giro
            medido e o número de lojas que decidem a ordem, não o calendário.
          </>
        ) : null}
      </p>
      <p className="text-delta-lg text-slate-700">
        As {formatInteger(STOCKOUT_ROWS.length)} rupturas somam{' '}
        {formatUnits(STOCKOUT_LOST_UNITS)} e {formatMoneyFull(STOCKOUT_LOST_SALES_BRL)} em{' '}
        {formatInteger(STOCKOUT_STORES_AFFECTED)} lojas medidas. O diagnóstico nacional dimensiona{' '}
        {formatMoney(NE_STOCKOUT_IMPACT_BRL)} de impacto no Nordeste — a diferença é o universo que
        não tem leitura direta, e está registrada em{' '}
        <Link
          to={`/decisoes/${NE_STOCKOUT_DECISION_ID}`}
          className="font-medium underline"
          style={{ color: 'var(--product-accent)' }}
        >
          {NE_STOCKOUT_DECISION_ID}
        </Link>
        .
      </p>
      <DataBadge attestation={STOCKOUT_ATTESTATION} variant="full" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 3. Pedido sugerido por cliente                                       */
/* ------------------------------------------------------------------ */

function OrderCard({ order }: { order: SuggestedOrder }) {
  return (
    <article className="flex h-full flex-col rounded-card border border-surface-border p-4">
      <header>
        <p className="text-delta-lg font-semibold text-slate-900">{order.customerName}</p>
        <p className="mt-0.5 text-delta text-neutral">
          {order.profileLabel} · {order.uf} · {formatInteger(order.storeCount)} lojas
        </p>
      </header>

      <ul className="mt-3 flex-1 divide-y divide-surface-border">
        {order.lines.map((line) => (
          <li key={`${order.id}-${line.skuId}-${line.reason}`} className="py-2.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-delta-lg font-medium text-slate-900">{line.skuName}</p>
              <StateChip label={ORDER_REASON_LABEL[line.reason]} tone={REASON_TONE[line.reason]} />
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <span className="text-delta-lg tabular-nums text-slate-700">
                {formatUnits(line.units)}
              </span>
              <span className="text-delta-lg font-semibold tabular-nums text-slate-900">
                {formatMoneyFull(line.amountBrl)}
              </span>
            </div>
            <p className="mt-1 text-delta text-neutral">{line.note}</p>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex items-baseline justify-between gap-2 border-t border-surface-border pt-2.5">
        <span className="text-delta-lg font-medium text-slate-700">
          Total · {formatUnits(order.totalUnits)}
        </span>
        <span className="text-delta-lg font-semibold tabular-nums text-slate-900">
          {formatMoneyFull(order.totalBrl)}
        </span>
      </div>

      {order.excludedSkus.length > 0 ? (
        <div
          className="mt-3 rounded-control px-3 py-2"
          style={{ backgroundColor: `${SEMANTIC.negative}0F` }}
        >
          <p className="text-delta font-semibold uppercase tracking-wide text-neutral">
            Fora do pedido, de propósito
          </p>
          <ul className="mt-1 space-y-0.5">
            {order.excludedSkus.map((sku) => (
              <li key={sku.skuId} className="text-delta text-slate-700">
                {sku.skuName} — giro de {formatDecimal(sku.monthlyUnitsPerStore, 0)} un/loja/mês,
                abaixo do mínimo de {formatInteger(MIX_ENTRY_THRESHOLD_UNITS)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-3 border-t border-surface-border pt-2.5">
        <DataBadge attestation={order.attestation} />
      </div>
    </article>
  )
}

/* ------------------------------------------------------------------ */
/* 4. Acompanhamento de lançamento                                      */
/* ------------------------------------------------------------------ */

function LaunchStageRow({ stage, position }: { stage: LaunchStage; position: number }) {
  const bottleneck = LAUNCH_BOTTLENECK?.id === stage.id
  const width = (stage.customers / LAUNCH_MAX_CUSTOMERS) * 100
  const color = bottleneck ? SEMANTIC.attention : SEMANTIC.neutral

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className="text-delta tabular-nums text-neutral">{position}</span>
          <span className="text-delta-lg font-medium text-slate-900">{stage.label}</span>
          {bottleneck ? <StateChip label="Trava do funil" tone="attention" /> : null}
        </span>
        <span className="text-delta-lg font-semibold tabular-nums text-slate-900">
          {formatInteger(stage.customers)} clientes
        </span>
      </div>

      <span className="mt-2 block h-6 w-full rounded-sm bg-slate-50">
        <span
          className="block h-6 rounded-sm"
          style={{ width: `${Math.max(width, 1)}%`, backgroundColor: color }}
        />
      </span>

      <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-delta text-neutral">{stage.description}</span>
        <span className="text-delta tabular-nums text-neutral">
          <span
            className="font-semibold"
            style={{ color: bottleneck ? SEMANTIC.attention : SEMANTIC.neutral }}
          >
            {formatPercent(stage.conversionPercent)}
          </span>{' '}
          do estágio anterior · {formatInteger(stage.droppedCustomers)} clientes não avançaram
        </span>
      </div>
    </li>
  )
}

function LaunchFunnel() {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-surface-border pb-3">
        <span className="text-delta-lg font-medium text-slate-900">
          Base-alvo do lançamento
        </span>
        <span className="text-delta-lg font-semibold tabular-nums text-slate-900">
          {formatInteger(LAUNCH_TARGET_CUSTOMERS)} clientes
        </span>
      </div>

      <ol className="divide-y divide-surface-border">
        {LAUNCH_STAGES.map((stage, index) => (
          <LaunchStageRow key={stage.id} stage={stage} position={index + 1} />
        ))}
      </ol>
    </div>
  )
}

function LaunchFooter() {
  return (
    <div className="space-y-2">
      {LAUNCH_BOTTLENECK ? (
        <p className="text-delta-lg text-slate-700">
          O funil trava na {LAUNCH_BOTTLENECK.label.toLowerCase()}:{' '}
          {formatPercent(LAUNCH_BOTTLENECK.conversionPercent)} de conversão contra o estágio
          anterior. {formatInteger(LAUNCH_NOT_REPEATED)} clientes compraram uma vez e não
          repetiram o pedido.
        </p>
      ) : null}
      <p className="text-delta-lg text-slate-700">
        Desses, {formatInteger(LAUNCH_NOT_REPEATED_IN_STOCKOUT)} (
        {formatPercent(LAUNCH_NOT_REPEATED_IN_STOCKOUT_PERCENT)}) estavam em ruptura do SKU no
        período. A trava não é de demanda, é de disponibilidade — e é o pedido sugerido acima que a
        resolve.
      </p>
      <DataBadge attestation={LAUNCH_ATTESTATION} variant="full" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Tela                                                                 */
/* ------------------------------------------------------------------ */

export function Assortment() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Sortimento e disponibilidade
        </h1>
        <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
          Não faz sentido oferecer todo o portfólio para todos os clientes
        </p>
        <p className="mt-1 text-delta-lg text-neutral">
          O mix deixa de ser opinião do representante e passa a sair do giro medido na loja:{' '}
          {formatInteger(OBSERVED_STORES)} lojas com leitura direta de sell-out dentro de um
          universo de {formatInteger(UNIVERSE_STORES)} PDVs ({formatPercent(OBSERVED_SHARE_PERCENT)}{' '}
          observados), na janela de {formatDate(TURNOVER_WINDOW_START)} a{' '}
          {formatDate(TURNOVER_WINDOW_END)}.
        </p>
        <p className="mt-2">
          <DataBadge attestation={ASSORTMENT_ATTESTATION} variant="full" />
        </p>
      </div>

      <DegradedBanner
        attestations={DEGRADED_ATTESTATIONS}
        consequence="A leitura de listagem das grandes redes está parada: o funil de lançamento segue na tela com confiança reduzida no primeiro estágio."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Ruptura estimada nacional"
          value={formatPercent(NATIONAL_STOCKOUT_PERCENT)}
          delta={NATIONAL_STOCKOUT_DELTA_POINTS}
          deltaUnit="points"
          deltaInverted
          comparison={KPI_COMPARISON}
          attestation={NATIONAL_STOCKOUT_ATTESTATION}
          size="lg"
        />
        <KpiCard
          label="Distribuição numérica"
          value={formatPercent(NUMERIC_DISTRIBUTION_PERCENT)}
          delta={NUMERIC_DISTRIBUTION_DELTA_POINTS}
          deltaUnit="points"
          comparison={KPI_COMPARISON}
          attestation={NUMERIC_DISTRIBUTION_ATTESTATION}
        />
        <KpiCard
          label="Venda perdida por ruptura no recorte"
          value={formatMoneyFull(STOCKOUT_LOST_SALES_BRL)}
          attestation={STOCKOUT_ATTESTATION}
        />
        <KpiCard
          label="Sell-out do período"
          value={formatMoney(SELL_OUT_BRL)}
          attestation={MIX_ATTESTATION}
        />
      </div>

      <Panel
        title="Mix ideal por perfil de PDV"
        description="O giro real de cada SKU em cada perfil decide quem entra na gôndola e quem fica de fora"
        action={
          <span className="inline-flex items-center gap-1.5 rounded-control border border-surface-border px-2.5 py-1 text-delta">
            <span className="text-neutral">Giro mínimo para entrar:</span>
            <span className="font-medium tabular-nums text-slate-900">
              {formatInteger(MIX_ENTRY_THRESHOLD_UNITS)} un/loja/mês
            </span>
          </span>
        }
        footer={
          <div className="space-y-2">
            <p className="text-delta-lg text-slate-700">{MIX_HEADLINE}</p>
            <p className="text-delta-lg text-slate-700">
              O índice compara o giro do SKU no perfil com a média do próprio SKU em todos os
              perfis. Onde a barra não alcança o traço, a recomendação é não oferecer:{' '}
              {formatInteger(MIX_OUT_COUNT)} recomendações de saída, com o mesmo peso das de
              entrada.
            </p>
            <DataBadge attestation={MIX_ATTESTATION} variant="full" />
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {OUTLET_PROFILES.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} />
          ))}
        </div>
      </Panel>

      <Panel
        title="Ruptura na ponta, priorizada"
        description="Ordenada por venda perdida estimada, do maior impacto para o menor"
        action={
          <span className="text-delta-lg font-semibold tabular-nums text-negative">
            {formatMoneyFull(STOCKOUT_LOST_SALES_BRL)}
          </span>
        }
        footer={<StockoutFooter />}
      >
        <StockoutTable />
      </Panel>

      <Panel
        title="Pedido sugerido por cliente"
        description="Cada linha traz o motivo que a sustenta — e o que ficou de fora traz o giro que justifica a exclusão"
        action={<FutureButton label={ORDER_WRITE_BACK_LABEL} phase={ORDER_WRITE_BACK_PHASE} />}
        footer={
          <div className="space-y-2">
            <p className="text-delta-lg text-slate-700">
              Os {formatInteger(SUGGESTED_ORDERS.length)} pedidos somam{' '}
              {formatUnits(SUGGESTED_ORDERS_TOTAL_UNITS)} e{' '}
              {formatMoneyFull(SUGGESTED_ORDERS_TOTAL_BRL)}. Nenhum SKU fora do mix do perfil entra
              em pedido: a mesma regra de giro que monta o sortimento define a quantidade.
            </p>
            <DataBadge attestation={ORDER_ATTESTATION} variant="full" />
          </div>
        }
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {SUGGESTED_ORDERS.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      </Panel>

      <Panel
        title="Acompanhamento de lançamento"
        description={`${LAUNCH_SKU_NAME} · listagem, primeira compra e recompra desde ${formatDate(LAUNCH_START_DATE)}`}
        footer={<LaunchFooter />}
      >
        <LaunchFunnel />
      </Panel>
    </div>
  )
}
