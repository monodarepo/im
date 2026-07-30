import { combine, type Attestation } from '../domain/attestation'
import { daysAgo, type IsoDate } from '../domain/today'
import { DOCTORS, type Doctor } from './doctors'
import { CRM_SFA, IQVIA, NEOGRID, SCANNTECH } from './sources'

/**
 * Next Best Action (GTM, módulo 2.5).
 *
 * A tela responde à frase mais dura da entrevista de GTM: *o vendedor recebe
 * informações, mas não recebe decisões*. Por isso cada card termina numa ação
 * — não num indicador — e o detalhe carrega o racional inteiro: por que este
 * médico, por que agora, com que evidência, contra que objeção e com que
 * mensagem. Recomendação sem racional volta a ser informação.
 */

export type Priority = 'very_high' | 'high' | 'medium' | 'low'

export const PRIORITY_LABEL: Record<Priority, string> = {
  very_high: 'Muito alta',
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
}

/**
 * Escala de prioridade do mapa. Rampa sequencial de matiz única: a leitura é de
 * intensidade, não de categoria, e não colide com a semântica de dado.
 */
export const PRIORITY_COLOR: Record<Priority, string> = {
  very_high: '#0F766E',
  high: '#3DA394',
  medium: '#86C7BC',
  low: '#C9E3DE',
}

export type Recommendation = {
  readonly id: string
  readonly doctorId: string
  /** Motivo em duas linhas, como o ESCOPO especifica o card. */
  readonly reason: readonly [string, string]
  readonly action: string
  readonly priority: Priority
  readonly rationale: {
    readonly whyDoctor: string
    readonly whyNow: string
    readonly evidence: string
    readonly likelyObjection: string
    readonly message: string
  }
  readonly attestation: Attestation
}

const VISIT_ATTESTATION = combine([CRM_SFA, IQVIA])
const PRESCRIPTION_ATTESTATION = combine([IQVIA, SCANNTECH])
const CAMPAIGN_ATTESTATION = combine([CRM_SFA, NEOGRID])

/**
 * NOTA: não consta do ESCOPO — o racional completo de cada recomendação.
 * Nome, especialidade, potencial, motivo e ação recomendada são canônicos da
 * seção 10.4; o detalhe do racional é redigido a partir deles.
 */
export const RECOMMENDATIONS: readonly Recommendation[] = [
  {
    id: 'nba-001',
    doctorId: 'MD-001',
    reason: ['Baixa frequência de visita.', 'Última visita há 21 dias.'],
    action: 'Visitar e apresentar Losartana',
    priority: 'very_high',
    rationale: {
      whyDoctor:
        'Cardiologista de alto potencial na carteira, ligado à oportunidade priorizada de cobertura em Cardiologia no Rio de Janeiro.',
      whyNow:
        'A janela de 21 dias sem visita é a maior da carteira de alto potencial e passa do intervalo em que a prescrição costuma se manter.',
      evidence:
        'Frequência de visita abaixo do padrão do território no CRM, com prescrição estável no período — o risco é de perda por ausência, não por preferência.',
      likelyObjection:
        'Já conhece a molécula e vai perguntar o que mudou desde a última conversa.',
      message:
        'Abrir pelo dado de distribuição da praça e conectar com a disponibilidade na farmácia onde ele encaminha o paciente.',
    },
    attestation: VISIT_ATTESTATION,
  },
  {
    id: 'nba-002',
    doctorId: 'MD-002',
    reason: ['Prescreve pouco Hypera.', 'Alta prescrição de concorrente.'],
    action: 'Visitar e oferecer amostra',
    priority: 'high',
    rationale: {
      whyDoctor:
        'Clínico geral de médio potencial com volume de prescrição relevante, mas concentrado no concorrente.',
      whyNow:
        'A amostra é o instrumento que muda a primeira escolha; adiar mantém o hábito de prescrição onde está.',
      evidence:
        'Participação da Hypera na prescrição dele abaixo da média da especialidade na região, com volume total acima da média.',
      likelyObjection:
        'Vai dizer que o paciente já responde bem ao que ele prescreve hoje.',
      message:
        'Não disputar a molécula: oferecer a amostra para o caso de início de tratamento, onde a escolha ainda está aberta.',
    },
    attestation: PRESCRIPTION_ATTESTATION,
  },
  {
    id: 'nba-003',
    doctorId: 'MD-003',
    reason: ['Alto potencial não explorado.', 'Última visita há 35 dias.'],
    action: 'Visitar e apresentar nova campanha',
    priority: 'very_high',
    rationale: {
      whyDoctor:
        'Cardiologista de alto potencial com a maior distância entre potencial estimado e prescrição registrada.',
      whyNow:
        'São 35 dias sem contato e a campanha nova dá um motivo concreto de reaproximação, em vez de uma visita de manutenção.',
      evidence:
        'Potencial da célula de Cardiologia na região acima da cobertura atual, e nenhuma visita registrada no ciclo.',
      likelyObjection:
        'Agenda cheia — vai oferecer poucos minutos entre atendimentos.',
      message:
        'Levar a campanha em uma página e fechar com o compromisso da próxima janela, não com o volume de informação.',
    },
    attestation: CAMPAIGN_ATTESTATION,
  },
]

