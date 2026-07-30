/**
 * Formatação numérica pt-BR.
 *
 * O agrupamento é feito à mão em vez de `Intl.NumberFormat`: builds de Node com
 * ICU reduzido formatam diferente, e a demonstração precisa sair idêntica em
 * qualquer máquina.
 */

/** Sinal de menos tipográfico (U+2212). Nunca usar hífen em número negativo. */
export const MINUS = '−'

/** Sinal de mais, para deltas positivos explícitos. */
export const PLUS = '+'

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function splitMagnitude(value: number, decimals: number): { sign: string; body: string } {
  const rounded = Math.abs(value).toFixed(decimals)
  const [integer = '0', fraction] = rounded.split('.')
  const body = fraction ? `${groupThousands(integer)},${fraction}` : groupThousands(integer)
  // `-0,0` depois do arredondamento é ruído: o número exibido é zero.
  const isNegative = value < 0 && Number(rounded) !== 0
  return { sign: isNegative ? MINUS : '', body }
}

export type SignMode =
  /** Só marca o negativo. */
  | 'negative-only'
  /** Marca positivo e negativo — a forma de delta. */
  | 'always'

function applySign(sign: string, body: string, mode: SignMode): string {
  if (sign) return `${sign}${body}`
  return mode === 'always' ? `${PLUS}${body}` : body
}

/** Decimal pt-BR: `formatDecimal(1610000.5, 1)` → `1.610.000,5`. */
export function formatDecimal(value: number, decimals = 1, mode: SignMode = 'negative-only'): string {
  const { sign, body } = splitMagnitude(value, decimals)
  return applySign(sign, body, mode)
}

/** Inteiro agrupado: `formatInteger(1610000)` → `1.610.000`. */
export function formatInteger(value: number, mode: SignMode = 'negative-only'): string {
  return formatDecimal(value, 0, mode)
}

/** Percentual: `formatPercent(8.6)` → `8,6%`. */
export function formatPercent(value: number, decimals = 1, mode: SignMode = 'negative-only'): string {
  return `${formatDecimal(value, decimals, mode)}%`
}

/** Variação percentual, sempre assinada: `formatPercentDelta(8.6)` → `+8,6%`. */
export function formatPercentDelta(value: number, decimals = 1): string {
  return formatPercent(value, decimals, 'always')
}

/**
 * Pontos percentuais, sempre assinado: `formatPointsDelta(-1.2)` → `−1,2 pp`.
 * Diferença de dois percentuais é pp, nunca %.
 */
export function formatPointsDelta(value: number, decimals = 1): string {
  return `${formatDecimal(value, decimals, 'always')} pp`
}

/** Multiplicador: `formatMultiple(1.8)` → `1,8x`. */
export function formatMultiple(value: number, decimals = 1): string {
  return `${formatDecimal(value, decimals)}x`
}
