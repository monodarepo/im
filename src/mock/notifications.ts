import { combine, type Attestation } from '../domain/attestation'
import type { ProductId, SemanticTone } from '../design/tokens'
import { daysAgo } from '../domain/today'
import type { IsoDate } from '../domain/today'
import { OWNERS } from './decisionRecords'
import { CRM_SFA, IQVIA, NEOGRID, NEOGRID_DISTRIBUIDORES, SAP, SCANNTECH } from './sources'

/**
 * Central de Notificações (seção 2, S4).
 *
 * Quinze alertas prioritários com anatomia fixa de cinco elementos: valor em
 * R$, evidência, causa provável, ação sugerida e dono.
 *
 * A anatomia é obrigatória, não sugerida. Um alerta sem valor não disputa
 * prioridade; sem evidência não se sustenta; sem causa não se resolve; sem
 * ação vira relatório; e sem dono não sai do lugar. O tipo abaixo torna os
 * cinco campos não-opcionais justamente para que nenhum alerta consiga nascer
 * pela metade.
 */

export type AlertSeverity = 'critical' | 'attention' | 'informative'

export const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  critical: 'Crítico',
  attention: 'Atenção',
  informative: 'Informativo',
}

export const SEVERITY_TONE: Record<AlertSeverity, SemanticTone> = {
  critical: 'negative',
  attention: 'attention',
  informative: 'neutral',
}

export const SEVERITY_ORDER: readonly AlertSeverity[] = ['critical', 'attention', 'informative']

/** Os cinco elementos, mais o que a plataforma precisa para navegar. */
export type Alert = {
  readonly id: string
  readonly title: string
  readonly severity: AlertSeverity
  readonly product: ProductId
  readonly detectedOn: IsoDate
  /** 1 — quanto está em risco. */
  readonly valueAtRiskBrl: number
  /** 2 — o número que sustenta o alerta. */
  readonly evidence: string
  /** 3 — por que aconteceu. */
  readonly probableCause: string
  /** 4 — o que fazer a respeito. */
  readonly suggestedAction: string
  /** 5 — quem responde por isso. */
  readonly owner: string
  readonly ownerRole: string
  readonly route: string
  readonly routeLabel: string
  readonly decisionId: string | null
  readonly attestation: Attestation
}

const HUB_ATTESTATION = combine([SCANNTECH, NEOGRID])
const RGM_ATTESTATION = combine([SCANNTECH, SAP])
const GTM_ATTESTATION = combine([CRM_SFA, IQVIA])
const AG_ATTESTATION = combine([SAP, CRM_SFA])

/**
 * NOTA: não constam do ESCOPO — os valores em risco e as evidências de doze
 * dos quinze alertas. Os três primeiros espelham decisões canônicas da seção
 * 10.2 e carregam o mesmo valor delas, sem redigitação conceitual.
 */
