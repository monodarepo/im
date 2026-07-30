import type { UfCode } from '../assets/brazil-uf'
import { combine, isStale, type Attestation } from '../domain/attestation'
import { daysAgo, HOJE, type IsoDate } from '../domain/today'
import { MARKET_KPIS, SELLOUT_TOTAL_BRL, type Kpi } from './kpis'
import { SKUS } from './products'
import { OBSERVED_OUTLETS, UNIVERSE_OUTLETS } from './pulse'
import { createRandom, MOCK_SEED } from './random'
import { CRM_SFA, NEOGRID, NEOGRID_DISTRIBUIDORES, SAP, SCANNTECH } from './sources'

/**
 * Sortimento e Disponibilidade (GTM, módulo 2.7).
 *
 * A tese da tela é uma só: *não faz sentido oferecer todo o portfólio para todos
 * os clientes*. É aqui que o dado de sell-out deixa de ser relatório e vira
 * decisão comercial — o mix para de ser opinião do representante e passa a sair
 * do giro medido na loja, PDV por PDV. Por isso a recomendação de **não**
 * oferecer um SKU tem o mesmo peso da de oferecer: as duas nascem do mesmo
 * limiar de giro, e as duas carregam o número que as justifica.
 *
 * Origem dos números: ruptura estimada nacional, distribuição numérica e
 * sell-out do período são canônicos (seção 10 do ESCOPO), e a cobertura da
 * medição — 15.000 lojas observadas de um universo de 70.000 PDVs — vem de
 * `pulse.ts`. Giro por perfil, preços médios, rupturas por conta, pedidos
 * sugeridos e funil de lançamento não constam do ESCOPO e estão marcados um a um
 * com `NOTA:` abaixo. Todo agregado sai por cálculo: nenhum total é digitado.
 */

