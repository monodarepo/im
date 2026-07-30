import type { CSSProperties, ReactNode } from 'react'
import { productCssVariables, type ProductId } from './tokens'

type ProductThemeProps = {
  product: ProductId
  children?: ReactNode
  className?: string
}

/**
 * Publica a identidade do produto ativo como custom property no escopo da
 * subárvore. Qualquer componente de chrome abaixo — botão primário, sidebar,
 * badge — lê `var(--product-accent)` sem receber prop.
 */
export function ProductTheme({ product, children, className }: ProductThemeProps) {
  return (
    <div
      data-product={product}
      className={className}
      style={productCssVariables(product) as CSSProperties}
    >
      {children}
    </div>
  )
}
