import { Link } from 'react-router-dom'
import { DataBadge } from '../../components/DataBadge'
import { KpiCard } from '../../components/KpiCard'
import { Panel } from '../../components/Panel'
import { PerimeterNote } from '../../components/PerimeterNote'
import { StateChip } from '../../components/StateChip'
import { formatDecimal, formatInteger, formatPercent } from '../../domain/format'
import { formatMoney } from '../../domain/money'
import type { SemanticTone } from '../../design/tokens'
import {
  CORRIDOR_LABEL,
  corridorStatus,
  LINES_OUTSIDE_CORRIDOR,
  MOLECULE_CAPTURE,
  PRICE_CORRIDOR,
  PRICE_LINES,
  PRICING_ATTESTATION,
  TOTAL_CAPTURE_BRL,
  type CorridorStatus,
} from '../../mock/pricing'
import { MARKET } from '../../domain/elasticity'

const STATUS_TONE: Record<CorridorStatus, SemanticTone> = {
  below: 'attention',
  inside: 'positive',
  above: 'negative',
}

function CorridorBar({ index }: { index: number }) {
  const min = 90
  const max = 110
  const clamp = (value: number) => Math.min(max, Math.max(min, value))
  const toPercent = (value: number) => ((clamp(value) - min) / (max - min)) * 100

  return (
    <span className="relative block h-2 w-28 rounded-full bg-slate-100" title={`IPR ${formatDecimal(index, 1)}`}>
      <span
        className="absolute inset-y-0 rounded-full bg-slate-200"
        style={{
          left: `${toPercent(PRICE_CORRIDOR.floor)}%`,
          width: `${toPercent(PRICE_CORRIDOR.ceiling) - toPercent(PRICE_CORRIDOR.floor)}%`,
        }}
      />
      <span
        className="absolute top-1/2 h-3 w-1 -translate-y-1/2 rounded-sm"
        style={{
          left: `${toPercent(index)}%`,
          backgroundColor:
            corridorStatus(index) === 'inside'
              ? '#16A34A'
              : corridorStatus(index) === 'above'
                ? '#DC2626'
                : '#F59E0B',
        }}
      />
    </span>
  )
}

export function PricingCockpit() {
  return (
    <div className="space-y-5">
      <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Cockpit de preço e margem
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={'Captura potencial'}
          value={formatMoney(TOTAL_CAPTURE_BRL)}
          attestation={PRICING_ATTESTATION}
          perimeter
        />
        <KpiCard
          label="Linhas fora do corredor"
          value={`${formatInteger(LINES_OUTSIDE_CORRIDOR)} de ${formatInteger(PRICE_LINES.length)}`}
          attestation={PRICING_ATTESTATION}
        />
        <KpiCard
          label="Corredor de preço"
          value={`${formatDecimal(PRICE_CORRIDOR.floor, 0)} a ${formatDecimal(PRICE_CORRIDOR.ceiling, 0)}`}
          attestation={PRICING_ATTESTATION}
        />
        <KpiCard
          label="Preço relativo — Losartana"
          value={formatDecimal(
            (MARKET.basePriceBrl / MARKET.competitorPriceBrl) * 100,
            1,
          )}
          attestation={PRICING_ATTESTATION}
        />
      </div>

      <Panel
        title="Preço próprio contra concorrência"
        description="Por molécula, apresentação, canal e região"
        footer={<DataBadge attestation={PRICING_ATTESTATION} variant="full" />}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-surface-border text-delta text-neutral">
                <th className="pb-2 font-medium">Molécula</th>
                <th className="pb-2 font-medium">Apresentação</th>
                <th className="pb-2 font-medium">Canal · Região</th>
                <th className="pb-2 text-right font-medium">Preço próprio</th>
                <th className="pb-2 text-right font-medium">Concorrente</th>
                <th className="pb-2 text-right font-medium">IPR</th>
                <th className="pb-2 font-medium">Corredor</th>
                <th className="pb-2 text-right font-medium">Captura</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {PRICE_LINES.map((line) => {
                const status = corridorStatus(line.relativePriceIndex)
                return (
                  <tr key={line.id} className="text-delta-lg transition-colors hover:bg-slate-50">
                    <td className="py-2.5 font-medium text-slate-900">{line.molecule}</td>
                    <td className="py-2.5 text-slate-600">{line.presentation}</td>
                    <td className="py-2.5 text-slate-600">
                      {line.channel} · {line.region}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-slate-900">
                      R$ {formatDecimal(line.ownPriceBrl, 2)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-slate-600">
                      R$ {formatDecimal(line.competitorPriceBrl, 2)}
                    </td>
                    <td className="py-2.5 text-right font-medium tabular-nums text-slate-900">
                      {formatDecimal(line.relativePriceIndex, 1)}
                    </td>
                    <td className="py-2.5">
                      <span className="flex items-center gap-2">
                        <CorridorBar index={line.relativePriceIndex} />
                        <StateChip label={CORRIDOR_LABEL[status]} tone={STATUS_TONE[status]} />
                      </span>
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {line.potentialCaptureBrl > 0 ? (
                        line.decisionId ? (
                          <Link
                            to={`/decisoes/${line.decisionId}`}
                            className="font-medium underline"
                            style={{ color: 'var(--product-accent)' }}
                          >
                            {formatMoney(line.potentialCaptureBrl)}
                          </Link>
                        ) : (
                          <span className="font-medium text-slate-900">
                            {formatMoney(line.potentialCaptureBrl)}
                          </span>
                        )
                      ) : (
                        <span className="text-neutral">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Ranking de moléculas por captura potencial"
        action={
          <Link
            to="/rgm/cenarios"
            className="rounded-control px-2 py-1 text-delta font-medium transition-colors hover:bg-slate-50"
            style={{ color: 'var(--product-accent)' }}
          >
            Abrir simulador →
          </Link>
        }
      >
        <ol className="divide-y divide-surface-border">
          {MOLECULE_CAPTURE.map((item, position) => (
            <li key={item.molecule} className="flex items-center gap-3 py-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-delta font-semibold tabular-nums text-slate-600">
                {position + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-delta-lg font-medium text-slate-900">
                  {item.molecule}
                </span>
                <span className="block text-delta text-neutral">
                  {formatInteger(item.linesOutside)} de {formatInteger(item.lines)} linhas fora do
                  corredor
                </span>
              </span>
              <span className="shrink-0 text-right text-delta-lg font-semibold tabular-nums text-slate-900">
                {item.potentialCaptureBrl > 0 ? formatMoney(item.potentialCaptureBrl) : '—'}
              </span>
            </li>
          ))}
        </ol>
      </Panel>

      <p className="text-delta text-neutral">
        Corredor de {formatPercent(PRICE_CORRIDOR.floor, 0)} a{' '}
        {formatPercent(PRICE_CORRIDOR.ceiling, 0)} de preço relativo. Fora dele, o preço vira
        exceção com dono.
      </p>

      <PerimeterNote />
    </div>
  )
}
