import { REGION_UFS, UF_NAME, type UfCode } from '../assets/brazil-uf'
import { combine, type Attestation } from '../domain/attestation'
import { formatDecimal, formatInteger, formatPercent } from '../domain/format'
import { PERSONAS } from '../domain/persona'
import type { SemanticTone } from '../design/tokens'
import { DOCTOR_COVERAGE_OPPORTUNITY, doctorTotals } from './doctors'
import { DAY_SUMMARY, TEAM_PERFORMANCE, type TeamMetric } from './nba'
import { createRandom, MOCK_SEED } from './random'
import { CRM_SFA, IQVIA } from './sources'

/**
 * Territórios e Cobertura (GTM, módulo 2.4).
 *
 * O Território 360° do HUB olha o mercado por UF: onde há potencial e onde não
 * há presença. Aqui o olhar é o inverso e é operacional — o território é uma
 * carteira com dono, tamanho e capacidade. A pergunta não é "onde vender", é
 * "a equipe que temos alcança a carteira que desenhamos".
 *
 * Ancoragem nos números canônicos:
 *
 * - **Cobertura de médicos** = 82% contra meta de 90% (`TEAM_PERFORMANCE`). O
 *   agregado ponderado dos territórios fecha exatamente nesse valor: as taxas
 *   por território são derivadas e depois deslocadas por uma constante única
 *   até a média ponderada bater no canônico.
 * - **Capacidade da equipe** nasce do plano diário canônico (`DAY_SUMMARY`):
 *   18 visitas planejadas por dia, corrigidas pela aderência de 78%.
 * - **Universo médico** vem de `doctors.ts`, que por sua vez se ancora na
 *   oportunidade D-2026-0003 (Cardiologia RJ, R$ 2,7M). O território do Rio de
 *   Janeiro referencia essa decisão.
 */

function requireMetric(id: string): TeamMetric {
  const metric = TEAM_PERFORMANCE.find((item) => item.id === id)
  if (!metric) throw new Error(`Métrica ausente em TEAM_PERFORMANCE: ${id}`)
  return metric
}

function requireTarget(metric: TeamMetric): number {
  if (metric.target === null) throw new Error(`Métrica sem meta declarada: ${metric.id}`)
  return metric.target
}

const COVERAGE_METRIC = requireMetric('coverage')

/** Cobertura de médicos da força de campo, canônica. */
export const COVERAGE_PERCENT = COVERAGE_METRIC.value

/** Meta de cobertura, canônica. */
export const COVERAGE_TARGET_PERCENT = requireTarget(COVERAGE_METRIC)

function personaName(index: number): string {
  const persona = PERSONAS[index]
  if (!persona) throw new Error(`Persona ausente no índice ${index}`)
  return persona.name
}

/* -------------------------------------------------------------------------- */
/* NOTA: não consta do ESCOPO — parâmetros de derivação                        */
/*                                                                             */
/* A seção 10.4 fixa cobertura, meta e plano diário. O desenho da malha de     */
/* territórios (nomes, donos, tamanho de equipe, cidades, distância média) e   */
/* os parâmetros abaixo são declarados aqui, com semente fixa, para que a      */
/* demonstração saia idêntica em qualquer máquina.                            */
/* -------------------------------------------------------------------------- */

/** Dias úteis de um ciclo de visitação de quatro semanas. */
export const CYCLE_WORKING_DAYS = 20

export const CYCLE_LABEL = 'ciclo de 4 semanas'

/** Visitas por médico-alvo que o padrão de cobertura exige em um ciclo. */
export const TARGET_VISIT_FREQUENCY = 1.5

/**
 * Capacidade efetiva de um representante por ciclo: o plano diário canônico
 * corrigido pela aderência ao roteiro. Planejar não é executar.
 */
export const EFFECTIVE_VISITS_PER_REP =
  DAY_SUMMARY.plannedVisits * CYCLE_WORKING_DAYS * (DAY_SUMMARY.routeAdherencePercent / 100)

/** Fatia do universo médico que compõe a carteira-alvo da força de campo. */
const TARGET_PANEL_SHARE = 0.26

