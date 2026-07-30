/**
 * Marcador de recomendação gerada por IA (padrão visual do CLAUDE.md).
 *
 * Um chip pequeno e neutro com o rótulo "IA" — nunca ícone de brilho. O
 * marcador diz a origem da recomendação sem vender nada: quem decide continua
 * sendo a pessoa, e o chip é informação, não enfeite.
 */
export function AiChip() {
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-control border border-slate-300 px-1.5 py-px text-micro uppercase text-slate-500"
      title="Recomendação gerada pela camada de IA da plataforma"
    >
      IA
    </span>
  )
}
