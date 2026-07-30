import type { SemanticTone } from '../design/tokens'
import { combine, type Attestation } from '../domain/attestation'
import { formatDecimal, formatInteger, formatPercent, formatPointsDelta } from '../domain/format'
import { ageInDays, daysFromNow, type IsoDate } from '../domain/today'
import {
  COMPETITIVE_MOVES,
  MARKET_SHARE_KPI,
  MOLECULE_TIMELINES,
  RELATIVE_PRICE_KPI,
  type CompetitiveMove,
} from './competitive'
import { findDecision, type DecisionRef } from './decisions'
import { SKUS } from './products'
import { IQVIA, NEOGRID_DISTRIBUIDORES, SCANNTECH } from './sources'

/**
 * War Room de Genéricos (módulo 3.9 do ESCOPO).
 *
 * A tela tem dois focos. O primeiro é o feed diário: os movimentos do
 * concorrente detectados na janela, com escopo e evidência datada. O segundo é
 * a resposta recomendada para cada movimento, em três posturas fechadas —
 * reagir localizado, reagir geral, não reagir — sempre com o racional explícito.
 *
 * Os movimentos NÃO são recriados aqui: vêm de `competitive.ts`, os mesmos que
 * a Inteligência Competitiva do HUB exibe. Este módulo só os enriquece com a
 * postura e o porquê. Se as duas telas discordassem sobre o que o concorrente
 * fez, nenhuma das duas serviria.
 */

export type ResponseStance = 'localized' | 'general' | 'hold'

export const RESPONSE_STANCES: readonly ResponseStance[] = ['localized', 'general', 'hold']

export const STANCE_LABEL: Record<ResponseStance, string> = {
  localized: 'Reagir localizado',
  general: 'Reagir geral',
  hold: 'Não reagir',
}

export const STANCE_DESCRIPTION: Record<ResponseStance, string> = {
  localized: 'Resposta contida na mesma praça e no mesmo canal do movimento.',
  general: 'Resposta em toda a praça, quando o movimento não tem recorte a isolar.',
  hold: 'Movimento acompanhado sem ação, com data de revisão marcada.',
}

/**
 * O tom lê a severidade da ameaça, não a qualidade da recomendação: quanto mais
 * larga a resposta exigida, mais forte a cor. Nenhuma cor de produto entra aqui.
 */
export const STANCE_TONE: Record<ResponseStance, SemanticTone> = {
  localized: 'attention',
  general: 'negative',
  hold: 'neutral',
}

/**
 * Prazo até a postura voltar à mesa, em dias.
 *
 * NOTA: não consta do ESCOPO. A escala segue a largura da resposta — quanto
 * mais contida a ação, mais curto o ciclo de verificação.
 */
const STANCE_REVIEW_DAYS: Record<ResponseStance, number> = {
  localized: 7,
  general: 21,
  hold: 30,
}

/**
 * Texto exibido quando a postura ainda não tem Decisão vinculada.
 *
 * NOTA: não consta do ESCOPO. Nenhuma recomendação fica solta: ou aponta para
 * uma Decisão existente, ou diz em que condição vira uma.
 */
const NO_DECISION_NOTE: Record<ResponseStance, string> = {
  localized:
    'Sem decisão vinculada: a resposta localizada entra na pauta do dia e vira decisão quando o impacto for apurado.',
  general:
    'Sem decisão vinculada: a resposta geral depende do dimensionamento do impacto antes de virar decisão.',
  hold: 'Sem decisão vinculada: não reagir é postura acompanhada, revisada na data ao lado.',
}

/** Evidência que sustenta o movimento. `reading` é `null` quando é qualitativa. */
export type MoveEvidence = {
  readonly id: string
  readonly label: string
  readonly reading: string | null
  readonly attestation: Attestation
}

export type DiscardedStance = {
  readonly stance: ResponseStance
  readonly why: string
}

/**
 * O racional é o produto da tela. Uma postura sem o porquê — e sem o porquê não
 * das outras duas — não é recomendação, é palpite.
 */
