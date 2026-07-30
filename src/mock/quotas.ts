import { combine, type Attestation } from '../domain/attestation'
import { PERSONAS } from '../domain/persona'
import { daysAgo, daysFromNow, type IsoDate } from '../domain/today'
import { findDecision, type DecisionRef } from './decisions'
import { DAY_SUMMARY, TEAM_PERFORMANCE, type TeamMetric } from './nba'
import { createRandom, MOCK_SEED } from './random'
import { CRM_SFA, IQVIA, SAP, SCANNTECH } from './sources'

/**
 * Metas e quotas (GTM, módulo 2.9).
 *
 * A tela responde a duas perguntas que a planilha de quota nunca responde.
 *
 * A primeira é de onde vem a meta. Aqui ela é construída de baixo para cima: o
 * território declara a capacidade que tem — representantes, visitas planejadas,
 * taxa de visita produtiva, conversão — e a meta nacional é a soma disso. Meta
 * dividida de cima para baixo é rateio, não compromisso.
 *
 * A segunda é o que acontece quando a soma de baixo não bate com o número
 * fixado no topo. A diferença não é escondida no rateio: ela aparece com nome,
 * repartida entre as alavancas que já estão abaixo da meta.
 *
 * Ancoragem nos números canônicos (seção 10.4):
 *
 * - **Soma bottom-up** = R$ 1,2M, o sell-out incremental de `TEAM_PERFORMANCE`.
 *   A distribuição entre os territórios é proporcional à capacidade instalada e
 *   fecha exatamente nesse total.
 * - **Meta fixada no topo** = soma bottom-up acrescida dos mesmos 15% de
 *   crescimento registrados contra a semana anterior.
 * - **Visitas planejadas** = 18 por representante por dia (`DAY_SUMMARY`),
 *   pelos dias úteis do ciclo.
 * - **Cobertura, visitas produtivas e conversão** por território variam em
 *   torno das médias canônicas (82%, 68% e 23%); a média ponderada das nove
 *   praças fecha em cada uma delas.
 */

function metricOf(id: string): TeamMetric {
  const metric = TEAM_PERFORMANCE.find((item) => item.id === id)
  if (!metric) throw new Error(`Métrica ausente em TEAM_PERFORMANCE: ${id}`)
  return metric
}

const COVERAGE_METRIC = metricOf('coverage')
const PRODUCTIVE_METRIC = metricOf('productive-visits')
const CONVERSION_METRIC = metricOf('conversion')
const INCREMENTAL_METRIC = metricOf('incremental-sellout')

function personaName(index: number): string {
  const persona = PERSONAS[index]
  if (!persona) throw new Error(`Persona ausente: ${index}`)
  return persona.name
}

/**
 * NOTA: não consta do ESCOPO — o recorte do ciclo. `HOJE` cai numa quinta-feira,
 * então o ciclo semanal corre de segunda a domingo com quatro dos cinco dias
 * úteis já vencidos.
 */
export const CYCLE = {
  label: 'Ciclo semanal em curso',
  startsOn: daysAgo(3) as IsoDate,
  endsOn: daysFromNow(3) as IsoDate,
  businessDays: 5,
  elapsedBusinessDays: 4,
} as const

/** Fração do ciclo já vencida — a régua da meta proporcional. */
export const CYCLE_ELAPSED_RATIO = CYCLE.elapsedBusinessDays / CYCLE.businessDays

/** Meta nacional que sobe dos territórios. Canônica: o sell-out incremental. */
export const BOTTOM_UP_TARGET_BRL = INCREMENTAL_METRIC.value

/** Crescimento que o topo repetiu ao fixar a meta. Canônico: +15%. */
export const TOP_DOWN_GROWTH_PERCENT = INCREMENTAL_METRIC.delta ?? 0

/** Número fixado no topo, antes de qualquer desdobramento. */
export const TOP_DOWN_TARGET_BRL = Math.round(
  BOTTOM_UP_TARGET_BRL * (1 + TOP_DOWN_GROWTH_PERCENT / 100),
)

/** O que a soma de baixo não alcança. É este número que precisa de nome. */
export const ROLLUP_GAP_BRL = TOP_DOWN_TARGET_BRL - BOTTOM_UP_TARGET_BRL

export const ROLLUP_GAP_PERCENT = (ROLLUP_GAP_BRL / BOTTOM_UP_TARGET_BRL) * 100

