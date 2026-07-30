import { UF_NAME, type UfCode } from '../assets/brazil-uf'
import { combine, type Attestation } from '../domain/attestation'
import { daysAgo, formatDate, type IsoDate } from '../domain/today'
import {
  COMPETITIVE_MOVES,
  EMPTY_PRICE_FILTER,
  PARITY_INDEX,
  PRICE_ATTESTATION,
  PRICE_CELLS,
  PRICE_CHANNELS,
  PRICE_MICROREGIONS,
  PRICE_SKUS,
  pricePosition,
  summarizePrices,
  type CompetitiveMove,
  type PriceCell,
  type PricePosition,
} from './competitive'
import { findDecision, type DecisionRef } from './decisions'
import { MARKET_KPIS, type Kpi } from './kpis'
import { PRICE_CORRIDOR } from './pricing'
import { createRandom, MOCK_SEED } from './random'
import { IQVIA, SCANNTECH } from './sources'

/**
 * Índice de Competitividade (RGM, módulo 3.2).
 *
 * O índice consolidado é o mesmo IPR da Visão Geral — 100 é paridade com o
 * concorrente. A tela existe para decompor esse número: a malha de preço já
 * fechada em `competitive.ts` é reagrupada por molécula, canal e região, e cada
 * recorte devolve quanto desloca o consolidado. Como os recortes particionam a
 * malha, a soma das puxadas é exatamente zero — nenhuma parcela é estimada.
 */

function requireKpi(id: string): Kpi {
  const kpi = MARKET_KPIS.find((candidate) => candidate.id === id)
  if (!kpi) throw new Error(`KPI ausente na seção 10: ${id}`)
  return kpi
}

/** Índice consolidado de competitividade de preço: 98,6 e −1,4 pp na semana. */
export const INDEX_KPI = requireKpi('relative-price')

export const SHARE_KPI = requireKpi('market-share')

export const SELLOUT_KPI = requireKpi('sellout')

/** Leitura consolidada da malha inteira. Bate com o IPR canônico. */
export const CONSOLIDATED = summarizePrices(EMPTY_PRICE_FILTER)

/** Distância do índice consolidado para a paridade, em pontos percentuais. */
export const INDEX_GAP_PP = CONSOLIDATED.gapPp

/**
 * Faixa de paridade operacional. É o mesmo corredor do cockpit de preço: dentro
 * dela a competitividade é decisão tomada, fora dela vira exceção com dono.
 */
export const PARITY_BAND = PRICE_CORRIDOR

export const PARITY_LINE = PARITY_INDEX

export type IndexCut = 'molecule' | 'channel' | 'region'

export const INDEX_CUTS: readonly IndexCut[] = ['molecule', 'channel', 'region']

export const INDEX_CUT_LABEL: Record<IndexCut, string> = {
  molecule: 'Molécula',
  channel: 'Canal',
  region: 'Região',
}

export const INDEX_CUT_DESCRIPTION: Record<IndexCut, string> = {
  molecule: 'Índice por molécula do portfólio de genéricos.',
  channel: 'Índice por canal de venda, do independente ao atacado.',
  region: 'Índice por unidade da federação onde há praça monitorada.',
}

type CutOption = {
  readonly id: string
  readonly label: string
  readonly shortLabel: string
  /** Detalhe secundário do recorte, quando existe. */
  readonly detail: string | null
}

function parseUf(shortLabel: string): UfCode {
  const code = shortLabel.split('/')[1]
  if (code === undefined || !(code in UF_NAME)) {
    throw new Error(`Microrregião sem UF reconhecível: ${shortLabel}`)
  }
  return code as UfCode
}

const UF_BY_MICROREGION = new Map<string, UfCode>(
  PRICE_MICROREGIONS.map((option) => [option.id, parseUf(option.shortLabel)]),
)

function ufOf(microregionId: string): UfCode {
  const uf = UF_BY_MICROREGION.get(microregionId)
  if (!uf) throw new Error(`Microrregião fora da malha: ${microregionId}`)
  return uf
}

const MOLECULE_OPTIONS: readonly CutOption[] = PRICE_SKUS.map((sku) => ({
  id: sku.id,
  label: sku.shortLabel,
  shortLabel: sku.shortLabel,
  detail: sku.label,
}))

const CHANNEL_OPTIONS: readonly CutOption[] = PRICE_CHANNELS.map((channel) => ({
  id: channel.id,
  label: channel.label,
  shortLabel: channel.shortLabel,
  detail: null,
}))