export type StanceRationale = {
  readonly headline: string
  readonly drivers: readonly string[]
  readonly discarded: readonly DiscardedStance[]
}

export type WarRoomEntry = {
  readonly move: CompetitiveMove
  readonly stance: ResponseStance
  readonly rationale: StanceRationale
  readonly evidence: readonly MoveEvidence[]
  /** Decisão que já dá encaminhamento ao movimento, quando existe. */
  readonly decision: DecisionRef | null
  /** Impacto financeiro endereçado pela decisão vinculada, em reais. */
  readonly financialImpactBrl: number | null
  /** Condição para a postura virar decisão. `null` quando a decisão já existe. */
  readonly decisionNote: string | null
  readonly reviewDate: IsoDate
  /** Movimento que abre a pauta do war room. */
  readonly isPriority: boolean
  readonly attestation: Attestation
}

function requireMove(id: string): CompetitiveMove {
  const move = COMPETITIVE_MOVES.find((candidate) => candidate.id === id)
  if (!move) throw new Error(`Movimento competitivo ausente: ${id}`)
  return move
}

function requireImpactPp(move: CompetitiveMove): number {
  if (move.impactPp === null) throw new Error(`Movimento sem impacto apurado: ${move.id}`)
  return move.impactPp
}

function skuName(id: string): string {
  const sku = SKUS.find((candidate) => candidate.id === id)
  if (!sku) throw new Error(`SKU ausente no portfólio: ${id}`)
  return sku.name
}

const PRESSURED_MOVE = requireMove('dipirona-mg-preco')
const PRESSURED_SHARE_LOSS_PP = requireImpactPp(PRESSURED_MOVE)

/** Leitura consolidada do preço relativo, com a variação do período. */
const RELATIVE_PRICE_READING = `${formatDecimal(RELATIVE_PRICE_KPI.value, 1)} · ${formatPointsDelta(
  RELATIVE_PRICE_KPI.delta,
)}`

const MARKET_SHARE_READING = `${formatPercent(MARKET_SHARE_KPI.value)} · ${formatPointsDelta(
  MARKET_SHARE_KPI.delta,
)}`

type EntrySpec = {
  readonly moveId: string
  readonly stance: ResponseStance
  readonly rationale: StanceRationale
  readonly evidence: readonly MoveEvidence[]
  readonly isPriority: boolean
}

/**
 * Postura e racional por movimento.
 *
 * NOTA: não consta do ESCOPO. O ESCOPO fixa os movimentos e o impacto do caso
 * canônico; a leitura de resposta abaixo é a aplicação da regra de RGM sobre
 * eles — resposta na mesma fronteira do movimento, tabela só se move com
 * evidência, e nenhum número novo é criado para justificar ação.
 */