const PLANNED_VISITS_PER_REP_DAY = DAY_SUMMARY.plannedVisits

type TeamSeed = {
  readonly id: string
  readonly label: string
  readonly ownerIndex: number
}

type TerritorySeed = {
  readonly id: string
  readonly teamId: string
  readonly label: string
  readonly reps: number
}

/**
 * NOTA: não consta do ESCOPO — a malha de equipes e territórios e o número de
 * representantes em cada praça. O recorte "Rio de Janeiro — Capital" acompanha o
 * filtro canônico do Next Best Action; os demais são declarados.
 */
const TEAM_SEEDS: readonly TeamSeed[] = [
  { id: 'team-sudeste', label: 'Equipe Sudeste', ownerIndex: 3 },
  { id: 'team-nordeste', label: 'Equipe Nordeste', ownerIndex: 2 },
  { id: 'team-sul-co', label: 'Equipe Sul e Centro-Oeste', ownerIndex: 0 },
]

const TERRITORY_SEEDS: readonly TerritorySeed[] = [
  { id: 'ter-sp-capital', teamId: 'team-sudeste', label: 'São Paulo — Capital', reps: 8 },
  { id: 'ter-sp-interior', teamId: 'team-sudeste', label: 'São Paulo — Interior', reps: 6 },
  { id: 'ter-rj-capital', teamId: 'team-sudeste', label: 'Rio de Janeiro — Capital', reps: 5 },
  { id: 'ter-ba-se', teamId: 'team-nordeste', label: 'Bahia e Sergipe', reps: 4 },
  { id: 'ter-pe-pb', teamId: 'team-nordeste', label: 'Pernambuco e Paraíba', reps: 3 },
  { id: 'ter-ce-pi', teamId: 'team-nordeste', label: 'Ceará e Piauí', reps: 3 },
  { id: 'ter-pr-sc', teamId: 'team-sul-co', label: 'Paraná e Santa Catarina', reps: 5 },
  { id: 'ter-rs', teamId: 'team-sul-co', label: 'Rio Grande do Sul', reps: 4 },
  { id: 'ter-go-df', teamId: 'team-sul-co', label: 'Goiás e Distrito Federal', reps: 3 },
]

type Band = { readonly min: number; readonly max: number }

/**
 * NOTA: não consta do ESCOPO — a dispersão de cada taxa entre territórios. As
 * faixas são declaradas e depois deslocadas para que a média ponderada pelas
 * visitas planejadas caia exatamente na média canônica.
 */
const COVERAGE_BAND: Band = { min: 73, max: 91 }
const PRODUCTIVE_BAND: Band = { min: 59, max: 78 }
const CONVERSION_BAND: Band = { min: 18, max: 29 }

/** Ritmo do território contra a meta proporcional e inclinação até o fechamento. */
const PACE_BAND: Band = { min: 0.81, max: 1.17 }
const MOMENTUM_BAND: Band = { min: 0.93, max: 1.07 }

/** Peso de mercado usado pelo topo ao repartir o número fixado. */
const MARKET_WEIGHT_BAND: Band = { min: 0.78, max: 1.42 }

function draw(seedOffset: number, band: Band, count: number): number[] {
  const random = createRandom(MOCK_SEED + seedOffset)
  return Array.from({ length: count }, () => band.min + (band.max - band.min) * random())
}

/** Desloca a série para que a média ponderada bata no alvo canônico. */
function centerOn(values: readonly number[], weights: readonly number[], target: number): number[] {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  const mean = values.reduce((sum, value, index) => sum + value * (weights[index] ?? 0), 0) / totalWeight
  return values.map((value) => value + (target - mean))
}

/** Reparte um total inteiro por pesos, jogando o resíduo na maior parcela. */
function allocate(total: number, weights: readonly number[]): number[] {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  const parts = weights.map((weight) => Math.round((total * weight) / totalWeight))
  const drift = total - parts.reduce((sum, part) => sum + part, 0)

  let largest = 0
  parts.forEach((part, index) => {
    if (part > (parts[largest] ?? 0)) largest = index
  })
  const current = parts[largest]
  if (current !== undefined) parts[largest] = current + drift

  return parts
}

export type QuotaStatus = 'above' | 'on' | 'below'

export const QUOTA_STATUS_LABEL: Record<QuotaStatus, string> = {
  above: 'Acima da meta',
  on: 'Na meta',
  below: 'Abaixo da meta',
}

