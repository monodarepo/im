import { combine, type Attestation } from '../domain/attestation'
import { MARKET } from '../domain/elasticity'
import { IQVIA, NEOGRID_DISTRIBUIDORES, SCANNTECH } from './sources'
import { findDecision } from './decisions'

/**
 * Cockpit de preço e margem (RGM, módulo 3.1).
 *
 * O corredor é a faixa de índice de preço relativo em que a marca aceita
 * operar: dentro dela o preço é decisão tomada, fora dela é exceção que precisa
 * de dono. O semáforo lê exatamente isso — não é alerta genérico.
 */

/**
 * NOTA: não consta do ESCOPO — limites do corredor de preço.
 * Faixa de IPR aceita como paridade operacional. Losartana em 103,2 fica acima
 * do teto, que é o que justifica o cenário do simulador.
 */
export const PRICE_CORRIDOR = { floor: 96, ceiling: 102 } as const

export type CorridorStatus = 'below' | 'inside' | 'above'

export const CORRIDOR_LABEL: Record<CorridorStatus, string> = {
  below: 'Abaixo do corredor',
  inside: 'Dentro do corredor',
  above: 'Acima do corredor',
}

export function corridorStatus(index: number): CorridorStatus {
  if (index < PRICE_CORRIDOR.floor) return 'below'
  if (index > PRICE_CORRIDOR.ceiling) return 'above'
  return 'inside'
}

export type PriceLine = {
  readonly id: string
  readonly molecule: string
  readonly presentation: string
  readonly channel: string
  readonly region: string
  readonly ownPriceBrl: number
  readonly competitorPriceBrl: number
  readonly relativePriceIndex: number
  /** Captura potencial ao trazer o preço para dentro do corredor. */
  readonly potentialCaptureBrl: number
  readonly decisionId: string | null
  readonly attestation: Attestation
}

const PRICE_ATTESTATION = combine([SCANNTECH, IQVIA])
const CHANNEL_ATTESTATION = combine([SCANNTECH, NEOGRID_DISTRIBUIDORES])

const index = (own: number, competitor: number) => Math.round((own / competitor) * 100 * 10) / 10

/**
 * NOTA: não consta do ESCOPO — preços por linha fora de Losartana/Farma/Sudeste
 * e as capturas potenciais de Losartana e Paracetamol.
 *
 * Ancoragens que vêm do canônico: a linha de Losartana reproduz os parâmetros
 * do simulador (R$ 12,90 contra R$ 12,50, IPR 103,2) e a captura de Dipirona em
 * MG é o impacto de D-2026-0002.
 */
const DIPIRONA_CAPTURE_BRL = findDecision('D-2026-0002')?.impactBrl ?? 0

export const PRICE_LINES: readonly PriceLine[] = [
  {
    id: 'losartana-farma-sudeste',
    molecule: 'Losartana',
    presentation: '50mg c/30',
    channel: 'Farma',
    region: 'Sudeste',
    ownPriceBrl: MARKET.basePriceBrl,
    competitorPriceBrl: MARKET.competitorPriceBrl,
    relativePriceIndex: index(MARKET.basePriceBrl, MARKET.competitorPriceBrl),
    potentialCaptureBrl: 1_875_000,
    decisionId: 'D-2026-0001',
    attestation: PRICE_ATTESTATION,
  },
  {
    id: 'dipirona-farma-sudeste',
    molecule: 'Dipirona',
    presentation: '500mg c/20',
    channel: 'Farma',
    region: 'Sudeste',
    ownPriceBrl: 9.8,
    competitorPriceBrl: 9.4,
    relativePriceIndex: index(9.8, 9.4),
    potentialCaptureBrl: DIPIRONA_CAPTURE_BRL,
    decisionId: 'D-2026-0002',
    attestation: PRICE_ATTESTATION,
  },
  {
    id: 'paracetamol-farma-nordeste',
    molecule: 'Paracetamol',
    presentation: '750mg c/20',
    channel: 'Farma',
    region: 'Nordeste',
    ownPriceBrl: 10.7,
    competitorPriceBrl: 11.2,
    relativePriceIndex: index(10.7, 11.2),
    potentialCaptureBrl: 840_000,
    decisionId: null,
    attestation: CHANNEL_ATTESTATION,
  },
  {
    id: 'losartana-atacado-sul',
    molecule: 'Losartana',
    presentation: '50mg c/30',
    channel: 'Atacado',
    region: 'Sul',
    ownPriceBrl: 11.6,
    competitorPriceBrl: 11.7,
    relativePriceIndex: index(11.6, 11.7),
    potentialCaptureBrl: 0,
    decisionId: null,
    attestation: CHANNEL_ATTESTATION,
  },
  {
    id: 'dipirona-atacado-centro-oeste',
    molecule: 'Dipirona',
    presentation: '500mg c/20',
    channel: 'Atacado',
    region: 'Centro-Oeste',
    ownPriceBrl: 8.9,
    competitorPriceBrl: 9.35,
    relativePriceIndex: index(8.9, 9.35),
    potentialCaptureBrl: 0,
    decisionId: null,
    attestation: CHANNEL_ATTESTATION,
  },
]

export type MoleculeCapture = {
  readonly molecule: string
  readonly potentialCaptureBrl: number
  readonly linesOutside: number
  readonly lines: number
}

/** Ranking de moléculas por captura potencial. */
export const MOLECULE_CAPTURE: readonly MoleculeCapture[] = Object.values(
  PRICE_LINES.reduce<Record<string, MoleculeCapture>>((acc, line) => {
    const previous = acc[line.molecule] ?? {
      molecule: line.molecule,
      potentialCaptureBrl: 0,
      linesOutside: 0,
      lines: 0,
    }
    acc[line.molecule] = {
      molecule: line.molecule,
      potentialCaptureBrl: previous.potentialCaptureBrl + line.potentialCaptureBrl,
      linesOutside:
        previous.linesOutside + (corridorStatus(line.relativePriceIndex) === 'inside' ? 0 : 1),
      lines: previous.lines + 1,
    }
    return acc
  }, {}),
).sort((a, b) => b.potentialCaptureBrl - a.potentialCaptureBrl)

export const TOTAL_CAPTURE_BRL = MOLECULE_CAPTURE.reduce(
  (sum, item) => sum + item.potentialCaptureBrl,
  0,
)

export const LINES_OUTSIDE_CORRIDOR = PRICE_LINES.filter(
  (line) => corridorStatus(line.relativePriceIndex) !== 'inside',
).length

export const PRICING_ATTESTATION = combine(PRICE_LINES.map((line) => line.attestation))
