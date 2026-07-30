/**
 * Esqueleto de carregamento. O formato imita o conteúdo que vem — linha de
 * tabela vira barra na altura da linha, KPI vira bloco no tamanho do valor —
 * para o layout não saltar quando o dado chega.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`block animate-pulse rounded-control bg-slate-200/70 ${className}`}
    />
  )
}

export function SkeletonRows({ rows = 5, height = 36 }: { rows?: number; height?: number }) {
  return (
    <div role="status" aria-label="Carregando" className="divide-y divide-surface-border">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4" style={{ height }}>
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-1/6" />
          <Skeleton className="ml-auto h-3 w-1/5" />
        </div>
      ))}
    </div>
  )
}
