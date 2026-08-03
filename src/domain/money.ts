/**
 * AUD-30: o espaço entre "R$" e o valor é fino (U+2009). Em Geist Mono o
 * espaço comum é célula cheia e lê como espaço duplo.
 */
import { formatDecimal, formatInteger, type SignMode } from './format'

/**
 * Valores monetários em reais.
 *
 * O valor circula sempre em reais inteiros no domínio; a abreviação é decisão
 * de exibição. Nada no mock guarda número já abreviado.
 */

const BILLION = 1_000_000_000
const MILLION = 1_000_000
const THOUSAND = 1_000

type Magnitude = { threshold: number; suffix: string }

/**
 * `mil` leva espaço porque a palavra é lida; `M` e `bi` ficam colados ao
 * número, como em `R$ 256,4M`.
 */
const MAGNITUDES: readonly Magnitude[] = [
  { threshold: BILLION, suffix: 'bi' },
  { threshold: MILLION, suffix: 'M' },
  { threshold: THOUSAND, suffix: ' mil' },
]

/**
 * Forma compacta de cartão e KPI: `formatMoney(256_400_000)` → `R$ 256,4M`.
 */
export function formatMoney(value: number, decimals = 1, mode: SignMode = 'negative-only'): string {
  const magnitude = MAGNITUDES.find(({ threshold }) => Math.abs(value) >= threshold)
  if (!magnitude) return `R$ ${formatDecimal(value, 0, mode)}`

  const scaled = formatDecimal(value / magnitude.threshold, decimals, mode)
  return `R$ ${scaled}${magnitude.suffix}`
}

/** Valor cheio, para tabela e detalhe: `formatMoneyFull(1_610_000)` → `R$ 1.610.000`. */
export function formatMoneyFull(value: number, mode: SignMode = 'negative-only'): string {
  return `R$ ${formatInteger(value, mode)}`
}

/** Variação monetária, sempre assinada: `formatMoneyDelta(-4_800_000)` → `R$ −4,8M`. */
export function formatMoneyDelta(value: number, decimals = 1): string {
  return formatMoney(value, decimals, 'always')
}
