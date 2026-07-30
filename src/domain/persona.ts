/**
 * Personas da demonstração. Fictícias por regra: nenhum nome real de
 * stakeholder Hypera aparece na interface.
 */
export type Persona = {
  readonly name: string
  readonly area: string
  readonly initials: string
}

export const PERSONAS: readonly Persona[] = [
  { name: 'Carla Mendes', area: 'Inteligência de Mercado', initials: 'CM' },
  { name: 'João Pedro', area: 'Go-to-Market', initials: 'JP' },
  { name: 'Mariana Santos', area: 'Receita e Preço', initials: 'MS' },
  { name: 'Fernanda Lima', area: 'Relacionamento Médico', initials: 'FL' },
]

/** Persona autenticada na demonstração. */
export const CURRENT_PERSONA: Persona = PERSONAS[0] as Persona
