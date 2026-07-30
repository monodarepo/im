import { Link } from 'react-router-dom'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { DataBadge } from '../../components/DataBadge'
import { DegradedBanner } from '../../components/DegradedBanner'
import { FutureButton } from '../../components/FutureButton'
import { KpiCard } from '../../components/KpiCard'
import { Panel } from '../../components/Panel'
import { StateChip } from '../../components/StateChip'
import { SEMANTIC, type SemanticTone } from '../../design/tokens'
import { formatDecimal, formatInteger, formatPercent } from '../../domain/format'
import { formatMoney, formatMoneyFull } from '../../domain/money'
import { formatDate, formatRelative } from '../../domain/today'
import {
  AT_RISK_LOTS,
  BLOCKED_LOT,
  daysToExpiry,
  EXPIRY_WINDOWS,
  HOLDER_KIND_LABEL,
  INVENTORY_ATTESTATION,
  LOGISTICS_ATTESTATION,
  LOT_STATUS_LABEL,
  LOTS,
  lotStatus,
  riskWindowStart,
  STOCKOUT_SOURCE_ROUTE,
  TOTAL_UNITS,
  TOTAL_UNITS_AT_RISK,
  TOTAL_VALUE_AT_RISK_BRL,
  TOTAL_VIRTUAL_ON_HAND,
  TOTAL_VIRTUAL_STALE,
  unitsAtRisk,
  valueAtRiskBrl,
  VIRTUAL_STOCK,
  type Lot,
  type LotStatus,
} from '../../mock/agInventory'
import { findDecision } from '../../mock/decisions'
import {
  AT_RISK_SHARE_PERCENT,
  AVERAGE_TRANSIT_DAYS,
  BALANCE_BY_HOLDER_KIND,
  BALANCE_BY_REGION,
  BALANCE_SERIES,
  BLOCKED_HELD_DAYS,
  BLOCKED_SINCE,
  CRITICAL_LOTS,
  DEGRADED_ATTESTATIONS,
  FIELD_CYCLE_DAYS,
  FIELD_STOCK_ATTESTATION,
  LANE_STATUS_LABEL,
  LANES_OVER_SLA,
  laneStatus,
  MOVEMENT_ATTESTATION,
  MOVEMENT_KIND_LABEL,
  MOVEMENTS,
  REDISTRIBUTION_ROUTE,
  staleSharePercent,
  TOTAL_IN_TRANSIT_UNITS,
  TOTAL_VIRTUAL_DELIVERED,
  TRANSFER_DECISION_ID,
  TRANSIT_ATTESTATION,
  TRANSIT_LANES,
  UNITS_AT_RISK_DELTA_PERCENT,
  VALUE_AT_RISK_DELTA_BRL,
  VIRTUAL_STALE_SHARE_PERCENT,
  type LaneStatus,
} from '../../mock/inventoryFlows'

/**
 * Estoque e Logística (AG, módulo 4.5).
 *
 * A tela responde três perguntas na ordem em que o estoque as impõe: onde a
 * amostra está, quanto tempo ela ainda tem e o que a impede de andar. O lote
 * retido no Nordeste é o caso em que as três se encontram — ele está parado por
 * uma decisão tomada em outra tela, e a saída dele também está.
 */

const LOT_STATUS_TONE: Record<LotStatus, SemanticTone> = {
  at_risk: 'negative',
  watch: 'attention',
  healthy: 'neutral',
}

const LANE_STATUS_TONE: Record<LaneStatus, SemanticTone> = {
  on_time: 'positive',
  late: 'negative',
  held: 'attention',
}

const BALANCE_COLOR = '#94A3B8'

function lotOfHolder(holderId: string): Lot | undefined {
  return LOTS.find((lot) => lot.holderId === holderId)
}

/**
 * O lote que o bloqueio de ruptura deixou parado.
 *
 * Fica acima de tudo porque é o único item da tela cuja solução não está nela:
 * a causa veio do HUB, a saída está na Redistribuição.
 */