/** Carteira-alvo nacional: o recorte do universo médico que a equipe visita. */
export const NATIONAL_TARGET_PANEL = Math.round(
  doctorTotals('brasil').targetDoctors * TARGET_PANEL_SHARE,
)

/** Coeficientes que ligam carga de trabalho a cobertura alcançada. */
const COVERAGE_INTERCEPT = 1.27
const COVERAGE_LOAD_SLOPE = 0.5
const COVERAGE_JITTER = 0.012

const VISIT_FREQUENCY_MIN = 1.15
const VISIT_FREQUENCY_MAX = 2.3

const TURNOVER_BAND = { min: 4, max: 12 } as const
const HIGH_TURNOVER_BAND = { min: 18, max: 26 } as const

/** Tolerância de carga em torno de 100% antes de o território virar exceção. */
export const LOAD_TOLERANCE_PP = 5

/** Déficit mínimo para o território entrar na fila de exceção, em pp. */
export const MATERIAL_GAP_PP = 2.5

export type CoverageGapCause = 'capacity' | 'dispersion' | 'turnover'

export const COVERAGE_GAP_CAUSE_LABEL: Record<CoverageGapCause, string> = {
  capacity: 'Capacidade insuficiente',
  dispersion: 'Dispersão geográfica',
  turnover: 'Alta rotatividade da carteira',
}

export type LoadState = 'overloaded' | 'balanced' | 'slack'

export const LOAD_STATE_LABEL: Record<LoadState, string> = {
  overloaded: 'Sobrecarregado',
  balanced: 'Equilibrado',
  slack: 'Com folga',
}

/**
 * Os dois extremos são problema: sobrecarga derruba cobertura, folga é
 * capacidade paga e não usada. O equilíbrio é o único estado positivo.
 */
export const LOAD_STATE_TONE: Record<LoadState, SemanticTone> = {
  overloaded: 'negative',
  balanced: 'positive',
  slack: 'attention',
}

export function loadState(loadPercent: number): LoadState {
  if (loadPercent > 100 + LOAD_TOLERANCE_PP) return 'overloaded'
  if (loadPercent < 100 - LOAD_TOLERANCE_PP) return 'slack'
  return 'balanced'
}

type TerritorySeed = {
  readonly id: string
  readonly name: string
  readonly ufs: readonly UfCode[]
  readonly ownerName: string
  readonly ownerRole: string
  /** Representantes alocados ao território. */
  readonly reps: number
  /** Peso relativo do território na carteira-alvo nacional. */
  readonly weight: number
  readonly cities: number
  /** Distância média entre dois pontos consecutivos da carteira, em km. */
  readonly averageDistanceKm: number
  readonly gapCause: CoverageGapCause
  readonly decisionId?: string
}

