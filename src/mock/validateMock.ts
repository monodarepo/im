/**
 * Guardas do mock.
 *
 * Roda como teste no `npm run validate` e é importável em runtime para uma tela
 * de diagnóstico. As funções recebem os arquivos já lidos: o módulo não toca o
 * sistema de arquivos, então serve tanto ao Node quanto ao browser.
 */

export type SourceFile = {
  /** Caminho relativo a `src/`, com barras normais. */
  readonly path: string
  readonly text: string
}

export type Violation = {
  readonly check: string
  readonly detail: string
}

/**
 * Termos que não podem aparecer na interface nem no mock.
 *
 * Produtos técnicos Google — a plataforma se apresenta como "Google Cloud" e
 * "IA", nunca pela peça de infraestrutura. Close-Up não é fonte declarável.
 * Os valores de investimento do programa não vão para a tela.
 */
export const FORBIDDEN_TERMS: readonly string[] = [
  'BigQuery',
  'Vertex',
  'Gemini',
  'Looker',
  'Dataflow',
  'Dataplex',
  'Pub/Sub',
  'Apigee',
  'AppSheet',
  'Maps Platform',
  'Close-Up',
  '39,4',
  '43,4',
]

/** Arquivos que declaram os termos para poder proibi-los. */
const SCANNER_FILES = ['mock/validateMock.ts', 'mock/validateMock.test.ts']

/** Alcance da varredura: todo o mock e toda a camada visual. */
export function isScannedFile(path: string): boolean {
  if (SCANNER_FILES.includes(path)) return false
  return path.startsWith('mock/') || path.endsWith('.tsx')
}

function occurrences(text: string, term: string): number {
  // Close-Up aparece com hífen, espaço ou nada entre as partes.
  const pattern =
    term === 'Close-Up'
      ? /close[\s-]?up/gi
      : new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
  return (text.match(pattern) ?? []).length
}

export function findForbiddenTerms(files: readonly SourceFile[]): Violation[] {
  const violations: Violation[] = []
  for (const file of files.filter(({ path }) => isScannedFile(path))) {
    for (const term of FORBIDDEN_TERMS) {
      const count = occurrences(file.text, term)
      if (count > 0) {
        violations.push({
          check: 'termo proibido',
          detail: `"${term}" aparece ${count}x em ${file.path}`,
        })
      }
    }
  }
  return violations
}

/** Comentários citam regras; código as cumpre. As checagens de uso olham só o código. */
export function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

/**
 * `HOJE` é a âncora temporal única: nenhum módulo pode ler o relógio do sistema
 * nem guardar estado no navegador.
 */
export function findNonDeterministicCode(files: readonly SourceFile[]): Violation[] {
  const forbidden = /localStorage|sessionStorage|Date\.now\(\)|new Date\(|Math\.random\(/
  return files
    .filter(({ path }) => !SCANNER_FILES.includes(path))
    .filter(({ text }) => forbidden.test(stripComments(text)))
    .map(({ path }) => ({
      check: 'fonte de não determinismo',
      detail: `${path} usa relógio, armazenamento de navegador ou aleatoriedade não semeada`,
    }))
}