/** UFs na ordem em que aparecem na malha de microrregiões. */
const REGION_OPTIONS: readonly CutOption[] = PRICE_MICROREGIONS.reduce<CutOption[]>(
  (acc, option) => {
    const uf = ufOf(option.id)
    if (acc.some((entry) => entry.id === uf)) return acc
    acc.push({ id: uf, label: UF_NAME[uf], shortLabel: uf, detail: null })
    return acc
  },
  [],
)

function optionsFor(cut: IndexCut): readonly CutOption[] {
  if (cut === 'molecule') return MOLECULE_OPTIONS
  if (cut === 'channel') return CHANNEL_OPTIONS
  return REGION_OPTIONS
}

function keyOf(cell: PriceCell, cut: IndexCut): string {
  if (cut === 'molecule') return cell.skuId
  if (cut === 'channel') return cell.channelId
  return ufOf(cell.microregionId)
}

/** Decisão canônica de competitividade: revisão de preço de Dipirona em MG. */
export const CRITICAL_DECISION: DecisionRef = (() => {
  const decision = findDecision('D-2026-0002')
  if (!decision) throw new Error('Decisão D-2026-0002 ausente do mock')
  return decision
})()

/** Movimento do concorrente que explica a pressão sobre o índice. */
export const CRITICAL_MOVE: CompetitiveMove = (() => {
  const move = COMPETITIVE_MOVES.find(
    (candidate) => candidate.decisionId === CRITICAL_DECISION.id && candidate.kind === 'price',
  )
  if (!move) throw new Error('Movimento canônico de preço ausente do mock')
  return move
})()

/** Perda de share atribuída ao movimento, em pontos percentuais. */
export const CRITICAL_SHARE_IMPACT_PP: number = (() => {
  const impact = CRITICAL_MOVE.impactPp
  if (impact === null) throw new Error('Movimento canônico sem impacto de share')
  return impact
})()

/**
 * Cortes em que a decisão canônica cai sobre um único valor. O movimento
 * atingiu todos os canais, então nenhum canal isolado responde por ele — nesse
 * corte o impacto financeiro fica em apuração, como na Inteligência Competitiva.
 */
const DECISION_ATTRIBUTABLE: Record<IndexCut, boolean> = {
  molecule: true,
  channel: false,
  region: true,
}