const TERRITORY_SEEDS: readonly TerritorySeed[] = [
  {
    id: 'T-RJ-CAP',
    name: 'Rio de Janeiro — Capital e Baixada',
    ufs: ['RJ'],
    ownerName: personaName(3),
    ownerRole: 'Gerente de território',
    reps: 10,
    weight: 24,
    cities: 9,
    averageDistanceKm: 14,
    gapCause: 'capacity',
    decisionId: DOCTOR_COVERAGE_OPPORTUNITY.decisionId,
  },
  {
    id: 'T-SP-CAP',
    name: 'São Paulo — Capital e ABC',
    ufs: ['SP'],
    ownerName: personaName(1),
    ownerRole: 'Gerente de território',
    reps: 18,
    weight: 39,
    cities: 12,
    averageDistanceKm: 11,
    gapCause: 'capacity',
  },
  {
    id: 'T-SP-INT',
    name: 'São Paulo — Interior',
    ufs: ['SP'],
    ownerName: 'Rafael Duarte',
    ownerRole: 'Gerente de território',
    reps: 17,
    weight: 31,
    cities: 48,
    averageDistanceKm: 62,
    gapCause: 'turnover',
  },
  {
    id: 'T-MG',
    name: 'Minas Gerais',
    ufs: ['MG'],
    ownerName: 'Beatriz Nogueira',
    ownerRole: 'Gerente de território',
    reps: 15,
    weight: 26,
    cities: 41,
    averageDistanceKm: 58,
    gapCause: 'turnover',
  },
  {
    id: 'T-SUL',
    name: 'Sul',
    ufs: REGION_UFS.sul,
    ownerName: 'Otávio Camargo',
    ownerRole: 'Gerente regional',
    reps: 17,
    weight: 30,
    cities: 53,
    averageDistanceKm: 71,
    gapCause: 'dispersion',
  },
  {
    id: 'T-NE',
    name: 'Nordeste',
    ufs: REGION_UFS.nordeste,
    ownerName: 'Helena Prado',
    ownerRole: 'Gerente regional',
    reps: 13,
    weight: 28,
    cities: 58,
    averageDistanceKm: 96,
    gapCause: 'capacity',
  },
  {
    id: 'T-CO',
    name: 'Centro-Oeste',
    ufs: ['GO', 'DF', 'MT', 'MS'],
    ownerName: 'Vicente Aragão',
    ownerRole: 'Gerente regional',
    reps: 10,
    weight: 16,
    cities: 27,
    averageDistanceKm: 118,
    gapCause: 'dispersion',
  },
  {
    id: 'T-NO',
    name: 'Norte',
    ufs: ['AM', 'PA', 'TO', 'RO', 'AC', 'AP', 'RR'],
    ownerName: 'Larissa Fontes',
    ownerRole: 'Gerente regional',
    reps: 8,
    weight: 12,
    cities: 22,
    averageDistanceKm: 164,
    gapCause: 'dispersion',
  },
]

const TOTAL_WEIGHT = TERRITORY_SEEDS.reduce((sum, seed) => sum + seed.weight, 0)

function between(random: () => number, min: number, max: number): number {
  return min + random() * (max - min)
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10
}

function ufLabelOf(ufs: readonly UfCode[]): string {
  const [only] = ufs
  if (ufs.length === 1 && only) return `${only} · ${UF_NAME[only]}`
  return `${ufs.length} UFs · ${ufs.join(', ')}`
}

/** Reparte a carteira-alvo nacional pelos pesos, sem perder nem criar médico. */
function targetDoctorsByTerritory(): readonly number[] {
  const raw = TERRITORY_SEEDS.map((seed) =>
    Math.round((NATIONAL_TARGET_PANEL * seed.weight) / TOTAL_WEIGHT),
  )
  const drift = NATIONAL_TARGET_PANEL - raw.reduce((sum, value) => sum + value, 0)
  const largest = raw.reduce((best, value, index) => (value > (raw[best] ?? 0) ? index : best), 0)
  return raw.map((value, index) => (index === largest ? value + drift : value))
}

const TARGET_DOCTORS = targetDoctorsByTerritory()

function targetAt(index: number): number {
  return TARGET_DOCTORS[index] ?? 0
}

/** Capacidade efetiva do time do território, em visitas por ciclo. */
function capacityAt(index: number): number {
  return Math.round((TERRITORY_SEEDS[index]?.reps ?? 0) * EFFECTIVE_VISITS_PER_REP)
}

/** Demanda do território: a carteira inteira na frequência-padrão. */
function requiredVisitsAt(index: number): number {
  return Math.round(targetAt(index) * TARGET_VISIT_FREQUENCY)
}

function loadPercentAt(index: number): number {
  const capacity = capacityAt(index)
  return capacity === 0 ? 0 : roundOneDecimal((requiredVisitsAt(index) / capacity) * 100)
}

/**
 * Cobertura por território: cai com a carga, sobe com a folga, e recebe um
 * deslocamento único que faz a média ponderada fechar nos 82% canônicos.
 */
