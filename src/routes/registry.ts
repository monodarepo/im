import type { FilterId } from '../state/filtersStore'
import type { ProductId, ThemeId } from '../design/tokens'

/**
 * Registro de telas da plataforma.
 *
 * Fonte única para roteamento, navegação da sidebar e placeholders. Uma tela
 * nova é uma entrada aqui — o React Router, o menu e o checklist de progresso
 * saem todos deste array, sem cadastro em três lugares.
 *
 * A seção 12.3 do ESCOPO define 45 rotas. As entradas abaixo são as que o
 * escopo desta fase fixou; as demais entram como dado, sem tocar em componente.
 */

export type RouteEntry = {
  /** Padrão de rota, no formato do React Router. */
  readonly path: string
  /** Destino do link de navegação quando `path` tem parâmetro. */
  readonly navPath?: string
  readonly title: string
  /** Rótulo do módulo no ESCOPO, ex.: `HUB 1.3`. */
  readonly badge: string
  readonly theme: ThemeId
  readonly product: ProductId | null
  /** Features previstas, em texto, como declaradas no ESCOPO. */
  readonly features: readonly string[]
  /** Filtros que a tela consome. O que não está aqui não aparece no header. */
  readonly filters: readonly FilterId[]
}

/** Total de rotas que a seção 12.3 do ESCOPO especifica. */
export const EXPECTED_ROUTE_COUNT = 45

