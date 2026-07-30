import { BRAZIL_UF_TILES, type UfCode } from '../assets/brazil-uf'
import { combine, type Attestation } from '../domain/attestation'
import type { ProductId } from '../design/tokens'
import { ACCOUNTS } from './customers'
import { UF_OPPORTUNITY } from './opportunities'
import { createRandom, MOCK_SEED } from './random'
import { CRM_SFA, IQVIA, NEOGRID, NEOGRID_DISTRIBUIDORES, SAP, SCANNTECH } from './sources'

/**
 * Mapa inteligente da Torre (seção 2, S1).
 *
 * Nove camadas selecionáveis sobre a mesma geografia e um drill de seis níveis.
 * A camada troca o que a cor significa; o drill troca o que o clique abre. As
 * duas coisas são ortogonais de propósito — o executivo escolhe a pergunta
 * (camada) e a profundidade (nível) sem trocar de tela.
 *
 * NOTA: não constam do ESCOPO — os valores por UF de oito das nove camadas e
 * toda a hierarquia abaixo de Estado. A camada de oportunidade é a única
 * canônica: vem da seção 10.2, via `UF_OPPORTUNITY`.
 */

export type MapLayerId =
  | 'opportunity'
  | 'sellout'
  | 'market_share'
  | 'distribution'
  | 'stockout'
  | 'relative_price'
  | 'commercial_coverage'
  | 'target_doctors'
  | 'sample_allocation'

export type MapLayer = {
  readonly id: MapLayerId
  readonly label: string
  readonly product: ProductId
  readonly unit: 'money' | 'percent' | 'index' | 'integer'
  /** Métrica em que valor alto é ruim — a rampa de cor inverte. */
  readonly inverted: boolean
  readonly question: string
  readonly route: string
  readonly attestation: Attestation
}

export const MAP_LAYERS: readonly MapLayer[] = [
  {
    id: 'opportunity',
    label: 'Oportunidade priorizada',
    product: 'hub',
    unit: 'money',
    inverted: false,
    question: 'Onde está o dinheiro que a plataforma já sabe como capturar?',
    route: '/hub/radar',
    attestation: combine([SCANNTECH, NEOGRID, IQVIA]),
  },
  {
    id: 'sellout',
    label: 'Sell-out',
    product: 'hub',
    unit: 'money',
    inverted: false,
    question: 'Onde o produto está saindo da gôndola?',
    route: '/hub',
    attestation: SCANNTECH,
  },
  {
    id: 'market_share',
    label: 'Participação de mercado',
    product: 'hub',
    unit: 'percent',
    inverted: false,
    question: 'Onde ganhamos e onde perdemos espaço?',
    route: '/hub/competitiva',
    attestation: IQVIA,
  },
  {
    id: 'distribution',
    label: 'Distribuição numérica',
    product: 'hub',
    unit: 'percent',
    inverted: false,
    question: 'Em quantos pontos de venda o produto está presente?',
    route: '/hub/cliente',
    attestation: NEOGRID,
  },
  {
    id: 'stockout',
    label: 'Ruptura',
    product: 'hub',
    unit: 'percent',
    inverted: true,
    question: 'Onde falta produto na ponta?',
    route: '/hub/causa-raiz',
    attestation: NEOGRID_DISTRIBUIDORES,
  },
  {
    id: 'relative_price',
    label: 'Preço relativo',
    product: 'rgm',
    unit: 'index',
    inverted: true,
    question: 'Onde estamos caros contra o concorrente direto?',
    route: '/rgm/competitividade',
    attestation: SCANNTECH,
  },
  {
    id: 'commercial_coverage',
    label: 'Cobertura comercial',
    product: 'gtm',
    unit: 'percent',
    inverted: false,
    question: 'Onde a força de vendas está chegando?',
    route: '/gtm/territorios',
    attestation: CRM_SFA,
  },
  {
    id: 'target_doctors',
    label: 'Médicos-alvo cobertos',
    product: 'gtm',
    unit: 'percent',
    inverted: false,
    question: 'Onde o médico de alto potencial está sendo visitado?',
    route: '/gtm/segmentacao',
    attestation: combine([IQVIA, CRM_SFA]),
  },
  {
    id: 'sample_allocation',
    label: 'Amostras alocadas',
    product: 'ag',
    unit: 'integer',
    inverted: false,
    question: 'Para onde a amostra está indo?',
    route: '/ag/otimizador',
    attestation: combine([SAP, CRM_SFA]),
  },
]