function coveredDoctorsByTerritory(): readonly number[] {
  const random = createRandom(MOCK_SEED + 41)

  const rawRates = TERRITORY_SEEDS.map((_, index) => {
    const load = loadPercentAt(index) / 100
    const jitter = (random() * 2 - 1) * COVERAGE_JITTER
    return COVERAGE_INTERCEPT - COVERAGE_LOAD_SLOPE * load + jitter
  })

  const weighted = rawRates.reduce((sum, rate, index) => sum + rate * targetAt(index), 0)
  const shift = COVERAGE_PERCENT / 100 - weighted / NATIONAL_TARGET_PANEL

  const covered = rawRates.map((rate, index) => Math.round(targetAt(index) * (rate + shift)))
  const expected = Math.round((NATIONAL_TARGET_PANEL * COVERAGE_PERCENT) / 100)
  const drift = expected - covered.reduce((sum, value) => sum + value, 0)
  const largest = covered.reduce(
    (best, value, index) => (value > (covered[best] ?? 0) ? index : best),
    0,
  )

  return covered.map((value, index) => (index === largest ? value + drift : value))
}

const COVERED_DOCTORS = coveredDoctorsByTerritory()

/** Cobertura e visita vêm do CRM/SFA; o universo médico, do painel de prescrição. */
export const COVERAGE_ATTESTATION: Attestation = combine([CRM_SFA, IQVIA])
export const CAPACITY_ATTESTATION: Attestation = CRM_SFA

export type FieldTerritory = {
  readonly id: string
  readonly name: string
  readonly ufs: readonly UfCode[]
  readonly ufLabel: string
  readonly ownerName: string
  readonly ownerRole: string
  readonly reps: number
  readonly cities: number
  readonly averageDistanceKm: number
  readonly targetDoctors: number
  readonly coveredDoctors: number
  readonly coveragePercent: number
  /** Distância até a meta, em pontos percentuais. Negativo = abaixo da meta. */
  readonly coverageGapPp: number
  /** Médicos que faltam cobrir para o território atingir a meta. */
  readonly doctorsToTarget: number
  /** Demanda da carteira na frequência-padrão, em visitas por ciclo. */
  readonly requiredVisits: number
  /** Capacidade efetiva da equipe, em visitas por ciclo. */
  readonly capacityVisits: number
  /** Visitas que a equipe de fato realiza no ciclo. */
  readonly realizedVisits: number
  /** Visitas por médico coberto no ciclo. */
  readonly visitFrequency: number
  readonly loadPercent: number
  /** Capacidade sobrando (positivo) ou faltando (negativo), em visitas/ciclo. */
  readonly capacitySlackVisits: number
  readonly portfolioTurnoverPercent: number
  readonly gapCause: CoverageGapCause
  readonly attestation: Attestation
  readonly decisionId?: string
}

function buildTerritories(): readonly FieldTerritory[] {
  return TERRITORY_SEEDS.map((seed, index) => {
    const random = createRandom(MOCK_SEED + 61 + index)
    const targetDoctors = targetAt(index)
    const coveredDoctors = COVERED_DOCTORS[index] ?? 0
    const coveragePercent = roundOneDecimal((coveredDoctors / targetDoctors) * 100)
    const capacityVisits = capacityAt(index)
    const requiredVisits = requiredVisitsAt(index)

    const desiredFrequency = between(random, VISIT_FREQUENCY_MIN, VISIT_FREQUENCY_MAX)
    const realizedVisits = Math.min(capacityVisits, Math.round(coveredDoctors * desiredFrequency))

    const turnoverBand = seed.gapCause === 'turnover' ? HIGH_TURNOVER_BAND : TURNOVER_BAND

    return {
      id: seed.id,
      name: seed.name,
      ufs: seed.ufs,
      ufLabel: ufLabelOf(seed.ufs),
      ownerName: seed.ownerName,
      ownerRole: seed.ownerRole,
      reps: seed.reps,
      cities: seed.cities,
      averageDistanceKm: seed.averageDistanceKm,
      targetDoctors,
      coveredDoctors,
      coveragePercent,
      coverageGapPp: roundOneDecimal(coveragePercent - COVERAGE_TARGET_PERCENT),
      doctorsToTarget: Math.max(
        0,
        Math.round((targetDoctors * COVERAGE_TARGET_PERCENT) / 100) - coveredDoctors,
      ),
      requiredVisits,
      capacityVisits,
      realizedVisits,
      visitFrequency: roundOneDecimal(realizedVisits / coveredDoctors),
      loadPercent: loadPercentAt(index),
      capacitySlackVisits: capacityVisits - requiredVisits,
      portfolioTurnoverPercent: roundOneDecimal(
        between(random, turnoverBand.min, turnoverBand.max),
      ),
      gapCause: seed.gapCause,
      attestation: COVERAGE_ATTESTATION,
      ...(seed.decisionId ? { decisionId: seed.decisionId } : {}),
    }
  })
}