export const ROUTES: readonly RouteEntry[] = [
  {
    path: '/',
    title: 'Início',
    badge: 'Plataforma',
    theme: 'institutional',
    product: null,
    features: [],
    filters: ['period'],
  },
  {
    path: '/decisoes',
    title: 'Fila de Decisões',
    badge: 'Plataforma',
    theme: 'institutional',
    product: null,
    features: [],
    filters: ['period', 'bu', 'brand'],
  },
  {
    path: '/hub',
    title: 'Visão Geral do Mercado',
    badge: 'HUB 1.1',
    theme: 'hub',
    product: 'hub',
    features: [],
    filters: ['period', 'bu', 'brand', 'product', 'molecule', 'channel', 'customer', 'region'],
  },
  {
    path: '/hub/pulse',
    title: 'Market Pulse',
    badge: 'HUB 1.2',
    theme: 'hub',
    product: 'hub',
    features: [],
    filters: ['period', 'bu', 'brand', 'product', 'channel', 'region'],
  },
  {
    path: '/hub/produto/:skuId',
    navPath: '/hub/produto/losartana-50-30',
    title: 'Produto 360°',
    badge: 'HUB 1.3',
    theme: 'hub',
    product: 'hub',
    features: [],
    filters: ['period', 'bu', 'brand', 'product', 'molecule', 'channel', 'region'],
  },
  {
    path: '/hub/cliente',
    title: 'Cliente e Canal 360°',
    badge: 'HUB 1.4',
    theme: 'hub',
    product: 'hub',
    features: [],
    filters: ['period', 'bu', 'brand', 'product', 'channel', 'customer', 'region'],
  },
  {
    path: '/hub/territorio',
    title: 'Território 360°',
    badge: 'HUB 1.5',
    theme: 'hub',
    product: 'hub',
    features: [],
    filters: ['period', 'bu', 'brand', 'region', 'territory', 'team'],
  },
  {
    path: '/hub/medico',
    title: 'Médico 360°',
    badge: 'HUB 1.6',
    theme: 'hub',
    product: 'hub',
    features: [],
    filters: ['period', 'bu', 'brand', 'specialty', 'region', 'territory'],
  },
  {
    path: '/hub/radar',
    title: 'Radar de Oportunidades',
    badge: 'HUB 1.7',
    theme: 'hub',
    product: 'hub',
    features: [],
    filters: ['period', 'bu', 'brand', 'product', 'molecule', 'channel', 'customer', 'region'],
  },
  {
    path: '/hub/competitiva',
    title: 'Inteligência Competitiva',
    badge: 'HUB 1.8',
    theme: 'hub',
    product: 'hub',
    features: [],
    filters: ['period', 'bu', 'brand', 'product', 'molecule', 'channel', 'region'],
  },
  {
    path: '/hub/causa-raiz',
    title: 'Diagnóstico de Causa Raiz',
    badge: 'HUB 1.9',
    theme: 'hub',
    product: 'hub',
    features: [],
    filters: ['period', 'bu', 'brand', 'product', 'molecule', 'region'],
  },
  {
    path: '/hub/qualidade',
    title: 'Qualidade dos Dados',
    badge: 'HUB 1.10',
    theme: 'hub',
    product: 'hub',
    features: [],
    filters: ['period'],
  },
  {
    path: '/gtm',
    title: 'Visão Geral do GTM',
    badge: 'GTM 2.1',
    theme: 'gtm',
    product: 'gtm',
    features: [],
    filters: ['period', 'bu', 'brand', 'region', 'territory', 'team', 'specialty'],
  },
  {
    path: '/gtm/planejamento',
    title: 'Planejamento GTM',
    badge: 'GTM 2.2',
    theme: 'gtm',
    product: 'gtm',
    features: [],
    filters: ['period', 'bu', 'brand', 'region', 'territory', 'team'],
  },
  {
    path: '/gtm/segmentacao',
    title: 'Segmentação e Targeting',
    badge: 'GTM 2.3',
    theme: 'gtm',
    product: 'gtm',
    features: [],
    filters: ['period', 'bu', 'brand', 'specialty', 'region', 'territory'],
  },
  {
    path: '/gtm/territorios',
    title: 'Territórios e Cobertura',
    badge: 'GTM 2.4',
    theme: 'gtm',
    product: 'gtm',
    features: [],
    filters: ['period', 'region', 'territory', 'team', 'specialty'],
  },
  {
    path: '/gtm/nba',
    title: 'Next Best Action',
    badge: 'GTM 2.5',
    theme: 'gtm',
    product: 'gtm',
    features: [],
    filters: ['period', 'territory', 'specialty', 'product'],
  },
  {
    path: '/gtm/roteirizacao',
    title: 'Roteirização Inteligente',
    badge: 'GTM 2.6',
    theme: 'gtm',
    product: 'gtm',
    features: [],
    filters: ['period', 'region', 'territory', 'team'],
  },
  {
    path: '/gtm/sortimento',
    title: 'Sortimento e Disponibilidade',
    badge: 'GTM 2.7',
    theme: 'gtm',
    product: 'gtm',
    features: [],
    filters: ['period', 'bu', 'brand', 'product', 'channel', 'customer', 'region'],
  },
  {
    path: '/gtm/execucao',
    title: 'Execução Comercial',
    badge: 'GTM 2.8',
    theme: 'gtm',
    product: 'gtm',
    features: [],
    filters: ['period', 'region', 'territory', 'team'],
  },
  {
    path: '/gtm/metas',
    title: 'Metas e Quotas',
    badge: 'GTM 2.9',
    theme: 'gtm',
    product: 'gtm',
    features: [],
    filters: ['period', 'bu', 'brand', 'region', 'territory', 'team'],
  },
  {
    path: '/gtm/simulador-cobertura',
    title: 'Simulador de Cobertura',
    badge: 'GTM 2.10',
    theme: 'gtm',
    product: 'gtm',
    features: [],
    filters: ['period', 'region', 'territory', 'team', 'specialty'],
  },
  {
    path: '/gtm/relatorios',
    title: 'Relatórios',
    badge: 'GTM 2.11',
    theme: 'gtm',
    product: 'gtm',
    features: [],
    filters: ['period', 'region', 'territory', 'team'],
  },
  {
    path: '/rgm',
    title: 'Cockpit de Preço e Margem',
    badge: 'RGM 3.1',
    theme: 'rgm',
    product: 'rgm',
    features: [],
    filters: ['period', 'bu', 'brand', 'product', 'molecule', 'channel', 'customer', 'region'],
  },
  {
    path: '/rgm/competitividade',
    title: 'Índice de Competitividade',
    badge: 'RGM 3.2',
    theme: 'rgm',
    product: 'rgm',
    features: [],
    filters: ['period', 'bu', 'brand', 'product', 'molecule', 'channel', 'region'],
  },
  {
    path: '/rgm/elasticidade',
    title: 'Simulador de Elasticidade',
    badge: 'RGM 3.3',
    theme: 'rgm',
    product: 'rgm',
    features: [],
    filters: ['period', 'bu', 'brand', 'product', 'molecule', 'channel', 'region'],
  },
  {
    path: '/rgm/cenarios',
    title: 'Simulador de Cenários',
    badge: 'RGM 3.4',
    theme: 'rgm',
    product: 'rgm',
    features: [],
    filters: ['period', 'bu', 'brand', 'product', 'molecule', 'channel', 'region'],
  },
  {
    path: '/rgm/gross-to-net',
    title: 'Gross-to-Net e Price Waterfall',
    badge: 'RGM 3.5',
    theme: 'rgm',
    product: 'rgm',
    features: [],
    filters: ['period', 'bu', 'brand', 'product', 'channel', 'customer', 'region'],
  },
  {
    path: '/rgm/portfolio',
    title: 'Arquitetura de Portfólio',
    badge: 'RGM 3.6',
    theme: 'rgm',
    product: 'rgm',
    features: [],
    filters: ['period', 'bu', 'brand', 'product', 'molecule', 'channel'],
  },
  {
    path: '/rgm/governanca',
    title: 'Governança de Preços',
    badge: 'RGM 3.7',
    theme: 'rgm',
    product: 'rgm',
    features: [],
    filters: ['period', 'bu', 'brand', 'product', 'channel', 'customer', 'region'],
  },
  {
    path: '/rgm/promocoes',
    title: 'Monitor de Promoções',
    badge: 'RGM 3.8',
    theme: 'rgm',
    product: 'rgm',
    features: [],
    filters: ['period', 'bu', 'brand', 'product', 'channel', 'customer', 'campaign'],
  },
  {
    path: '/rgm/war-room',
    title: 'War Room de Genéricos',
    badge: 'RGM 3.9',
    theme: 'rgm',
    product: 'rgm',
    features: [],
    filters: ['period', 'bu', 'brand', 'product', 'molecule', 'channel', 'region'],
  },
  {
    path: '/rgm/relatorios',
    title: 'Relatórios',
    badge: 'RGM 3.10',
    theme: 'rgm',
    product: 'rgm',
    features: [],
    filters: ['period', 'bu', 'brand', 'product', 'channel', 'customer', 'region'],
  },
  {
    path: '/ag',
    title: 'Visão Geral do AG',
    badge: 'AG 4.1',
    theme: 'ag',
    product: 'ag',
    features: [],
    filters: ['period', 'bu', 'brand', 'product', 'specialty', 'campaign', 'region'],
  },
  {
    path: '/ag/campanhas',
    title: 'Planejamento de Campanhas',
    badge: 'AG 4.2',
    theme: 'ag',
    product: 'ag',
    features: [],
    filters: ['period', 'bu', 'brand', 'product', 'specialty', 'campaign', 'region'],
  },
  {
    path: '/ag/segmentacao',
    title: 'Segmentação de Médicos',
    badge: 'AG 4.3',
    theme: 'ag',
    product: 'ag',
    features: [],
    filters: ['period', 'bu', 'brand', 'product', 'specialty', 'region', 'territory'],
  },
  {
    path: '/ag/otimizador',
    title: 'Otimizador de Alocação',
    badge: 'AG 4.4',
    theme: 'ag',
    product: 'ag',
    features: [],
    filters: ['period', 'bu', 'brand', 'product', 'specialty', 'region', 'territory'],
  },
  {
    path: '/ag/estoque',
    title: 'Estoque e Logística',
    badge: 'AG 4.5',
    theme: 'ag',
    product: 'ag',
    features: [],
    filters: ['period', 'bu', 'brand', 'product', 'region', 'territory'],
  },
  {
    path: '/ag/campo',
    title: 'Execução em Campo',
    badge: 'AG 4.6',
    theme: 'ag',
    product: 'ag',
    features: [],
    filters: ['period', 'product', 'specialty', 'region', 'territory', 'team'],
  },
  {
    path: '/ag/conversao-roi',
    title: 'Conversão e ROI',
    badge: 'AG 4.7',
    theme: 'ag',
    product: 'ag',
    features: [],
    filters: ['period', 'bu', 'brand', 'product', 'specialty', 'campaign', 'region'],
  },
  {
    path: '/ag/redistribuicao',
    title: 'Redistribuição Inteligente',
    badge: 'AG 4.8',
    theme: 'ag',
    product: 'ag',
    features: [],
    filters: ['period', 'bu', 'product', 'region', 'territory'],
  },
  {
    path: '/ag/compliance',
    title: 'Compliance e Rastreabilidade',
    badge: 'AG 4.9',
    theme: 'ag',
    product: 'ag',
    features: [],
    filters: ['period', 'bu', 'product', 'specialty', 'region', 'territory'],
  },
  {
    path: '/ag/relatorios',
    title: 'Relatórios',
    badge: 'AG 4.10',
    theme: 'ag',
    product: 'ag',
    features: [],
    filters: ['period', 'bu', 'brand', 'product', 'campaign', 'region'],
  },
]

