import { ageInDays, type IsoDate } from './today'

/**
 * Fontes válidas da plataforma. O tipo é fechado de propósito: nenhuma origem
 * fora desta lista pode entrar em um atestado.
 */
export type Source =
  | 'scanntech'
  | 'iqvia'
  | 'neogrid'
  | 'sap'
  | 'crm_sfa'
  | 'distribuidores'
  | 'grandes_redes'

export const SOURCE_LABEL: Record<Source, string> = {
  scanntech: 'Scanntech',
  iqvia: 'IQVIA',
  neogrid: 'Neogrid',
  sap: 'SAP',
  crm_sfa: 'CRM/SFA',
  distribuidores: 'Distribuidores',
  grandes_redes: 'Grandes redes',
}

/** Confiança no número. Escala ordinal — `low` é o elo mais fraco. */
export type Confidence = 'low' | 'medium' | 'high'

/** Integridade do dado que sustenta o número. */
export type Quality = 'degraded' | 'partial' | 'complete'

/** Como o número foi obtido. */
export type Method = 'measured' | 'derived' | 'modeled'

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  low: 'Confiança baixa',
  medium: 'Confiança média',
  high: 'Confiança alta',
}

export const QUALITY_LABEL: Record<Quality, string> = {
  degraded: 'Dado degradado',
  partial: 'Dado parcial',
  complete: 'Dado completo',
}

export const METHOD_LABEL: Record<Method, string> = {
  measured: 'Medido',
  derived: 'Derivado',
  modeled: 'Modelado',
}

const CONFIDENCE_RANK: Record<Confidence, number> = { low: 0, medium: 1, high: 2 }
const QUALITY_RANK: Record<Quality, number> = { degraded: 0, partial: 1, complete: 2 }
const METHOD_RANK: Record<Method, number> = { modeled: 0, derived: 1, measured: 2 }

/**
 * Procedência de um número exibido. Todo valor relevante na interface carrega
 * um atestado — sem ele, o número não vai para a tela.
 */
export type Attestation = {
  /** Fontes que sustentam o número, sem repetição. */
  readonly source: readonly Source[]
  /** Data de referência da informação. */
  readonly asOf: IsoDate
  /** Atraso da fonte, em dias, na data de referência. */
  readonly lagDays: number
  readonly confidence: Confidence
  readonly quality: Quality
  readonly method: Method
}

function weakest<T extends string>(values: readonly T[], rank: Record<T, number>, fallback: T): T {
  return values.reduce<T>((worst, value) => (rank[value] < rank[worst] ? value : worst), fallback)
}

function uniqueSources(attestations: readonly Attestation[]): readonly Source[] {
  const seen = new Set<Source>()
  for (const attestation of attestations) {
    for (const source of attestation.source) seen.add(source)
  }
  return [...seen].sort()
}

function oldest(dates: readonly IsoDate[]): IsoDate {
  return dates.reduce((worst, date) => (date < worst ? date : worst))
}

/**
 * Combina atestados retornando sempre o elo mais fraco: a menor confiança, a
 * menor qualidade, o método menos direto, o maior atraso e a data de referência
 * mais antiga. Um número composto nunca parece mais firme que sua pior parcela.
 */
export function combine(attestations: readonly Attestation[]): Attestation {
  const [first] = attestations
  if (!first) throw new Error('combine() exige ao menos um atestado')
  if (attestations.length === 1) return first

  return {
    source: uniqueSources(attestations),
    asOf: oldest(attestations.map((a) => a.asOf)),
    lagDays: Math.max(...attestations.map((a) => a.lagDays)),
    confidence: weakest(
      attestations.map((a) => a.confidence),
      CONFIDENCE_RANK,
      first.confidence,
    ),
    quality: weakest(
      attestations.map((a) => a.quality),
      QUALITY_RANK,
      first.quality,
    ),
    method: weakest(
      attestations.map((a) => a.method),
      METHOD_RANK,
      first.method,
    ),
  }
}

/**
 * Um atestado está atrasado quando a idade da informação, medida de `HOJE`,
 * ultrapassa o atraso esperado da fonte. Estado atrasado degrada a tela com
 * um aviso — nunca a bloqueia.
 */
export function isStale(attestation: Attestation): boolean {
  return ageInDays(attestation.asOf) > attestation.lagDays
}

/** Frase de procedência para tooltip e rodapé de card. */
export function describeAttestation(attestation: Attestation): string {
  const sources = attestation.source.map((source) => SOURCE_LABEL[source]).join(' + ')
  return `${sources} · ${METHOD_LABEL[attestation.method]} · ${CONFIDENCE_LABEL[attestation.confidence].toLowerCase()}`
}
