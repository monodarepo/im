import { combine, type Attestation } from '../domain/attestation'
import { daysAgo, daysBetween, daysFromNow, HOJE, type IsoDate } from '../domain/today'
import { CRM_SFA, IQVIA, NEOGRID_DISTRIBUIDORES, SAP, SCANNTECH } from './sources'

/**
 * Governança de Preços (RGM, módulo 3.7).
 *
 * Cinco estágios entre recomendar um preço e ele existir na ponta. O quinto é o
 * que costuma faltar: preço publicado não é preço praticado, e sem medir
 * aderência a decisão de preço morre no caminho entre a tabela e a gôndola.
 */

export type StageId =
  | 'recommendation'
  | 'authority_approval'
  | 'effective_date'
  | 'publication'
  | 'adherence'

export type StageStatus = 'done' | 'active' | 'pending' | 'at_risk'

export const STAGE_STATUS_LABEL: Record<StageStatus, string> = {
  done: 'Concluído',
  active: 'Em andamento',
  pending: 'Pendente',
  at_risk: 'Em risco',
}

export type Stage = {
  readonly id: StageId
  readonly order: number
  readonly label: string
  readonly description: string
  readonly status: StageStatus
  readonly owner: string
  readonly date: IsoDate
  readonly attestation: Attestation
}

const COMMERCIAL = combine([SAP, SCANNTECH])
const FIELD = combine([SCANNTECH, NEOGRID_DISTRIBUIDORES])

/**
 * NOTA: não consta do ESCOPO — datas, responsáveis e status de cada estágio.
 * A sequência dos cinco estágios é do ESCOPO; a instância abaixo é declarada.
 * Responsáveis usam as personas fictícias da plataforma.
 */
export const STAGES: readonly Stage[] = [
  {
    id: 'recommendation',
    order: 1,
    label: 'Recomendação',
    description: 'Cenário simulado com impacto estimado e racional de elasticidade.',
    status: 'done',
    owner: 'Mariana Santos',
    date: daysAgo(12),
    attestation: COMMERCIAL,
  },
  {
    id: 'authority_approval',
    order: 2,
    label: 'Aprovação por alçada',
    description: 'Aprovador definido pela faixa de desconto e pelo impacto em margem.',
    status: 'done',
    owner: 'João Pedro',
    date: daysAgo(7),
    attestation: SAP,
  },
  {
    id: 'effective_date',
    order: 3,
    label: 'Vigência',
    description: 'Data a partir da qual a condição vale, com janela de transição.',
    status: 'done',
    owner: 'Mariana Santos',
    date: daysAgo(3),
    attestation: SAP,
  },
  {
    id: 'publication',
    order: 4,
    label: 'Publicação aos distribuidores',
    description: 'Tabela enviada aos distribuidores com prazo de carga acordado.',
    status: 'active',
    owner: 'Fernanda Lima',
    date: HOJE,
    attestation: combine([SAP, CRM_SFA]),
  },
  {
    id: 'adherence',
    order: 5,
    label: 'Aderência na ponta',
    description: 'Preço efetivamente praticado no ponto de venda contra o publicado.',
    status: 'at_risk',
    owner: 'Fernanda Lima',
    date: daysFromNow(4),
    attestation: FIELD,
  },
]

export type GuardrailId = 'cmed' | 'minimum_margin' | 'commercial_policy' | 'authority'

export type GuardrailStatus = 'ok' | 'attention' | 'blocked'

export type Guardrail = {
  readonly id: GuardrailId
  readonly label: string
  readonly rule: string
  readonly status: GuardrailStatus
  readonly reading: string
}

/**
 * NOTA: não consta do ESCOPO — os limites numéricos de cada guardrail.
 * Os quatro guardrails são do ESCOPO; os valores que os instanciam são
 * declarados e devem vir da política comercial vigente.
 */
