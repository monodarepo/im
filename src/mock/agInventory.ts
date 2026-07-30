import { combine } from '../domain/attestation'
import { addDays, daysBetween, daysFromNow, HOJE, type IsoDate } from '../domain/today'
import { CRM_SFA, NEOGRID, NEOGRID_DISTRIBUIDORES, SAP } from './sources'
import { BLOCKED_SAMPLES, STOCKOUT_BLOCK } from './sampleAllocation'

/**
 * Estoque de amostras (AG, módulo 4.5) — e a matéria-prima da Redistribuição
 * Inteligente (4.8).
 *
 * As duas telas leem os mesmos lotes de propósito. O ciclo que a demonstração
 * precisa mostrar é: o Otimizador bloqueia o Nordeste por ruptura, o lote
 * retido lá envelhece no estoque, e a Redistribuição propõe transferi-lo antes
 * de virar perda. Se cada tela tivesse a sua lista de lotes, o ciclo seria uma
 * coincidência de texto em vez de consequência de dado.
 */

export type HolderKind = 'branch' | 'operator' | 'rep'

export const HOLDER_KIND_LABEL: Record<HolderKind, string> = {
  branch: 'Filial',
  operator: 'Operador logístico',
  rep: 'Representante',
}

export type LotStatus = 'healthy' | 'watch' | 'at_risk'

export const LOT_STATUS_LABEL: Record<LotStatus, string> = {
  healthy: 'Saudável',
  watch: 'Em observação',
  at_risk: 'Risco de perda',
}

/**
 * NOTA: não consta do ESCOPO — as janelas de risco por validade.
 * Abaixo de 45 dias o lote entra em observação; abaixo de 25, em risco.
 */
export const EXPIRY_WINDOWS = { watchDays: 45, riskDays: 25 } as const

export type Lot = {
  readonly id: string
  readonly batchCode: string
  readonly skuId: string
  readonly skuName: string
  readonly units: number
  readonly expiresOn: IsoDate
  readonly holderId: string
  readonly holderName: string
  readonly holderKind: HolderKind
  readonly region: string
  /** Giro mensal de amostras no detentor, usado para projetar o consumo. */
  readonly monthlyOutflow: number
  /** `true` quando o lote está parado por bloqueio de ruptura do HUB. */
  readonly blockedByStockout: boolean
}

/** Custo unitário da amostra, derivado do custo da campanha canônica. */
export const UNIT_COST_BRL = 2.51

/**
 * NOTA: não consta do ESCOPO — a carteira de lotes.
 *
 * O primeiro lote é o que fecha o ciclo com o Otimizador: são as amostras
 * retidas pelo bloqueio de ruptura do Nordeste, agora perto do vencimento.
 * O volume vem de `BLOCKED_SAMPLES`, não é redigitado.
 */
export const LOTS: readonly Lot[] = [
  {
    id: 'lot-ne-blocked',
    batchCode: 'LT-2026-0412',
    skuId: 'losartana-50-30',
    skuName: 'Losartana 50mg c/30',
    units: BLOCKED_SAMPLES,
    expiresOn: daysFromNow(18),
    holderId: 'filial-nordeste',
    holderName: 'Filial Nordeste',
    holderKind: 'branch',
    region: 'Nordeste',
    monthlyOutflow: 0,
    blockedByStockout: true,
  },
  {
    id: 'lot-sp-capital',
    batchCode: 'LT-2026-0388',
    skuId: 'losartana-50-30',
    skuName: 'Losartana 50mg c/30',
    units: 21_400,
    expiresOn: daysFromNow(96),
    holderId: 'filial-sp',
    holderName: 'Filial São Paulo',
    holderKind: 'branch',
    region: 'SP Capital',
    monthlyOutflow: 8_900,
    blockedByStockout: false,
  },
  {
    id: 'lot-operator',
    batchCode: 'LT-2026-0401',
    skuId: 'dipirona-500-20',
    skuName: 'Dipirona 500mg c/20',
    units: 14_800,
    expiresOn: daysFromNow(38),
    holderId: 'operador-centro',
    holderName: 'Operador Centro-Oeste',
    holderKind: 'operator',
    region: 'Centro-Oeste',
    monthlyOutflow: 3_100,
    blockedByStockout: false,
  },
  {
    id: 'lot-rj',
    batchCode: 'LT-2026-0377',
    skuId: 'losartana-50-30',
    skuName: 'Losartana 50mg c/30',
    units: 9_250,
    expiresOn: daysFromNow(64),
    holderId: 'filial-rj',
    holderName: 'Filial Rio de Janeiro',
    holderKind: 'branch',
    region: 'RJ',
    monthlyOutflow: 4_600,
    blockedByStockout: false,
  },
  {
    id: 'lot-rep-sul',
    batchCode: 'LT-2026-0395',
    skuId: 'paracetamol-750-20',
    skuName: 'Paracetamol 750mg c/20',
    units: 1_180,
    expiresOn: daysFromNow(22),
    holderId: 'rep-sul-04',
    holderName: 'Representante — Sul 04',
    holderKind: 'rep',
    region: 'Sul',
    monthlyOutflow: 240,
    blockedByStockout: false,
  },
  {
    id: 'lot-rep-mg',
    batchCode: 'LT-2026-0402',
    skuId: 'losartana-50-30',
    skuName: 'Losartana 50mg c/30',
    units: 860,
    expiresOn: daysFromNow(71),
    holderId: 'rep-mg-11',
    holderName: 'Representante — MG 11',
    holderKind: 'rep',
    region: 'MG',
    monthlyOutflow: 410,
    blockedByStockout: false,
  },
]

