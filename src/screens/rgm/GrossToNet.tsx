import { useState } from 'react'
import { DataBadge } from '../../components/DataBadge'
import { KpiCard } from '../../components/KpiCard'
import { Panel } from '../../components/Panel'
import { PerimeterMark, PerimeterNote } from '../../components/PerimeterNote'
import { StateChip } from '../../components/StateChip'
import { formatInteger, formatPercent } from '../../domain/format'
import { formatMoney, formatMoneyFull } from '../../domain/money'
import { formatRelative } from '../../domain/today'
import { SEMANTIC } from '../../design/tokens'
import type { SemanticTone } from '../../design/tokens'
import {
  COMMERCIAL_DISCOUNT_BRL,
  CUT_LABEL,
  CUTS,
  DEDUCTION_RATE_PERCENT,
  GROSS_REVENUE_BRL,
  GROSS_TO_NET,
  GROSS_TO_NET_ATTESTATION,
  LEAKAGE_LABEL,
  LEAKAGE_SHARE_OF_DEDUCTIONS_PERCENT,
  LEAKAGES,
  NET_REVENUE_BRL,
  TOTAL_DEDUCTIONS_BRL,
  TOTAL_LEAKAGE_BRL,
  type GrossToNetCut,
  type LeakageSeverity,
} from '../../mock/grossToNet'

const SEVERITY_TONE: Record<LeakageSeverity, SemanticTone> = {
  out_of_policy: 'negative',
  low_return: 'attention',
  review: 'neutral',
}

const BAR_MAX_WIDTH = 100

/**
 * Cascata desenhada à mão em vez de gráfico de barras empilhadas.
 *
 * O degrau precisa mostrar de onde sai e onde chega, e a proporção entre eles
 * precisa ser lida de relance — é essa proporção que responde à pergunta que
 * abriu a tela. Uma barra flutuante por degrau, na escala da receita bruta.
 */
function Waterfall() {
  let cursor = GROSS_REVENUE_BRL

  return (
    <div className="space-y-1">
      {GROSS_TO_NET.map((leg) => {
        const isDeduction = leg.kind === 'deduction'
        const start = isDeduction ? cursor + leg.amountBrl : 0
        const magnitude = Math.abs(leg.amountBrl)
        const width = (magnitude / GROSS_REVENUE_BRL) * BAR_MAX_WIDTH
        const offset = isDeduction ? (start / GROSS_REVENUE_BRL) * BAR_MAX_WIDTH : 0
        if (isDeduction) cursor += leg.amountBrl

        const color =
          leg.kind === 'deduction'
            ? SEMANTIC.negative
            : leg.kind === 'total'
              ? SEMANTIC.positive
              : '#334155'

        return (
          <div key={leg.id} className="grid grid-cols-[190px_1fr_150px] items-center gap-3 py-1">
            <span
              className={`text-delta-lg ${
                leg.kind === 'deduction' ? 'text-slate-600' : 'font-semibold text-slate-900'
              }`}
              title={leg.description}
            >
              {leg.label}
            </span>

            <span className="relative block h-6 rounded-sm bg-slate-50">
              <span
                className="absolute inset-y-0 rounded-sm"
                style={{
                  left: `${offset}%`,
                  width: `${Math.max(width, 0.4)}%`,
                  backgroundColor: color,
                  opacity: leg.kind === 'deduction' ? 0.85 : 1,
                }}
              />
            </span>

            <span
              className={`text-right text-delta-lg tabular-nums ${
                leg.kind === 'deduction' ? 'text-negative' : 'font-semibold text-slate-900'
              }`}
            >
              {leg.kind === 'deduction' ? formatMoney(leg.amountBrl) : formatMoney(leg.amountBrl)}
              <PerimeterMark />
            </span>
          </div>
        )
      })}
    </div>
  )
}