const ENTRY_SPECS: readonly EntrySpec[] = [
  {
    moveId: 'dipirona-mg-preco',
    stance: 'localized',
    isPriority: true,
    rationale: {
      headline:
        'Responder dentro de Minas Gerais, na mesma profundidade do corte e com prazo fechado.',
      drivers: [
        `A perda de share já é mensurável e datada: ${formatPointsDelta(PRESSURED_SHARE_LOSS_PP)} no recorte, com duas fontes independentes sustentando a leitura.`,
        'O corte está confinado a uma UF. Enquanto não houver réplica em outra praça, a resposta cabe na mesma fronteira do movimento.',
        'O preço relativo consolidado está abaixo da paridade: a folga existe no agregado, não no recorte pressionado. Defender no agregado seria defender onde não há ataque.',
        'A decisão já existe e dimensiona a captura. Reagir localizado é executá-la, não abrir frente nova.',
      ],
      discarded: [
        {
          stance: 'general',
          why: 'Levar a resposta ao país inteiro entregaria margem em praças onde nenhum corte foi observado e transformaria um movimento de uma UF em guerra de preço nacional.',
        },
        {
          stance: 'hold',
          why: 'Ficar parado deixaria correr a única perda já apurada da janela, sobre a molécula que o concorrente escolheu atacar.',
        },
      ],
    },
    evidence: [
      {
        id: 'share-loss',
        label: 'Perda de share no recorte de Minas Gerais',
        reading: formatPointsDelta(PRESSURED_SHARE_LOSS_PP),
        attestation: PRESSURED_MOVE.attestation,
      },
      {
        id: 'relative-price',
        label: 'Preço relativo consolidado',
        reading: RELATIVE_PRICE_READING,
        attestation: RELATIVE_PRICE_KPI.attestation,
      },
      {
        id: 'confinement',
        label: 'Corte observado apenas em Minas Gerais, sem réplica em outra UF na janela',
        reading: null,
        attestation: SCANNTECH,
      },
    ],
  },
  {
    moveId: 'paracetamol-encarte-redes-regionais',
    stance: 'localized',
    isPriority: false,
    rationale: {
      headline:
        'Responder no mesmo canal e na mesma praça, com verba promocional e sem tocar a tabela.',
      drivers: [
        'O encarte está concentrado em um canal e uma praça. A resposta cabe exatamente na mesma fronteira, sem transbordar para o resto do país.',
        'É o movimento mais recente da janela e a captura do recorte é observada e completa: dá para medir a reação em poucos dias.',
        'Responder com verba promocional mantém a tabela intacta e a ação reversível — se o encarte terminar, a resposta termina junto.',
      ],
      discarded: [
        {
          stance: 'general',
          why: 'Levar promoção a todos os canais por causa de um encarte regional custaria margem nacional para conter um movimento de uma praça.',
        },
        {
          stance: 'hold',
          why: 'Ceder gôndola no canal em que o concorrente acabou de comprar espaço, justamente onde a leitura é a mais fresca da janela, é perder o recorte sem disputá-lo.',
        },
      ],
    },
    evidence: [
      {
        id: 'freshness',
        label: 'Movimento mais recente da janela, com captura observada e completa',
        reading: null,
        attestation: SCANNTECH,
      },
      {
        id: 'impact-open',
        label: 'Efeito sobre o share do recorte',
        reading: null,
        attestation: requireMove('paracetamol-encarte-redes-regionais').attestation,
      },
    ],
  },
  {
    moveId: 'losartana-lancamento-c60',
    stance: 'general',
    isPriority: false,
    rationale: {
      headline:
        'Responder em toda a praça, por portfólio e preço por comprimido: não há recorte geográfico a isolar.',
      drivers: [
        'O lançamento entrou em todo o país ao mesmo tempo e vem do líder da categoria. Uma resposta regional não alcançaria a referência que o movimento cria.',
        `O portfólio próprio cobre ${skuName('losartana-50-30')}; a faixa de 60 comprimidos fica descoberta, e é nela que a comparação de preço por comprimido passa a ser feita.`,
        'Losartana é a molécula da maior decisão aberta da carteira. A resposta de portfólio protege a mesma base que já está sendo recuperada.',
      ],
      discarded: [
        {
          stance: 'localized',
          why: 'Não existe praça a isolar: o lançamento é nacional e simultâneo, sem concentração observada em nenhuma UF.',
        },
        {
          stance: 'hold',
          why: 'Deixar a faixa de 60 comprimidos descoberta entrega ao concorrente a melhor referência de preço por comprimido da molécula, e ela não volta sozinha.',
        },
      ],
    },
    evidence: [
      {
        id: 'market-share',
        label: MARKET_SHARE_KPI.label,
        reading: MARKET_SHARE_READING,
        attestation: MARKET_SHARE_KPI.attestation,
      },
      {
        id: 'portfolio-gap',
        label: `Portfólio próprio para em ${skuName('losartana-50-30')}`,
        reading: null,
        attestation: requireMove('losartana-lancamento-c60').attestation,
      },
    ],
  },
  {
    moveId: 'dipirona-encarte-grandes-redes',
    stance: 'hold',
    isPriority: false,
    rationale: {
      headline: 'Não reagir enquanto o efeito do encarte não estiver apurado.',
      drivers: [
        'O impacto segue em apuração. Responder a uma ação promocional sem dimensionar o efeito troca desconto permanente por promoção temporária.',
        'A captura nas grandes redes chega parcial e com confiança média: é o elo mais fraco da janela e não sustenta mudança de tabela.',
        'A mesma molécula já concentra a resposta da categoria no corte de preço em Minas Gerais. Abrir uma segunda frente diluiria a primeira.',
      ],
      discarded: [
        {
          stance: 'localized',
          why: 'Não há praça a isolar: o encarte é nacional dentro do canal, e um contra-encarte regional não alcançaria o mesmo espaço de gôndola.',
        },
        {
          stance: 'general',
          why: 'Uma resposta nacional a uma ação temporária comprometeria a tabela da molécula que já está sob pressão de preço em outro recorte.',
        },
      ],
    },
    evidence: [
      {
        id: 'impact-open',
        label: 'Efeito sobre o share do canal',
        reading: null,
        attestation: requireMove('dipirona-encarte-grandes-redes').attestation,
      },
      {
        id: 'temporary',
        label: 'Ação promocional por natureza temporária, sem alteração de tabela observada',
        reading: null,
        attestation: requireMove('dipirona-encarte-grandes-redes').attestation,
      },
    ],
  },
  {
    moveId: 'losartana-atacado-reajuste',
    stance: 'hold',
    isPriority: false,
    rationale: {
      headline: 'Não reagir: o movimento é de alta e melhora a posição relativa sem custo.',
      drivers: [
        'O concorrente reajustou para cima. Espelhar o reajuste transferiria ao canal um ganho que a Hypera já tem de graça.',
        'A leitura do atacado chega estimada e parcial. Mudar tabela a partir dela seria mover preço sem evidência observada.',
        'Sem repasse ao sell-out, o efeito na ponta ainda não existe — não há o que responder.',
      ],
      discarded: [
        {
          stance: 'localized',
          why: 'Não há perda a conter no recorte: a posição relativa melhorou, não piorou.',
        },
        {
          stance: 'general',
          why: 'Alterar a tabela nacional a partir de um movimento favorável e ainda não repassado ao varejo é mudar preço na direção errada.',
        },
      ],
    },
    evidence: [
      {
        id: 'impact-open',
        label: 'Efeito sobre o preço praticado no varejo',
        reading: null,
        attestation: requireMove('losartana-atacado-reajuste').attestation,
      },
      {
        id: 'wholesale-method',
        label: 'Leitura do atacado chega estimada e parcial',
        reading: null,
        attestation: NEOGRID_DISTRIBUIDORES,
      },
    ],
  },
  {
    moveId: 'paracetamol-lancamento-750',
    stance: 'hold',
    isPriority: false,
    rationale: {
      headline:
        'Não reagir: molécula e dosagem já estão cobertas e o movimento não produziu efeito observável.',
      drivers: [
        `O portfólio próprio já cobre ${skuName('paracetamol-750-20')} na mesma dosagem. A diferença é de tamanho de embalagem, não de cobertura terapêutica.`,
        'É o movimento mais antigo da janela e segue sem impacto apurado — tempo suficiente para que um efeito relevante já tivesse aparecido.',
        'A fonte que sustenta o lançamento é a de maior defasagem entre as disponíveis. Reagir agora seria reagir a uma foto velha.',
      ],
      discarded: [
        {
          stance: 'localized',
          why: 'Não há praça a isolar: o lançamento é nacional.',
        },
        {
          stance: 'general',
          why: 'Abrir apresentação nova sem efeito observado sobre a molécula é custo de portfólio sem evidência de retorno.',
        },
      ],
    },
    evidence: [
      {
        id: 'portfolio-covered',
        label: `Portfólio próprio cobre ${skuName('paracetamol-750-20')} na mesma dosagem`,
        reading: null,
        attestation: requireMove('paracetamol-lancamento-750').attestation,
      },
      {
        id: 'age',
        label: 'Movimento mais antigo da janela, sem efeito observado no sell-out',
        reading: null,
        attestation: IQVIA,
      },
    ],
  },
]

