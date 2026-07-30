import type { Attestation } from '../domain/attestation'
import { formatDecimal, formatPercent } from '../domain/format'
import { formatMoney } from '../domain/money'
import { IQVIA, NEOGRID, NEOGRID_DISTRIBUIDORES, SCANNTECH } from './sources'

/** Indicadores da Visão Geral do Mercado (seção 10.1 do ESCOPO). */

export type KpiFormat = 'money' | 'percent' | 'index'

export type Kpi = {
  readonly id: string
  readonly label: string
  readonly value: number
  readonly format: KpiFormat
  readonly delta: number
  readonly deltaUnit: 'percent' | 'points'
  /** Métrica em que cair é bom. */
  readonly inverted: boolean
  readonly comparison: string
  readonly attestation: Attestation
}

const VS_PREVIOUS_WEEK = 'vs. 7 dias anteriores'

export const MARKET_KPIS: readonly Kpi[] = [
  {
    id: 'sellout',
    label: 'Sell-out (R$)',
    value: 256_400_000,
    format: 'money',
    delta: 8.6,
    deltaUnit: 'percent',
    inverted: false,
    comparison: VS_PREVIOUS_WEEK,
    attestation: SCANNTECH,
  },
  {
    id: 'market-share',
    label: 'Market Share (Valor)',
    value: 18.7,
    format: 'percent',
    delta: 0.8,
    deltaUnit: 'points',
    inverted: false,
    comparison: VS_PREVIOUS_WEEK,
    attestation: IQVIA,
  },
  {
    id: 'numeric-distribution',
    label: 'Distribuição Numérica',
    value: 76.2,
    format: 'percent',
    delta: 1.9,
    deltaUnit: 'points',
    inverted: false,
    comparison: VS_PREVIOUS_WEEK,
    attestation: NEOGRID,
  },
  {
    id: 'stockout',
    label: 'Ruptura Estimada',
    value: 7.3,
    format: 'percent',
    delta: -1.2,
    deltaUnit: 'points',
    inverted: true,
    comparison: VS_PREVIOUS_WEEK,
    attestation: NEOGRID_DISTRIBUIDORES,
  },
  {
    id: 'relative-price',
    label: 'Preço Relativo (IPR)',
    value: 98.6,
    format: 'index',
    delta: -1.4,
    deltaUnit: 'points',
    inverted: false,
    comparison: VS_PREVIOUS_WEEK,
    attestation: SCANNTECH,
  },
]

/** Sell-out do período, âncora do gráfico de evolução e do centro do donut. */
export const SELLOUT_TOTAL_BRL = 256_400_000

/** Variação do sell-out contra os 7 dias anteriores, em pontos percentuais. */
export const SELLOUT_GROWTH_PERCENT = 8.6

export function formatKpiValue(kpi: Kpi): string {
  if (kpi.format === 'money') return formatMoney(kpi.value)
  if (kpi.format === 'percent') return formatPercent(kpi.value)
  return formatDecimal(kpi.value, 1)
}