export const ALERTS: readonly Alert[] = [
  {
    id: 'alert-share-sp',
    title: 'Participação de Losartana em SP cai pela oitava semana',
    severity: 'critical',
    product: 'hub',
    detectedOn: daysAgo(6),
    valueAtRiskBrl: 4_800_000,
    evidence: 'Queda de 3,2 pp acumulada em oito semanas, contínua e não pontual.',
    probableCause:
      'Ruptura no canal independente somada a preço acima do corredor e a 148 pontos sem visita no ciclo.',
    suggestedAction:
      'Executar a decisão D-2026-0001: recompor abastecimento, ajustar preço e recobrir os pontos sem visita.',
    owner: OWNERS.carla.name,
    ownerRole: OWNERS.carla.role,
    route: '/decisoes/D-2026-0001',
    routeLabel: 'Decisão D-2026-0001',
    decisionId: 'D-2026-0001',
    attestation: combine([SCANNTECH, IQVIA, NEOGRID]),
  },
  {
    id: 'alert-price-mg',
    title: 'Dipirona fora do corredor de preço em MG pela quarta semana',
    severity: 'critical',
    product: 'rgm',
    detectedOn: daysAgo(4),
    valueAtRiskBrl: 3_200_000,
    evidence: 'IPR em 106,4 contra teto de 102, no canal de maior elasticidade da carteira.',
    probableCause: 'Reajuste linear aplicado sem considerar a elasticidade do canal em MG.',
    suggestedAction: 'Reposicionar ao centro do corredor e medir a resposta em quatro semanas.',
    owner: OWNERS.joao.name,
    ownerRole: OWNERS.joao.role,
    route: '/decisoes/D-2026-0002',
    routeLabel: 'Decisão D-2026-0002',
    decisionId: 'D-2026-0002',
    attestation: RGM_ATTESTATION,
  },
  {
    id: 'alert-coverage-rj',
    title: 'Cobertura de cardiologistas no RJ estacionada abaixo da meta',
    severity: 'attention',
    product: 'gtm',
    detectedOn: daysAgo(9),
    valueAtRiskBrl: 2_700_000,
    evidence: 'Cobertura em 61% contra meta de 80%, por dois ciclos consecutivos.',
    probableCause: 'Redesenho de território deixou três carteiras sem representante alocado.',
    suggestedAction: 'Realocar capacidade de territórios vizinhos com folga de agenda.',
    owner: OWNERS.mariana.name,
    ownerRole: OWNERS.mariana.role,
    route: '/decisoes/D-2026-0003',
    routeLabel: 'Decisão D-2026-0003',
    decisionId: 'D-2026-0003',
    attestation: GTM_ATTESTATION,
  },
  {
    id: 'alert-stockout-ne',
    title: 'Ruptura acima de 10% em três estados do Nordeste',
    severity: 'critical',
    product: 'hub',
    detectedOn: daysAgo(3),
    valueAtRiskBrl: 1_600_000,
    evidence: 'Ruptura regional acima do limite que dispara o bloqueio de amostragem.',
    probableCause:
      'Ajuste de alocação no centro de distribuição reduziu o abastecimento abaixo da cobertura mínima.',
    suggestedAction: 'Recompor o abastecimento regional e manter o bloqueio até normalizar.',
    owner: OWNERS.carla.name,
    ownerRole: OWNERS.carla.role,
    route: '/decisoes/D-2026-0005',
    routeLabel: 'Decisão D-2026-0005',
    decisionId: 'D-2026-0005',
    attestation: NEOGRID_DISTRIBUIDORES,
  },
  {
    id: 'alert-expiry',
    title: 'Lotes de amostra entrando na janela de vencimento sem giro',
    severity: 'attention',
    product: 'ag',
    detectedOn: daysAgo(5),
    valueAtRiskBrl: 23_076,
    evidence: 'Lotes com janela abaixo de 25 dias em detentores sem saída suficiente.',
    probableCause:
      'Bloqueio de território por ruptura reteve amostras onde não há como distribuí-las.',
    suggestedAction: 'Aprovar as transferências priorizadas por valor recuperado.',
    owner: OWNERS.fernanda.name,
    ownerRole: OWNERS.fernanda.role,
    route: '/ag/redistribuicao',
    routeLabel: 'Redistribuição Inteligente',
    decisionId: 'D-2026-0004',
    attestation: combine([SAP, NEOGRID]),
  },
  {
    id: 'alert-gtn-leakage',
    title: 'Desconto comercial sem contrapartida de volume no atacado',
    severity: 'critical',
    product: 'rgm',
    detectedOn: daysAgo(7),
    valueAtRiskBrl: 18_400_000,
    evidence: 'Desconto concedido cresceu 3,1% enquanto o volume do canal ficou estável.',
    probableCause:
      'Verba negociada por cliente sem cláusula de performance vinculada a volume ou execução.',
    suggestedAction:
      'Rever as condições comerciais dos clientes com maior desvio antes do próximo ciclo de negociação.',
    owner: OWNERS.joao.name,
    ownerRole: OWNERS.joao.role,
    route: '/rgm/gross-to-net',
    routeLabel: 'Gross-to-Net e Price Waterfall',
    decisionId: null,
    attestation: combine([SAP, CRM_SFA]),
  },
  {
    id: 'alert-quota-gap',
    title: 'Gap entre quota consolidada e meta descendente',
    severity: 'attention',
    product: 'gtm',
    detectedOn: daysAgo(11),
    valueAtRiskBrl: 6_400_000,
    evidence: 'A soma das quotas de território não alcança a meta descendente do ciclo.',
    probableCause:
      'Metas de território calibradas pela realização anterior, sem absorver o crescimento pedido no topo.',
    suggestedAction:
      'Redistribuir a diferença entre os territórios com maior potencial descoberto.',
    owner: OWNERS.mariana.name,
    ownerRole: OWNERS.mariana.role,
    route: '/gtm/metas',
    routeLabel: 'Metas e Quotas',
    decisionId: null,
    attestation: combine([CRM_SFA, SAP]),
  },
  {
    id: 'alert-assortment',
    title: 'Sortimento incompleto nas lojas de maior giro',
    severity: 'attention',
    product: 'gtm',
    detectedOn: daysAgo(8),
    valueAtRiskBrl: 3_900_000,
    evidence: 'Itens do sortimento obrigatório ausentes em lojas do primeiro decil de giro.',
    probableCause:
      'Pedido sugerido não contempla o item quando o histórico da loja é curto — o produto nunca entra.',
    suggestedAction:
      'Forçar o item no pedido sugerido das lojas de alto giro por dois ciclos e medir a saída.',
    owner: OWNERS.mariana.name,
    ownerRole: OWNERS.mariana.role,
    route: '/gtm/sortimento',
    routeLabel: 'Sortimento e Disponibilidade',
    decisionId: null,
    attestation: combine([NEOGRID, SCANNTECH]),
  },
  {
    id: 'alert-competitor',
    title: 'Concorrente reduz preço de genérico em praça relevante',
    severity: 'critical',
    product: 'rgm',
    detectedOn: daysAgo(2),
    valueAtRiskBrl: 5_100_000,
    evidence: 'Movimento de preço detectado no sell-out, com perda de participação na sequência.',
    probableCause:
      'Entrada de concorrente com posicionamento agressivo na molécula de maior volume.',
    suggestedAction:
      'Avaliar resposta localizada no war room antes de qualquer ajuste nacional de preço.',
    owner: OWNERS.joao.name,
    ownerRole: OWNERS.joao.role,
    route: '/rgm/war-room',
    routeLabel: 'War Room de Genéricos',
    decisionId: null,
    attestation: SCANNTECH,
  },
  {
    id: 'alert-no-write-off',
    title: 'Amostras entregues sem baixa de recebimento há mais de 30 dias',
    severity: 'critical',
    product: 'ag',
    detectedOn: daysAgo(10),
    valueAtRiskBrl: 2_267,
    evidence: 'Amostras saíram da filial e não têm médico identificado nem aceite registrado.',
    probableCause:
      'Entrega registrada em campo sem conclusão do fluxo de aceite no aplicativo.',
    suggestedAction:
      'Suspender nova remessa ao território até a regularização e cobrar baixa retroativa.',
    owner: OWNERS.fernanda.name,
    ownerRole: OWNERS.fernanda.role,
    route: '/ag/compliance',
    routeLabel: 'Compliance e Rastreabilidade',
    decisionId: null,
    attestation: combine([CRM_SFA, SAP]),
  },
  {
    id: 'alert-consent',
    title: 'Consentimentos de médicos vencendo no próximo ciclo',
    severity: 'attention',
    product: 'ag',
    detectedOn: daysAgo(12),
    valueAtRiskBrl: 640_000,
    evidence: 'Médicos com termo dentro da janela de vencimento de 60 dias.',
    probableCause:
      'Renovação não está embutida no roteiro de visita — o termo vence sem ninguém perceber.',
    suggestedAction: 'Incluir a renovação na próxima visita programada de cada médico.',
    owner: OWNERS.fernanda.name,
    ownerRole: OWNERS.fernanda.role,
    route: '/ag/compliance',
    routeLabel: 'Compliance e Rastreabilidade',
    decisionId: null,
    attestation: CRM_SFA,
  },
  {
    id: 'alert-data-lag',
    title: 'Fonte de distribuidores com atraso acima do esperado',
    severity: 'attention',
    product: 'hub',
    detectedOn: daysAgo(1),
    valueAtRiskBrl: 0,
    evidence: 'A carga mais recente está mais velha que o atraso declarado da fonte.',
    probableCause: 'Janela de recebimento do arquivo do distribuidor deslocada no calendário.',
    suggestedAction:
      'Operar com confiança reduzida nas telas afetadas e reprocessar quando a carga chegar.',
    owner: OWNERS.carla.name,
    ownerRole: OWNERS.carla.role,
    route: '/hub/qualidade',
    routeLabel: 'Qualidade dos Dados',
    decisionId: null,
    attestation: NEOGRID_DISTRIBUIDORES,
  },
  {
    id: 'alert-reconciliation',
    title: 'Diferença entre sell-in e sell-out sem explicação completa',
    severity: 'attention',
    product: 'hub',
    detectedOn: daysAgo(14),
    valueAtRiskBrl: 1_200_000,
    evidence: 'Parte da diferença do período segue sem causa atribuída na reconciliação.',
    probableCause:
      'Variação de estoque no canal não capturada pelas fontes disponíveis no recorte.',
    suggestedAction:
      'Ampliar a captura de estoque no canal antes de usar a diferença como base de meta.',
    owner: OWNERS.carla.name,
    ownerRole: OWNERS.carla.role,
    route: '/hub/cliente',
    routeLabel: 'Cliente e Canal 360°',
    decisionId: null,
    attestation: combine([SAP, NEOGRID]),
  },
  {
    id: 'alert-visit-productivity',
    title: 'Produtividade de visita abaixo da média em dois territórios',
    severity: 'informative',
    product: 'gtm',
    detectedOn: daysAgo(13),
    valueAtRiskBrl: 480_000,
    evidence: 'Visitas por dia útil abaixo da média da equipe, com deslocamento acima do esperado.',
    probableCause: 'Roteiro construído por proximidade de cadastro, não por tempo de deslocamento.',
    suggestedAction: 'Recalcular o roteiro pelo tempo real de trajeto e revisar a sequência.',
    owner: OWNERS.mariana.name,
    ownerRole: OWNERS.mariana.role,
    route: '/gtm/roteirizacao',
    routeLabel: 'Roteirização Inteligente',
    decisionId: null,
    attestation: CRM_SFA,
  },
  {
    id: 'alert-portfolio',
    title: 'Canibalização entre apresentações da mesma molécula',
    severity: 'informative',
    product: 'rgm',
    detectedOn: daysAgo(16),
    valueAtRiskBrl: 900_000,
    evidence: 'Crescimento de uma apresentação acompanhado de queda proporcional na vizinha.',
    probableCause:
      'Degrau de preço entre apresentações menor que a diferença de conteúdo percebida.',
    suggestedAction: 'Revisar a arquitetura de preço entre as apresentações antes do próximo ciclo.',
    owner: OWNERS.joao.name,
    ownerRole: OWNERS.joao.role,
    route: '/rgm/portfolio',
    routeLabel: 'Arquitetura de Portfólio',
    decisionId: null,
    attestation: SCANNTECH,
  },
]