function buildEntry(spec: EntrySpec): WarRoomEntry {
  const move = requireMove(spec.moveId)
  const decision = move.decisionId === null ? null : (findDecision(move.decisionId) ?? null)

  return {
    move,
    stance: spec.stance,
    rationale: spec.rationale,
    evidence: spec.evidence,
    decision,
    financialImpactBrl: decision === null ? null : decision.impactBrl,
    decisionNote: decision === null ? NO_DECISION_NOTE[spec.stance] : null,
    reviewDate: daysFromNow(STANCE_REVIEW_DAYS[spec.stance]),
    isPriority: spec.isPriority,
    attestation: combine([move.attestation, ...spec.evidence.map((item) => item.attestation)]),
  }
}

/** Entradas do war room, uma por movimento detectado. */
export const WAR_ROOM_ENTRIES: readonly WarRoomEntry[] = ENTRY_SPECS.map(buildEntry)

export type WarRoomDay = {
  readonly date: IsoDate
  readonly entries: readonly WarRoomEntry[]
}

/** Feed cronológico, do movimento mais recente para o mais antigo. */
export const WAR_ROOM_FEED: readonly WarRoomDay[] = (() => {
  const byDate = new Map<IsoDate, WarRoomEntry[]>()

  for (const entry of WAR_ROOM_ENTRIES) {
    const bucket = byDate.get(entry.move.date)
    if (bucket) bucket.push(entry)
    else byDate.set(entry.move.date, [entry])
  }

  return [...byDate.entries()]
    .map(([date, entries]) => ({ date, entries: entries as readonly WarRoomEntry[] }))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
})()