/** Faixa de tolerância em torno da meta proporcional, em pontos percentuais. */
const ON_TARGET_TOLERANCE_PERCENT = 2

function statusOf(deviationPercent: number): QuotaStatus {
  if (deviationPercent > ON_TARGET_TOLERANCE_PERCENT) return 'above'
  if (deviationPercent < -ON_TARGET_TOLERANCE_PERCENT) return 'below'
  return 'on'
}

/** Nó do desdobramento: vale para território, equipe e nacional. */
export type QuotaNode = {
  readonly id: string
  readonly label: string
  readonly owner: string
  readonly reps: number
  readonly plannedVisits: number
  /** Meta do ciclo inteiro, construída de baixo para cima. */
  readonly quotaBrl: number
  /** Parcela da meta proporcional aos dias úteis já vencidos. */
  readonly quotaToDateBrl: number
  readonly achievedBrl: number
  /** Realizado menos meta proporcional. Positivo é acima do plano. */
  readonly deviationBrl: number
  readonly deviationPercent: number
  /** Projeção de fechamento do ciclo no ritmo atual. */
  readonly forecastBrl: number
  readonly forecastGapBrl: number
  readonly attainmentPercent: number
  readonly status: QuotaStatus
  /** Parcela do número fixado no topo atribuída a este nó. */
  readonly topDownBrl: number
  /** Quanto a soma de baixo fica abaixo do que o topo atribuiu. */
  readonly rollupGapBrl: number
  /** Participação na meta nacional bottom-up. */
  readonly sharePercent: number
}

export type TerritoryQuota = QuotaNode & {
  readonly teamId: string
  readonly coveragePercent: number
  readonly productiveVisitsPercent: number
  readonly conversionPercent: number
  /** Conversões esperadas no ciclo — a ponte entre visita e reais. */
  readonly expectedConversions: number
  /** Valor médio por conversão que a meta do território implica. */
  readonly impliedTicketBrl: number
}

export type TeamQuota = QuotaNode & {
  readonly territories: readonly TerritoryQuota[]
}

function buildTerritories(): readonly TerritoryQuota[] {
  const count = TERRITORY_SEEDS.length
  const plannedVisits = TERRITORY_SEEDS.map(
    (seed) => seed.reps * PLANNED_VISITS_PER_REP_DAY * CYCLE.businessDays,
  )

  const coverage = centerOn(draw(41, COVERAGE_BAND, count), plannedVisits, COVERAGE_METRIC.value)
  const productive = centerOn(
    draw(53, PRODUCTIVE_BAND, count),
    plannedVisits,
    PRODUCTIVE_METRIC.value,
  )
  const conversion = centerOn(
    draw(67, CONVERSION_BAND, count),
    plannedVisits,
    CONVERSION_METRIC.value,
  )

  const capacityWeights = plannedVisits.map(
    (visits, index) => visits * ((productive[index] ?? 0) / 100) * ((conversion[index] ?? 0) / 100),
  )
  const quotas = allocate(BOTTOM_UP_TARGET_BRL, capacityWeights)

  const marketWeights = draw(79, MARKET_WEIGHT_BAND, count).map(
    (weight, index) => weight * (TERRITORY_SEEDS[index]?.reps ?? 0),
  )
  const topDown = allocate(TOP_DOWN_TARGET_BRL, marketWeights)

  const pace = draw(83, PACE_BAND, count)
  const momentum = draw(97, MOMENTUM_BAND, count)

  return TERRITORY_SEEDS.map((seed, index) => {
    const team = TEAM_SEEDS.find((item) => item.id === seed.teamId)
    if (!team) throw new Error(`Equipe ausente para o território: ${seed.id}`)

    const visits = plannedVisits[index] ?? 0
    const productiveRate = productive[index] ?? 0
    const conversionRate = conversion[index] ?? 0
    const quotaBrl = quotas[index] ?? 0
    const expectedConversions = Math.round(
      visits * (productiveRate / 100) * (conversionRate / 100),
    )
    const quotaToDateBrl = Math.round(quotaBrl * CYCLE_ELAPSED_RATIO)
    const achievedBrl = Math.round(quotaToDateBrl * (pace[index] ?? 1))
    const deviationBrl = achievedBrl - quotaToDateBrl
    const forecastBrl = Math.round(quotaBrl * (pace[index] ?? 1) * (momentum[index] ?? 1))
    const topDownBrl = topDown[index] ?? 0

    return {
      id: seed.id,
      teamId: seed.teamId,
      label: seed.label,
      owner: personaName(team.ownerIndex),
      reps: seed.reps,
      plannedVisits: visits,
      coveragePercent: coverage[index] ?? 0,
      productiveVisitsPercent: productiveRate,
      conversionPercent: conversionRate,
      expectedConversions,
      impliedTicketBrl: expectedConversions === 0 ? 0 : Math.round(quotaBrl / expectedConversions),
      quotaBrl,
      quotaToDateBrl,
      achievedBrl,
      deviationBrl,
      deviationPercent: quotaToDateBrl === 0 ? 0 : (deviationBrl / quotaToDateBrl) * 100,
      forecastBrl,
      forecastGapBrl: forecastBrl - quotaBrl,
      attainmentPercent: quotaBrl === 0 ? 0 : (forecastBrl / quotaBrl) * 100,
      status: statusOf(quotaToDateBrl === 0 ? 0 : (deviationBrl / quotaToDateBrl) * 100),
      topDownBrl,
      rollupGapBrl: topDownBrl - quotaBrl,
      sharePercent: (quotaBrl / BOTTOM_UP_TARGET_BRL) * 100,
    }
  })
}