export const FIELD_TERRITORIES: readonly FieldTerritory[] = buildTerritories()

export const TERRITORY_COUNT = FIELD_TERRITORIES.length

export type CoverageGap = {
  readonly territory: FieldTerritory
  /** Tamanho do déficit em pontos percentuais, sempre positivo. */
  readonly deficitPp: number
  readonly cause: CoverageGapCause
  readonly causeLabel: string
  /** Evidência numérica da causa, já formatada. */
  readonly detail: string
}

function gapDetail(territory: FieldTerritory): string {
  switch (territory.gapCause) {
    case 'capacity':
      return `A carteira pede ${formatInteger(territory.requiredVisits)} visitas por ${CYCLE_LABEL} e a equipe entrega ${formatInteger(territory.capacityVisits)} — faltam ${formatInteger(territory.requiredVisits - territory.capacityVisits)} visitas de capacidade.`
    case 'dispersion':
      return `${formatInteger(territory.cities)} cidades e ${formatInteger(territory.averageDistanceKm)} km médios entre pontos: o tempo de campo vai para o deslocamento, não para a visita.`
    case 'turnover':
      return `${formatPercent(territory.portfolioTurnoverPercent)} da carteira trocou de titular no último ${CYCLE_LABEL} — o relacionamento recomeça antes de converter.`
  }
}

/** Territórios abaixo da meta, em qualquer tamanho de déficit. */
export const BELOW_TARGET_COUNT = FIELD_TERRITORIES.filter(
  (territory) => territory.coveragePercent < COVERAGE_TARGET_PERCENT,
).length

/**
 * Fila de exceção: só os déficits materiais, do maior número de médicos a
 * cobrir para o menor. Território a menos de 2,5 pp da meta segue na carteira,
 * mas não vira caso — a lista precisa caber em uma reunião.
 */
export const COVERAGE_GAPS: readonly CoverageGap[] = FIELD_TERRITORIES.filter(
  (territory) => COVERAGE_TARGET_PERCENT - territory.coveragePercent >= MATERIAL_GAP_PP,
)
  .map((territory) => ({
    territory,
    deficitPp: roundOneDecimal(COVERAGE_TARGET_PERCENT - territory.coveragePercent),
    cause: territory.gapCause,
    causeLabel: COVERAGE_GAP_CAUSE_LABEL[territory.gapCause],
    detail: gapDetail(territory),
  }))
  .sort((a, b) => b.territory.doctorsToTarget - a.territory.doctorsToTarget)

/** Médicos que faltam cobrir para a meta, somando toda a malha. */
export const DOCTORS_TO_TARGET = FIELD_TERRITORIES.reduce(
  (sum, territory) => sum + territory.doctorsToTarget,
  0,
)

/** Territórios ordenados por carga, do mais pressionado ao mais folgado. */
export const LOAD_RANKING: readonly FieldTerritory[] = [...FIELD_TERRITORIES].sort(
  (a, b) => b.loadPercent - a.loadPercent,
)

/** Topo da escala das barras de carga, arredondado para a dezena acima. */
export const LOAD_SCALE_MAX = Math.max(
  110,
  Math.ceil(Math.max(...FIELD_TERRITORIES.map((territory) => territory.loadPercent)) / 10) * 10,
)

/** Referência da barra: a carga que a capacidade da equipe comporta. */
export const LOAD_REFERENCE_PERCENT = 100

export const OVERLOADED_COUNT = FIELD_TERRITORIES.filter(
  (territory) => loadState(territory.loadPercent) === 'overloaded',
).length

export const SLACK_COUNT = FIELD_TERRITORIES.filter(
  (territory) => loadState(territory.loadPercent) === 'slack',
).length

