// blocks/_registry.ts
// Registro central de todos los bloques de UnitPro.
// Este archivo es la fuente de verdad de qué bloques existen,
// cuánto cuestan y qué hacen. NO depende de Supabase.

import { BlockDefinition, BlockId } from '@/types/blocks';
import HeroSection     from '@/blocks/landing/public/HeroSection';
import CalendarSection from '@/blocks/calendar/public/CalendarSection';
import GallerySection  from '@/blocks/gallery/public/GallerySection';
import ReviewsSection  from '@/blocks/reviews/public/ReviewsSection';
import ContactSection  from '@/blocks/crm/public/ContactSection';

export const BLOCKS_REGISTRY: Record<BlockId, BlockDefinition> = {

  // ─── CORE ────────────────────────────────────────────────────────────────
  landing: {
    id: 'landing',
    name: 'Landing Page',
    description: 'Página pública del negocio con info, servicios y CTA. Incluida en todos los planes.',
    category: 'core',
    priceARS: 0,
    agencyPriceARS: 0,
    hasPublicView: true,
    hasAdminView: true,
    dependencies: [],
    icon: 'Globe',
    available: true,
    SectionComponent: HeroSection,
  },

  // ─── SERVICIOS ────────────────────────────────────────────────────────────
  calendar: {
    id: 'calendar',
    name: 'Calendario & Turnos',
    description: 'Agenda online para que tus clientes reserven turnos. Sincronización con Google Calendar.',
    category: 'services',
    priceARS: 2500,
    agencyPriceARS: 1750,
    hasPublicView: true,
    hasAdminView: true,
    dependencies: [],
    icon: 'CalendarDays',
    available: true,
    SectionComponent: CalendarSection,
  },

  crm: {
    id: 'crm',
    name: 'CRM & Contactos',
    description: 'Gestión de contactos, historial de clientes y pipeline de presupuestos.',
    category: 'services',
    priceARS: 1500,
    agencyPriceARS: 1050,
    hasPublicView: true,   // Formulario de contacto público
    hasAdminView: true,
    dependencies: [],
    icon: 'Users',
    available: true,
    SectionComponent: ContactSection,
  },

  gallery: {
    id: 'gallery',
    name: 'Galería de Imágenes',
    description: 'Galería visual del negocio o portfolio de trabajos.',
    category: 'services',
    priceARS: 800,
    agencyPriceARS: 560,
    hasPublicView: true,
    hasAdminView: true,
    dependencies: [],
    icon: 'Images',
    available: true,
    SectionComponent: GallerySection,
  },

  reviews: {
    id: 'reviews',
    name: 'Valoraciones',
    description: 'Sistema de reseñas y valoraciones de clientes.',
    category: 'services',
    priceARS: 700,
    agencyPriceARS: 490,
    hasPublicView: true,
    hasAdminView: true,
    dependencies: [],
    icon: 'Star',
    available: true,
    SectionComponent: ReviewsSection,
  },

  analytics: {
    id: 'analytics',
    name: 'Analytics',
    description: 'Métricas del negocio: visitas, conversiones y comportamiento de clientes.',
    category: 'marketing',
    priceARS: 1500,
    agencyPriceARS: 1050,
    hasPublicView: false,
    hasAdminView: true,
    dependencies: [],
    icon: 'BarChart2',
    available: true,
  },

  payments: {
    id: 'payments',
    name: 'Pagos & Cobros',
    description: 'Integración con MercadoPago y Stripe. Cobro de señas y pagos online.',
    category: 'services',
    priceARS: 2000,
    agencyPriceARS: 1400,
    hasPublicView: true,
    hasAdminView: true,
    dependencies: [],
    icon: 'CreditCard',
    available: true,
  },

  chat: {
    id: 'chat',
    name: 'Chat con Clientes',
    description: 'Widget de mensajería directa con clientes desde la web del negocio.',
    category: 'marketing',
    priceARS: 1000,
    agencyPriceARS: 700,
    hasPublicView: true,
    hasAdminView: true,
    dependencies: [],
    icon: 'MessageCircle',
    available: true,
  },

  // ─── COMMERCE (futuros) ───────────────────────────────────────────────────
  shop: {
    id: 'shop',
    name: 'Tienda Online',
    description: 'Venta de productos con carrito, stock y gestión de pedidos.',
    category: 'commerce',
    priceARS: 4000,
    agencyPriceARS: 2800,
    hasPublicView: true,
    hasAdminView: true,
    dependencies: ['payments'],
    icon: 'ShoppingBag',
    available: false, // Próximamente — Fase 6
  },

  academy: {
    id: 'academy',
    name: 'Academia & Cursos',
    description: 'Cursos, inscripciones y acceso a contenido digital.',
    category: 'commerce',
    priceARS: 3500,
    agencyPriceARS: 2450,
    hasPublicView: true,
    hasAdminView: true,
    dependencies: ['payments'],
    icon: 'GraduationCap',
    available: false, // Próximamente — Fase 7
  },
};

// ─── Helpers del registry ─────────────────────────────────────────────────────

/** Todos los bloques disponibles (available: true) */
export const AVAILABLE_BLOCKS = Object.values(BLOCKS_REGISTRY).filter(b => b.available);

/** Bloques disponibles agrupados por categoría */
export const BLOCKS_BY_CATEGORY = AVAILABLE_BLOCKS.reduce((acc, block) => {
  if (!acc[block.category]) acc[block.category] = [];
  acc[block.category].push(block);
  return acc;
}, {} as Record<string, BlockDefinition[]>);

/** Obtener la definición de un bloque por ID */
export function getBlockDefinition(blockId: BlockId): BlockDefinition {
  return BLOCKS_REGISTRY[blockId];
}

/** Calcular precio efectivo (con o sin precio agencia) */
export function getBlockPrice(blockId: BlockId, isAgency = false): number {
  const block = BLOCKS_REGISTRY[blockId];
  return isAgency ? block.agencyPriceARS : block.priceARS;
}

/** Calcular total mensual de una lista de bloques activos */
export function calculateMonthlyTotal(activeBlockIds: BlockId[], isAgency = false): number {
  return activeBlockIds.reduce((total, id) => {
    return total + getBlockPrice(id, isAgency);
  }, 0);
}

/** Verificar si las dependencias de un bloque están cubiertas */
export function checkDependencies(
  blockId: BlockId,
  activeBlockIds: BlockId[]
): { satisfied: boolean; missing: BlockId[] } {
  const { dependencies } = BLOCKS_REGISTRY[blockId];
  const missing = dependencies.filter(dep => !activeBlockIds.includes(dep));
  return { satisfied: missing.length === 0, missing };
}