/**
 * Fio condutor Losartana (seção 8.3 do ESCOPO) — as nove etapas do fluxo que a
 * demonstração percorre de ponta a ponta.
 *
 * O fio é dado, não convenção: cada tela do fluxo renderiza a mesma faixa a
 * partir desta lista, e o teste verifica que toda rota citada existe. Se o fio
 * fosse um conjunto de links espalhados, a primeira tela refatorada abriria um
 * beco sem saída — e beco sem saída no meio da demonstração custa a sala.
 */

export type ThreadStepId =
  | 'detection'
  | 'diagnosis'
  | 'simulation'
  | 'prioritization'
  | 'plan'
  | 'reinforcement'
  | 'execution'
  | 'measurement'
  | 'learning'

export type ThreadStep = {
  readonly id: ThreadStepId
  /** Nome da etapa como a seção 8.3 a chama. */
  readonly stage: string
  /** Rota principal da etapa — o destino do clique no fio. */
  readonly route: string
  readonly routeLabel: string
  /** Rotas irmãs quando a etapa se desdobra em mais de uma tela. */
  readonly alsoRoutes: readonly { route: string; label: string }[]
  /** O que acontece nesta etapa, na frase que o apresentador diz. */
  readonly narrative: string
}

export const THREAD_STEPS: readonly ThreadStep[] = [
  {
    id: 'detection',
    stage: 'Detecção',
    route: '/hub',
    routeLabel: 'HUB Visão Geral',
    alsoRoutes: [],
    narrative: 'O HUB detecta a queda de participação de Losartana em SP.',
  },
  {
    id: 'diagnosis',
    stage: 'Diagnóstico',
    route: '/hub/causa-raiz',
    routeLabel: 'HUB Causa-Raiz',
    alsoRoutes: [],
    narrative: 'A causa-raiz decompõe a perda: ruptura, preço e cobertura, no mesmo recorte.',
  },
  {
    id: 'simulation',
    stage: 'Simulação',
    route: '/rgm/cenarios',
    routeLabel: 'RGM Cenários',
    alsoRoutes: [],
    narrative: 'O RGM simula os cenários de preço e escolhe o que recupera volume sem queimar margem.',
  },
  {
    id: 'prioritization',
    stage: 'Priorização',
    route: '/gtm/segmentacao',
    routeLabel: 'GTM Segmentação',
    alsoRoutes: [],
    narrative: 'O GTM prioriza os clientes e médicos onde a recuperação rende mais.',
  },
  {
    id: 'plan',
    stage: 'Plano',
    route: '/gtm/nba',
    routeLabel: 'GTM Next Best Action',
    alsoRoutes: [{ route: '/gtm/roteirizacao', label: 'Roteirização' }],
    narrative: 'O plano vira decisão por vendedor: o NBA diz o quê, a roteirização diz em que ordem.',
  },
  {
    id: 'reinforcement',
    stage: 'Reforço',
    route: '/ag/otimizador',
    routeLabel: 'AG Otimizador',
    alsoRoutes: [],
    narrative:
      'A amostra reforça a praça — menos no Nordeste, que segue bloqueado pela ruptura que o HUB detectou.',
  },
  {
    id: 'execution',
    stage: 'Registro',
    route: '/gtm/execucao',
    routeLabel: 'GTM Execução',
    alsoRoutes: [{ route: '/ag/campo', label: 'AG Execução em Campo' }],
    narrative: 'O campo executa e registra: visita, entrega, aceite e motivo.',
  },
  {
    id: 'measurement',
    stage: 'Mensuração',
    route: '/hub/produto/losartana-50-30',
    routeLabel: 'HUB Produto 360°',
    alsoRoutes: [{ route: '/', label: 'Torre Integrada' }],
    narrative: 'O mesmo HUB que detectou a queda mede a recuperação — mesma régua, mesmo atestado.',
  },
  {
    id: 'learning',
    stage: 'Aprendizado',
    route: '/decisoes/D-2026-0001',
    routeLabel: 'Central de Decisões',
    alsoRoutes: [],
    narrative:
      'A decisão fecha em APRENDIDA: o resultado medido vira regra e calibra as próximas decisões.',
  },
]

const INDEX_BY_ID = new Map(THREAD_STEPS.map((step, index) => [step.id, index]))

export function threadStep(id: ThreadStepId): ThreadStep {
  return THREAD_STEPS[INDEX_BY_ID.get(id) as number] as ThreadStep
}

export function threadPosition(id: ThreadStepId): number {
  return (INDEX_BY_ID.get(id) as number) + 1
}

export function nextThreadStep(id: ThreadStepId): ThreadStep | undefined {
  return THREAD_STEPS[(INDEX_BY_ID.get(id) as number) + 1]
}

export function previousThreadStep(id: ThreadStepId): ThreadStep | undefined {
  const index = INDEX_BY_ID.get(id) as number
  return index > 0 ? THREAD_STEPS[index - 1] : undefined
}

/** A decisão que o fio inteiro alimenta. */
export const THREAD_DECISION_ID = 'D-2026-0001'