export const TERRITORY_QUOTAS: readonly TerritoryQuota[] = buildTerritories()

function rollup(id: string, label: string, owner: string, nodes: readonly QuotaNode[]): QuotaNode {
  const sum = (read: (node: QuotaNode) => number): number =>
    nodes.reduce((total, node) => total + read(node), 0)

  const quotaBrl = sum((node) => node.quotaBrl)
  const quotaToDateBrl = sum((node) => node.quotaToDateBrl)
  const achievedBrl = sum((node) => node.achievedBrl)
  const forecastBrl = sum((node) => node.forecastBrl)
  const topDownBrl = sum((node) => node.topDownBrl)
  const deviationBrl = achievedBrl - quotaToDateBrl
  const deviationPercent = quotaToDateBrl === 0 ? 0 : (deviationBrl / quotaToDateBrl) * 100

  return {
    id,
    label,
    owner,
    reps: sum((node) => node.reps),
    plannedVisits: sum((node) => node.plannedVisits),
    quotaBrl,
    quotaToDateBrl,
    achievedBrl,
    deviationBrl,
    deviationPercent,
    forecastBrl,
    forecastGapBrl: forecastBrl - quotaBrl,
    attainmentPercent: quotaBrl === 0 ? 0 : (forecastBrl / quotaBrl) * 100,
    status: statusOf(deviationPercent),
    topDownBrl,
    rollupGapBrl: topDownBrl - quotaBrl,
    sharePercent: (quotaBrl / BOTTOM_UP_TARGET_BRL) * 100,
  }
}

export const TEAM_QUOTAS: readonly TeamQuota[] = TEAM_SEEDS.map((seed) => {
  const territories = TERRITORY_QUOTAS.filter((territory) => territory.teamId === seed.id)
  return { ...rollup(seed.id, seed.label, personaName(seed.ownerIndex), territories), territories }
})

/** Raiz do desdobramento: a soma das equipes, não um número posto no topo. */
export const NATIONAL_QUOTA: QuotaNode = rollup(
  'national',
  'Nacional — força de campo',
  personaName(1),
  TEAM_QUOTAS,
)

export type GapCause = {
  readonly id: string
  readonly label: string
  /** Distância entre o indicador e sua meta, em pontos percentuais. */
  readonly shortfallPoints: number
  readonly currentPercent: number
  readonly targetPercent: number
  /** Volume que fechar esta alavanca libera no ciclo. */
  readonly unlockBrl: number
  /** Parcela do gap de desdobramento atribuída à alavanca. */
  readonly gapBrl: number
  readonly gapSharePercent: number
  readonly note: string
}

/**
 * Decomposição do gap entre a soma bottom-up e o número fixado no topo.
 *
 * Cada alavanca canônica que está abaixo da meta é aplicada em sequência sobre a
 * meta bottom-up; a diferença que ela produz é o volume que fechá-la libera. O
 * gap é então repartido na proporção desses volumes — nenhuma parcela é
 * arbitrada.
 */
