import type { CSSProperties, ReactNode } from 'react'
import { productCssVariables, type ThemeId } from './tokens'

type ProductThemeProps = {
  theme: ThemeId
  children?: ReactNode
  className?: string
}

/**
 * Publica a identidade ativa como custom property no escopo da subárvore.
 * Qualquer componente de chrome abaixo — botão primário, sidebar, badge — lê
 * `var(--product-accent)` sem receber prop.
 */
export function ProductTheme({ theme, children, className }: ProductThemeProps) {
  return (
    <div data-theme={theme} className={className} style={productCssVariables(theme) as CSSProperties}>
      {children}
    </div>
  )
}
