import { combine } from '../domain/attestation'
import {
  isAuditTrailConsistent,
  parcelTotal,
  type AuditEntry,
  type DecisionRecord,
} from '../domain/decision'
import { daysAgo, daysFromNow } from '../domain/today'
import { DECISIONS, type DecisionRef } from './decisions'
import { CRM_SFA, IQVIA, NEOGRID, NEOGRID_DISTRIBUIDORES, SAP, SCANNTECH } from './sources'

/**
 * Decisões completas — o objeto da seção 8.1 do ESCOPO instanciado.
 *
 * `decisions.ts` guarda a referência mínima (id, título, impacto, produto) que
 * as telas de produto usam para linkar. Aqui mora o resto: evidência, causa,
 * recomendação, decomposição do impacto por produto, alçada, dono, prazo e
 * trilha de auditoria.
 *
 * O impacto nunca é digitado duas vezes: `impactBrl` vem de `decisions.ts` e a
 * soma das parcelas é conferida contra ele em teste. Se alguém mexer numa
 * parcela sem mexer na outra, o teste cai — que é exatamente o ponto de
 * decompor R$ 4,8M em três produtos.
 */

/** Personas fictícias. Nenhum nome real de stakeholder Hypera na interface. */
export const OWNERS = {
  carla: { name: 'Carla Mendes', role: 'Diretoria Comercial' },
  joao: { name: 'João Pedro', role: 'Gerência de RGM' },
  mariana: { name: 'Mariana Santos', role: 'Gerência de GTM' },
  fernanda: { name: 'Fernanda Lima', role: 'Gerência de Amostra Grátis' },
} as const

const HUB_EVIDENCE = combine([SCANNTECH, NEOGRID])
const GTM_EVIDENCE = combine([CRM_SFA, IQVIA])
const RGM_EVIDENCE = combine([SCANNTECH, SAP])
const AG_EVIDENCE = combine([CRM_SFA, IQVIA, SAP])

/**
 * Decomposição de R$ 4,8M da D-2026-0001.
 *
 * NOTA: não consta do ESCOPO — a repartição por produto. O total é canônico
 * (seção 10.2); a divisão GTM 2,1 + RGM 1,9 + AG 0,8 é a que o enunciado desta
 * fase fixa, e é ela que dá ao valor um caminho de volta às telas de origem.
 */
const D1_PARCELS = [
  {
    id: 'd1-gtm',
    source: 'gtm' as const,
    label: 'Cobertura comercial em SP — 148 pontos de venda sem visita no ciclo',
    amountBrl: 2_100_000,
    createdOn: daysAgo(6),
    attestation: GTM_EVIDENCE,
  },
  {
    id: 'd1-rgm',
    source: 'rgm' as const,
    label: 'Preço relativo de Losartana acima do corredor no canal independente',
    amountBrl: 1_900_000,
    createdOn: daysAgo(6),
    attestation: RGM_EVIDENCE,
  },
  {
    id: 'd1-ag',
    source: 'ag' as const,
    label: 'Amostragem em cardiologistas de alto potencial sem cobertura',
    amountBrl: 800_000,
    createdOn: daysAgo(6),
    attestation: AG_EVIDENCE,
  },
]

/** Tela de origem de cada parcela — o caminho de volta ao produto que a apurou. */
export const PARCEL_ROUTES: Record<string, { route: string; label: string }> = {
  'd1-gtm': { route: '/gtm/territorios', label: 'Territórios e Cobertura' },
  'd1-rgm': { route: '/rgm/competitividade', label: 'Índice de Competitividade' },
  'd1-ag': { route: '/ag/otimizador', label: 'Otimizador de Alocação' },
}

const D1_AUDIT: readonly AuditEntry[] = [
  {
    id: 'a1',
    on: daysAgo(6),
    actor: 'Plataforma',
    role: 'Detecção automática',
    from: null,
    to: 'draft',
    note: 'Queda de 3,2 pp de participação em SP detectada pelo HUB, com ruptura e preço relativo fora do corredor no mesmo recorte.',
  },
  {
    id: 'a2',
    on: daysAgo(5),
    actor: OWNERS.carla.name,
    role: OWNERS.carla.role,
    from: 'draft',
    to: 'proposed',
    note: 'Diagnóstico de causa-raiz aceito. Impacto decomposto em três produtos e encaminhado aos donos.',
  },
  {
    id: 'a3',
    on: daysAgo(2),
    actor: OWNERS.mariana.name,
    role: OWNERS.mariana.role,
    from: 'proposed',
    to: 'in_approval',
    note: 'Parcela de GTM confirmada com o plano de recobertura dos 148 pontos de venda. Enviada para alçada de diretoria.',
  },
]

