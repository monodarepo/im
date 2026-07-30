import { combine, type Attestation } from '../domain/attestation'
import { DOCTORS } from './doctors'
import { PRIORITY_COLOR, type Priority } from './nba'
import { CRM_SFA, IQVIA, NEOGRID, NEOGRID_DISTRIBUIDORES } from './sources'

/**
 * Roteirização inteligente (GTM, módulo 2.6).
 *
 * A sequência não é a lista de visitas ordenada por potencial: é o que cabe no
 * dia. Potencial, distância, trânsito e janela de atendimento entram juntos, e
 * o roteiro só vale enquanto a realidade não muda. Quando entra um alerta de
 * ruptura ou de oportunidade, o replanejamento é mostrado — a mudança precisa
 * ser visível para o representante confiar nela.
 */

export type Stop = {
  readonly id: string
  readonly label: string
  readonly sublabel: string
  readonly doctorId: string | null
  readonly priority: Priority
  /** Janela de atendimento do ponto. */
  readonly window: string
  /** Minutos de deslocamento desde a parada anterior. */
  readonly travelMinutes: number
  /** Minutos previstos de permanência. */
  readonly durationMinutes: number
  readonly arrival: string
}

export type Route = {
  readonly id: string
  readonly label: string
  readonly stops: readonly Stop[]
  readonly totalTravelMinutes: number
  readonly coveredPotentialBrl: number
}

/**
 * NOTA: não consta do ESCOPO — as paradas, janelas, tempos de deslocamento e
 * horários. Os três médicos das paradas são canônicos da seção 10.4; o
 * restante do roteiro é declarado.
 */
const BASE_STOPS: readonly Stop[] = [
  {
    id: 'stop-1',
    label: 'Dr. Ricardo Alencar',
    sublabel: 'Consultório — Centro',
    doctorId: 'MD-001',
    priority: 'very_high',
    window: '08:30 – 10:00',
    travelMinutes: 0,
    durationMinutes: 30,
    arrival: '08:40',
  },
  {
    id: 'stop-2',
    label: 'Dra. Camila Barros',
    sublabel: 'Clínica — Zona Sul',
    doctorId: 'MD-002',
    priority: 'high',
    window: '09:30 – 12:00',
    travelMinutes: 25,
    durationMinutes: 25,
    arrival: '09:35',
  },
  {
    id: 'stop-3',
    label: 'Farmácia Rede Aurora — Centro',
    sublabel: 'Checagem de gôndola e estoque',
    doctorId: null,
    priority: 'medium',
    window: '10:00 – 16:00',
    travelMinutes: 18,
    durationMinutes: 20,
    arrival: '10:18',
  },
  {
    id: 'stop-4',
    label: 'Dr. Marcelo Vieira',
    sublabel: 'Hospital — Zona Norte',
    doctorId: 'MD-003',
    priority: 'very_high',
    window: '13:00 – 15:00',
    travelMinutes: 35,
    durationMinutes: 30,
    arrival: '13:15',
  },
  {
    id: 'stop-5',
    label: 'Distribuidor Vertente — Tijuca',
    sublabel: 'Alinhamento de reposição',
    doctorId: null,
    priority: 'low',
    window: '14:00 – 17:00',
    travelMinutes: 22,
    durationMinutes: 25,
    arrival: '14:10',
  },
]

function potentialOf(stops: readonly Stop[]): number {
  return stops.reduce((sum, stop) => {
    const doctor = DOCTORS.find((item) => item.id === stop.doctorId)
    return sum + (doctor?.potentialBrl ?? 0)
  }, 0)
}

function travelOf(stops: readonly Stop[]): number {
  return stops.reduce((sum, stop) => sum + stop.travelMinutes, 0)
}

export const BASE_ROUTE: Route = {
  id: 'base',
  label: 'Roteiro planejado',
  stops: BASE_STOPS,
  totalTravelMinutes: travelOf(BASE_STOPS),
  coveredPotentialBrl: potentialOf(BASE_STOPS),
}

