import { combine, type Attestation } from '../domain/attestation'
import type { ProductId } from '../design/tokens'
import { FEATURED_DECISION } from './decisionRecords'
import { DOCTORS } from './doctors'
import { CRM_SFA, IQVIA, NEOGRID, NEOGRID_DISTRIBUIDORES, SAP, SCANNTECH } from './sources'

/**
 * Copiloto Executivo (seção 2, S3).
 *
 * A pergunta canônica tem resposta determinística: não há LLM aqui, e não
 * precisa haver. O que a demonstração precisa provar não é que o modelo
 * escreve bonito — é que a plataforma sabe responder atravessando os quatro
 * produtos, com número atestado e link para a tela que apurou cada bloco.
 *
 * Toda resposta termina no mesmo lugar: uma decisão rastreável. Recomendação
 * que não vira decisão é conversa.
 */

export const CANONICAL_QUESTION =
  'Quais são as cinco maiores oportunidades para recuperar market share de Losartana em São Paulo nas próximas quatro semanas?'

export type SuggestedQuestion = {
  readonly id: string
  readonly text: string
  /** `true` na pergunta canônica, a única com resposta montada. */
  readonly answered: boolean
}

export const SUGGESTED_QUESTIONS: readonly SuggestedQuestion[] = [
  { id: 'canonical', text: CANONICAL_QUESTION, answered: true },
  {
    id: 'gtn',
    text: 'Onde está o desconto comercial que não vira volume?',
    answered: false,
  },
  {
    id: 'samples',
    text: 'Qual campanha de amostra grátis teve o melhor retorno no trimestre?',
    answered: false,
  },
  {
    id: 'stockout',
    text: 'Que territórios estão em ruptura há mais de duas semanas?',
    answered: false,
  },
]

export type AnswerRow = {
  readonly label: string
  readonly value: string
  readonly note?: string
}

export type AnswerBlock = {
  readonly id: string
  readonly title: string
  /** A frase que responde o bloco, antes de qualquer tabela. */
  readonly headline: string
  readonly rows: readonly AnswerRow[]
  readonly product: ProductId
  readonly route: string
  readonly routeLabel: string
  readonly attestation: Attestation
}

const cardiologists = DOCTORS.filter((doctor) => doctor.specialty === 'cardiologia')

/**
 * Os dez blocos da resposta.
 *
 * NOTA: não constam do ESCOPO — os valores por território, cliente e loja, o
 * preço relativo por canal e o plano de ação. Os médicos são os canônicos da
 * seção 10.4 e a decomposição do impacto é a da D-2026-0001 (seção 10.2), que
 * é o que amarra a resposta do copiloto à decisão que já existe.
 */
