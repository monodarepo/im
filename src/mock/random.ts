/**
 * Gerador pseudoaleatório determinístico (mulberry32).
 *
 * A demonstração precisa ser idêntica em qualquer máquina: toda variação do
 * mock nasce de uma semente fixa, nunca do relógio ou de `Math.random()`.
 */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Semente única do mock da plataforma. */
export const MOCK_SEED = 20260730

export function pick<T>(random: () => number, items: readonly T[]): T {
  const item = items[Math.floor(random() * items.length)]
  if (item === undefined) throw new Error('pick() exige uma lista não vazia')
  return item
}