export type RouteAlert = {
  readonly id: string
  readonly kind: 'stockout' | 'opportunity'
  readonly title: string
  readonly detail: string
  readonly attestation: Attestation
}

/**
 * NOTA: não consta do ESCOPO — os dois alertas e o roteiro replanejado.
 * O alerta de ruptura se apoia no diagnóstico canônico de ruptura acima de 10%;
 * a instância no ponto de venda é declarada.
 */
export const ROUTE_ALERTS: readonly RouteAlert[] = [
  {
    id: 'alert-stockout',
    kind: 'stockout',
    title: 'Ruptura detectada na Rede Aurora — Centro',
    detail:
      'Losartana 50mg c/30 sem estoque na loja de maior giro do território. A checagem de gôndola vira prioridade e sobe na fila.',
    attestation: combine([NEOGRID, NEOGRID_DISTRIBUIDORES]),
  },
  {
    id: 'alert-opportunity',
    kind: 'opportunity',
    title: 'Janela aberta com Dr. Marcelo Vieira',
    detail:
      'Secretaria confirmou disponibilidade às 11:20. Antecipar evita o deslocamento de volta à Zona Norte à tarde.',
    attestation: combine([CRM_SFA, IQVIA]),
  },
]

/**
 * Roteiro replanejado: a farmácia em ruptura sobe para segunda parada e a
 * visita ao Dr. Marcelo Vieira é antecipada para a janela confirmada. O total
 * de deslocamento cai porque a ida à Zona Norte deixa de ser um retorno.
 */
const REPLANNED_STOPS: readonly Stop[] = [
  BASE_STOPS[0] as Stop,
  {
    ...(BASE_STOPS[2] as Stop),
    priority: 'very_high',
    travelMinutes: 12,
    arrival: '09:22',
    sublabel: 'Ruptura confirmada — reposição imediata',
  },
  {
    ...(BASE_STOPS[3] as Stop),
    window: '11:00 – 12:00',
    travelMinutes: 28,
    arrival: '11:20',
    sublabel: 'Hospital — Zona Norte (janela antecipada)',
  },
  { ...(BASE_STOPS[1] as Stop), travelMinutes: 30, arrival: '13:40' },
  { ...(BASE_STOPS[4] as Stop), travelMinutes: 18, arrival: '15:05' },
]

export const REPLANNED_ROUTE: Route = {
  id: 'replanned',
  label: 'Roteiro replanejado',
  stops: REPLANNED_STOPS,
  totalTravelMinutes: travelOf(REPLANNED_STOPS),
  coveredPotentialBrl: potentialOf(REPLANNED_STOPS),
}

/** Minutos economizados pelo replanejamento. */
export const TRAVEL_SAVED_MINUTES =
  BASE_ROUTE.totalTravelMinutes - REPLANNED_ROUTE.totalTravelMinutes

export type RouteFactor = {
  readonly id: string
  readonly label: string
  readonly description: string
  /** Peso do fator na ordenação, em porcentagem. */
  readonly weightPercent: number
}

/** NOTA: não consta do ESCOPO — os pesos dos fatores de roteirização. */
export const ROUTE_FACTORS: readonly RouteFactor[] = [
  {
    id: 'potential',
    label: 'Potencial',
    description: 'Potencial estimado do médico ou do ponto de venda.',
    weightPercent: 40,
  },
  {
    id: 'distance',
    label: 'Distância',
    description: 'Deslocamento entre paradas consecutivas.',
    weightPercent: 25,
  },
  {
    id: 'traffic',
    label: 'Trânsito',
    description: 'Tempo estimado de percurso na faixa de horário.',
    weightPercent: 20,
  },
  {
    id: 'window',
    label: 'Janela',
    description: 'Horário em que o ponto aceita atendimento.',
    weightPercent: 15,
  },
]

export const ROUTE_COLOR = PRIORITY_COLOR

export const ROUTING_ATTESTATION = combine([CRM_SFA, NEOGRID, IQVIA])