export const ANSWER_BLOCKS: readonly AnswerBlock[] = [
  {
    id: 'territories',
    title: 'Territórios prioritários',
    headline:
      'Três territórios concentram 68% da perda de participação em São Paulo. Começar por eles é o que muda o número no ciclo.',
    rows: [
      { label: 'SP Capital — Centro', value: 'R$ 1,8M', note: '−4,1 pp de participação' },
      { label: 'SP Capital — Zona Leste', value: 'R$ 1,1M', note: '−3,4 pp de participação' },
      { label: 'SP Interior — Campinas', value: 'R$ 0,9M', note: '−2,2 pp de participação' },
    ],
    product: 'gtm',
    route: '/gtm/territorios',
    routeLabel: 'Territórios e Cobertura',
    attestation: combine([CRM_SFA, IQVIA]),
  },
  {
    id: 'customers',
    title: 'Clientes e lojas',
    headline:
      'A perda está no canal independente, não nas grandes redes. São 148 pontos sem visita no ciclo.',
    rows: [
      { label: 'Farmácias independentes', value: '148 pontos', note: 'sem visita no ciclo' },
      { label: 'Rede Aurora — Centro', value: 'R$ 0,6M', note: 'ruptura de 11,8%' },
      { label: 'Distribuidor Paulista', value: 'R$ 0,4M', note: 'cobertura de estoque abaixo do piso' },
    ],
    product: 'hub',
    route: '/hub/cliente',
    routeLabel: 'Cliente e Canal 360°',
    attestation: combine([NEOGRID, SCANNTECH]),
  },
  {
    id: 'cause',
    title: 'Causa da perda',
    headline: FEATURED_DECISION.probableCause,
    rows: [
      { label: 'Ruptura no canal independente', value: '11,8%', note: 'limite de 10%' },
      { label: 'Pontos sem visita no ciclo', value: '148 de 1.240' },
      { label: 'Preço acima do teto do corredor', value: 'IPR 104,3', note: 'corredor 96–102' },
    ],
    product: 'hub',
    route: '/hub/causa-raiz',
    routeLabel: 'Diagnóstico de Causa Raiz',
    attestation: combine([NEOGRID_DISTRIBUIDORES, SCANNTECH]),
  },
  {
    id: 'price',
    title: 'Preço relativo',
    headline:
      'O concorrente direto está 4,1% mais barato na mesma gôndola. Voltar ao teto do corredor recupera competitividade sem entrar em guerra de preço.',
    rows: [
      { label: 'IPR atual em SP', value: '104,3' },
      { label: 'Teto do corredor', value: '102,0' },
      { label: 'Ajuste sugerido', value: '−2,3 pontos de índice' },
    ],
    product: 'rgm',
    route: '/rgm/competitividade',
    routeLabel: 'Índice de Competitividade',
    attestation: SCANNTECH,
  },
  {
    id: 'coverage',
    title: 'Cobertura comercial',
    headline:
      'Recompor a visita nos 148 pontos exige duas semanas de capacidade extra, disponível em territórios vizinhos com folga de agenda.',
    rows: [
      { label: 'Pontos a recobrir', value: '148' },
      { label: 'Capacidade necessária', value: '2 semanas' },
      { label: 'Origem da capacidade', value: 'SP Interior — folga de agenda' },
    ],
    product: 'gtm',
    route: '/gtm/roteirizacao',
    routeLabel: 'Roteirização Inteligente',
    attestation: CRM_SFA,
  },
  {
    id: 'doctors',
    title: 'Médicos prioritários',
    headline:
      'Os cardiologistas de alto potencial da praça respondem por parte relevante da prescrição e estão com visita atrasada.',
    rows: cardiologists.map((doctor) => ({
      label: doctor.name,
      value: `${doctor.uf} · potencial alto`,
      note: `última visita há ${doctor.lastVisitDaysAgo} dias`,
    })),
    product: 'gtm',
    route: '/gtm/nba',
    routeLabel: 'Next Best Action',
    attestation: combine([IQVIA, CRM_SFA]),
  },
  {
    id: 'samples',
    title: 'Amostras recomendadas',
    headline:
      'A amostragem entra depois da recomposição de estoque, nunca antes: não se estimula demanda onde o produto não está disponível.',
    rows: [
      { label: 'Amostras para a praça', value: '20 por médico de alto potencial' },
      { label: 'Condição de liberação', value: 'ruptura abaixo de 10%' },
      { label: 'Estoque disponível', value: 'suficiente na filial São Paulo' },
    ],
    product: 'ag',
    route: '/ag/otimizador',
    routeLabel: 'Otimizador de Alocação',
    attestation: combine([SAP, CRM_SFA]),
  },
  {
    id: 'impact',
    title: 'Impacto potencial',
    headline:
      'A soma das três frentes é a decomposição da decisão que já existe — não é um número novo.',
    rows: FEATURED_DECISION.parcels.map((parcel) => ({
      label: parcel.label,
      value: `R$ ${(parcel.amountBrl / 1_000_000).toFixed(1).replace('.', ',')}M`,
    })),
    product: 'hub',
    route: '/decisoes/D-2026-0001',
    routeLabel: 'Decisão D-2026-0001',
    attestation: FEATURED_DECISION.attestation,
  },
  {
    id: 'plan',
    title: 'Plano de ação',
    headline: 'Quatro semanas, na ordem em que uma frente destrava a seguinte.',
    rows: [
      { label: 'Semana 1', value: 'Recompor abastecimento no canal independente' },
      { label: 'Semana 2', value: 'Ajustar preço relativo ao teto do corredor' },
      { label: 'Semanas 2–3', value: 'Recobrir os 148 pontos sem visita' },
      { label: 'Semana 4', value: 'Reativar amostragem nos cardiologistas prioritários' },
    ],
    product: 'hub',
    route: '/decisoes/D-2026-0001',
    routeLabel: 'Decisão D-2026-0001',
    attestation: FEATURED_DECISION.attestation,
  },
  {
    id: 'owners',
    title: 'Responsáveis',
    headline:
      'Cada frente tem dono e prazo. Recomendação sem dono não sai do slide.',
    rows: [
      { label: 'Abastecimento e ruptura', value: 'Carla Mendes', note: 'Diretoria Comercial' },
      { label: 'Preço relativo', value: 'João Pedro', note: 'Gerência de RGM' },
      { label: 'Cobertura comercial', value: 'Mariana Santos', note: 'Gerência de GTM' },
      { label: 'Amostragem', value: 'Fernanda Lima', note: 'Gerência de Amostra Grátis' },
    ],
    product: 'gtm',
    route: '/decisoes/D-2026-0001',
    routeLabel: 'Decisão D-2026-0001',
    attestation: CRM_SFA,
  },
]

export const ANSWER_ATTESTATION: Attestation = combine(
  ANSWER_BLOCKS.map((block) => block.attestation),
)

/**
 * Rodapé de explicabilidade, sempre visível.
 *
 * Quatro perguntas que a resposta tem que responder sobre si mesma: de onde
 * veio o dado, que regra foi aplicada, quanta confiança carrega e quão velho
 * está. Sem isso, uma resposta bem escrita é indistinguível de uma inventada.
 */
export const EXPLAINABILITY = {
  data: 'Scanntech (sell-out), IQVIA (prescrição e participação), Neogrid e distribuidores (estoque e ruptura), SAP (faturamento), CRM/SFA (visita e cobertura).',
  rule: 'Territórios ordenados por perda de participação no período; causa atribuída ao fator com maior contribuição no diagnóstico de causa-raiz; ação ordenada por dependência — abastecimento antes de preço, preço antes de cobertura, cobertura antes de amostragem.',
  confidenceNote:
    'A confiança da resposta é a do elo mais fraco entre os blocos, nunca a do melhor.',
  lagNote:
    'A defasagem exibida é a da fonte mais atrasada entre as consultadas, medida na data de referência.',
} as const

export const COPILOT_DECISION_ID = FEATURED_DECISION.id
