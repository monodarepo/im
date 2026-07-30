/**
 * Marca Hypera Pharma para o chrome da demonstração.
 *
 * O símbolo é uma RECRIAÇÃO aproximada da gota, desenhada à mão: o vetor
 * oficial não era alcançável do ambiente de build (fontes de marca bloqueadas
 * pelo proxy). Em tamanho de sidebar a aproximação passa; para material
 * impresso ou tela de abertura, substituir os paths abaixo pelo SVG do manual
 * de marca — a interface do componente não precisa mudar.
 */

const NAVY = '#1E3E97'
const TEAL = '#4FC2CB'
const DARK_NAVY = '#12265E'
const PHARMA_GRAY = '#8A8C8E'

export function HyperaMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Símbolo Hypera"
      className="shrink-0"
    >
      <path
        fill={NAVY}
        d="M14,24 C28,6 62,2 80,14 C96,25 100,48 92,66 C84,84 64,96 44,94 C24,92 8,76 7,56 C6,44 8,32 14,24 Z"
      />
      <path
        fill={TEAL}
        d="M14,24 C28,6 62,2 80,14 C88,20 93,28 95,37 C84,26 72,26 62,34 C50,44 36,46 26,40 C18,35 13,30 14,24 Z"
      />
      <path
        fill="#FFFFFF"
        d="M7,50 C16,40 28,40 38,46 C50,54 62,52 72,44 C76,41 80,40 83,42 C80,48 74,53 66,56 C54,62 42,62 32,56 C24,51 14,52 8,58 Z"
      />
      <path
        fill={DARK_NAVY}
        d="M7,56 C6,44 8,32 14,24 C10,36 11,52 18,64 C25,76 36,86 50,89 C64,92 74,88 82,80 C74,90 60,96 44,94 C24,92 8,76 7,56 Z"
      />
    </svg>
  )
}

/**
 * Símbolo + wordmark. `on="dark"` para a sidebar (texto branco);
 * `on="light"` usa o azul da marca.
 */
export function HyperaLogo({ on = 'dark', size = 34 }: { on?: 'dark' | 'light'; size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <HyperaMark size={size} />
      <span className="leading-none">
        <span
          className="block text-base font-semibold tracking-tight"
          style={{ color: on === 'dark' ? '#FFFFFF' : NAVY }}
        >
          Hypera
        </span>
        <span
          className="mt-0.5 block text-right text-delta font-medium"
          style={{ color: on === 'dark' ? '#94A3B8' : PHARMA_GRAY }}
        >
          pharma
        </span>
      </span>
    </span>
  )
}
