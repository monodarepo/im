import { combine, type Attestation } from '../domain/attestation'
import { MARKET, simulate, type ScenarioInputs, type ScenarioOutcome } from '../domain/elasticity'
import { IQVIA, NEOGRID, SAP, SCANNTECH } from './sources'

/**
 * Cenários canônicos do simulador (seção 10.3 do ESCOPO).
 *
 * As linhas abaixo são fixadas como dado, não recalculadas na carga: são os
 * números que o ESCOPO fixa e que a demonstração precisa mostrar. O modelo de
 * elasticidade governa apenas o que o usuário editar — e como a calibração sai
 * destas mesmas âncoras, voltar aos parâmetros canônicos devolve os números
 * canônicos exatos.
 *
 * ## Divergência conhecida no Cenário 3
 *
 * Volume e share dos quatro cenários fecham com o modelo. As linhas monetárias
 * fecham em Atual, Cenário 1 e Cenário 2 por `sell-out = volume × preço` e
 * `receita = sell-out × (1 − desconto)`. O Cenário 3 não fecha por nenhuma
 * fórmula compatível com os outros três:
 *
 * | linha           | ESCOPO   | fórmula dos demais |
 * | --------------- | -------- | ------------------ |
 * | IPR             | 95,0     | 103,2 (preço de tabela inalterado) |
 * | Sell-out        | 19,6M    | 20,8M              |
 * | Receita líquida | 18,0M    | 19,1M              |
 *
 * O IPR do Cenário 2 (95,2) segue o preço de tabela; o do Cenário 3 (95,0)
 * segue o preço líquido. Os dois critérios não coexistem. Mantivemos o número
 * do ESCOPO em cada linha e registramos a divergência aqui em vez de escolher
 * um dos dois em silêncio.
 */

export type ScenarioId = 'current' | 'scenario-1' | 'scenario-2' | 'scenario-3'

export type Scenario = {
  readonly id: ScenarioId
  readonly label: string
  readonly inputs: ScenarioInputs
  /** Valores da seção 10.3, exibidos enquanto o cenário não for editado. */
  readonly canonical: ScenarioOutcome
  readonly editable: boolean
}

const pinned = (
  priceBrl: number,
  discountRate: number,
  relativePriceIndexValue: number,
  volume: number,
  sellOutBrl: number,
  netRevenueBrl: number,
  contributionBrl: number,
  sharePercent: number,
  promoRoiPercent: number | null,
): ScenarioOutcome => ({
  priceBrl,
  discountRate,
  netPriceBrl: priceBrl * (1 - discountRate),
  relativePriceIndex: relativePriceIndexValue,
  volume,
  sellOutBrl,
  netRevenueBrl,
  contributionBrl,
  sharePercent,
  promoRoiPercent,
})

export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'current',
    label: 'Atual',
    inputs: { priceBrl: 12.9, discountRate: 0 },
    canonical: pinned(12.9, 0, 103.2, 1_250_000, 16_125_000, 16_125_000, 7_310_000, 18.7, null),
    editable: false,
  },
  {
    id: 'scenario-1',
    label: 'Cenário 1',
    inputs: { priceBrl: 12.4, discountRate: 0 },
    canonical: pinned(12.4, 0, 99.2, 1_340_000, 16_616_000, 16_616_000, 7_550_000, 19.2, 15.2),
    editable: true,
  },
  {
    id: 'scenario-2',
    label: 'Cenário 2',
    inputs: { priceBrl: 11.9, discountRate: 0.05 },
    canonical: pinned(11.9, 0.05, 95.2, 1_520_000, 18_088_000, 17_183_600, 7_820_000, 20.8, 22.8),
    editable: true,
  },
  {
    id: 'scenario-3',
    label: 'Cenário 3',
    inputs: { priceBrl: 12.9, discountRate: 0.08 },
    canonical: pinned(12.9, 0.08, 95.0, 1_610_000, 19_600_000, 18_000_000, 8_190_000, 21.9, 25.6),
    editable: true,
  },
]

const BY_ID = new Map(SCENARIOS.map((scenario) => [scenario.id, scenario]))

export function findScenario(id: ScenarioId): Scenario | undefined {
  return BY_ID.get(id)
}

/** Tolerância de centavo e de ponto de desconto ao comparar com o canônico. */
function sameInputs(a: ScenarioInputs, b: ScenarioInputs): boolean {
  return (
    Math.abs(a.priceBrl - b.priceBrl) < 0.005 &&
    Math.abs(a.discountRate - b.discountRate) < 0.0005
  )
}

/**
 * Resolve o que a coluna exibe.
 *
 * Nos parâmetros canônicos devolve a linha fixada — é o que garante que mexer e
 * voltar reponha exatamente os números do ESCOPO. Fora deles, entrega a
 * simulação.
 */
export function resolveScenario(scenario: Scenario, inputs: ScenarioInputs): ScenarioOutcome {
  return sameInputs(inputs, scenario.inputs) ? scenario.canonical : simulate(inputs)
}

export const SCENARIO_FILTERS = [
  { label: 'Molécula', value: 'Losartana' },
  { label: 'Apresentação', value: '50mg c/30' },
  { label: 'Canal', value: 'Farma' },
  { label: 'Região', value: 'Sudeste' },
] as const

export const CURRENT_PARAMETERS = [
  { label: 'Preço', value: MARKET.basePriceBrl, format: 'currency' as const },
  { label: 'Desconto', value: 0, format: 'percent' as const },
  { label: 'Preço concorrente médio', value: MARKET.competitorPriceBrl, format: 'currency' as const },
  { label: 'Índice de preço (IPR)', value: 103.2, format: 'index' as const },
  { label: 'Margem de contribuição', value: 45.5, format: 'percent' as const },
  { label: 'Volume atual', value: MARKET.baseVolume, format: 'integer' as const },
]

/** Recomendação da IA para o período. */
export const SCENARIO_RECOMMENDATION = {
  scenarioId: 'scenario-3' as ScenarioId,
  rationale: 'Melhor equilíbrio entre volume, receita e margem',
  confidencePercent: 78,
}

export const BASELINE = SCENARIOS[0] as Scenario
export const RECOMMENDED = SCENARIOS[3] as Scenario

/** Impacto do cenário recomendado contra o atual, derivado das linhas fixadas. */
export const RECOMMENDED_IMPACT = {
  netRevenueBrl: RECOMMENDED.canonical.netRevenueBrl - BASELINE.canonical.netRevenueBrl,
  volume: RECOMMENDED.canonical.volume - BASELINE.canonical.volume,
  sharePoints:
    Math.round((RECOMMENDED.canonical.sharePercent - BASELINE.canonical.sharePercent) * 10) / 10,
  contributionPercent:
    Math.round(
      (RECOMMENDED.canonical.contributionBrl / BASELINE.canonical.contributionBrl - 1) * 100 * 10,
    ) / 10,
}

/** Parcela que o cenário aprovado leva para a Decisão. */
export const APPROVAL_DECISION_ID = 'D-2026-0001'

export const SCENARIO_ATTESTATION: Attestation = combine([SCANNTECH, IQVIA, NEOGRID, SAP])
