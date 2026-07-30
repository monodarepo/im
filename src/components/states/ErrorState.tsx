import type { ReactNode } from 'react'
import { ICON_SIZE, ICON_STROKE, iconUi } from '../../design/icons'
import { SEMANTIC } from '../../design/tokens'

/**
 * Estado de erro. Diz o que aconteceu e por onde sair — sem desculpa, sem
 * exclamação. Erro sem causa e sem saída é beco, e beco não vai para a tela.
 */
export function ErrorState({
  title,
  cause,
  action,
}: {
  title: string
  cause: string
  action?: ReactNode
}) {
  const Alert = iconUi.alert
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <Alert size={ICON_SIZE.lg} strokeWidth={ICON_STROKE} color={SEMANTIC.negative} aria-hidden />
      <p className="text-body-lg font-medium text-slate-900">{title}</p>
      <p className="max-w-sm text-body text-neutral">{cause}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