function buildGapCauses(): readonly GapCause[] {
  const levers: readonly { id: string; metric: TeamMetric; note: string }[] = [
    {
      id: 'coverage',
      metric: COVERAGE_METRIC,
      note: 'Médicos-alvo sem visita no ciclo. Cada ponto de cobertura recuperado entra na base antes de qualquer ganho de conversão.',
    },
    {
      id: 'productive-visits',
      metric: PRODUCTIVE_METRIC,
      note: 'Visitas registradas que não chegam a contato qualificado. O custo já foi pago; o que falta é o que acontece dentro da visita.',
    },
    {
      id: 'conversion',
      metric: CONVERSION_METRIC,
      note: 'Contatos qualificados que não viram prescrição ou pedido. É a alavanca mais lenta das três e depende de material e amostra na mão.',
    },
  ]

  let cursor = BOTTOM_UP_TARGET_BRL
  const unlocks = levers.map(({ metric }) => {
    const target = metric.target ?? metric.value
    const next = target === 0 ? cursor : (cursor * target) / metric.value
    const unlock = next - cursor
    cursor = next
    return unlock
  })

  const shares = allocate(ROLLUP_GAP_BRL, unlocks)

  return levers.map(({ id, metric, note }, index) => {
    const target = metric.target ?? metric.value
    const gapBrl = shares[index] ?? 0
    return {
      id,
      label: metric.label,
      shortfallPoints: target - metric.value,
      currentPercent: metric.value,
      targetPercent: target,
      unlockBrl: Math.round(unlocks[index] ?? 0),
      gapBrl,
      gapSharePercent: (gapBrl / ROLLUP_GAP_BRL) * 100,
      note,
    }
  })
}

export const GAP_CAUSES: readonly GapCause[] = buildGapCauses()

/** Volume total que fechar as três alavancas libera no ciclo. */
export const GAP_UNLOCK_TOTAL_BRL = GAP_CAUSES.reduce((sum, cause) => sum + cause.unlockBrl, 0)

/** Quantas vezes o gap cabe dentro do que as alavancas liberam. */
export const GAP_COVERAGE_RATIO = GAP_UNLOCK_TOTAL_BRL / ROLLUP_GAP_BRL

/** Conversões que o plano de visitas do ciclo comporta em toda a força de campo. */
export const EXPECTED_CONVERSIONS_TOTAL = TERRITORY_QUOTAS.reduce(
  (sum, territory) => sum + territory.expectedConversions,
  0,
)

/** Ponte entre visita e reais: quanto vale uma conversão na meta bottom-up. */
export const IMPLIED_TICKET_BRL = Math.round(BOTTOM_UP_TARGET_BRL / EXPECTED_CONVERSIONS_TOTAL)

/** Plano de visitas e carteira: o que o território declara. */
export const PLAN_ATTESTATION = CRM_SFA

/** Realizado do ciclo: sell-out lido no PDV, faturamento conferido no ERP. */
export const RESULT_ATTESTATION = combine([SCANNTECH, SAP])

/** Meta construída de baixo: plano de visitas cruzado com sell-out e prescrição. */
export const QUOTA_ATTESTATION = combine([CRM_SFA, SCANNTECH, IQVIA])

/**
 * A projeção herda o elo mais fraco da meta e rebaixa o método: fechamento de
 * ciclo é extrapolação de ritmo, não observação.
 */
const TREND_METHOD: Attestation = {
  source: ['crm_sfa'],
  asOf: daysAgo(1),
  lagDays: 2,
  confidence: 'medium',
  quality: 'complete',
  method: 'extrapolated',
}

export const FORECAST_ATTESTATION = combine([QUOTA_ATTESTATION, TREND_METHOD])

/** Encaminhamento do gap: referencia a decisão de cobertura já aberta no GTM. */
export const QUOTA_DECISION: DecisionRef | undefined = findDecision('D-2026-0003')

export const QUOTA_RECOMMENDATION = {
  title: 'Realocar o gap de desdobramento para a alavanca de cobertura',
  detail:
    'O gap não é distribuído como acréscimo linear de quota. Ele volta como compromisso de cobertura nos territórios com maior distância entre capacidade instalada e potencial atribuído pelo topo, sob a decisão de cobertura já aberta.',
  owner: personaName(1),
} as const

