import { combine, type Attestation } from '../domain/attestation'
import { formatDecimal, formatInteger, formatPercent } from '../domain/format'
import { formatMoney } from '../domain/money'
import { CRM_SFA, IQVIA, NEOGRID, NEOGRID_DISTRIBUIDORES, SCANNTECH } from './sources'

/**
 * Ficha de Produto 360° (módulo 1.3 do ESCOPO).
 *
 * As 14 dimensões chegam agrupadas em quatro painéis, e cada painel carrega o
 * atestado das suas próprias fontes. O contraste entre os atestados é o
 * argumento da tela: o mesmo produto é visto por Scanntech, Neogrid e CRM com
 * defasagens e confianças diferentes, e é a harmonização que permite lê-los
 * lado a lado sem fingir que têm a mesma idade.
 */

export type MetricFormat = 'money' | 'percent' | 'index' | 'integer' | 'days'

export type ProductMetric = {
  readonly id: string
  readonly label: string
  /** `null` enquanto o valor da seção 10 do ESCOPO não estiver disponível. */
  readonly value: number | null
  readonly format: MetricFormat
  readonly delta?: number
  readonly deltaUnit?: 'percent' | 'points'
  readonly inverted?: boolean
}

export type ProductPanel = {
  readonly id: string
  readonly title: string
  readonly attestation: Attestation
  readonly metrics: readonly ProductMetric[]
}

export type Sku = {
  readonly id: string
  readonly name: string
  readonly molecule: string
  readonly presentation: string
  readonly panels: readonly ProductPanel[]
}

export function formatMetric(metric: ProductMetric): string {
  if (metric.value === null) return '—'
  switch (metric.format) {
    case 'money':
      return formatMoney(metric.value)
    case 'percent':
      return formatPercent(metric.value)
    case 'index':
      return formatDecimal(metric.value, 1)
    case 'days':
      return `${formatDecimal(metric.value, 0)} dias`
    case 'integer':
      return formatInteger(metric.value)
  }
}

/**
 * Dimensões do módulo 1.3. Os rótulos e o agrupamento são do ESCOPO; os valores
 * de cada SKU vêm da seção 10 e entram quando o documento estiver disponível.
 */
function panelsFor(actionMetrics: readonly ProductMetric[]): readonly ProductPanel[] {
  return [
    {
      id: 'comercial',
      title: 'Comercial',
      attestation: combine([SCANNTECH, IQVIA]),
      metrics: [
        { id: 'sell-in', label: 'Sell-in (R$)', value: null, format: 'money' },
        { id: 'sell-out', label: 'Sell-out (R$)', value: null, format: 'money' },
        { id: 'share', label: 'Market share (valor)', value: null, format: 'percent' },
        { id: 'avg-price', label: 'Preço médio', value: null, format: 'money' },
        { id: 'ipr', label: 'Preço relativo (IPR)', value: null, format: 'index' },
      ],
    },
    {
      id: 'disponibilidade',
      title: 'Disponibilidade',
      attestation: combine([NEOGRID, NEOGRID_DISTRIBUIDORES]),
      metrics: [
        { id: 'stock', label: 'Estoque nos clientes', value: null, format: 'integer' },
        { id: 'coverage', label: 'Cobertura', value: null, format: 'days' },
        { id: 'stockout', label: 'Ruptura', value: null, format: 'percent', inverted: true },
        { id: 'numeric-distribution', label: 'Distribuição numérica', value: null, format: 'percent' },
        {
          id: 'weighted-distribution',
          label: 'Distribuição ponderada',
          value: null,
          format: 'percent',
        },
      ],
    },
    {
      id: 'demanda',
      title: 'Demanda',
      attestation: combine([IQVIA, CRM_SFA]),
      metrics: [
        { id: 'prescriptions', label: 'Prescrições', value: null, format: 'integer' },
        { id: 'visits', label: 'Visitas realizadas', value: null, format: 'integer' },
        { id: 'samples', label: 'Amostras distribuídas', value: null, format: 'integer' },
      ],
    },
    {
      id: 'acao',
      title: 'Ação',
      // A recomendação se apoia em tudo, inclusive na ruptura estimada: por
      // isso herda o elo mais fraco de todos os painéis acima.
      attestation: combine([SCANNTECH, NEOGRID, NEOGRID_DISTRIBUIDORES, IQVIA, CRM_SFA]),
      metrics: actionMetrics,
    },
  ]
}

const NO_ACTION: readonly ProductMetric[] = [
  { id: 'open-recommendations', label: 'Recomendações em aberto', value: 0, format: 'integer' },
  { id: 'potential-impact', label: 'Impacto financeiro potencial', value: 0, format: 'money' },
]

export const SKUS: readonly Sku[] = [
  {
    id: 'losartana-50-30',
    name: 'Losartana 50mg c/30',
    molecule: 'Losartana potássica',
    presentation: 'Comprimido revestido · 50mg · 30 unidades',
    panels: panelsFor([
      {
        id: 'open-recommendations',
        label: 'Recomendações em aberto',
        value: 1,
        format: 'integer',
      },
      {
        id: 'potential-impact',
        label: 'Impacto financeiro potencial',
        value: 4_800_000,
        format: 'money',
      },
    ]),
  },
  {
    id: 'dipirona-500-20',
    name: 'Dipirona 500mg c/20',
    molecule: 'Dipirona monoidratada',
    presentation: 'Comprimido · 500mg · 20 unidades',
    panels: panelsFor(NO_ACTION),
  },
  {
    id: 'paracetamol-750-20',
    name: 'Paracetamol 750mg c/20',
    molecule: 'Paracetamol',
    presentation: 'Comprimido · 750mg · 20 unidades',
    panels: panelsFor(NO_ACTION),
  },
]

export const DEFAULT_SKU_ID = 'losartana-50-30'

export function findSku(id: string): Sku | undefined {
  return SKUS.find((sku) => sku.id === id)
}

/** Total de dimensões do módulo 1.3, contando sell-in/sell-out como uma. */
export const PRODUCT_DIMENSION_COUNT = 14