function kpiOf(id: string): Kpi {
  const found = MARKET_KPIS.find((candidate) => candidate.id === id)
  if (!found) throw new Error(`KPI ausente em MARKET_KPIS: ${id}`)
  return found
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function skuNameOf(skuId: string): string {
  const sku = SKUS.find((candidate) => candidate.id === skuId)
  if (!sku) throw new Error(`SKU ausente em SKUS: ${skuId}`)
  return sku.name
}

/* ------------------------------------------------------------------ */
/* 0. Âncoras canônicas e cobertura da medição                          */
/* ------------------------------------------------------------------ */

/** Ruptura estimada nacional e sua variação (seção 10 do ESCOPO). */
export const NATIONAL_STOCKOUT_PERCENT = kpiOf('stockout').value
export const NATIONAL_STOCKOUT_DELTA_POINTS = kpiOf('stockout').delta
export const NATIONAL_STOCKOUT_ATTESTATION = kpiOf('stockout').attestation

/** Distribuição numérica e sua variação (seção 10 do ESCOPO). */
export const NUMERIC_DISTRIBUTION_PERCENT = kpiOf('numeric-distribution').value
export const NUMERIC_DISTRIBUTION_DELTA_POINTS = kpiOf('numeric-distribution').delta
export const NUMERIC_DISTRIBUTION_ATTESTATION = kpiOf('numeric-distribution').attestation

/** Comparação dos indicadores canônicos, na forma em que o ESCOPO os declara. */
export const KPI_COMPARISON = kpiOf('stockout').comparison

/** Sell-out do período (seção 10 do ESCOPO). */
export const SELL_OUT_BRL = SELLOUT_TOTAL_BRL

/** Cobertura da leitura direta de sell-out, herdada do Market Pulse. */
export const OBSERVED_STORES = OBSERVED_OUTLETS
export const UNIVERSE_STORES = UNIVERSE_OUTLETS
export const OBSERVED_SHARE_PERCENT = round((OBSERVED_STORES / UNIVERSE_STORES) * 100, 1)

/**
 * NOTA: não consta do ESCOPO — janela de apuração do giro. Noventa dias é o
 * período mínimo em que o giro de um SKU se separa do ruído sazonal da praça.
 */
export const TURNOVER_WINDOW_DAYS = 90
export const TURNOVER_WINDOW_START: IsoDate = daysAgo(TURNOVER_WINDOW_DAYS)
export const TURNOVER_WINDOW_END: IsoDate = HOJE

/* ------------------------------------------------------------------ */
/* 1. Mix ideal por perfil de PDV                                       */
/* ------------------------------------------------------------------ */

export type OutletProfileId = 'neighborhood' | 'regional_chain' | 'high_traffic' | 'popular'

export const OUTLET_PROFILE_ORDER: readonly OutletProfileId[] = [
  'high_traffic',
  'regional_chain',
  'neighborhood',
  'popular',
]

export const OUTLET_PROFILE_LABEL: Record<OutletProfileId, string> = {
  neighborhood: 'Farmácia de bairro',
  regional_chain: 'Rede regional',
  high_traffic: 'Drogaria de alto fluxo',
  popular: 'PDV popular',
}

export const OUTLET_PROFILE_DESCRIPTION: Record<OutletProfileId, string> = {
  neighborhood: 'Balcão único, cliente recorrente, gôndola curta',
  regional_chain: 'Compra centralizada, sortimento negociado por contrato',
  high_traffic: 'Alto fluxo de passagem, gôndola larga e reposição diária',
  popular: 'Preço como primeiro critério, cesta concentrada em poucos itens',
}

export type MixDecision = 'in' | 'out'

export const MIX_DECISION_LABEL: Record<MixDecision, string> = {
  in: 'No mix',
  out: 'Fora do mix',
}

/**
 * NOTA: não consta do ESCOPO — giro mínimo para um SKU entrar no mix, em
 * unidades por loja por mês. Abaixo dele o item não paga o espaço de gôndola
 * nem o custo de reposição, e a recomendação passa a ser não oferecer.
 */
export const MIX_ENTRY_THRESHOLD_UNITS = 18

type TurnoverEntry = {
  readonly profileId: OutletProfileId
  readonly skuId: string
  /** Giro medido nas lojas observadas: unidades por loja por mês. */
  readonly monthlyUnitsPerStore: number
  readonly rationale: string
}

/**
 * NOTA: não consta do ESCOPO — o giro de cada SKU em cada perfil de PDV. É o
 * dado que sustenta a tela inteira: o mix, o preço da ruptura e a quantidade do
 * pedido sugerido saem todos daqui, e nenhum deles é digitado duas vezes.
 */
const TURNOVER: readonly TurnoverEntry[] = [
  {
    profileId: 'high_traffic',
    skuId: 'dipirona-500-20',
    monthlyUnitsPerStore: 121,
    rationale: 'Maior giro medido do portfólio: item de reposição diária.',
  },
  {
    profileId: 'high_traffic',
    skuId: 'losartana-50-30',
    monthlyUnitsPerStore: 88,
    rationale: 'Tratamento contínuo com recompra mensal previsível.',
  },
  {
    profileId: 'high_traffic',
    skuId: 'paracetamol-750-20',
    monthlyUnitsPerStore: 46,
    rationale: 'Fluxo de passagem sustenta a apresentação de 750mg.',
  },
  {
    profileId: 'regional_chain',
    skuId: 'dipirona-500-20',
    monthlyUnitsPerStore: 74,
    rationale: 'Item de cesta em todas as lojas da bandeira.',
  },
  {
    profileId: 'regional_chain',
    skuId: 'losartana-50-30',
    monthlyUnitsPerStore: 63,
    rationale: 'Carteira de crônicos cadastrada no programa de fidelidade.',
  },
  {
    profileId: 'regional_chain',
    skuId: 'paracetamol-750-20',
    monthlyUnitsPerStore: 29,
    rationale: 'Giro modesto, mas acima do limiar em toda a bandeira.',
  },
  {
    profileId: 'neighborhood',
    skuId: 'dipirona-500-20',
    monthlyUnitsPerStore: 58,
    rationale: 'Compra de urgência do cliente do quarteirão.',
  },
  {
    profileId: 'neighborhood',
    skuId: 'losartana-50-30',
    monthlyUnitsPerStore: 42,
    rationale: 'Base fiel de crônicos que retira todo mês no mesmo balcão.',
  },
  {
    profileId: 'neighborhood',
    skuId: 'paracetamol-750-20',
    monthlyUnitsPerStore: 11,
    rationale: 'Gôndola curta: o espaço rende mais com a apresentação de 500mg.',
  },
  {
    profileId: 'popular',
    skuId: 'dipirona-500-20',
    monthlyUnitsPerStore: 96,
    rationale: 'Concentra a cesta: é o item que traz o cliente à loja.',
  },
  {
    profileId: 'popular',
    skuId: 'paracetamol-750-20',
    monthlyUnitsPerStore: 16,
    rationale: 'Perde para a apresentação mais barata na mesma prateleira.',
  },
  {
    profileId: 'popular',
    skuId: 'losartana-50-30',
    monthlyUnitsPerStore: 14,
    rationale: 'Crônico da praça retira na rede com convênio, não aqui.',
  },
]

const PORTFOLIO_SKU_IDS: readonly string[] = SKUS.map((sku) => sku.id)

/**
 * NOTA: não consta do ESCOPO — participação de cada perfil na base observada.
 * A farmácia de bairro é a maioria das lojas e a minoria do volume; a drogaria
 * de alto fluxo faz o inverso. O jitter é semeado para que a divisão não caia em
 * números redondos que pareceriam arbitrados.
 */
const PROFILE_WEIGHT: Record<OutletProfileId, number> = {
  high_traffic: 0.14,
  regional_chain: 0.22,
  neighborhood: 0.46,
  popular: 0.18,
}

function distributeObservedStores(): Record<OutletProfileId, number> {
  const random = createRandom(MOCK_SEED + 61)
  const weights = OUTLET_PROFILE_ORDER.map(
    (profileId) => PROFILE_WEIGHT[profileId] * (0.96 + 0.08 * random()),
  )
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  const counts = weights.map((weight) => Math.round((OBSERVED_STORES * weight) / total))
  const drift = OBSERVED_STORES - counts.reduce((sum, count) => sum + count, 0)

  const entries = OUTLET_PROFILE_ORDER.map((profileId, index) => {
    const base = counts[index] ?? 0
    return [profileId, index === 0 ? base + drift : base] as const
  })

  return Object.fromEntries(entries) as Record<OutletProfileId, number>
}

const OBSERVED_STORES_BY_PROFILE = distributeObservedStores()

function turnoverOf(profileId: OutletProfileId, skuId: string): TurnoverEntry {
  const found = TURNOVER.find(
    (entry) => entry.profileId === profileId && entry.skuId === skuId,
  )
  if (!found) throw new Error(`Giro ausente para ${profileId} × ${skuId}`)
  return found
}

function averageTurnover(skuId: string): number {
  const entries = TURNOVER.filter((entry) => entry.skuId === skuId)
  const total = entries.reduce((sum, entry) => sum + entry.monthlyUnitsPerStore, 0)
  return total / entries.length
}

export type MixLine = {
  readonly skuId: string
  readonly skuName: string
  /** Sai do giro contra o limiar — nunca é digitada. */
  readonly decision: MixDecision
  readonly monthlyUnitsPerStore: number
  readonly dailyUnitsPerStore: number
  /** Giro no perfil contra a média do SKU em todos os perfis, base 100. */
  readonly turnoverIndex: number
  readonly rationale: string
}

export type OutletProfile = {
  readonly id: OutletProfileId
  readonly label: string
  readonly description: string
  /** Lojas do perfil dentro da base com leitura direta de sell-out. */
  readonly observedStores: number
  /** Projeção do perfil sobre o universo indireto de PDVs. */
  readonly universeStores: number
  readonly lines: readonly MixLine[]
  readonly skusInMix: number
  readonly attestation: Attestation
}

export const MIX_ATTESTATION: Attestation = SCANNTECH

function mixLinesOf(profileId: OutletProfileId): readonly MixLine[] {
  return PORTFOLIO_SKU_IDS.map<MixLine>((skuId) => {
    const entry = turnoverOf(profileId, skuId)
    return {
      skuId,
      skuName: skuNameOf(skuId),
      decision: entry.monthlyUnitsPerStore >= MIX_ENTRY_THRESHOLD_UNITS ? 'in' : 'out',
      monthlyUnitsPerStore: entry.monthlyUnitsPerStore,
      dailyUnitsPerStore: round(entry.monthlyUnitsPerStore / 30, 2),
      turnoverIndex: Math.round((entry.monthlyUnitsPerStore / averageTurnover(skuId)) * 100),
      rationale: entry.rationale,
    }
  }).sort((a, b) => b.monthlyUnitsPerStore - a.monthlyUnitsPerStore)
}

export const OUTLET_PROFILES: readonly OutletProfile[] = OUTLET_PROFILE_ORDER.map((profileId) => {
  const observedStores = OBSERVED_STORES_BY_PROFILE[profileId]
  const lines = mixLinesOf(profileId)

  return {
    id: profileId,
    label: OUTLET_PROFILE_LABEL[profileId],
    description: OUTLET_PROFILE_DESCRIPTION[profileId],
    observedStores,
    universeStores: Math.round((observedStores / OBSERVED_STORES) * UNIVERSE_STORES),
    lines,
    skusInMix: lines.filter((line) => line.decision === 'in').length,
    attestation: MIX_ATTESTATION,
  }
})

export function profileOf(profileId: OutletProfileId): OutletProfile {
  const found = OUTLET_PROFILES.find((profile) => profile.id === profileId)
  if (!found) throw new Error(`Perfil de PDV ausente: ${profileId}`)
  return found
}

const MIX_LINES: readonly MixLine[] = OUTLET_PROFILES.flatMap((profile) => profile.lines)

/** Combinações perfil × SKU avaliadas. É o denominador da tese da tela. */
export const MIX_COMBINATION_COUNT = MIX_LINES.length

/** Combinações em que a recomendação é não oferecer o SKU. */
export const MIX_OUT_COUNT = MIX_LINES.filter((line) => line.decision === 'out').length

export const MIX_IN_COUNT = MIX_COMBINATION_COUNT - MIX_OUT_COUNT

/** Escala das barras de giro: o maior giro medido no portfólio. */
export const MIX_MAX_MONTHLY_UNITS = MIX_LINES.reduce(
  (max, line) => Math.max(max, line.monthlyUnitsPerStore),
  0,
)

export const MIX_HEADLINE = `Das ${MIX_COMBINATION_COUNT} combinações de perfil e SKU, ${MIX_OUT_COUNT} não pagam a gôndola: o giro medido não cobre o espaço nem a reposição.`

/* ------------------------------------------------------------------ */
/* 2. Ruptura na ponta, priorizada por impacto                          */
/* ------------------------------------------------------------------ */

/**
 * NOTA: não consta do ESCOPO — preço médio praticado por unidade, em reais. É o
 * multiplicador que transforma unidade perdida em venda perdida; sem ele a
 * ruptura só teria ordenação por dias, que é justamente a ordenação errada.
 */
const UNIT_PRICE_BRL: readonly { readonly skuId: string; readonly priceBrl: number }[] = [
  { skuId: 'losartana-50-30', priceBrl: 18.9 },
  { skuId: 'dipirona-500-20', priceBrl: 9.4 },
  { skuId: 'paracetamol-750-20', priceBrl: 12.6 },
]

export function unitPriceOf(skuId: string): number {
  const found = UNIT_PRICE_BRL.find((entry) => entry.skuId === skuId)
  if (!found) throw new Error(`Preço médio ausente para ${skuId}`)
  return found.priceBrl
}

export const STOCKOUT_ATTESTATION: Attestation = combine([NEOGRID, NEOGRID_DISTRIBUIDORES])

type StockoutInput = {
  readonly id: string
  readonly accountName: string
  readonly scope: string
  readonly uf: UfCode
  readonly profileId: OutletProfileId
  readonly skuId: string
  readonly daysOut: number
  readonly storesAffected: number
  readonly cause: string
  readonly decisionId?: string
}

/**
 * NOTA: não consta do ESCOPO — as rupturas do recorte, com nomes fictícios de
 * rede. Dias em ruptura e lojas afetadas são declarados; a venda perdida é
 * calculada sobre o giro do perfil e o preço médio do SKU, nunca digitada.
 *
 * A primeira linha é a materialização do diagnóstico canônico de ruptura de
 * Paracetamol no Nordeste e referencia a decisão que já carrega o caso.
 */
const STOCKOUT_INPUTS: readonly StockoutInput[] = [
  {
    id: 'stockout-ne-paracetamol',
    accountName: 'Rede Farma Nordeste',
    scope: 'Lojas de BA, PE e CE',
    uf: 'BA',
    profileId: 'regional_chain',
    skuId: 'paracetamol-750-20',
    daysOut: 11,
    storesAffected: 612,
    cause: 'Pedido de reposição não disparado após corte no centro de distribuição.',
    decisionId: 'D-2026-0005',
  },
  {
    id: 'stockout-agreste-dipirona',
    accountName: 'Rede Popular do Agreste',
    scope: 'Lojas do interior de PE',
    uf: 'PE',
    profileId: 'popular',
    skuId: 'dipirona-500-20',
    daysOut: 6,
    storesAffected: 340,
    cause: 'Pico de demanda sem revisão do ponto de pedido na loja.',
  },
  {
    id: 'stockout-aurora-losartana',
    accountName: 'Rede Farma Aurora',
    scope: 'Lojas da capital e Baixada',
    uf: 'RJ',
    profileId: 'high_traffic',
    skuId: 'losartana-50-30',
    daysOut: 5,
    storesAffected: 154,
    cause: 'Estoque parado no centro de distribuição da rede, sem transferência à loja.',
  },
  {
    id: 'stockout-sul-losartana',
    accountName: 'Rede Farma Sul',
    scope: 'Lojas do RS e SC',
    uf: 'RS',
    profileId: 'regional_chain',
    skuId: 'losartana-50-30',
    daysOut: 3,
    storesAffected: 288,
    cause: 'Ruptura de curta duração após atraso de uma janela de entrega.',
  },
  {
    id: 'stockout-vale-verde-dipirona',
    accountName: 'Drogaria Vale Verde',
    scope: 'Lojas de alto fluxo do interior de SP',
    uf: 'SP',
    profileId: 'high_traffic',
    skuId: 'dipirona-500-20',
    daysOut: 4,
    storesAffected: 210,
    cause: 'Reposição diária interrompida durante a troca de operador logístico.',
  },
  {
    id: 'stockout-bairro-novo-dipirona',
    accountName: 'Farmácia Bairro Novo',
    scope: 'PDVs independentes atendidos por distribuidor',
    uf: 'MG',
    profileId: 'neighborhood',
    skuId: 'dipirona-500-20',
    daysOut: 7,
    storesAffected: 96,
    cause: 'Distribuidor sem cobertura mínima do item na região.',
  },
]

export type StockoutRow = {
  readonly id: string
  readonly accountName: string
  readonly scope: string
  readonly uf: UfCode
  readonly profileId: OutletProfileId
  readonly profileLabel: string
  readonly skuId: string
  readonly skuName: string
  readonly daysOut: number
  readonly storesAffected: number
  readonly lostUnits: number
  readonly lostSalesBrl: number
  readonly cause: string
  readonly decisionId: string | null
  readonly attestation: Attestation
}

function toStockoutRow(input: StockoutInput): StockoutRow {
  const daily = turnoverOf(input.profileId, input.skuId).monthlyUnitsPerStore / 30
  const lostUnits = Math.round(daily * input.daysOut * input.storesAffected)

  return {
    id: input.id,
    accountName: input.accountName,
    scope: input.scope,
    uf: input.uf,
    profileId: input.profileId,
    profileLabel: OUTLET_PROFILE_LABEL[input.profileId],
    skuId: input.skuId,
    skuName: skuNameOf(input.skuId),
    daysOut: input.daysOut,
    storesAffected: input.storesAffected,
    lostUnits,
    lostSalesBrl: Math.round(lostUnits * unitPriceOf(input.skuId)),
    cause: input.cause,
    decisionId: input.decisionId ?? null,
    attestation: STOCKOUT_ATTESTATION,
  }
}

/**
 * A fila é ordenada por venda perdida, não por dias em ruptura nem por nome da
 * conta. A ruptura mais antiga da lista não é a mais cara, e é exatamente esse
 * descolamento que a ordenação por impacto existe para mostrar.
 */
export const STOCKOUT_ROWS: readonly StockoutRow[] = STOCKOUT_INPUTS.map(toStockoutRow).sort(
  (a, b) => b.lostSalesBrl - a.lostSalesBrl,
)

export const STOCKOUT_LOST_SALES_BRL = STOCKOUT_ROWS.reduce(
  (sum, row) => sum + row.lostSalesBrl,
  0,
)

export const STOCKOUT_LOST_UNITS = STOCKOUT_ROWS.reduce((sum, row) => sum + row.lostUnits, 0)

export const STOCKOUT_STORES_AFFECTED = STOCKOUT_ROWS.reduce(
  (sum, row) => sum + row.storesAffected,
  0,
)

export const TOP_STOCKOUT: StockoutRow | undefined = STOCKOUT_ROWS[0]

/** Última da fila por impacto — e não a mais recente por dias em ruptura. */
export const LAST_STOCKOUT: StockoutRow | undefined = STOCKOUT_ROWS[STOCKOUT_ROWS.length - 1]

/**
 * Quantas rupturas acima da última na fila estão em ruptura há menos tempo que
 * ela. É a medida do descolamento entre antiguidade e impacto: se fosse zero, a
 * ordenação por dias e a ordenação por dinheiro dariam na mesma.
 */
export const SHORTER_ROWS_ABOVE_LAST = STOCKOUT_ROWS.slice(0, -1).filter(
  (row) => row.daysOut < (LAST_STOCKOUT?.daysOut ?? 0),
).length

/** Impacto da ruptura de Paracetamol no NE (seção 10 do ESCOPO). */
export const NE_STOCKOUT_IMPACT_BRL = 2_100_000
export const NE_STOCKOUT_DECISION_ID = 'D-2026-0005'

/* ------------------------------------------------------------------ */
/* 3. Pedido sugerido por cliente                                       */
/* ------------------------------------------------------------------ */

export type OrderReason = 'restock' | 'enter_mix' | 'coverage'

export const ORDER_REASON_LABEL: Record<OrderReason, string> = {
  restock: 'Repor ruptura',
  enter_mix: 'Entrar no mix',
  coverage: 'Aumentar cobertura',
}

export const ORDER_ATTESTATION: Attestation = combine([SCANNTECH, NEOGRID, SAP])

type OrderLineInput = {
  readonly skuId: string
  readonly units: number
  readonly reason: OrderReason
  readonly note: string
}

type OrderInput = {
  readonly id: string
  readonly customerName: string
  readonly profileId: OutletProfileId
  readonly uf: UfCode
  readonly storeCount: number
  readonly lines: readonly OrderLineInput[]
}

/**
 * NOTA: não consta do ESCOPO — os pedidos sugeridos e suas quantidades. Cada
 * linha declara unidades e motivo; o valor da linha e o total do pedido saem do
 * preço médio do SKU. Nenhum SKU fora do mix do perfil entra em pedido: é a
 * mesma regra de giro do primeiro bloco aplicada à quantidade.
 */
const ORDER_INPUTS: readonly OrderInput[] = [
  {
    id: 'order-aurora',
    customerName: 'Rede Farma Aurora',
    profileId: 'high_traffic',
    uf: 'RJ',
    storeCount: 154,
    lines: [
      {
        skuId: 'losartana-50-30',
        units: 3_080,
        reason: 'restock',
        note: 'Cobre os 5 dias de ruptura nas 154 lojas e reconstitui o ponto de pedido.',
      },
      {
        skuId: 'dipirona-500-20',
        units: 5_400,
        reason: 'coverage',
        note: 'Item de maior giro do perfil ativo em parte das lojas apenas.',
      },
      {
        skuId: 'paracetamol-750-20',
        units: 1_850,
        reason: 'enter_mix',
        note: 'Giro do perfil acima do limiar e SKU ainda não listado na bandeira.',
      },
    ],
  },
  {
    id: 'order-agreste',
    customerName: 'Rede Popular do Agreste',
    profileId: 'popular',
    uf: 'PE',
    storeCount: 340,
    lines: [
      {
        skuId: 'dipirona-500-20',
        units: 8_160,
        reason: 'restock',
        note: 'Único item do portfólio que se paga neste perfil — e está em ruptura há 6 dias.',
      },
    ],
  },
  {
    id: 'order-sul',
    customerName: 'Rede Farma Sul',
    profileId: 'regional_chain',
    uf: 'RS',
    storeCount: 288,
    lines: [
      {
        skuId: 'losartana-50-30',
        units: 1_815,
        reason: 'restock',
        note: 'Repõe os 3 dias de ruptura antes que o crônico troque de marca no balcão.',
      },
      {
        skuId: 'paracetamol-750-20',
        units: 2_300,
        reason: 'coverage',
        note: 'SKU listado no contrato, ativo em menos da metade das lojas da bandeira.',
      },
    ],
  },
]

export type SuggestedOrderLine = {
  readonly skuId: string
  readonly skuName: string
  readonly units: number
  readonly reason: OrderReason
  readonly note: string
  readonly amountBrl: number
}

export type ExcludedSku = {
  readonly skuId: string
  readonly skuName: string
  readonly monthlyUnitsPerStore: number
}

export type SuggestedOrder = {
  readonly id: string
  readonly customerName: string
  readonly profileId: OutletProfileId
  readonly profileLabel: string
  readonly uf: UfCode
  readonly storeCount: number
  readonly lines: readonly SuggestedOrderLine[]
  readonly totalUnits: number
  readonly totalBrl: number
  /** SKUs deliberadamente fora do pedido, com o giro que justifica a exclusão. */
  readonly excludedSkus: readonly ExcludedSku[]
  readonly attestation: Attestation
}

function toSuggestedOrder(input: OrderInput): SuggestedOrder {
  const lines: readonly SuggestedOrderLine[] = input.lines.map((line) => ({
    skuId: line.skuId,
    skuName: skuNameOf(line.skuId),
    units: line.units,
    reason: line.reason,
    note: line.note,
    amountBrl: Math.round(line.units * unitPriceOf(line.skuId)),
  }))

  const excludedSkus: readonly ExcludedSku[] = profileOf(input.profileId)
    .lines.filter((line) => line.decision === 'out')
    .map((line) => ({
      skuId: line.skuId,
      skuName: line.skuName,
      monthlyUnitsPerStore: line.monthlyUnitsPerStore,
    }))

  return {
    id: input.id,
    customerName: input.customerName,
    profileId: input.profileId,
    profileLabel: OUTLET_PROFILE_LABEL[input.profileId],
    uf: input.uf,
    storeCount: input.storeCount,
    lines,
    totalUnits: lines.reduce((sum, line) => sum + line.units, 0),
    totalBrl: lines.reduce((sum, line) => sum + line.amountBrl, 0),
    excludedSkus,
    attestation: ORDER_ATTESTATION,
  }
}

export const SUGGESTED_ORDERS: readonly SuggestedOrder[] = ORDER_INPUTS.map(toSuggestedOrder)

export const SUGGESTED_ORDERS_TOTAL_BRL = SUGGESTED_ORDERS.reduce(
  (sum, order) => sum + order.totalBrl,
  0,
)

export const SUGGESTED_ORDERS_TOTAL_UNITS = SUGGESTED_ORDERS.reduce(
  (sum, order) => sum + order.totalUnits,
  0,
)

export const ORDER_WRITE_BACK_LABEL = 'Enviar pedido sugerido ao ERP'
export const ORDER_WRITE_BACK_PHASE = 'Fase 3'

/* ------------------------------------------------------------------ */
/* 4. Acompanhamento de lançamento                                      */
/* ------------------------------------------------------------------ */

/**
 * NOTA: não consta do ESCOPO — a leitura de listagem depende do painel das
 * grandes redes, cuja captura está parada. O bloco de lançamento abre em estado
 * degradado: a confiança cai, o banner explica, e a tela segue operável.
 */
const GRANDES_REDES_LISTING: Attestation = {
  source: ['grandes_redes'],
  asOf: daysAgo(12),
  lagDays: 5,
  confidence: 'low',
  quality: 'degraded',
  method: 'reprocessed',
}

export type LaunchStageId = 'listing' | 'first_order' | 'repeat_order'

/**
 * NOTA: não consta do ESCOPO — o lançamento acompanhado e seu funil. O SKU é o
 * Paracetamol 750mg c/20, o mais recente do portfólio canônico; a base-alvo e os
 * clientes de cada estágio são declarados, e as conversões saem por divisão.
 */
export const LAUNCH_SKU_ID = 'paracetamol-750-20'
export const LAUNCH_SKU_NAME = skuNameOf(LAUNCH_SKU_ID)
export const LAUNCH_TARGET_CUSTOMERS = 1_240
export const LAUNCH_START_DATE: IsoDate = daysAgo(120)

type LaunchStageInput = {
  readonly id: LaunchStageId
  readonly label: string
  readonly description: string
  readonly customers: number
  readonly attestation: Attestation
}

const LAUNCH_STAGE_INPUTS: readonly LaunchStageInput[] = [
  {
    id: 'listing',
    label: 'Listagem',
    description: 'Cliente com o SKU cadastrado e liberado para compra',
    customers: 862,
    attestation: combine([CRM_SFA, GRANDES_REDES_LISTING]),
  },
  {
    id: 'first_order',
    label: 'Primeira compra',
    description: 'Cliente que já faturou o primeiro pedido do SKU',
    customers: 604,
    attestation: combine([SAP, CRM_SFA]),
  },
  {
    id: 'repeat_order',
    label: 'Recompra',
    description: 'Cliente que repetiu o pedido depois do giro do primeiro lote',
    customers: 187,
    attestation: combine([SAP, SCANNTECH]),
  },
]

export type LaunchStage = {
  readonly id: LaunchStageId
  readonly label: string
  readonly description: string
  readonly customers: number
  /** Conversão vinda do estágio anterior — do alvo, no primeiro estágio. */
  readonly conversionPercent: number
  /** Participação na base-alvo do lançamento. */
  readonly targetSharePercent: number
  readonly droppedCustomers: number
  readonly attestation: Attestation
}

export const LAUNCH_STAGES: readonly LaunchStage[] = LAUNCH_STAGE_INPUTS.map((stage, index) => {
  const previous = LAUNCH_STAGE_INPUTS[index - 1]?.customers ?? LAUNCH_TARGET_CUSTOMERS
  return {
    id: stage.id,
    label: stage.label,
    description: stage.description,
    customers: stage.customers,
    conversionPercent: round((stage.customers / previous) * 100, 1),
    targetSharePercent: round((stage.customers / LAUNCH_TARGET_CUSTOMERS) * 100, 1),
    droppedCustomers: previous - stage.customers,
    attestation: stage.attestation,
  }
})

/** Onde o funil trava: o estágio de menor conversão, apurado, não escolhido. */
export const LAUNCH_BOTTLENECK: LaunchStage | undefined = LAUNCH_STAGES.reduce<
  LaunchStage | undefined
>(
  (worst, stage) =>
    worst === undefined || stage.conversionPercent < worst.conversionPercent ? stage : worst,
  undefined,
)

const FIRST_ORDER_STAGE = LAUNCH_STAGES.find((stage) => stage.id === 'first_order')
const REPEAT_ORDER_STAGE = LAUNCH_STAGES.find((stage) => stage.id === 'repeat_order')

/** Clientes que compraram uma vez e não repetiram o pedido. */
export const LAUNCH_NOT_REPEATED =
  (FIRST_ORDER_STAGE?.customers ?? 0) - (REPEAT_ORDER_STAGE?.customers ?? 0)

/**
 * NOTA: não consta do ESCOPO — quantos dos clientes que não recompraram estavam
 * em ruptura do SKU no período. É o número que muda a leitura do funil: a trava
 * não é de demanda, é de disponibilidade.
 */
export const LAUNCH_NOT_REPEATED_IN_STOCKOUT = 268

export const LAUNCH_NOT_REPEATED_IN_STOCKOUT_PERCENT = round(
  (LAUNCH_NOT_REPEATED_IN_STOCKOUT / LAUNCH_NOT_REPEATED) * 100,
  1,
)

export const LAUNCH_ATTESTATION: Attestation = combine(
  LAUNCH_STAGE_INPUTS.map((stage) => stage.attestation),
)

export const LAUNCH_MAX_CUSTOMERS = LAUNCH_TARGET_CUSTOMERS

/* ------------------------------------------------------------------ */
/* 5. Atestados da tela                                                 */
/* ------------------------------------------------------------------ */

export const ASSORTMENT_ATTESTATION: Attestation = combine([
  MIX_ATTESTATION,
  STOCKOUT_ATTESTATION,
  ORDER_ATTESTATION,
])

/** Fontes atrasadas que motivam o banner. Vazio quando nenhuma está. */
export const DEGRADED_ATTESTATIONS: readonly Attestation[] = [GRANDES_REDES_LISTING].filter(isStale)