function CutTable({ cut }: { cut: GrossToNetCut }) {
  const rows = CUTS[cut]

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left">
        <thead>
          <tr className="border-b border-surface-border text-delta text-neutral">
            <th className="pb-2 font-medium">{CUT_LABEL[cut]}</th>
            <th className="pb-2 text-right font-medium">Preço de lista</th>
            <th className="pb-2 text-right font-medium">Receita líquida</th>
            <th className="pb-2 text-right font-medium">Conversão</th>
            <th className="pb-2 text-right font-medium">Vazamento</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {rows.map((row) => {
            const conversion = (row.netBrl / row.grossBrl) * 100
            return (
              <tr key={row.id} className="text-delta-lg transition-colors hover:bg-slate-50">
                <td className="py-2.5 font-medium text-slate-900">{row.label}</td>
                <td className="py-2.5 text-right tabular-nums text-slate-600">
                  {formatMoney(row.grossBrl)}
                  <PerimeterMark />
                </td>
                <td className="py-2.5 text-right tabular-nums text-slate-900">
                  {formatMoney(row.netBrl)}
                  <PerimeterMark />
                </td>
                <td className="py-2.5 text-right font-medium tabular-nums text-slate-900">
                  {formatPercent(conversion)}
                </td>
                <td className="py-2.5 text-right tabular-nums text-negative">
                  {formatMoney(row.leakageBrl)}
                  <PerimeterMark />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function GrossToNet() {
  const [cut, setCut] = useState<GrossToNetCut>('product')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Gross-to-net e price waterfall
        </h1>
        <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
          Do preço de lista à receita líquida
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Desconto comercial no perímetro"
          value={formatMoney(COMMERCIAL_DISCOUNT_BRL)}
          attestation={GROSS_TO_NET_ATTESTATION}
          size="lg"
        />
        <KpiCard
          label="Deduções totais"
          value={formatMoney(Math.abs(TOTAL_DEDUCTIONS_BRL))}
          delta={DEDUCTION_RATE_PERCENT}
          deltaUnit="points"
          deltaInverted
          comparison="do preço de lista"
          attestation={GROSS_TO_NET_ATTESTATION}
        />
        <KpiCard
          label="Vazamento identificado"
          value={formatMoney(TOTAL_LEAKAGE_BRL)}
          delta={LEAKAGE_SHARE_OF_DEDUCTIONS_PERCENT}
          deltaUnit="points"
          deltaInverted
          comparison="das deduções"
          attestation={GROSS_TO_NET_ATTESTATION}
        />
        <KpiCard
          label="Receita líquida"
          value={formatMoney(NET_REVENUE_BRL)}
          attestation={GROSS_TO_NET_ATTESTATION}
        />
      </div>

      <Panel
        title="Cascata de preço"
        description="Cada degrau entre o preço de lista e a receita líquida"
        footer={<DataBadge attestation={GROSS_TO_NET_ATTESTATION} variant="full" />}
      >
        <Waterfall />
      </Panel>

      <Panel
        title="Detecção de vazamento"
        description="Condições fora de política ou de baixo retorno dentro das deduções"
        action={
          <span className="text-delta-lg font-semibold tabular-nums text-negative">
            {formatMoney(TOTAL_LEAKAGE_BRL)}
            <PerimeterMark />
          </span>
        }
      >
        <ul className="space-y-3">
          {LEAKAGES.map((leakage) => (
            <li
              key={leakage.id}
              className="rounded-card border border-surface-border p-4 transition-colors hover:bg-slate-50"
              style={{
                borderLeftWidth: 3,
                borderLeftColor:
                  leakage.severity === 'out_of_policy'
                    ? SEMANTIC.negative
                    : leakage.severity === 'low_return'
                      ? SEMANTIC.attention
                      : SEMANTIC.neutral,
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-delta-lg font-medium text-slate-900">{leakage.title}</p>
                  <p className="mt-0.5 text-delta text-neutral">
                    {formatInteger(leakage.accounts)} clientes · detectado{' '}
                    {formatRelative(leakage.detectedOn)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StateChip
                    label={LEAKAGE_LABEL[leakage.severity]}
                    tone={SEVERITY_TONE[leakage.severity]}
                  />
                  <span className="text-delta-lg font-semibold tabular-nums text-negative">
                    {formatMoneyFull(leakage.amountBrl)}
                    <PerimeterMark />
                  </span>
                </div>
              </div>

              <p className="mt-2 text-delta-lg text-slate-700">{leakage.evidence}</p>

              <div className="mt-3 border-t border-surface-border pt-2.5">
                <DataBadge attestation={leakage.attestation} />
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        title="Abertura por corte"
        description="A conversão de bruto para líquido muda muito entre produto, cliente e canal"
        action={
          <div className="inline-flex rounded-control border border-surface-border p-0.5">
            {(['product', 'customer', 'channel'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setCut(option)}
                className="rounded-control px-2.5 py-1 text-delta font-medium text-slate-600 transition-colors hover:bg-slate-50"
                style={
                  cut === option
                    ? { backgroundColor: 'var(--product-accent)', color: '#FFFFFF' }
                    : undefined
                }
              >
                {CUT_LABEL[option]}
              </button>
            ))}
          </div>
        }
      >
        <CutTable cut={cut} />
      </Panel>

      <PerimeterNote />
    </div>
  )
}