/** Alerta sem os cinco elementos não entra na fila. */
export function isWellFormed(alert: Alert): boolean {
  return (
    alert.evidence.length > 0 &&
    alert.probableCause.length > 0 &&
    alert.suggestedAction.length > 0 &&
    alert.owner.length > 0 &&
    alert.valueAtRiskBrl >= 0
  )
}

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  critical: 0,
  attention: 1,
  informative: 2,
}

/** Severidade primeiro, valor em risco depois. */
export const PRIORITIZED_ALERTS: readonly Alert[] = [...ALERTS].sort((a, b) => {
  const bySeverity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
  return bySeverity !== 0 ? bySeverity : b.valueAtRiskBrl - a.valueAtRiskBrl
})

export const TOTAL_AT_RISK_BRL = ALERTS.reduce((sum, alert) => sum + alert.valueAtRiskBrl, 0)

export function countBySeverity(severity: AlertSeverity): number {
  return ALERTS.filter((alert) => alert.severity === severity).length
}

export function countByProduct(product: ProductId): number {
  return ALERTS.filter((alert) => alert.product === product).length
}

export const ALERTS_WITH_DECISION = ALERTS.filter((alert) => alert.decisionId !== null).length

export const NOTIFICATIONS_ATTESTATION: Attestation = combine(
  ALERTS.map((alert) => alert.attestation),
)

export { HUB_ATTESTATION as ALERT_HUB_ATTESTATION, AG_ATTESTATION as ALERT_AG_ATTESTATION }
