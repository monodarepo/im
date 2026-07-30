/**
 * Nota de perímetro (seção 6 do ESCOPO).
 *
 * Todo número de impacto financeiro do RGM é calculado sobre um perímetro que
 * ainda está em validação com o cliente. O asterisco marca o número; a nota
 * explica o que ele significa. Sem isso, um valor de captura na tela vira
 * promessa — e não é.
 */

export const PERIMETER_TEXT =
  'Perímetro em validação: os valores de impacto financeiro são calculados sobre a base de produtos, canais e clientes ainda em conferência com a Hypera.'

/** Asterisco colado ao número. */
export function PerimeterMark() {
  return (
    <sup className="ml-0.5 cursor-help text-neutral" title={PERIMETER_TEXT}>
      *
    </sup>
  )
}

/** Rodapé que explica o asterisco. Vai uma vez por tela. */
export function PerimeterNote({ className }: { className?: string }) {
  return (
    <p className={`text-delta text-neutral ${className ?? ''}`}>
      <span aria-hidden>*</span> {PERIMETER_TEXT}
    </p>
  )
}
