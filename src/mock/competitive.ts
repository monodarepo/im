import { UF_NAME, type UfCode } from '../assets/brazil-uf'
import type { SemanticTone } from '../design/tokens'
import { combine, type Attestation } from '../domain/attestation'
import { formatDecimal } from '../domain/format'
import { daysAgo, type IsoDate } from '../domain/today'
import { MARKET_KPIS, type Kpi } from './kpis'
import { SKUS } from './products'
import { createRandom, MOCK_SEED } from './random'
import { IQVIA, NEOGRID_DISTRIBUIDORES, SCANNTECH } from './sources'

/**
 * Inteligência Competitiva (módulo 1.8 do ESCOPO).
 *
 * Dois blocos. O primeiro compara o preço Hypera com o do concorrente por SKU,
 * canal e microrregião, ancorado no IPR consolidado da seção 10. O segundo
 * ordena os movimentos do concorrente por molécula, para que a leitura de preço
 * tenha uma causa datada ao lado.
 *
 * Nenhum concorrente é nomeado: a plataforma trabalha com posições de mercado
 * ("Concorrente A", "Genérico líder"), não com razão social.
 */

function requireKpi(id: string): Kpi {
  const kpi = MARKET_KPIS.find((candidate) => candidate.id === id)
  if (!kpi) throw new Error(`KPI ausente na seção 10: ${id}`)
  return kpi
}

/** Índice de preço relativo consolidado — o mesmo número da Visão Geral. */
export const RELATIVE_PRICE_KPI = requireKpi('relative-price')

export const MARKET_SHARE_KPI = requireKpi('market-share')

/** Paridade de preço: acima de 100 a Hypera está mais cara que o concorrente. */
export const PARITY_INDEX = 100

/** Distância para a paridade, em pontos percentuais. Derivada do IPR canônico. */
export const CONSOLIDATED_GAP_PP = RELATIVE_PRICE_KPI.value - PARITY_INDEX

/**
 * Recorte de preço praticado nas grandes redes.
 *
 * NOTA: não consta do ESCOPO — a defasagem e a confiança abaixo são a
 * caracterização da fonte, no mesmo formato dos demais atestados do mock.
 */
const GRANDES_REDES: Attestation = {
  source: ['grandes_redes'],
  asOf: daysAgo(4),
  lagDays: 5,
  confidence: 'medium',
  quality: 'partial',
  method: 'observed',
}

export type PriceDimension = 'sku' | 'channel' | 'microregion'

export const PRICE_DIMENSION_LABEL: Record<PriceDimension, string> = {
  sku: 'SKU',
  channel: 'Canal',
  microregion: 'Microrregião',
}

export const PRICE_DIMENSIONS: readonly PriceDimension[] = ['sku', 'channel', 'microregion']

export type PriceOption = {
  readonly id: string
  readonly label: string
  readonly shortLabel: string
}

/**
 * Preço de referência do concorrente por SKU, em reais por embalagem.
 *
 * NOTA: não consta do ESCOPO. Os preços absolutos existem para dar escala ao
 * gráfico; o número que a tela defende é o índice relativo, esse sim canônico.
 */
const BASE_PRICE_BRL: readonly { readonly skuId: string; readonly value: number }[] = [
  { skuId: 'losartana-50-30', value: 18.9 },
  { skuId: 'dipirona-500-20', value: 9.4 },
  { skuId: 'paracetamol-750-20', value: 11.2 },
]

function basePriceFor(skuId: string): number {
  const entry = BASE_PRICE_BRL.find((item) => item.skuId === skuId)
  if (!entry) throw new Error(`Preço base ausente para o SKU ${skuId}`)
  return entry.value
}

/** Moléculas na ordem em que aparecem no canônico. */
export const MOLECULES: readonly string[] = ['Dipirona', 'Losartana', 'Paracetamol']