export const GUARDRAILS: readonly Guardrail[] = [
  {
    id: 'cmed',
    label: 'CMED',
    rule: 'Preço de fábrica não pode ultrapassar o teto regulado da apresentação.',
    status: 'ok',
    reading: 'Preço proposto 4,2% abaixo do teto',
  },
  {
    id: 'minimum_margin',
    label: 'Margem mínima',
    rule: 'Margem de contribuição não pode ficar abaixo do piso da categoria.',
    status: 'attention',
    reading: 'Cenário aprovado a 1,8 pp do piso',
  },
  {
    id: 'commercial_policy',
    label: 'Política comercial',
    rule: 'Desconto acumulado com bonificação limitado por canal.',
    status: 'ok',
    reading: 'Dentro do limite do canal Farma',
  },
  {
    id: 'authority',
    label: 'Alçada',
    rule: 'Faixa de desconto define o nível de aprovação exigido.',
    status: 'ok',
    reading: 'Aprovado no nível exigido pela faixa',
  },
]

export type DistributorStatus = 'published' | 'late' | 'not_loaded'

export const DISTRIBUTOR_STATUS_LABEL: Record<DistributorStatus, string> = {
  published: 'Publicado',
  late: 'Em atraso',
  not_loaded: 'Não carregado',
}

export type Distributor = {
  readonly id: string
  readonly name: string
  readonly region: string
  /** Data em que a tabela foi publicada para o distribuidor. */
  readonly publishedOn: IsoDate
  /** Data em que o distribuidor carregou a tabela. `null` se ainda não carregou. */
  readonly updatedOn: IsoDate | null
  /** Prazo acordado de carga, em dias após a publicação. */
  readonly slaDays: number
  readonly status: DistributorStatus
}

/**
 * NOTA: não consta do ESCOPO — a carteira de distribuidores e seus prazos.
 * Nomes fictícios. O padrão de atraso é o ponto da tela: parte da rede carrega
 * a tabela fora do prazo, e é aí que o preço aprovado deixa de existir.
 */
export const DISTRIBUTORS: readonly Distributor[] = [
  {
    id: 'dist-sul',
    name: 'Distribuidora Sul Farma',
    region: 'Sul',
    publishedOn: daysAgo(3),
    updatedOn: daysAgo(2),
    slaDays: 3,
    status: 'published',
  },
  {
    id: 'dist-sudeste',
    name: 'Central Sudeste Medicamentos',
    region: 'Sudeste',
    publishedOn: daysAgo(3),
    updatedOn: daysAgo(1),
    slaDays: 3,
    status: 'published',
  },
  {
    id: 'dist-nordeste',
    name: 'Nordeste Distribuição Farmacêutica',
    region: 'Nordeste',
    publishedOn: daysAgo(9),
    updatedOn: null,
    slaDays: 3,
    status: 'not_loaded',
  },
  {
    id: 'dist-centro-oeste',
    name: 'Centro-Oeste Med',
    region: 'Centro-Oeste',
    publishedOn: daysAgo(7),
    updatedOn: daysAgo(1),
    slaDays: 3,
    status: 'late',
  },
  {
    id: 'dist-norte',
    name: 'Norte Saúde Distribuidora',
    region: 'Norte',
    publishedOn: daysAgo(6),
    updatedOn: null,
    slaDays: 3,
    status: 'not_loaded',
  },
  {
    id: 'dist-interior',
    name: 'Interior Farma Logística',
    region: 'Sudeste',
    publishedOn: daysAgo(4),
    updatedOn: daysAgo(3),
    slaDays: 3,
    status: 'published',
  },
]

export const DISTRIBUTORS_ON_TIME = DISTRIBUTORS.filter(
  (distributor) => distributor.status === 'published',
).length

export const DISTRIBUTORS_OFF_TRACK = DISTRIBUTORS.length - DISTRIBUTORS_ON_TIME

export const ADHERENCE_PERCENT =
  Math.round((DISTRIBUTORS_ON_TIME / DISTRIBUTORS.length) * 100 * 10) / 10

/** Dias decorridos desde a publicação, para medir o estouro de SLA. */
export function daysSincePublication(distributor: Distributor): number {
  return daysBetween(distributor.publishedOn, distributor.updatedOn ?? HOJE)
}

/** `true` quando a carga passou do prazo acordado — ou nem aconteceu. */
export function isOverSla(distributor: Distributor): boolean {
  return daysSincePublication(distributor) > distributor.slaDays
}

export const GOVERNANCE_ATTESTATION = combine([SAP, SCANNTECH, CRM_SFA, IQVIA])