export type StanceCount = {
  readonly stance: ResponseStance
  readonly count: number
}

function countStances(entries: readonly WarRoomEntry[]): readonly StanceCount[] {
  return RESPONSE_STANCES.map((stance) => ({
    stance,
    count: entries.filter((entry) => entry.stance === stance).length,
  }))
}

/** Contagem de movimentos por postura recomendada. */
export const STANCE_SUMMARY: readonly StanceCount[] = countStances(WAR_ROOM_ENTRIES)

export type MoleculeStances = {
  readonly molecule: string
  readonly entries: readonly WarRoomEntry[]
  readonly counts: readonly StanceCount[]
  readonly attestation: Attestation
}

/**
 * Mesma quebra por molécula da Inteligência Competitiva, agora com a postura de
 * resposta ao lado de cada linha de tempo.
 */
export const MOLECULE_STANCES: readonly MoleculeStances[] = MOLECULE_TIMELINES.map((timeline) => {
  const entries = timeline.moves
    .map((move) => WAR_ROOM_ENTRIES.find((entry) => entry.move.id === move.id))
    .filter((entry): entry is WarRoomEntry => entry !== undefined)

  return {
    molecule: timeline.molecule,
    entries,
    counts: countStances(entries),
    attestation: timeline.attestation,
  }
})

/** Largura da janela observada, em dias, medida pelo movimento mais antigo. */
export const WAR_ROOM_WINDOW_DAYS = Math.max(
  ...WAR_ROOM_ENTRIES.map((entry) => ageInDays(entry.move.date)),
)

/** Movimentos cujo impacto ainda não foi dimensionado. */
export const MOVES_UNDER_REVIEW = WAR_ROOM_ENTRIES.filter(
  (entry) => entry.move.impactPp === null,
).length

/** Perda de share apurada na janela, em pontos percentuais. */
export const MEASURED_SHARE_LOSS_PP = WAR_ROOM_ENTRIES.reduce(
  (total, entry) => total + (entry.move.impactPp ?? 0),
  0,
)

/** Impacto financeiro endereçado por decisões já abertas, em reais. */
export const ADDRESSED_IMPACT_BRL = WAR_ROOM_ENTRIES.reduce(
  (total, entry) => total + (entry.financialImpactBrl ?? 0),
  0,
)

export const WAR_ROOM_ATTESTATION: Attestation = combine(
  WAR_ROOM_ENTRIES.map((entry) => entry.attestation),
)

/** Rótulo do total de movimentos, no plural correto. */
export function formatMoveCount(count: number): string {
  return count === 1 ? '1 movimento' : `${formatInteger(count)} movimentos`
}
