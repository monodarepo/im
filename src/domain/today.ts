/**
 * Âncora temporal única da plataforma.
 *
 * Toda data relativa exibida na interface deriva desta constante. Nenhum módulo
 * de domínio ou de dados pode ler o relógio do sistema — a demonstração precisa
 * ser idêntica em qualquer máquina e em qualquer dia.
 */
export const HOJE = '2026-07-30'

/** Data civil no formato ISO `AAAA-MM-DD`. */
export type IsoDate = string

type CivilDate = { year: number; month: number; day: number }

function parse(date: IsoDate): CivilDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) throw new Error(`Data ISO inválida: ${date}`)
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
}

function pad(value: number, size: number): string {
  return String(value).padStart(size, '0')
}

/**
 * Dias desde a época civil (1970-01-01), pelo algoritmo de calendário
 * proléptico gregoriano. Aritmética inteira pura: sem `Date`, sem fuso.
 */
function toEpochDay({ year, month, day }: CivilDate): number {
  const y = month <= 2 ? year - 1 : year
  const era = Math.floor(y / 400)
  const yearOfEra = y - era * 400
  const dayOfYear = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1
  const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear
  return era * 146097 + dayOfEra - 719468
}

function fromEpochDay(epochDay: number): CivilDate {
  const z = epochDay + 719468
  const era = Math.floor(z / 146097)
  const dayOfEra = z - era * 146097
  const yearOfEra = Math.floor(
    (dayOfEra - Math.floor(dayOfEra / 1460) + Math.floor(dayOfEra / 36524) - Math.floor(dayOfEra / 146096)) / 365,
  )
  const y = yearOfEra + era * 400
  const dayOfYear = dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100))
  const mp = Math.floor((5 * dayOfYear + 2) / 153)
  const day = dayOfYear - Math.floor((153 * mp + 2) / 5) + 1
  const month = mp + (mp < 10 ? 3 : -9)
  return { year: month <= 2 ? y + 1 : y, month, day }
}

/** Soma (ou subtrai, com valor negativo) dias a uma data ISO. */
export function addDays(date: IsoDate, days: number): IsoDate {
  const { year, month, day } = fromEpochDay(toEpochDay(parse(date)) + days)
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`
}

/** Dias decorridos de `from` até `to`. Negativo quando `to` é anterior. */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return toEpochDay(parse(to)) - toEpochDay(parse(from))
}

/** Idade da informação em dias, medida a partir de `HOJE`. */
export function ageInDays(asOf: IsoDate): number {
  return daysBetween(asOf, HOJE)
}

const MONTHS_PT = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
]

/** Formata para exibição em pt-BR: `30/07/2026`. */
export function formatDate(date: IsoDate): string {
  const { year, month, day } = parse(date)
  return `${pad(day, 2)}/${pad(month, 2)}/${pad(year, 4)}`
}

/** Formata mês e ano para eixos e rótulos: `jul/26`. */
export function formatMonth(date: IsoDate): string {
  const { year, month } = parse(date)
  return `${MONTHS_PT[month - 1]}/${pad(year % 100, 2)}`
}