export const DEFAULT_LAYER: MapLayerId = 'opportunity'

const LAYER_RANGE: Record<Exclude<MapLayerId, 'opportunity'>, { min: number; max: number }> = {
  sellout: { min: 1_200_000, max: 42_000_000 },
  market_share: { min: 9.4, max: 27.8 },
  distribution: { min: 48.2, max: 91.6 },
  stockout: { min: 2.1, max: 14.7 },
  relative_price: { min: 92.4, max: 108.2 },
  commercial_coverage: { min: 44.0, max: 94.5 },
  target_doctors: { min: 38.6, max: 88.2 },
  sample_allocation: { min: 340, max: 29_500 },
}

/** Todas as UFs desenhadas no mapa — a fonte é o próprio traçado. */
const ALL_UFS: readonly UfCode[] = BRAZIL_UF_TILES.map((tile) => tile.code)

/**
 * Valores por UF, gerados uma vez com semente fixa.
 *
 * A semente deriva do identificador da camada, então cada camada tem um
 * desenho próprio e estável: a demonstração é idêntica em qualquer máquina, e
 * trocar de camada muda o mapa de verdade em vez de repintar o mesmo padrão.
 */
function buildLayerValues(): Record<MapLayerId, Partial<Record<UfCode, number>>> {
  const values = {} as Record<MapLayerId, Partial<Record<UfCode, number>>>

  values.opportunity = Object.fromEntries(
    ALL_UFS.map((uf) => [uf, UF_OPPORTUNITY[uf]?.impactBrl ?? 0]),
  ) as Partial<Record<UfCode, number>>

  let offset = 1
  for (const layer of MAP_LAYERS) {
    if (layer.id === 'opportunity') continue
    const range = LAYER_RANGE[layer.id]
    const random = createRandom(MOCK_SEED + offset * 977)
    offset += 1
    values[layer.id] = Object.fromEntries(
      ALL_UFS.map((uf) => {
        const raw = range.min + random() * (range.max - range.min)
        const rounded = range.max > 1_000 ? Math.round(raw / 100) * 100 : Math.round(raw * 10) / 10
        return [uf, rounded]
      }),
    ) as Partial<Record<UfCode, number>>
  }

  return values
}

export const LAYER_VALUES = buildLayerValues()

export function layerValue(layer: MapLayerId, uf: UfCode): number | undefined {
  const value = LAYER_VALUES[layer][uf]
  if (layer === 'opportunity' && value === 0) return undefined
  return value
}

/** Extremos da camada, para normalizar a rampa de cor sem escala fixa. */
export function layerExtent(layer: MapLayerId): { min: number; max: number } {
  const values = ALL_UFS.map((uf) => layerValue(layer, uf)).filter(
    (value): value is number => value !== undefined,
  )
  if (values.length === 0) return { min: 0, max: 1 }
  return { min: Math.min(...values), max: Math.max(...values) }
}

export function findLayer(id: MapLayerId): MapLayer {
  return MAP_LAYERS.find((layer) => layer.id === id) as MapLayer
}

/* ------------------------------------------------------------------ */
/* Drill: Estado → Município → Território → Cliente → Loja → Produto   */
/* ------------------------------------------------------------------ */

export type DrillLevelId =
  | 'estado'
  | 'municipio'
  | 'territorio'
  | 'cliente'
  | 'loja'
  | 'produto'

export const DRILL_ORDER: readonly DrillLevelId[] = [
  'estado',
  'municipio',
  'territorio',
  'cliente',
  'loja',
  'produto',
]

export const DRILL_LABEL: Record<DrillLevelId, string> = {
  estado: 'Estado',
  municipio: 'Município',
  territorio: 'Território',
  cliente: 'Cliente',
  loja: 'Loja',
  produto: 'Produto',
}