export type IndexSlice = {
  readonly id: string
  readonly label: string
  readonly shortLabel: string
  readonly detail: string | null
  readonly ipr: number
  /** Distância do recorte para a paridade, em pontos percentuais. */
  readonly gapPp: number
  /** Peso do recorte na malha, de 0 a 1. */
  readonly weight: number
  /** Quanto o recorte desloca o índice consolidado, em pontos. Soma zero. */
  readonly contributionPp: number
  readonly cellCount: number
  readonly position: PricePosition
  /** Impacto financeiro já dimensionado. `null` enquanto estiver em apuração. */
  readonly exposureBrl: number | null
  readonly decisionId: string | null
  readonly attestation: Attestation
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function buildSlices(cut: IndexCut): readonly IndexSlice[] {
  const total = PRICE_CELLS.length

  const raw = optionsFor(cut).map((option) => {
    const cells = PRICE_CELLS.filter((cell) => keyOf(cell, cut) === option.id)
    const ipr = mean(cells.map((cell) => cell.ipr))
    const weight = cells.length / total

    return {
      option,
      cells,
      ipr,
      weight,
      contributionPp: (ipr - CONSOLIDATED.ipr) * weight,
    }
  })

  /**
   * O recorte que carrega o índice acima da paridade é o mesmo da pressão
   * canônica — Dipirona no corte de molécula, e a praça correspondente no corte
   * de região. É a ele que a decisão de R$ 3,2M se prende.
   */
  const critical = DECISION_ATTRIBUTABLE[cut]
    ? raw.reduce((worst, entry) => (entry.ipr > worst.ipr ? entry : worst))
    : null

  return raw
    .filter((entry) => entry.cells.length > 0)
    .map(({ option, cells, ipr, weight, contributionPp }) => {
      const isCritical = critical !== null && critical.option.id === option.id

      return {
        id: option.id,
        label: option.label,
        shortLabel: option.shortLabel,
        detail: option.detail,
        ipr,
        gapPp: ipr - PARITY_INDEX,
        weight,
        contributionPp,
        cellCount: cells.length,
        position: pricePosition(ipr),
        exposureBrl: isCritical ? CRITICAL_DECISION.impactBrl : null,
        decisionId: isCritical ? CRITICAL_DECISION.id : null,
        attestation: PRICE_ATTESTATION,
      }
    })
}

const SLICES_BY_CUT: Record<IndexCut, readonly IndexSlice[]> = {
  molecule: buildSlices('molecule'),
  channel: buildSlices('channel'),
  region: buildSlices('region'),
}

export type SliceOrder = 'pull' | 'index'

export const SLICE_ORDERS: readonly SliceOrder[] = ['pull', 'index']

export const SLICE_ORDER_LABEL: Record<SliceOrder, string> = {
  pull: 'Puxada sobre o índice',
  index: 'Índice do recorte',
}

/** Recortes de um corte, do que mais puxa para cima ao que mais puxa para baixo. */
export function sliceIndex(cut: IndexCut, order: SliceOrder = 'pull'): readonly IndexSlice[] {
  const slices = [...SLICES_BY_CUT[cut]]
  if (order === 'index') return slices.sort((a, b) => b.ipr - a.ipr)
  return slices.sort((a, b) => b.contributionPp - a.contributionPp)
}

export type IndexDrivers = {
  /** Recorte que mais empurra o índice para cima (posição mais cara). */
  readonly up: IndexSlice | null
  /** Recorte que mais puxa o índice para baixo. */
  readonly down: IndexSlice | null
}

export function indexDrivers(cut: IndexCut): IndexDrivers {
  const ordered = sliceIndex(cut, 'pull')
  return {
    up: ordered[0] ?? null,
    down: ordered[ordered.length - 1] ?? null,
  }
}

/** Maior puxada em módulo do corte, para escalar a barra divergente. */
export function pullScale(cut: IndexCut): number {
  const values = SLICES_BY_CUT[cut].map((slice) => Math.abs(slice.contributionPp))
  return values.length === 0 ? 0 : Math.max(...values)
}

/**
 * Amplitude do índice dentro do corte, em pontos. Quanto maior, mais desigual é
 * a competitividade entre os recortes — e menos o consolidado descreve o todo.
 */
export function sliceSpreadPp(cut: IndexCut): number {
  const values = SLICES_BY_CUT[cut].map((slice) => slice.ipr)
  if (values.length === 0) return 0
  return Math.max(...values) - Math.min(...values)
}

export type IndexPoint = {
  readonly date: IsoDate
  /** Rótulo curto do eixo X, ex.: `24/07`. */
  readonly label: string
  readonly index: number
}

const SERIES_WEEKS = 12
const WEEK_DAYS = 7

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

/** Índice da semana anterior, implícito na variação canônica de −1,4 pp. */
export const PREVIOUS_INDEX = round1(INDEX_KPI.value - INDEX_KPI.delta)

/**
 * NOTA: não consta do ESCOPO — as 10 leituras semanais anteriores à penúltima.
 *
 * Só as duas últimas semanas são canônicas: a corrente em 98,6 e a anterior no
 * valor que produz a variação de −1,4 pp. O trecho mais antigo é um passeio
 * semeado dentro da faixa de paridade, para que a queda recente tenha contra o
 * que ser lida. Semente fixa: a curva é a mesma em qualquer máquina.
 */
const SERIES_JITTER_HALF_RANGE_PP = 1.1

function buildSeries(): readonly IndexPoint[] {
  const random = createRandom(MOCK_SEED + 42)

  const values = Array.from({ length: SERIES_WEEKS - 2 }, () =>
    round1(PREVIOUS_INDEX + (random() - 0.5) * 2 * SERIES_JITTER_HALF_RANGE_PP),
  )
  values.push(PREVIOUS_INDEX, INDEX_KPI.value)

  return values.map((index, position) => {
    const date = daysAgo((SERIES_WEEKS - 1 - position) * WEEK_DAYS)
    return { date, label: formatDate(date).slice(0, 5), index }
  })
}

export const INDEX_SERIES: readonly IndexPoint[] = buildSeries()

/** Domínio do eixo, folgado o bastante para conter série e faixa de paridade. */
export const INDEX_DOMAIN: readonly [number, number] = (() => {
  const values = INDEX_SERIES.map((point) => point.index)
  const low = Math.min(...values, PARITY_BAND.floor)
  const high = Math.max(...values, PARITY_BAND.ceiling)
  return [Math.floor(low - 1), Math.ceil(high + 1)]
})()

export const INDEX_TICKS: readonly number[] = Array.from(
  { length: INDEX_DOMAIN[1] - INDEX_DOMAIN[0] + 1 },
  (_, position) => INDEX_DOMAIN[0] + position,
).filter((value) => value % 2 === 0)

export const SERIES_ATTESTATION: Attestation = combine([SCANNTECH, IQVIA])

export const INDEX_ATTESTATION: Attestation = combine([PRICE_ATTESTATION, INDEX_KPI.attestation])

/** Atalho para o corte em que a pressão canônica aparece isolada por praça. */
export const CRITICAL_CUT: IndexCut = 'region'

export const CRITICAL_CUT_LABEL = 'Abrir decomposição por região'