function shortMolecule(molecule: string): string {
  return MOLECULES.find((name) => molecule.startsWith(name)) ?? molecule
}

export const PRICE_SKUS: readonly PriceOption[] = SKUS.map((sku) => ({
  id: sku.id,
  label: sku.name,
  shortLabel: shortMolecule(sku.molecule),
}))

type ChannelSpec = {
  readonly id: string
  readonly label: string
  readonly shortLabel: string
  /** NOTA: não consta do ESCOPO — degrau de preço típico do canal. */
  readonly priceFactor: number
  readonly attestation: Attestation
}

const CHANNEL_SPECS: readonly ChannelSpec[] = [
  {
    id: 'independentes',
    label: 'Farmácias independentes',
    shortLabel: 'Independentes',
    priceFactor: 1.06,
    attestation: SCANNTECH,
  },
  {
    id: 'redes-regionais',
    label: 'Redes regionais',
    shortLabel: 'Redes regionais',
    priceFactor: 1.0,
    attestation: SCANNTECH,
  },
  {
    id: 'grandes-redes',
    label: 'Grandes redes',
    shortLabel: 'Grandes redes',
    priceFactor: 0.94,
    attestation: GRANDES_REDES,
  },
  {
    id: 'atacado',
    label: 'Atacado e distribuidores',
    shortLabel: 'Atacado',
    priceFactor: 0.88,
    attestation: NEOGRID_DISTRIBUIDORES,
  },
]

export const PRICE_CHANNELS: readonly PriceOption[] = CHANNEL_SPECS.map(
  ({ id, label, shortLabel }) => ({ id, label, shortLabel }),
)

type MicroregionSpec = {
  readonly id: string
  readonly name: string
  readonly uf: UfCode
  /** NOTA: não consta do ESCOPO — degrau de preço típico da praça. */
  readonly priceFactor: number
}

const MICROREGION_SPECS: readonly MicroregionSpec[] = [
  { id: 'sao-paulo-capital', name: 'São Paulo capital', uf: 'SP', priceFactor: 1.02 },
  { id: 'campinas', name: 'Campinas', uf: 'SP', priceFactor: 1.0 },
  { id: 'belo-horizonte', name: 'Belo Horizonte', uf: 'MG', priceFactor: 0.99 },
  { id: 'uberlandia', name: 'Uberlândia', uf: 'MG', priceFactor: 0.97 },
  { id: 'curitiba', name: 'Curitiba', uf: 'PR', priceFactor: 1.01 },
  { id: 'recife', name: 'Recife', uf: 'PE', priceFactor: 1.03 },
]

export const PRICE_MICROREGIONS: readonly PriceOption[] = MICROREGION_SPECS.map((spec) => ({
  id: spec.id,
  label: `${spec.name} · ${UF_NAME[spec.uf]}`,
  shortLabel: `${spec.name}/${spec.uf}`,
}))

/** SKU e UF sob pressão de preço no canônico: Dipirona em Minas Gerais. */
const PRESSURED_SKU_ID = 'dipirona-500-20'
const PRESSURED_UF: UfCode = 'MG'

/**
 * Efeito da redução de preço do concorrente sobre o índice relativo, em pontos.
 *
 * NOTA: não consta do ESCOPO. O sinal é o que importa: onde o concorrente
 * cortou preço, a Hypera passa a figurar acima da paridade.
 */
const PRESSURE_PP = 4

const JITTER_HALF_RANGE_PP = 2.4