/** Carga média da malha, ponderada pelo tamanho de cada carteira. */
export const AVERAGE_LOAD_PERCENT = roundOneDecimal(
  FIELD_TERRITORIES.reduce(
    (sum, territory) => sum + territory.loadPercent * territory.targetDoctors,
    0,
  ) / NATIONAL_TARGET_PANEL,
)

export const TOTAL_REPS = FIELD_TERRITORIES.reduce((sum, territory) => sum + territory.reps, 0)

/** Como a capacidade da equipe é obtida — exibido junto do balanceamento. */
export const CAPACITY_BASIS_NOTE = `Capacidade efetiva por representante: ${formatInteger(DAY_SUMMARY.plannedVisits)} visitas planejadas por dia × ${formatInteger(CYCLE_WORKING_DAYS)} dias úteis do ${CYCLE_LABEL}, corrigidas pela aderência ao roteiro de ${formatPercent(DAY_SUMMARY.routeAdherencePercent, 0)} — ${formatDecimal(EFFECTIVE_VISITS_PER_REP, 0)} visitas por ciclo.`

export const COVERAGE_RULE_NOTE = `Carteira-alvo de ${formatInteger(NATIONAL_TARGET_PANEL)} médicos, ${formatInteger(TOTAL_REPS)} representantes em ${formatInteger(TERRITORY_COUNT)} territórios. A demanda de cada território é a carteira inteira na frequência-padrão de ${formatDecimal(TARGET_VISIT_FREQUENCY)} visita por médico no ${CYCLE_LABEL}.`

export const GAP_RULE_NOTE = `${formatInteger(BELOW_TARGET_COUNT)} dos ${formatInteger(TERRITORY_COUNT)} territórios estão abaixo da meta de ${formatPercent(COVERAGE_TARGET_PERCENT, 0)}. Entram nesta fila os ${formatInteger(COVERAGE_GAPS.length)} que estão a ${formatDecimal(MATERIAL_GAP_PP)} pp ou mais da meta — os demais seguem na carteira, sem virar caso.`

export const BALANCE_RULE_NOTE =`Carga = demanda da carteira ÷ capacidade efetiva da equipe. Acima de ${formatInteger(100 + LOAD_TOLERANCE_PP)}% o território não fecha a cobertura; abaixo de ${formatInteger(100 - LOAD_TOLERANCE_PP)}% há capacidade paga e ociosa.`

export type TerritoryCoverageKpi = {
  readonly id: string
  readonly label: string
  /** Valor já formatado pelo domínio. */
  readonly value: string
  readonly delta?: number
  readonly deltaUnit?: 'percent' | 'points'
  readonly comparison?: string
  readonly attestation: Attestation
}

export const TERRITORY_COVERAGE_KPIS: readonly TerritoryCoverageKpi[] = [
  {
    id: 'coverage',
    label: 'Cobertura de médicos',
    value: formatPercent(COVERAGE_PERCENT),
    delta: roundOneDecimal(COVERAGE_PERCENT - COVERAGE_TARGET_PERCENT),
    deltaUnit: 'points',
    comparison: `vs. meta de ${formatPercent(COVERAGE_TARGET_PERCENT, 0)}`,
    attestation: COVERAGE_ATTESTATION,
  },
  {
    id: 'target-panel',
    label: 'Médicos-alvo na carteira',
    value: formatInteger(NATIONAL_TARGET_PANEL),
    attestation: COVERAGE_ATTESTATION,
  },
  {
    id: 'gap-territories',
    label: 'Territórios abaixo da meta',
    value: `${formatInteger(BELOW_TARGET_COUNT)} de ${formatInteger(TERRITORY_COUNT)}`,
    attestation: COVERAGE_ATTESTATION,
  },
  {
    id: 'doctors-to-target',
    label: 'Médicos a cobrir para a meta',
    value: formatInteger(DOCTORS_TO_TARGET),
    attestation: COVERAGE_ATTESTATION,
  },
]

/** Decisão que a malha do Rio de Janeiro endereça, sem redigitar o valor. */
export const TERRITORY_DECISION = DOCTOR_COVERAGE_OPPORTUNITY