export const QUOTA_COPY = {
  screenTitle: 'Metas e quotas',
  screenSubtitle: 'A meta nacional é a soma do que os territórios comportam',
  rollupTitle: 'Desdobramento bottom-up',
  rollupDescription: 'Território → equipe → nacional. Cada nível mostra o que contribui, não o que recebeu de rateio.',
  confrontationTitle: 'Soma de baixo × número fixado no topo',
  confrontationDescription: 'Quando os dois não batem, a diferença aparece com nome.',
  causesTitle: 'O gap com nome',
  causesDescription: 'As três alavancas canônicas que já estão abaixo da meta, e o volume que cada uma libera.',
  narrativeTitle: 'Como ler esta tela',
  deviationTitle: 'Desvio plano × execução',
  deviationDescription: 'Meta do ciclo, meta proporcional aos dias vencidos, realizado e tendência de fechamento.',
  byTeamTitle: 'Onde o gap se concentra',
  byTeamDescription: 'Diferença entre o que o topo atribuiu à equipe e o que a equipe comporta.',
  capacityTitle: 'Como a capacidade vira meta',
  capacityDescription: 'Visitas planejadas, taxa de visita produtiva e conversão. O produto das três é o que o território comporta.',
  nationalRowLabel: 'Nacional',
  expandHint: 'Clique na equipe para abrir os territórios',
  bottomUpLabel: 'Soma bottom-up dos territórios',
  topDownLabel: 'Meta fixada no topo',
  gapLabel: 'Gap de desdobramento',
  forecastLabel: 'Tendência de fechamento',
  gapUnlockLabel: 'Volume liberado ao fechar as três alavancas',
  gapUnlockNote: 'Mais do que o gap pede — o que falta é execução, não quota adicional.',
  ticketBridgeLabel: 'Valor médio por conversão',
  conversionsBridgeLabel: 'Conversões esperadas no ciclo',
  cyclePrefix: 'Ciclo',
  elapsedLabel: 'dias úteis vencidos de',
  recommendationLabel: 'Encaminhamento',
  decisionLabel: 'Decisão',
  gapUnlockColumn: 'Volume liberado',
  gapShareColumn: 'Parcela do gap',
  shortfallColumn: 'Distância até a meta',
  teamGapColumn: 'Gap da equipe',
  teamTopDownColumn: 'Atribuído pelo topo',
  teamBottomUpColumn: 'Comporta',
} as const

export const ROLLUP_COLUMNS = {
  node: 'Território / equipe',
  owner: 'Responsável',
  reps: 'Representantes',
  plannedVisits: 'Visitas planejadas',
  contribution: 'Contribuição à meta',
  share: 'Participação',
} as const

export const DEVIATION_COLUMNS = {
  node: 'Território',
  quota: 'Meta do ciclo',
  quotaToDate: 'Meta até aqui',
  achieved: 'Realizado',
  deviationBrl: 'Desvio (R$)',
  deviationPercent: 'Desvio (%)',
  forecast: 'Tendência de fechamento',
  attainment: 'Atingimento projetado',
  status: 'Situação',
} as const

export const CAPACITY_COLUMNS = {
  node: 'Território',
  plannedVisits: 'Visitas planejadas',
  productive: 'Visitas produtivas',
  conversion: 'Conversão',
  coverage: 'Cobertura',
  conversions: 'Conversões esperadas',
  quota: 'Meta do ciclo',
} as const

export const QUOTA_NARRATIVE: readonly string[] = [
  'A meta nacional do ciclo não foi posta no topo e dividida: ela sobe dos nove territórios. Cada praça declara a capacidade que tem — representantes, visitas planejadas no ciclo, taxa de visita produtiva e conversão — e a soma dessas capacidades é a meta que a força de campo assume.',
  'O número fixado no topo repete sobre o ciclo o mesmo crescimento registrado contra a semana anterior. A diferença entre os dois não é negociada em reunião: é repartida entre as três alavancas que já estão abaixo da meta, na proporção do volume que cada uma libera quando fecha.',
  'Fechar as três alavancas libera mais do que o gap pede. Isso muda a conversa: o que falta não é quota adicional distribuída linearmente, é execução nos indicadores que a própria equipe já acompanha.',
]

export const FUTURE_ACTIONS: readonly { readonly label: string; readonly phase: string }[] = [
  { label: 'Write-back de quotas ao ERP', phase: 'Fase 3' },
  { label: 'Renegociar quota com o território', phase: 'Fase 2' },
]