export type DrillNode = {
  readonly id: string
  readonly level: DrillLevelId
  readonly name: string
  readonly value: number
  /** Participação do nó no total do nível acima. */
  readonly sharePercent: number
}

/**
 * O drill é construído sob demanda a partir do nó pai, com semente derivada do
 * seu identificador. Descer sempre pelo mesmo caminho devolve sempre os mesmos
 * filhos — e a soma dos filhos fecha o valor do pai, que é o que torna o drill
 * uma decomposição e não uma lista solta.
 */
function seedOf(key: string): number {
  let hash = MOCK_SEED
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) % 2_147_483_647
  }
  return hash
}

const MUNICIPALITIES: Record<string, readonly string[]> = {
  SP: ['São Paulo', 'Campinas', 'Ribeirão Preto', 'Santos', 'Sorocaba'],
  RJ: ['Rio de Janeiro', 'Niterói', 'Duque de Caxias', 'Campos dos Goytacazes'],
  MG: ['Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora'],
}

const GENERIC_MUNICIPALITIES = ['Capital', 'Região metropolitana', 'Interior norte', 'Interior sul']

const TERRITORY_SUFFIX = ['Centro', 'Norte', 'Sul', 'Leste', 'Oeste']

const STORE_SUFFIX = ['Unidade Centro', 'Unidade Shopping', 'Unidade Bairro', 'Unidade Avenida']

const PRODUCTS_AT_STORE = [
  'Losartana 50mg c/30',
  'Dipirona 500mg c/20',
  'Paracetamol 750mg c/20',
  'Hydraserum FPS 50',
]

function namesFor(level: DrillLevelId, parent: DrillNode): readonly string[] {
  if (level === 'municipio') {
    return MUNICIPALITIES[parent.id] ?? GENERIC_MUNICIPALITIES
  }
  if (level === 'territorio') {
    return TERRITORY_SUFFIX.map((suffix) => `${parent.name} — ${suffix}`)
  }
  if (level === 'cliente') {
    return ACCOUNTS.slice(0, 4).map((account) => account.name)
  }
  if (level === 'loja') {
    return STORE_SUFFIX.map((suffix) => `${parent.name} · ${suffix}`)
  }
  return PRODUCTS_AT_STORE
}

/**
 * Reparte o valor do pai entre os filhos por maior resto, de modo que a soma
 * feche exatamente. Um drill cujo total não bate com o nível de cima ensina o
 * executivo a desconfiar da tela inteira.
 */
export function drillInto(parent: DrillNode): readonly DrillNode[] {
  const index = DRILL_ORDER.indexOf(parent.level)
  const nextLevel = DRILL_ORDER[index + 1]
  if (!nextLevel) return []

  const names = namesFor(nextLevel, parent)
  const random = createRandom(seedOf(`${parent.id}:${nextLevel}`))
  const weights = names.map(() => 0.4 + random())
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)

  const raw = weights.map((weight) => (parent.value * weight) / totalWeight)
  const floored = raw.map((value) => Math.floor(value))
  let remainder = Math.round(parent.value - floored.reduce((sum, value) => sum + value, 0))

  const order = raw
    .map((value, position) => ({ position, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction)

  const values = [...floored]
  for (const { position } of order) {
    if (remainder <= 0) break
    values[position] = (values[position] ?? 0) + 1
    remainder -= 1
  }

  return names.map((name, position) => {
    const value = values[position] ?? 0
    return {
      id: `${parent.id}/${nextLevel}-${position}`,
      level: nextLevel,
      name,
      value,
      sharePercent: parent.value === 0 ? 0 : Math.round((value / parent.value) * 1000) / 10,
    }
  })
}

export function rootNode(uf: UfCode, layer: MapLayerId, name: string): DrillNode {
  return {
    id: uf,
    level: 'estado',
    name,
    value: layerValue(layer, uf) ?? 0,
    sharePercent: 100,
  }
}

export const MAP_ATTESTATION: Attestation = combine([SCANNTECH, NEOGRID, IQVIA, CRM_SFA, SAP])