export function doctorOf(recommendation: Recommendation): Doctor | undefined {
  return DOCTORS.find((doctor) => doctor.id === recommendation.doctorId)
}

/** Resumo do dia do representante (seção 10.4). */
export const DAY_SUMMARY = {
  plannedVisits: 18,
  completedVisits: 7,
  routeAdherencePercent: 78,
  doctorsReached: 12,
  samplesToDeliver: 34,
  /** Horário da última recomposição da fila, como o ESCOPO o fixa. */
  updatedAt: '08:30',
}

export type TeamMetric = {
  readonly id: string
  readonly label: string
  readonly value: number
  readonly target: number | null
  readonly format: 'percent' | 'money'
  readonly delta: number | null
  readonly comparison: string | null
}

/** Desempenho da equipe na semana (seção 10.4). */
export const TEAM_PERFORMANCE: readonly TeamMetric[] = [
  {
    id: 'coverage',
    label: 'Cobertura de médicos',
    value: 82,
    target: 90,
    format: 'percent',
    delta: null,
    comparison: null,
  },
  {
    id: 'productive-visits',
    label: 'Visitas produtivas',
    value: 68,
    target: 75,
    format: 'percent',
    delta: null,
    comparison: null,
  },
  {
    id: 'conversion',
    label: 'Conversão por visita',
    value: 23,
    target: 25,
    format: 'percent',
    delta: null,
    comparison: null,
  },
  {
    id: 'incremental-sellout',
    label: 'Sell-out incremental',
    value: 1_200_000,
    target: null,
    format: 'money',
    delta: 15,
    comparison: 'vs. semana anterior',
  },
]

/** Próximas ações sugeridas (seção 10.4). */
export const SUGGESTED_ACTIONS: readonly string[] = [
  'Priorizar 5 cardiologistas de alto potencial',
  'Aumentar frequência em 3 territórios',
  'Entregar 12 amostras a médicos-alvo',
  'Apresentar campanha Losartana Plus',
]

export type PriorityPin = {
  readonly id: string
  readonly label: string
  readonly priority: Priority
  /** Posição no mapa estilizado, em porcentagem da caixa. */
  readonly x: number
  readonly y: number
  readonly doctorId: string | null
}

/**
 * NOTA: não consta do ESCOPO — as posições dos pins e as praças além das dos
 * três médicos canônicos. O mapa é estilizado: as posições preservam a
 * vizinhança relativa da região, não a coordenada geográfica.
 */
export const PRIORITY_PINS: readonly PriorityPin[] = [
  { id: 'pin-1', label: 'Centro', priority: 'very_high', x: 46, y: 38, doctorId: 'MD-001' },
  { id: 'pin-2', label: 'Zona Sul', priority: 'high', x: 38, y: 62, doctorId: 'MD-002' },
  { id: 'pin-3', label: 'Zona Norte', priority: 'very_high', x: 58, y: 22, doctorId: 'MD-003' },
  { id: 'pin-4', label: 'Barra', priority: 'medium', x: 22, y: 54, doctorId: null },
  { id: 'pin-5', label: 'Tijuca', priority: 'high', x: 62, y: 48, doctorId: null },
  { id: 'pin-6', label: 'Méier', priority: 'medium', x: 70, y: 66, doctorId: null },
  { id: 'pin-7', label: 'Baixada', priority: 'low', x: 30, y: 24, doctorId: null },
  { id: 'pin-8', label: 'Niterói', priority: 'low', x: 80, y: 36, doctorId: null },
]

export const PRIORITY_ORDER: readonly Priority[] = ['very_high', 'high', 'medium', 'low']

export const NBA_FILTERS = [
  { label: 'Período', value: 'Esta semana' },
  { label: 'Território', value: 'Rio de Janeiro — Capital' },
  { label: 'Especialidade', value: 'Cardiologia' },
  { label: 'Produto', value: 'Losartana 50mg c/30' },
] as const

/** Rota do Otimizador de Alocação no AG, destino das amostras a entregar. */
export const SAMPLE_ALLOCATION_ROUTE = '/ag/otimizador'

export const NBA_ATTESTATION = combine([CRM_SFA, IQVIA, SCANNTECH])

export const LAST_UPDATE_DATE: IsoDate = daysAgo(0)