/**
 * NOTA: não constam do ESCOPO — evidências, causa provável, recomendação,
 * prazos, alçadas e trilhas. O que é canônico em cada decisão é o par
 * título/impacto, que vem de `decisions.ts` (seção 10.2).
 */
const RECORDS: readonly DecisionRecord[] = [
  {
    ...(DECISIONS[0] as DecisionRef),
    state: 'in_approval',
    parcels: D1_PARCELS,
    summary:
      'A participação de Losartana em São Paulo caiu 3,2 pp em oito semanas. A perda não é de um produto só: falta cobertura comercial, o preço saiu do corredor e o médico de alto potencial parou de receber amostra.',
    probableCause:
      'Ruptura no canal independente reduziu a presença em gôndola. O concorrente ocupou o espaço com preço 4,1% abaixo, e a força de vendas deixou de visitar 148 pontos no ciclo — a praça perdeu presença física e preço ao mesmo tempo.',
    recommendation:
      'Recompor cobertura nos 148 pontos sem visita, ajustar o preço relativo ao teto do corredor no canal independente e reativar amostragem nos cardiologistas de alto potencial da praça.',
    confidence: 'high',
    urgency: 'critical',
    effort: 'medium',
    owner: OWNERS.carla.name,
    ownerRole: OWNERS.carla.role,
    dueOn: daysFromNow(12),
    authority: 'director',
    autonomy: 'assisted',
    evidence: [
      {
        id: 'e1',
        label: 'Participação de mercado em SP',
        value: '17,4% · −3,2 pp em 8 semanas',
        reading: 'A queda é contínua, não um degrau de um mês — descarta erro pontual de apuração.',
        route: '/hub/produto/losartana-50-30',
        routeLabel: 'Produto 360°',
        attestation: IQVIA,
      },
      {
        id: 'e2',
        label: 'Ruptura no canal independente',
        value: '11,8% · acima do limite de 10%',
        reading: 'Sem produto em gôndola não há venda a recuperar, por melhor que seja o preço.',
        route: '/hub/causa-raiz',
        routeLabel: 'Diagnóstico de Causa Raiz',
        attestation: NEOGRID_DISTRIBUIDORES,
      },
      {
        id: 'e3',
        label: 'Preço relativo (IPR)',
        value: '104,3 · corredor 96–102',
        reading: 'Acima do teto do corredor: o concorrente está 4,1% mais barato na mesma gôndola.',
        route: '/rgm/competitividade',
        routeLabel: 'Índice de Competitividade',
        attestation: SCANNTECH,
      },
      {
        id: 'e4',
        label: 'Pontos de venda sem visita no ciclo',
        value: '148 de 1.240',
        reading: 'Cobertura comercial caiu junto com a participação, no mesmo recorte geográfico.',
        route: '/gtm/territorios',
        routeLabel: 'Territórios e Cobertura',
        attestation: CRM_SFA,
      },
    ],
    audit: D1_AUDIT,
    attestation: combine([HUB_EVIDENCE, GTM_EVIDENCE, RGM_EVIDENCE, AG_EVIDENCE]),
  },
  {
    ...(DECISIONS[1] as DecisionRef),
    state: 'proposed',
    parcels: [
      {
        id: 'd2-rgm',
        source: 'rgm',
        label: 'Reposicionamento de preço de Dipirona no varejo de MG',
        amountBrl: 3_200_000,
        createdOn: daysAgo(4),
        attestation: RGM_EVIDENCE,
      },
    ],
    summary:
      'Dipirona está 6,4% acima do concorrente direto em Minas Gerais, com elasticidade que sustenta recuperação de volume sem perda de margem absoluta.',
    probableCause:
      'Reajuste aplicado de forma linear no portfólio, sem considerar que o canal de MG tem elasticidade acima da média nacional.',
    recommendation:
      'Reposicionar o preço ao centro do corredor no canal varejo de MG e medir a resposta em quatro semanas antes de estender a outros estados.',
    confidence: 'high',
    urgency: 'high',
    effort: 'low',
    owner: OWNERS.joao.name,
    ownerRole: OWNERS.joao.role,
    dueOn: daysFromNow(21),
    authority: 'manager',
    autonomy: 'recommended',
    evidence: [
      {
        id: 'e1',
        label: 'Preço relativo em MG',
        value: '106,4 · corredor 96–102',
        reading: 'Fora do teto no canal de maior elasticidade da carteira.',
        route: '/rgm/competitividade',
        routeLabel: 'Índice de Competitividade',
        attestation: SCANNTECH,
      },
    ],
    audit: [
      {
        id: 'a1',
        on: daysAgo(4),
        actor: 'Plataforma',
        role: 'Detecção automática',
        from: null,
        to: 'draft',
        note: 'Preço fora do corredor por quatro semanas consecutivas em MG.',
      },
      {
        id: 'a2',
        on: daysAgo(3),
        actor: OWNERS.joao.name,
        role: OWNERS.joao.role,
        from: 'draft',
        to: 'proposed',
        note: 'Cenário simulado e anexado. Aguardando janela de reajuste do canal.',
      },
    ],
    attestation: RGM_EVIDENCE,
  },
  {
    ...(DECISIONS[2] as DecisionRef),
    state: 'approved',
    parcels: [
      {
        id: 'd3-gtm',
        source: 'gtm',
        label: 'Recobertura de cardiologistas de alto potencial no RJ',
        amountBrl: 2_700_000,
        createdOn: daysAgo(9),
        attestation: GTM_EVIDENCE,
      },
    ],
    summary:
      'A cobertura de cardiologistas de alto potencial no Rio de Janeiro está em 61%, contra meta de 80%. O potencial descoberto está concentrado em 3 territórios.',
    probableCause:
      'Redesenho de território no ciclo anterior deixou três carteiras sem representante alocado.',
    recommendation:
      'Realocar capacidade de dois territórios vizinhos com folga de agenda e priorizar os médicos de maior potencial descoberto.',
    confidence: 'medium',
    urgency: 'medium',
    effort: 'high',
    owner: OWNERS.mariana.name,
    ownerRole: OWNERS.mariana.role,
    dueOn: daysFromNow(30),
    authority: 'director',
    autonomy: 'recommended',
    evidence: [
      {
        id: 'e1',
        label: 'Cobertura de médicos-alvo no RJ',
        value: '61% · meta 80%',
        reading: 'A lacuna é de capacidade alocada, não de tamanho de carteira.',
        route: '/gtm/territorios',
        routeLabel: 'Territórios e Cobertura',
        attestation: CRM_SFA,
      },
    ],
    audit: [
      {
        id: 'a1',
        on: daysAgo(9),
        actor: 'Plataforma',
        role: 'Detecção automática',
        from: null,
        to: 'draft',
        note: 'Cobertura abaixo da meta por dois ciclos consecutivos.',
      },
      {
        id: 'a2',
        on: daysAgo(8),
        actor: OWNERS.mariana.name,
        role: OWNERS.mariana.role,
        from: 'draft',
        to: 'proposed',
        note: 'Plano de realocação montado no simulador de cobertura.',
      },
      {
        id: 'a3',
        on: daysAgo(5),
        actor: OWNERS.mariana.name,
        role: OWNERS.mariana.role,
        from: 'proposed',
        to: 'in_approval',
        note: 'Enviado para alçada de diretoria.',
      },
      {
        id: 'a4',
        on: daysAgo(3),
        actor: OWNERS.carla.name,
        role: OWNERS.carla.role,
        from: 'in_approval',
        to: 'approved',
        note: 'Aprovado com a ressalva de medir cobertura por território no fim do ciclo.',
      },
    ],
    attestation: GTM_EVIDENCE,
  },
  {
    ...(DECISIONS[3] as DecisionRef),
    state: 'executing',
    parcels: [
      {
        id: 'd4-ag',
        source: 'ag',
        label: 'Redistribuição preventiva de amostras com risco de vencimento',
        amountBrl: 1_900_000,
        createdOn: daysAgo(14),
        attestation: AG_EVIDENCE,
      },
    ],
    summary:
      'Lotes de amostra parados em detentores sem giro suficiente para consumi-los antes do vencimento. A transferência recupera valor que viraria perda.',
    probableCause:
      'Bloqueio de território por ruptura reteve amostras onde não há como distribuí-las, e o giro do detentor não absorve o saldo na janela restante.',
    recommendation:
      'Aprovar as transferências priorizadas por valor recuperado e revisar a regra de expedição para não reabastecer praça bloqueada.',
    confidence: 'high',
    urgency: 'high',
    effort: 'low',
    owner: OWNERS.fernanda.name,
    ownerRole: OWNERS.fernanda.role,
    dueOn: daysFromNow(8),
    authority: 'manager',
    autonomy: 'assisted',
    evidence: [
      {
        id: 'e1',
        label: 'Amostras em risco de vencimento',
        value: 'Lotes com janela abaixo de 25 dias',
        reading: 'O risco é de calendário: sem transferência, o prazo decide sozinho.',
        route: '/ag/estoque',
        routeLabel: 'Estoque e Logística',
        attestation: combine([SAP, NEOGRID]),
      },
    ],
    audit: [
      {
        id: 'a1',
        on: daysAgo(14),
        actor: 'Plataforma',
        role: 'Detecção automática',
        from: null,
        to: 'draft',
        note: 'Lotes entrando na janela de risco de validade.',
      },
      {
        id: 'a2',
        on: daysAgo(12),
        actor: OWNERS.fernanda.name,
        role: OWNERS.fernanda.role,
        from: 'draft',
        to: 'proposed',
        note: 'Sugestões de transferência priorizadas por valor recuperado.',
      },
      {
        id: 'a3',
        on: daysAgo(10),
        actor: OWNERS.fernanda.name,
        role: OWNERS.fernanda.role,
        from: 'proposed',
        to: 'in_approval',
        note: 'Enviado para alçada.',
      },
      {
        id: 'a4',
        on: daysAgo(7),
        actor: OWNERS.carla.name,
        role: OWNERS.carla.role,
        from: 'in_approval',
        to: 'approved',
        note: 'Aprovado. Transferências liberadas para execução.',
      },
      {
        id: 'a5',
        on: daysAgo(4),
        actor: OWNERS.fernanda.name,
        role: OWNERS.fernanda.role,
        from: 'approved',
        to: 'executing',
        note: 'Primeira remessa em trânsito.',
      },
    ],
    attestation: AG_EVIDENCE,
  },
  {
    ...(DECISIONS[4] as DecisionRef),
    state: 'proposed',
    parcels: [
      {
        id: 'd5-hub',
        source: 'hub',
        label: 'Recomposição de abastecimento nos estados do Nordeste em ruptura',
        amountBrl: 1_600_000,
        createdOn: daysAgo(3),
        attestation: HUB_EVIDENCE,
      },
    ],
    summary:
      'Ruptura acima de 10% em três estados do Nordeste, com efeito em cadeia sobre a distribuição de amostras da praça.',
    probableCause:
      'Ajuste de alocação no centro de distribuição regional reduziu o abastecimento abaixo da cobertura mínima do canal.',
    recommendation:
      'Recompor o abastecimento regional e manter o bloqueio de amostragem até a ruptura voltar abaixo do limite.',
    confidence: 'medium',
    urgency: 'high',
    effort: 'medium',
    owner: OWNERS.carla.name,
    ownerRole: OWNERS.carla.role,
    dueOn: daysFromNow(15),
    authority: 'director',
    autonomy: 'recommended',
    evidence: [
      {
        id: 'e1',
        label: 'Ruptura no Nordeste',
        value: 'Acima de 10% em 3 estados',
        reading: 'Acima do limite que dispara o bloqueio de amostragem da praça.',
        route: '/hub/causa-raiz',
        routeLabel: 'Diagnóstico de Causa Raiz',
        attestation: NEOGRID_DISTRIBUIDORES,
      },
    ],
    audit: [
      {
        id: 'a1',
        on: daysAgo(3),
        actor: 'Plataforma',
        role: 'Detecção automática',
        from: null,
        to: 'draft',
        note: 'Ruptura acima do limite em três estados simultaneamente.',
      },
      {
        id: 'a2',
        on: daysAgo(2),
        actor: OWNERS.carla.name,
        role: OWNERS.carla.role,
        from: 'draft',
        to: 'proposed',
        note: 'Encaminhado para abastecimento com bloqueio de amostragem mantido.',
      },
    ],
    attestation: HUB_EVIDENCE,
  },
]

export const DECISION_RECORDS: readonly DecisionRecord[] = RECORDS

const BY_ID = new Map(DECISION_RECORDS.map((record) => [record.id, record]))

export function findDecisionRecord(id: string): DecisionRecord | undefined {
  return BY_ID.get(id)
}

/** A decisão que a plataforma usa para se explicar. */
export const FEATURED_DECISION_ID = 'D-2026-0001'

export const FEATURED_DECISION = findDecisionRecord(FEATURED_DECISION_ID) as DecisionRecord

/** Total sob decisão — o que a fila vale somada. */
export const TOTAL_DECISION_IMPACT_BRL = DECISION_RECORDS.reduce(
  (sum, record) => sum + record.impactBrl,
  0,
)

export function parcelsReconcile(record: DecisionRecord): boolean {
  return parcelTotal(record.parcels) === record.impactBrl
}

export const AUDIT_TRAILS_CONSISTENT = DECISION_RECORDS.every((record) =>
  isAuditTrailConsistent(record.audit),
)
