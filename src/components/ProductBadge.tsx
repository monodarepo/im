import { PRODUCTS, type ProductId } from '../design/tokens'

type ProductBadgeProps = {
  product: ProductId
  /** `full` mostra o nome do produto; `short` só a sigla. */
  variant?: 'short' | 'full'
  size?: 'sm' | 'md'
}

/**
 * Selo de identidade do produto.
 *
 * É chrome, não dado: a cor identifica de quem é o número, nunca se ele é bom
 * ou ruim. Por isso convive com o delta semântico no mesmo card sem competir —
 * um responde "de quem", o outro "como está".
 */
export function ProductBadge({ product, variant = 'short', size = 'sm' }: ProductBadgeProps) {
  const identity = PRODUCTS[product]

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-control font-medium text-white ${
        size === 'sm' ? 'px-2 py-0.5 text-delta' : 'px-2.5 py-1 text-delta-lg'
      }`}
      style={{ backgroundColor: identity.accent }}
      title={identity.name}
    >
      {variant === 'short' ? identity.shortName : identity.name}
    </span>
  )
}

/** Linha de selos para um card que envolve mais de um produto. */
export function ProductBadges({
  products,
  size = 'sm',
}: {
  products: readonly ProductId[]
  size?: 'sm' | 'md'
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {products.map((product) => (
        <ProductBadge key={product} product={product} size={size} />
      ))}
    </span>
  )
}