export function daysToExpiry(lot: Lot): number {
  return daysBetween(HOJE, lot.expiresOn)
}

export function lotStatus(lot: Lot): LotStatus {
  const days = daysToExpiry(lot)
  if (days <= EXPIRY_WINDOWS.riskDays) return 'at_risk'
  if (days <= EXPIRY_WINDOWS.watchDays) return 'watch'
  return 'healthy'
}

/**
 * Unidades que o detentor não consegue consumir antes do vencimento, no ritmo
 * de saída atual. É o que se perde se nada for feito — e o que a
 * Redistribuição tenta recuperar.
 */
export function unitsAtRisk(lot: Lot): number {
  const months = daysToExpiry(lot) / 30
  const consumable = Math.round(lot.monthlyOutflow * months)
  return Math.max(0, lot.units - consumable)
}

export function valueAtRiskBrl(lot: Lot): number {
  return Math.round(unitsAtRisk(lot) * UNIT_COST_BRL)
}

export const AT_RISK_LOTS = LOTS.filter((lot) => lotStatus(lot) !== 'healthy' && unitsAtRisk(lot) > 0)

export const TOTAL_UNITS = LOTS.reduce((sum, lot) => sum + lot.units, 0)
export const TOTAL_UNITS_AT_RISK = AT_RISK_LOTS.reduce((sum, lot) => sum + unitsAtRisk(lot), 0)
export const TOTAL_VALUE_AT_RISK_BRL = AT_RISK_LOTS.reduce(
  (sum, lot) => sum + valueAtRiskBrl(lot),
  0,
)

/** O lote que o bloqueio de ruptura deixou parado — o gatilho da redistribuição. */
export const BLOCKED_LOT = LOTS.find((lot) => lot.blockedByStockout)

export const STOCKOUT_SOURCE_ROUTE = STOCKOUT_BLOCK.sourceRoute

export type VirtualStock = {
  readonly holderId: string
  readonly holderName: string
  readonly region: string
  /** Amostras em poder do representante, ainda não entregues. */
  readonly onHand: number
  /** Entregas registradas no ciclo. */
  readonly delivered: number
  /** Amostras sem baixa há mais de um ciclo. */
  readonly stale: number
}

/**
 * Estoque virtual do representante.
 *
 * NOTA: não consta do ESCOPO — a carteira de representantes e seus saldos.
 * "Virtual" porque a amostra saiu do sistema quando deixou a filial, mas ainda
 * não chegou ao médico: sem baixa de entrega, ela existe no papel e não no
 * consultório.
 */
export const VIRTUAL_STOCK: readonly VirtualStock[] = [
  {
    holderId: 'rep-sul-04',
    holderName: 'Representante — Sul 04',
    region: 'Sul',
    onHand: 1_180,
    delivered: 240,
    stale: 640,
  },
  {
    holderId: 'rep-mg-11',
    holderName: 'Representante — MG 11',
    region: 'MG',
    onHand: 860,
    delivered: 410,
    stale: 95,
  },
  {
    holderId: 'rep-sp-02',
    holderName: 'Representante — SP 02',
    region: 'SP Capital',
    onHand: 1_640,
    delivered: 980,
    stale: 120,
  },
  {
    holderId: 'rep-rj-07',
    holderName: 'Representante — RJ 07',
    region: 'RJ',
    onHand: 720,
    delivered: 515,
    stale: 48,
  },
]

export const TOTAL_VIRTUAL_ON_HAND = VIRTUAL_STOCK.reduce((sum, item) => sum + item.onHand, 0)
export const TOTAL_VIRTUAL_STALE = VIRTUAL_STOCK.reduce((sum, item) => sum + item.stale, 0)

export const INVENTORY_ATTESTATION = combine([SAP, NEOGRID, CRM_SFA])
export const LOGISTICS_ATTESTATION = combine([SAP, NEOGRID_DISTRIBUIDORES])

/** Data em que o lote entra na janela de risco. */
export function riskWindowStart(lot: Lot): IsoDate {
  return addDays(lot.expiresOn, -EXPIRY_WINDOWS.riskDays)
}
