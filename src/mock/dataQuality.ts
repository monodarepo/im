import { combine, type Attestation, type Source } from '../domain/attestation'
import { ageInDays, daysAgo, type IsoDate } from '../domain/today'
import { createRandom, MOCK_SEED } from './random'
import { CRM_SFA, IQVIA, NEOGRID, SAP, SCANNTECH_AFFECTED } from './sources'

/**
 * Qualidade dos dados (módulo 1.10 do ESCOPO).
 *
 * Telemetria de ingestão: o que entrou, quando, com que atraso e em que estado.
 * A fila de exceções é a parte que importa — cada aceite vira regra permanente
 * da fonte, então o mesmo erro não volta no próximo lote.
 */

export type SourceStatus = 'ok' | 'delayed' | 'layout_changed' | 'blocked'

export const SOURCE_STATUS_LABEL: Record<SourceStatus, string> = {
  ok: 'OK',
  delayed: 'Atrasada',
  layout_changed: 'Layout alterado',
  blocked: 'Bloqueada',
}

/**
 * Cada linha da tabela atesta a si mesma: o atestado nomeia exatamente a fonte
 * daquela linha. Reaproveitar um atestado combinado aqui faria o banner acusar
 * uma fonte que a própria tabela mostra como OK.
 */
const DISTRIBUIDORES_DELAYED: Attestation = {
  source: ['distribuidores'],
  asOf: daysAgo(6),
  lagDays: 5,
  confidence: 'medium',
  quality: 'partial',
  method: 'estimated',
}

const GRANDES_REDES_BLOCKED: Attestation = {
  source: ['grandes_redes'],
  asOf: daysAgo(12),
  lagDays: 5,
  confidence: 'low',
  quality: 'degraded',
  method: 'reprocessed',
}

export type SourceHealth = {
  readonly source: Source
  readonly lastCapture: IsoDate
  readonly lagDays: number
  /** Registros recebidos na última captura. */
  readonly volume: number
  readonly status: SourceStatus
  readonly attestation: Attestation
}

export const SOURCE_HEALTH: readonly SourceHealth[] = [
  {
    source: 'scanntech',
    lastCapture: daysAgo(9),
    lagDays: 3,
    volume: 4_182_000,
    status: 'layout_changed',
    attestation: SCANNTECH_AFFECTED,
  },
  {
    source: 'iqvia',
    lastCapture: daysAgo(30),
    lagDays: 45,
    volume: 1_240_000,
    status: 'ok',
    attestation: IQVIA,
  },
  {
    source: 'neogrid',
    lastCapture: daysAgo(3),
    lagDays: 5,
    volume: 2_760_000,
    status: 'ok',
    attestation: NEOGRID,
  },
  {
    source: 'sap',
    lastCapture: daysAgo(1),
    lagDays: 2,
    volume: 318_000,
    status: 'ok',
    attestation: SAP,
  },
  {
    source: 'crm_sfa',
    lastCapture: daysAgo(1),
    lagDays: 2,
    volume: 96_400,
    status: 'ok',
    attestation: CRM_SFA,
  },
  {
    source: 'distribuidores',
    lastCapture: daysAgo(6),
    lagDays: 5,
    volume: 1_905_000,
    status: 'delayed',
    attestation: DISTRIBUIDORES_DELAYED,
  },
  {
    source: 'grandes_redes',
    lastCapture: daysAgo(12),
    lagDays: 5,
    volume: 0,
    status: 'blocked',
    attestation: GRANDES_REDES_BLOCKED,
  },
]

export type DataException = {
  readonly id: string
  readonly source: Source
  /** O que não bateu na conferência. */
  readonly finding: string
  readonly affectedRecords: number
  readonly probableCause: string
  readonly proposedFix: string
  /** Regra permanente criada quando a correção é aceita. */
  readonly rule: string
}

export const DATA_EXCEPTIONS: readonly DataException[] = [
  {
    id: 'exc-001',
    source: 'scanntech',
    finding: 'Coluna de preço unitário chegou como texto',
    affectedRecords: 4_182_000,
    probableCause: 'Novo layout passou a enviar o separador de milhar dentro do campo numérico.',
    proposedFix: 'Interpretar ponto como separador de milhar e vírgula como decimal na coluna.',
    rule: 'Scanntech · preço unitário: normalizar texto para número na ingestão',
  },
  {
    id: 'exc-002',
    source: 'scanntech',
    finding: 'Códigos de produto sem correspondência no cadastro',
    affectedRecords: 142,
    probableCause: 'Loja passou a informar o código interno da rede no lugar do código de barras.',
    proposedFix: 'Resolver pelo de-para de código interno da rede antes de descartar o registro.',
    rule: 'Scanntech · produto: tentar de-para do código da rede antes de rejeitar',
  },
  {
    id: 'exc-003',
    source: 'scanntech',
    finding: 'Datas de captura fora da janela esperada',
    affectedRecords: 8_940,
    probableCause: 'Layout novo envia mês e dia invertidos em parte dos registros.',
    proposedFix: 'Reinterpretar como dia/mês quando o primeiro campo for maior que 12.',
    rule: 'Scanntech · data de captura: desambiguar mês e dia pela faixa do valor',
  },
]

/**
 * Score de confiabilidade por fonte ao longo do mês.
 *
 * Série de telemetria gerada com semente fixa: mede a saúde da ingestão, não o
 * mercado. A queda da Scanntech acompanha a data em que o layout mudou.
 */
export type ReliabilityPoint = {
  readonly date: IsoDate
  readonly label: string
  readonly scanntech: number
  readonly iqvia: number
  readonly neogrid: number
  readonly sap: number
}

const WINDOW_DAYS = 30
const LAYOUT_CHANGE_DAY = WINDOW_DAYS - 1 - ageInDays(daysAgo(9))

function score(random: () => number, base: number, penalty: number): number {
  return Math.round(Math.min(100, Math.max(0, base - penalty + (random() - 0.5) * 3)) * 10) / 10
}

export const RELIABILITY_SERIES: readonly ReliabilityPoint[] = (() => {
  const random = createRandom(MOCK_SEED + 7)
  return Array.from({ length: WINDOW_DAYS }, (_, index) => {
    const date = daysAgo(WINDOW_DAYS - 1 - index)
    const layoutPenalty = index >= LAYOUT_CHANGE_DAY ? 34 : 0
    return {
      date,
      label: date.slice(8, 10),
      scanntech: score(random, 98, layoutPenalty),
      iqvia: score(random, 95, 0),
      neogrid: score(random, 97, 0),
      sap: score(random, 99, 0),
    }
  })
})()

export const RELIABILITY_SOURCES = [
  { key: 'scanntech', label: 'Scanntech' },
  { key: 'iqvia', label: 'IQVIA' },
  { key: 'neogrid', label: 'Neogrid' },
  { key: 'sap', label: 'SAP' },
] as const

/** Atestados degradados que sustentam o banner do topo. */
export const DEGRADED_ATTESTATIONS: readonly Attestation[] = SOURCE_HEALTH.filter(
  (health) => health.status !== 'ok',
).map((health) => health.attestation)

/** Procedência da telemetria de ingestão: o elo mais fraco entre as fontes. */
export const INGESTION_ATTESTATION: Attestation = combine(
  SOURCE_HEALTH.map((health) => health.attestation),
)
