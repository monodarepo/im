import type { Attestation } from '../domain/attestation'
import { daysAgo } from '../domain/today'

/**
 * Atestados das fontes que sustentam o HUB.
 *
 * A defasagem de cada fonte é a real da operação: Scanntech e Neogrid chegam em
 * dias, IQVIA em semanas. Nenhuma está atrasada em relação ao próprio lag, então
 * a tela abre em estado pleno.
 */

export const SCANNTECH: Attestation = {
  source: ['scanntech'],
  asOf: daysAgo(2),
  lagDays: 3,
  confidence: 'high',
  quality: 'complete',
  method: 'observed',
}

export const NEOGRID: Attestation = {
  source: ['neogrid'],
  asOf: daysAgo(3),
  lagDays: 5,
  confidence: 'high',
  quality: 'complete',
  method: 'observed',
}

export const NEOGRID_DISTRIBUIDORES: Attestation = {
  source: ['neogrid', 'distribuidores'],
  asOf: daysAgo(3),
  lagDays: 5,
  confidence: 'medium',
  quality: 'partial',
  method: 'estimated',
}

export const IQVIA: Attestation = {
  source: ['iqvia'],
  asOf: daysAgo(30),
  lagDays: 45,
  confidence: 'medium',
  quality: 'complete',
  method: 'estimated',
}
