/**
 * Mapa do Brasil por UF, em cartograma de blocos.
 *
 * Cada UF ocupa um bloco de mesmo tamanho, posicionado na grade de modo a
 * preservar a vizinhança real — Norte no topo, Nordeste à direita, Sul embaixo.
 * A área do bloco não representa a área geográfica: num mapa de oportunidade
 * isso é vantagem, porque DF e AC deixam de sumir ao lado do AM.
 *
 * Os paths são gerados aqui, sem dependência externa e sem tiles de servidor.
 */

export type UfCode =
  | 'AC' | 'AL' | 'AM' | 'AP' | 'BA' | 'CE' | 'DF' | 'ES' | 'GO'
  | 'MA' | 'MG' | 'MS' | 'MT' | 'PA' | 'PB' | 'PE' | 'PI' | 'PR'
  | 'RJ' | 'RN' | 'RO' | 'RR' | 'RS' | 'SC' | 'SE' | 'SP' | 'TO'

export type UfTile = {
  readonly code: UfCode
  readonly name: string
  readonly path: string
  /** Centro do bloco, para ancorar rótulo e tooltip. */
  readonly cx: number
  readonly cy: number
}

const TILE = 100
const GAP = 8
const RADIUS = 10
const PITCH = TILE + GAP

type Cell = { code: UfCode; name: string; col: number; row: number }

const GRID: readonly Cell[] = [
  { code: 'RR', name: 'Roraima', col: 3, row: 0 },
  { code: 'AP', name: 'Amapá', col: 4, row: 0 },

  { code: 'AM', name: 'Amazonas', col: 2, row: 1 },
  { code: 'PA', name: 'Pará', col: 4, row: 1 },
  { code: 'MA', name: 'Maranhão', col: 5, row: 1 },
  { code: 'CE', name: 'Ceará', col: 6, row: 1 },
  { code: 'RN', name: 'Rio Grande do Norte', col: 7, row: 1 },

  { code: 'AC', name: 'Acre', col: 1, row: 2 },
  { code: 'RO', name: 'Rondônia', col: 2, row: 2 },
  { code: 'TO', name: 'Tocantins', col: 4, row: 2 },
  { code: 'PI', name: 'Piauí', col: 5, row: 2 },
  { code: 'PB', name: 'Paraíba', col: 7, row: 2 },

  { code: 'MT', name: 'Mato Grosso', col: 3, row: 3 },
  { code: 'GO', name: 'Goiás', col: 4, row: 3 },
  { code: 'BA', name: 'Bahia', col: 5, row: 3 },
  { code: 'PE', name: 'Pernambuco', col: 6, row: 3 },
  { code: 'AL', name: 'Alagoas', col: 7, row: 3 },

  { code: 'MS', name: 'Mato Grosso do Sul', col: 3, row: 4 },
  { code: 'DF', name: 'Distrito Federal', col: 4, row: 4 },
  { code: 'MG', name: 'Minas Gerais', col: 5, row: 4 },
  { code: 'SE', name: 'Sergipe', col: 7, row: 4 },

  { code: 'SP', name: 'São Paulo', col: 4, row: 5 },
  { code: 'RJ', name: 'Rio de Janeiro', col: 5, row: 5 },
  { code: 'ES', name: 'Espírito Santo', col: 6, row: 5 },

  { code: 'PR', name: 'Paraná', col: 4, row: 6 },
  { code: 'SC', name: 'Santa Catarina', col: 4, row: 7 },
  { code: 'RS', name: 'Rio Grande do Sul', col: 4, row: 8 },
]

const MIN_COL = Math.min(...GRID.map((cell) => cell.col))
const MAX_COL = Math.max(...GRID.map((cell) => cell.col))
const MAX_ROW = Math.max(...GRID.map((cell) => cell.row))

function roundedRectPath(x: number, y: number, size: number, radius: number): string {
  const max = x + size
  const bottom = y + size
  return [
    `M${x + radius},${y}`,
    `H${max - radius}`,
    `A${radius},${radius} 0 0 1 ${max},${y + radius}`,
    `V${bottom - radius}`,
    `A${radius},${radius} 0 0 1 ${max - radius},${bottom}`,
    `H${x + radius}`,
    `A${radius},${radius} 0 0 1 ${x},${bottom - radius}`,
    `V${y + radius}`,
    `A${radius},${radius} 0 0 1 ${x + radius},${y}`,
    'Z',
  ].join('')
}

export const BRAZIL_UF_TILES: readonly UfTile[] = GRID.map(({ code, name, col, row }) => {
  const x = (col - MIN_COL) * PITCH
  const y = row * PITCH
  return {
    code,
    name,
    path: roundedRectPath(x, y, TILE, RADIUS),
    cx: x + TILE / 2,
    cy: y + TILE / 2,
  }
})

export const BRAZIL_VIEWBOX = {
  width: (MAX_COL - MIN_COL + 1) * PITCH - GAP,
  height: (MAX_ROW + 1) * PITCH - GAP,
}

export const UF_NAME: Record<UfCode, string> = Object.fromEntries(
  GRID.map(({ code, name }) => [code, name]),
) as Record<UfCode, string>

export const REGION_UFS = {
  sul: ['PR', 'SC', 'RS'],
  nordeste: ['MA', 'PI', 'CE', 'RN', 'PB', 'PE', 'AL', 'SE', 'BA'],
} as const satisfies Record<string, readonly UfCode[]>
