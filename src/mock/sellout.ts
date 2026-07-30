import { daysAgo, formatDate, type IsoDate } from '../domain/today'
import { SELLOUT_GROWTH_PERCENT, SELLOUT_TOTAL_BRL } from './kpis'
import { createRandom, MOCK_SEED } from './random'

/**
 * Evolução diária do sell-out nos 7 dias correntes contra os 7 anteriores.
 *
 * A série é derivada, não inventada: a soma dos 7 dias correntes fecha
 * exatamente em `SELLOUT_TOTAL_BRL` e a dos 7 anteriores no valor que produz os
 * `SELLOUT_GROWTH_PERCENT` do KPI. A distribuição dentro da semana vem de uma
 * semente fixa, então o desenho da curva é o mesmo em qualquer máquina.
 */

export type SelloutPoint = {
  readonly date: IsoDate
  /** Rótulo curto do eixo X, ex.: `24/07`. */
  readonly label: string
  /** Sell-out do dia no período corrente, em reais. */
  readonly current: number
  /** Sell-out do dia equivalente nos 7 dias anteriores, em reais. */
  readonly previous: number
}

const DAYS = 7

const PREVIOUS_TOTAL_BRL = SELLOUT_TOTAL_BRL / (1 + SELLOUT_GROWTH_PERCENT / 100)

/** Pesos diários com leve tendência de alta e ruído semeado. */
function dailyWeights(seed: number): number[] {
  const random = createRandom(seed)
  const raw = Array.from({ length: DAYS }, (_, day) => (1 + (0.12 * day) / (DAYS - 1)) * (0.92 + 0.16 * random()))
  const total = raw.reduce((sum, weight) => sum + weight, 0)
  return raw.map((weight) => weight / total)
}

/** Distribui um total pelos pesos, absorvendo o arredondamento no último dia. */
function distribute(total: number, weights: readonly number[]): number[] {
  const values = weights.map((weight) => Math.round(total * weight))
  const drift = total - values.reduce((sum, value) => sum + value, 0)
  const last = values.length - 1
  values[last] = (values[last] ?? 0) + drift
  return values
}

const currentValues = distribute(SELLOUT_TOTAL_BRL, dailyWeights(MOCK_SEED))
const previousValues = distribute(Math.round(PREVIOUS_TOTAL_BRL), dailyWeights(MOCK_SEED + 1))

export const SELLOUT_SERIES: readonly SelloutPoint[] = Array.from({ length: DAYS }, (_, index) => {
  const date = daysAgo(DAYS - 1 - index)
  return {
    date,
    label: formatDate(date).slice(0, 5),
    current: currentValues[index] ?? 0,
    previous: previousValues[index] ?? 0,
  }
})

export const SELLOUT_PREVIOUS_TOTAL_BRL = previousValues.reduce((sum, value) => sum + value, 0)