function BlockedLotSpotlight({ lot }: { lot: Lot }) {
  const decision = findDecision(TRANSFER_DECISION_ID)
  const days = daysToExpiry(lot)

  return (
    <div
      role="status"
      className="rounded-card border px-5 py-4"
      style={{ borderColor: `${SEMANTIC.negative}66`, backgroundColor: `${SEMANTIC.negative}0D` }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-delta-lg font-semibold text-slate-900">
            {lot.batchCode} · {formatInteger(lot.units)} unidades paradas na {lot.holderName}
          </p>
          <p className="mt-1 text-delta-lg text-slate-700">
            {lot.skuName}. Vence em {formatDate(lot.expiresOn)} — {formatRelative(lot.expiresOn)}.
            Cruzou {formatRelative(riskWindowStart(lot))} o limite dos últimos{' '}
            {EXPIRY_WINDOWS.riskDays} dias de validade e não registra nenhuma saída desde{' '}
            {formatDate(BLOCKED_SINCE)}.
          </p>
          <p className="mt-2 text-delta-lg text-slate-700">
            Está parado porque o Otimizador de Alocação bloqueou o Nordeste por ruptura: não se
            estimula demanda onde o produto não está na prateleira. Enquanto o bloqueio vale, a
            filial não expede e o lote envelhece — {formatInteger(unitsAtRisk(lot))} unidades sem
            consumo previsto, {formatMoneyFull(valueAtRiskBrl(lot))} em risco.
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <StateChip label={`Parado há ${BLOCKED_HELD_DAYS} dias`} tone="negative" />
          <StateChip label={`${days} dias até vencer`} tone="attention" />
          <Link
            to={STOCKOUT_SOURCE_ROUTE}
            className="text-delta-lg font-medium underline"
            style={{ color: 'var(--product-accent)' }}
          >
            Ver o diagnóstico de ruptura no HUB →
          </Link>
        </div>
      </div>

      <div
        className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3"
        style={{ borderColor: `${SEMANTIC.negative}33` }}
      >
        <p className="text-delta-lg text-slate-700">
          A Redistribuição Inteligente já tem uma sugestão de transferência para este lote: levá-lo
          a uma região com giro antes que a validade decida por nós.
          {decision ? (
            <>
              {' '}
              A transferência entra em{' '}
              <Link
                to={`/decisoes/${decision.id}`}
                className="font-medium underline"
                style={{ color: 'var(--product-accent)' }}
              >
                {decision.id} — {decision.title}
              </Link>
              .
            </>
          ) : null}
        </p>

        <Link
          to={REDISTRIBUTION_ROUTE}
          className="shrink-0 rounded-control px-3 py-1.5 text-delta-lg font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--product-accent)' }}
        >
          Abrir a Redistribuição Inteligente →
        </Link>
      </div>
    </div>
  )
}

function HolderKindBalances() {
  return (
    <div className="space-y-4">
      {BALANCE_BY_HOLDER_KIND.map((row) => (
        <div key={row.kind}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-delta-lg font-medium text-slate-900">
              {row.label}
              <span className="ml-2 text-delta font-normal text-neutral">
                {formatInteger(row.holders)} {row.holders === 1 ? 'detentor' : 'detentores'} ·{' '}
                {row.regions.join(', ')}
              </span>
            </span>
            <span className="text-delta-lg font-semibold tabular-nums text-slate-900">
              {formatInteger(row.units)}
              <span className="ml-1.5 text-delta font-normal text-neutral">unid.</span>
              <span className="ml-2 text-delta font-normal text-neutral">
                {formatPercent(row.sharePercent, 1)} do saldo
              </span>
            </span>
          </div>

          <span className="mt-1 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <span
              className="block h-2.5"
              style={{
                width: `${((row.units - row.unitsAtRisk) / TOTAL_UNITS) * 100}%`,
                backgroundColor: BALANCE_COLOR,
              }}
            />
            <span
              className="block h-2.5"
              style={{
                width: `${(row.unitsAtRisk / TOTAL_UNITS) * 100}%`,
                backgroundColor: SEMANTIC.negative,
              }}
            />
          </span>

          <p className="mt-1 text-delta text-neutral">
            {formatInteger(row.unitsAtRisk)} unidades sem consumo previsto até o vencimento
          </p>
        </div>
      ))}

      <div className="border-t border-surface-border pt-3">
        <p className="text-delta font-semibold uppercase tracking-wide text-neutral">Por região</p>
        <ul className="mt-2 space-y-1.5">
          {BALANCE_BY_REGION.map((row) => (
            <li key={row.region} className="flex items-baseline justify-between gap-3 text-delta-lg">
              <span className="text-slate-700">{row.region}</span>
              <span className="tabular-nums text-slate-900">
                {formatInteger(row.units)}
                {row.unitsAtRisk > 0 ? (
                  <span
                    className="ml-2 text-delta font-medium"
                    style={{ color: SEMANTIC.negative }}
                  >
                    {formatInteger(row.unitsAtRisk)} em risco
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function BalanceChart() {
  const data = BALANCE_SERIES.map((point) => ({
    label: point.label,
    units: point.units,
    unitsAtRisk: point.unitsAtRisk,
  }))

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: '#E2E8F0' }}
            tick={{ fill: '#64748B', fontSize: 12 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={64}
            tick={{ fill: '#64748B', fontSize: 12 }}
            tickFormatter={(value: number) => formatInteger(value)}
          />
          <Tooltip
            formatter={(value: number, name: string) => [formatInteger(value), name]}
            contentStyle={{ fontSize: 12, borderRadius: 12, borderColor: '#E2E8F0' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="units" name="Saldo em estoque" fill={BALANCE_COLOR} radius={[4, 4, 0, 0]} />
          <Line
            type="monotone"
            dataKey="unitsAtRisk"
            name="Unidades em risco"
            stroke={SEMANTIC.negative}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

function LotTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-left">
        <thead>
          <tr className="border-b border-surface-border text-delta text-neutral">
            <th className="pb-2 font-medium">Lote</th>
            <th className="pb-2 font-medium">SKU</th>
            <th className="pb-2 font-medium">Detentor</th>
            <th className="pb-2 font-medium">Região</th>
            <th className="pb-2 text-right font-medium">Unidades</th>
            <th className="pb-2 text-right font-medium">Validade</th>
            <th className="pb-2 text-right font-medium">Dias até vencer</th>
            <th className="pb-2 font-medium">Status</th>
            <th className="pb-2 text-right font-medium">Em risco (unid.)</th>
            <th className="pb-2 text-right font-medium">Valor em risco</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {CRITICAL_LOTS.map((lot) => {
            const status = lotStatus(lot)
            const risk = unitsAtRisk(lot)
            const days = daysToExpiry(lot)

            return (
              <tr
                key={lot.id}
                className="text-delta-lg transition-colors hover:bg-slate-50"
                style={
                  lot.blockedByStockout
                    ? { backgroundColor: `${SEMANTIC.negative}0D` }
                    : undefined
                }
              >
                <td className="py-2.5 font-medium text-slate-900">
                  {lot.batchCode}
                  {lot.blockedByStockout ? (
                    <span className="ml-2 text-delta font-normal" style={{ color: SEMANTIC.negative }}>
                      bloqueado por ruptura
                    </span>
                  ) : null}
                </td>
                <td className="py-2.5 text-slate-600">{lot.skuName}</td>
                <td className="py-2.5 text-slate-700">
                  {lot.holderName}
                  <span className="ml-2 text-delta text-neutral">
                    {HOLDER_KIND_LABEL[lot.holderKind]}
                  </span>
                </td>
                <td className="py-2.5 text-slate-600">{lot.region}</td>
                <td className="py-2.5 text-right tabular-nums text-slate-700">
                  {formatInteger(lot.units)}
                </td>
                <td className="py-2.5 text-right tabular-nums text-slate-700">
                  {formatDate(lot.expiresOn)}
                </td>
                <td
                  className="py-2.5 text-right font-medium tabular-nums"
                  style={{ color: SEMANTIC[LOT_STATUS_TONE[status]] }}
                >
                  {formatInteger(days)}
                </td>
                <td className="py-2.5">
                  <StateChip label={LOT_STATUS_LABEL[status]} tone={LOT_STATUS_TONE[status]} />
                </td>
                <td className="py-2.5 text-right tabular-nums text-slate-900">
                  {risk > 0 ? formatInteger(risk) : '—'}
                </td>
                <td
                  className="py-2.5 text-right font-semibold tabular-nums"
                  style={risk > 0 ? { color: SEMANTIC.negative } : undefined}
                >
                  {risk > 0 ? formatMoneyFull(valueAtRiskBrl(lot)) : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function VirtualStockTable() {
  const rows = [...VIRTUAL_STOCK].sort((a, b) => b.stale - a.stale)

  return (
    <div className="space-y-4">
      <p className="text-delta-lg text-slate-700">
        Virtual porque a amostra saiu da filial mas ainda não chegou ao médico: sem baixa de
        entrega, ela existe no papel e não no consultório.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-surface-border text-delta text-neutral">
              <th className="pb-2 font-medium">Representante</th>
              <th className="pb-2 font-medium">Região</th>
              <th className="pb-2 text-right font-medium">Em poder</th>
              <th className="pb-2 text-right font-medium">Entregas no ciclo</th>
              <th className="pb-2 text-right font-medium">
                Sem baixa há mais de {FIELD_CYCLE_DAYS} dias
              </th>
              <th className="pb-2 text-right font-medium">% do saldo sem baixa</th>
              <th className="pb-2 font-medium">Lote em poder</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {rows.map((row) => {
              const share = staleSharePercent(row.holderId)
              const lot = lotOfHolder(row.holderId)

              return (
                <tr key={row.holderId} className="text-delta-lg transition-colors hover:bg-slate-50">
                  <td className="py-2.5 font-medium text-slate-900">{row.holderName}</td>
                  <td className="py-2.5 text-slate-600">{row.region}</td>
                  <td className="py-2.5 text-right tabular-nums text-slate-700">
                    {formatInteger(row.onHand)}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-slate-700">
                    {formatInteger(row.delivered)}
                  </td>
                  <td
                    className="py-2.5 text-right font-semibold tabular-nums"
                    style={{ color: share >= 25 ? SEMANTIC.negative : SEMANTIC.attention }}
                  >
                    {formatInteger(row.stale)}
                  </td>
                  <td
                    className="py-2.5 text-right tabular-nums"
                    style={{ color: share >= 25 ? SEMANTIC.negative : undefined }}
                  >
                    {formatPercent(share, 1)}
                  </td>
                  <td className="py-2.5 text-delta text-neutral">
                    {lot
                      ? `${lot.batchCode} · vence ${formatRelative(lot.expiresOn)}`
                      : 'sem lote nominal na carteira'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-delta text-neutral">
        {formatInteger(TOTAL_VIRTUAL_STALE)} unidades — {formatPercent(VIRTUAL_STALE_SHARE_PERCENT, 1)}{' '}
        do que está com a força de campo — passaram de um ciclo sem baixa de entrega, contra{' '}
        {formatInteger(TOTAL_VIRTUAL_DELIVERED)} entregas registradas no ciclo. Amostra sem baixa não
        é amostra entregue: é saldo que ninguém está contando e que continua vencendo.
      </p>
    </div>
  )
}

function TransitTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left">
        <thead>
          <tr className="border-b border-surface-border text-delta text-neutral">
            <th className="pb-2 font-medium">Trecho</th>
            <th className="pb-2 text-right font-medium">Em trânsito</th>
            <th className="pb-2 text-right font-medium">Tempo médio (dias)</th>
            <th className="pb-2 text-right font-medium">Prazo acordado (dias)</th>
            <th className="pb-2 text-right font-medium">Última expedição</th>
            <th className="pb-2 font-medium">Situação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {TRANSIT_LANES.map((lane) => {
            const status = laneStatus(lane)

            return (
              <tr key={lane.id} className="text-delta-lg transition-colors hover:bg-slate-50">
                <td className="py-2.5">
                  <span className="font-medium text-slate-900">
                    {lane.origin} → {lane.destination}
                  </span>
                  {lane.note ? <p className="text-delta text-neutral">{lane.note}</p> : null}
                </td>
                <td className="py-2.5 text-right tabular-nums text-slate-700">
                  {lane.unitsInTransit > 0 ? formatInteger(lane.unitsInTransit) : '—'}
                </td>
                <td
                  className="py-2.5 text-right font-medium tabular-nums"
                  style={status === 'late' ? { color: SEMANTIC.negative } : { color: '#334155' }}
                >
                  {formatInteger(lane.transitDays)}
                </td>
                <td className="py-2.5 text-right tabular-nums text-slate-600">
                  {formatInteger(lane.slaDays)}
                </td>
                <td className="py-2.5 text-right tabular-nums text-slate-600">
                  {formatDate(lane.lastDispatchOn)}
                </td>
                <td className="py-2.5">
                  <StateChip label={LANE_STATUS_LABEL[status]} tone={LANE_STATUS_TONE[status]} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function MovementList() {
  return (
    <ul className="space-y-3">
      {MOVEMENTS.map((movement) => (
        <li key={movement.id} className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="min-w-0 text-delta-lg text-slate-700">
            <span className="mr-2 rounded-sm bg-slate-100 px-1.5 py-0.5 text-delta font-medium text-slate-600">
              {MOVEMENT_KIND_LABEL[movement.kind]}
            </span>
            {movement.description}
            <span className="ml-2 text-delta text-neutral">
              {movement.holderName} · {formatDate(movement.occurredOn)} (
              {formatRelative(movement.occurredOn)})
            </span>
          </span>
          <span
            className="text-delta-lg font-semibold tabular-nums"
            style={{ color: movement.kind === 'block' ? SEMANTIC.negative : '#0F172A' }}
          >
            {formatInteger(movement.units)}
            <span className="ml-1.5 text-delta font-normal text-neutral">unid.</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

export function Inventory() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Estoque e logística
          </h1>
          <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
            Onde a amostra está — e quanto tempo ela ainda tem
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-control border border-surface-border bg-surface-card px-2.5 py-1 text-delta">
            <span className="text-neutral">Em trânsito:</span>
            <span className="font-medium tabular-nums text-slate-900">
              {formatInteger(TOTAL_IN_TRANSIT_UNITS)} unid.
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-control border border-surface-border bg-surface-card px-2.5 py-1 text-delta">
            <span className="text-neutral">Tempo médio de trânsito:</span>
            <span className="font-medium tabular-nums text-slate-900">
              {formatDecimal(AVERAGE_TRANSIT_DAYS, 1)} dias
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-control border border-surface-border bg-surface-card px-2.5 py-1 text-delta">
            <span className="text-neutral">Trechos acima do prazo:</span>
            <span className="font-medium tabular-nums text-slate-900">{LANES_OVER_SLA}</span>
          </span>
        </div>
      </div>

      <DegradedBanner
        attestations={DEGRADED_ATTESTATIONS}
        consequence="O rastreamento dos distribuidores parou de chegar: o saldo em estoque segue observado pelo SAP, mas o que está em estrada é estimativa e aparece com confiança reduzida."
      />

      {BLOCKED_LOT ? <BlockedLotSpotlight lot={BLOCKED_LOT} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Unidades em estoque"
          value={formatInteger(TOTAL_UNITS)}
          attestation={INVENTORY_ATTESTATION}
        />
        <KpiCard
          label="Unidades em risco de perda"
          value={formatInteger(TOTAL_UNITS_AT_RISK)}
          delta={UNITS_AT_RISK_DELTA_PERCENT}
          deltaInverted
          comparison="vs. ciclo anterior"
          attestation={INVENTORY_ATTESTATION}
        />
        <KpiCard
          label="Valor em risco"
          value={formatMoney(TOTAL_VALUE_AT_RISK_BRL)}
          delta={VALUE_AT_RISK_DELTA_BRL}
          deltaUnit="money"
          deltaInverted
          comparison="vs. ciclo anterior"
          attestation={INVENTORY_ATTESTATION}
        />
        <KpiCard
          label="Lotes em risco"
          value={formatInteger(AT_RISK_LOTS.length)}
          attestation={INVENTORY_ATTESTATION}
        />
        <KpiCard
          label="Estoque virtual com representantes"
          value={formatInteger(TOTAL_VIRTUAL_ON_HAND)}
          attestation={FIELD_STOCK_ATTESTATION}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Panel
            title="Saldo por detentor"
            description="Filial, operador logístico e representante — quem guarda o quê"
            footer={<DataBadge attestation={LOGISTICS_ATTESTATION} variant="full" />}
          >
            <HolderKindBalances />
          </Panel>
        </div>

        <div className="lg:col-span-7">
          <Panel
            title="Evolução do saldo por ciclo"
            description={`O saldo cai e a parcela em risco sobe: ${formatPercent(AT_RISK_SHARE_PERCENT, 1)} do estoque não tem consumo previsto até vencer`}
            footer={<DataBadge attestation={INVENTORY_ATTESTATION} variant="full" />}
          >
            <BalanceChart />
          </Panel>
        </div>
      </div>

      <Panel
        title="Lote, validade e risco de perda"
        description={`Em observação abaixo de ${EXPIRY_WINDOWS.watchDays} dias de validade, em risco abaixo de ${EXPIRY_WINDOWS.riskDays}. Unidades em risco são as que o giro do detentor não consome antes do vencimento`}
        footer={<DataBadge attestation={INVENTORY_ATTESTATION} variant="full" />}
      >
        <LotTable />
      </Panel>

      <Panel
        title="Estoque virtual do representante"
        description="Saldo que saiu da filial e ainda não tem baixa de entrega"
        footer={<DataBadge attestation={FIELD_STOCK_ATTESTATION} variant="full" />}
      >
        <VirtualStockTable />
      </Panel>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Panel
            title="Fluxo logístico"
            description="Volume em trânsito e tempo por trecho contra o prazo acordado"
            footer={<DataBadge attestation={TRANSIT_ATTESTATION} variant="full" />}
          >
            <TransitTable />
          </Panel>
        </div>

        <div className="lg:col-span-5">
          <Panel
            title="Movimentações do ciclo"
            footer={<DataBadge attestation={MOVEMENT_ATTESTATION} variant="full" />}
          >
            <MovementList />
          </Panel>
        </div>
      </div>

      <Panel
        title="Ações"
        footer={
          <span>
            A transferência do lote retido é proposta na{' '}
            <Link
              to={REDISTRIBUTION_ROUTE}
              className="font-medium underline"
              style={{ color: 'var(--product-accent)' }}
            >
              Redistribuição Inteligente
            </Link>{' '}
            e aprovada em {TRANSFER_DECISION_ID}. Esta tela apura o estoque; ela não move amostra
            sozinha.
          </span>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={REDISTRIBUTION_ROUTE}
            className="rounded-control px-3 py-2 text-delta-lg font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--product-accent)' }}
          >
            Avaliar transferência
          </Link>
          <FutureButton label="Write-back ao ERP" phase="Fase 3" />
          <FutureButton label="Solicitar inventário na filial" phase="Fase 2" />
          <FutureButton label="Exportar posição de estoque" phase="Fase 2" />
        </div>
      </Panel>
    </div>
  )
}