const BY_PATH = new Map(ROUTES.map((route) => [route.path, route]))

export function findRoute(pathname: string): RouteEntry | undefined {
  return BY_PATH.get(pathname)
}

/**
 * Entrada que governa uma rota. Subrota sem registro próprio — `/decisoes/:id`,
 * por exemplo — herda a entrada da sua raiz.
 */
export function resolveRoute(pathname: string): RouteEntry | undefined {
  const exact = findRoute(pathname)
  if (exact) return exact

  const [, segment] = pathname.split('/')
  return findRoute(`/${segment ?? ''}`)
}

/**
 * Identidade de cor da rota. Fora do registro — inclusive em rota inexistente —
 * o chrome fica institucional em vez de herdar a cor do produto anterior.
 */
export function resolveTheme(pathname: string): ThemeId {
  return resolveRoute(pathname)?.theme ?? 'institutional'
}

export function routesOfProduct(product: ProductId): RouteEntry[] {
  return ROUTES.filter((route) => route.product === product)
}

/** Rotas sem produto: raiz e fila de decisões. */
export function institutionalRoutes(): RouteEntry[] {
  return ROUTES.filter((route) => route.product === null)
}

/** Quanto da seção 12.3 já está mapeado — o checklist de progresso. */
export function routeCoverage(): { mapped: number; expected: number; missing: number } {
  return {
    mapped: ROUTES.length,
    expected: EXPECTED_ROUTE_COUNT,
    missing: Math.max(0, EXPECTED_ROUTE_COUNT - ROUTES.length),
  }
}
