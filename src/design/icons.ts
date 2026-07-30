/**
 * Mapa semântico de ícones (PD1). Lucide, exclusivamente.
 *
 * Nomeado pelo domínio, não pelo desenho: quem precisa do ícone de ruptura
 * importa `iconFor.stockout` e nunca decide qual desenho usar. É o que garante
 * que o mesmo conceito tem o mesmo ícone nas 45 telas — e que trocar um
 * desenho é uma linha aqui, não uma caça em quarenta arquivos.
 *
 * Nenhuma tela importa de `lucide-react` diretamente. Stroke 1.5, tamanhos
 * 14 / 16 / 20 apenas. Ícone nunca é o único significante de uma ação.
 */
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  Building2,
  CalendarClock,
  ChartNoAxesColumn,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  Clock,
  Database,
  FileText,
  Landmark,
  Layers,
  Map,
  MapPin,
  Megaphone,
  Minus,
  PackageX,
  Percent,
  PieChart,
  Pill,
  Plus,
  Route,
  Search,
  Stethoscope,
  Store,
  Tag,
  Target,
  TrendingUp,
  Truck,
  X,
  type LucideIcon,
} from 'lucide-react'

export const ICON_STROKE = 1.5

export const ICON_SIZE = { sm: 14, md: 16, lg: 20 } as const

/** Conceitos do domínio. */
export const iconFor = {
  sellOut: ChartNoAxesColumn,
  marketShare: PieChart,
  stockout: PackageX,
  price: Tag,
  margin: Percent,
  doctor: Stethoscope,
  pharmacy: Store,
  customer: Building2,
  territory: Map,
  region: MapPin,
  sample: Pill,
  decision: Landmark,
  approval: BadgeCheck,
  dataSource: Database,
  competitor: Target,
  forecast: TrendingUp,
  route: Route,
  campaign: Megaphone,
  logistics: Truck,
  report: FileText,
  cycle: CalendarClock,
  layer: Layers,
  lag: Clock,
} as const satisfies Record<string, LucideIcon>

/** Utilitários de chrome — fechar, navegar, ordenar, avisar. */
export const iconUi = {
  close: X,
  bell: Bell,
  help: CircleHelp,
  search: Search,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  chevronRight: ChevronRight,
  arrowRight: ArrowRight,
  arrowLeft: ArrowLeft,
  external: ArrowUpRight,
  plus: Plus,
  minus: Minus,
  ok: CircleCheck,
  alert: CircleAlert,
} as const satisfies Record<string, LucideIcon>

export type { LucideIcon }
