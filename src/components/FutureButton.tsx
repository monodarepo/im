type FutureButtonProps = {
  label: string
  /** Fase em que a funcionalidade entra, ex.: `Fase 3`. */
  phase: string
}

/**
 * Funcionalidade prevista mas ainda não disponível.
 *
 * Fica visível e desabilitada, dizendo em que fase entra. Esconder o botão faz
 * a plataforma parecer menor do que é; deixá-lo clicável sem efeito quebra a
 * confiança na demonstração.
 */
export function FutureButton({ label, phase }: FutureButtonProps) {
  const title = `${label} — ${phase}`

  return (
    <button
      type="button"
      disabled
      title={title}
      className="inline-flex cursor-not-allowed items-center gap-2 rounded-control border border-surface-border bg-slate-50 px-3 py-1.5 text-delta-lg font-medium text-neutral"
    >
      {label}
      <span className="rounded-sm bg-slate-200 px-1.5 py-0.5 text-delta text-slate-600">{phase}</span>
    </button>
  )
}