export type PriceCell = {
  readonly skuId: string
  readonly channelId: string
  readonly microregionId: string
  readonly hyperaPriceBrl: number
  readonly competitorPriceBrl: number
  readonly ipr: number
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Malha de preço SKU × canal × microrregião.
 *
 * O índice de cada célula nasce do IPR consolidado mais um degrau estrutural e
 * um ruído semeado; ao final a malha inteira é deslocada para que a média volte
 * a ser exatamente o IPR canônico. A tela pode ser fatiada sem que o número
 * consolidado deixe de bater com a Visão Geral.
 */
function buildCells(): readonly PriceCell[] {
  const random = createRandom(MOCK_SEED + 18)

  const raw = PRICE_SKUS.flatMap((sku) =>
    CHANNEL_SPECS.flatMap((channel) =>
      MICROREGION_SPECS.map((microregion) => {
        const pressure =
          sku.id === PRESSURED_SKU_ID && microregion.uf === PRESSURED_UF ? PRESSURE_PP : 0
        const jitter = (random() - 0.5) * 2 * JITTER_HALF_RANGE_PP

        return {
          skuId: sku.id,
          channelId: channel.id,
          microregionId: microregion.id,
          competitorPriceBrl: round2(
            basePriceFor(sku.id) * channel.priceFactor * microregion.priceFactor,
          ),
          rawIpr: RELATIVE_PRICE_KPI.value + pressure + jitter,
        }
      }),
    ),
  )

  const mean = raw.reduce((sum, cell) => sum + cell.rawIpr, 0) / raw.length
  const shift = RELATIVE_PRICE_KPI.value - mean

  return raw.map(({ rawIpr, ...cell }) => {
    const ipr = rawIpr + shift
    return {
      ...cell,
      ipr,
      hyperaPriceBrl: round2((cell.competitorPriceBrl * ipr) / PARITY_INDEX),
    }
  })
}

export const PRICE_CELLS: readonly PriceCell[] = buildCells()

export type PriceFilter = {
  readonly skuId: string | null
  readonly channelId: string | null
  readonly microregionId: string | null
}

export const EMPTY_PRICE_FILTER: PriceFilter = {
  skuId: null,
  channelId: null,
  microregionId: null,
}

export type PriceGroup = {
  readonly id: string
  readonly label: string
  readonly shortLabel: string
  readonly hyperaPriceBrl: number
  readonly competitorPriceBrl: number
  readonly ipr: number
  /** Distância para a paridade, em pontos percentuais. */
  readonly gapPp: number
  /** Diferença de preço por embalagem, em reais. */
  readonly gapBrl: number
  readonly cellCount: number
}

function matches(cell: PriceCell, filter: PriceFilter): boolean {
  if (filter.skuId !== null && cell.skuId !== filter.skuId) return false
  if (filter.channelId !== null && cell.channelId !== filter.channelId) return false
  if (filter.microregionId !== null && cell.microregionId !== filter.microregionId) return false
  return true
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/**
 * Agrega um conjunto de células. Sem volume por recorte, a média é simples —
 * ponderar por um peso que a plataforma não tem seria inventar dado.
 */
function aggregate(option: PriceOption, cells: readonly PriceCell[]): PriceGroup {
  const hyperaPriceBrl = mean(cells.map((cell) => cell.hyperaPriceBrl))
  const competitorPriceBrl = mean(cells.map((cell) => cell.competitorPriceBrl))
  const ipr = mean(cells.map((cell) => cell.ipr))

  return {
    id: option.id,
    label: option.label,
    shortLabel: option.shortLabel,
    hyperaPriceBrl,
    competitorPriceBrl,
    ipr,
    gapPp: ipr - PARITY_INDEX,
    gapBrl: hyperaPriceBrl - competitorPriceBrl,
    cellCount: cells.length,
  }
}

export function optionsFor(dimension: PriceDimension): readonly PriceOption[] {
  if (dimension === 'sku') return PRICE_SKUS
  if (dimension === 'channel') return PRICE_CHANNELS
  return PRICE_MICROREGIONS
}

function keyOf(cell: PriceCell, dimension: PriceDimension): string {
  if (dimension === 'sku') return cell.skuId
  if (dimension === 'channel') return cell.channelId
  return cell.microregionId
}

/**
 * Comparação por recorte. O filtro da própria dimensão comparada é ignorado —
 * é ela que abre as barras.
 */
export function groupPrices(
  dimension: PriceDimension,
  filter: PriceFilter,
): readonly PriceGroup[] {
  const selected = PRICE_CELLS.filter((cell) => matches(cell, filter))

  return optionsFor(dimension)
    .map((option) =>
      aggregate(
        option,
        selected.filter((cell) => keyOf(cell, dimension) === option.id),
      ),
    )
    .filter((group) => group.cellCount > 0)
}

const CONSOLIDATED_OPTION: PriceOption = {
  id: 'consolidado',
  label: 'Leitura consolidada',
  shortLabel: 'Consolidado',
}

/** Leitura consolidada do recorte ativo. Sem filtro, devolve o IPR canônico. */
export function summarizePrices(filter: PriceFilter): PriceGroup {
  return aggregate(
    CONSOLIDATED_OPTION,
    PRICE_CELLS.filter((cell) => matches(cell, filter)),
  )
}

/** Recorte crítico do período: a molécula e a dimensão do movimento canônico. */
export const PRESSURED_CUT = {
  dimension: 'microregion' as PriceDimension,
  skuId: PRESSURED_SKU_ID,
  label: 'Abrir recorte de Dipirona por microrregião',
}

export type PricePosition = 'below' | 'parity' | 'above'

export const PRICE_POSITION_LABEL: Record<PricePosition, string> = {
  below: 'Abaixo do concorrente',
  parity: 'Em paridade',
  above: 'Acima do concorrente',
}

/**
 * Só a posição acima do concorrente recebe cor: é a que abre risco de perda de
 * share. Estar abaixo da paridade é leitura de margem, não alerta.
 */
export const PRICE_POSITION_TONE: Record<PricePosition, SemanticTone> = {
  below: 'neutral',
  parity: 'neutral',
  above: 'attention',
}

const PARITY_BAND_PP = 1

export function pricePosition(ipr: number): PricePosition {
  const gap = ipr - PARITY_INDEX
  if (gap > PARITY_BAND_PP) return 'above'
  if (gap < -PARITY_BAND_PP) return 'below'
  return 'parity'
}

/** Preço unitário com centavos: `R$ 18,90`. */
export function formatUnitPrice(value: number): string {
  return `R$ ${formatDecimal(value, 2)}`
}

/** Diferença de preço por embalagem, sempre assinada: `R$ −0,26`. */
export function formatPriceGapBrl(value: number): string {
  return `R$ ${formatDecimal(value, 2, 'always')}`
}

export function formatIndex(value: number): string {
  return formatDecimal(value, 1)
}

export const PRICE_ATTESTATION: Attestation = combine([
  ...CHANNEL_SPECS.map((channel) => channel.attestation),
  IQVIA,
])

export type MoveKind = 'price' | 'launch' | 'promotion'

export const MOVE_KIND_LABEL: Record<MoveKind, string> = {
  price: 'Mudança de preço',
  launch: 'Lançamento',
  promotion: 'Promoção',
}

export type CompetitiveMove = {
  readonly id: string
  readonly molecule: string
  /** Posição de mercado do concorrente, nunca a razão social. */
  readonly competitor: string
  readonly kind: MoveKind
  readonly date: IsoDate
  readonly description: string
  /** Praça ou canal atingido pelo movimento. */
  readonly scope: string
  readonly impactLabel: string
  /** Impacto em share, em pontos percentuais. `null` enquanto estiver em apuração. */
  readonly impactPp: number | null
  /** Decisão que dá encaminhamento ao movimento, quando já existe. */
  readonly decisionId: string | null
  readonly attestation: Attestation
}

const COMPETITOR_A = 'Concorrente A'
const COMPETITOR_B = 'Concorrente B'
const GENERIC_LEADER = 'Genérico líder'

const IN_REVIEW = 'Impacto em apuração'

/**
 * Movimentos observados na janela. Só o movimento canônico carrega impacto
 * numérico — os demais ficam com o impacto em apuração até a seção 10 do ESCOPO
 * dimensioná-los, no mesmo critério usado na Ficha de Produto.
 */
export const COMPETITIVE_MOVES: readonly CompetitiveMove[] = [
  {
    id: 'dipirona-mg-preco',
    molecule: 'Dipirona',
    competitor: COMPETITOR_A,
    kind: 'price',
    date: daysAgo(6),
    description: 'Concorrente reduziu preço de Dipirona em MG',
    scope: `${UF_NAME.MG} · todos os canais`,
    impactLabel: 'Perda estimada de share',
    impactPp: -1.3,
    decisionId: 'D-2026-0002',
    attestation: combine([SCANNTECH, IQVIA]),
  },
  {
    id: 'dipirona-encarte-grandes-redes',
    molecule: 'Dipirona',
    competitor: COMPETITOR_B,
    kind: 'promotion',
    date: daysAgo(19),
    description: 'Concorrente ampliou encarte de Dipirona nas grandes redes',
    scope: 'Grandes redes · nacional',
    impactLabel: IN_REVIEW,
    impactPp: null,
    decisionId: null,
    attestation: GRANDES_REDES,
  },
  {
    id: 'losartana-lancamento-c60',
    molecule: 'Losartana',
    competitor: GENERIC_LEADER,
    kind: 'launch',
    date: daysAgo(11),
    description: 'Genérico líder lançou apresentação de Losartana com 60 comprimidos',
    scope: 'Nacional',
    impactLabel: IN_REVIEW,
    impactPp: null,
    decisionId: null,
    attestation: IQVIA,
  },
  {
    id: 'losartana-atacado-reajuste',
    molecule: 'Losartana',
    competitor: COMPETITOR_A,
    kind: 'price',
    date: daysAgo(27),
    description: 'Concorrente reajustou preço de Losartana no atacado',
    scope: 'Atacado e distribuidores · Sudeste',
    impactLabel: IN_REVIEW,
    impactPp: null,
    decisionId: null,
    attestation: NEOGRID_DISTRIBUIDORES,
  },
  {
    id: 'paracetamol-encarte-redes-regionais',
    molecule: 'Paracetamol',
    competitor: COMPETITOR_B,
    kind: 'promotion',
    date: daysAgo(4),
    description: 'Concorrente iniciou encarte de Paracetamol em redes regionais',
    scope: `Redes regionais · ${UF_NAME.PE}`,
    impactLabel: IN_REVIEW,
    impactPp: null,
    decisionId: null,
    attestation: SCANNTECH,
  },
  {
    id: 'paracetamol-lancamento-750',
    molecule: 'Paracetamol',
    competitor: GENERIC_LEADER,
    kind: 'launch',
    date: daysAgo(33),
    description: 'Genérico líder lançou Paracetamol 750mg com 30 comprimidos',
    scope: 'Nacional',
    impactLabel: IN_REVIEW,
    impactPp: null,
    decisionId: null,
    attestation: IQVIA,
  },
]

export type MoleculeTimeline = {
  readonly molecule: string
  readonly moves: readonly CompetitiveMove[]
  readonly attestation: Attestation
}

/** Movimentos agrupados por molécula, do mais recente para o mais antigo. */
export const MOLECULE_TIMELINES: readonly MoleculeTimeline[] = MOLECULES.map((molecule) => {
  const moves = COMPETITIVE_MOVES.filter((move) => move.molecule === molecule).sort((a, b) =>
    a.date < b.date ? 1 : -1,
  )

  return {
    molecule,
    moves,
    attestation: combine(moves.map((move) => move.attestation)),
  }
}).filter((timeline) => timeline.moves.length > 0)

export const MOVES_ATTESTATION: Attestation = combine(
  COMPETITIVE_MOVES.map((move) => move.attestation),
)
