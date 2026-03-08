// blocks/_registry.ts
//
// ÚNICA fuente de verdad de todos los bloques.
// ModularDashboard y LandingModular leen de acá — nunca tienen if/else por bloque.
//
// Para agregar un bloque nuevo:
//   1. Añadir el ID a BlockId en types/blocks.ts
//   2. Crear el AdminComponent en blocks/<id>/admin/<Id>Admin.tsx
//   3. Agregar la entrada acá (adminOrder define el orden en el sidebar)

import type { BlockDefinition, BlockId, BlockSharedData } from '@/types/blocks';

// ── SectionComponents (landing pública) ──────────────────────────────────────
import HeroSection     from '@/blocks/landing/public/HeroSection';
import CalendarSection from '@/blocks/calendar/public/CalendarSection';
import GallerySection  from '@/blocks/gallery/public/GallerySection';
import ReviewsSection  from '@/blocks/reviews/public/ReviewsSection';
import ContactSection  from '@/blocks/crm/public/ContactSection';

// ── AdminComponents (tabs del dashboard) ─────────────────────────────────────
// Platform
import ResumenAdmin       from '@/blocks/platform/admin/ResumenAdmin';
import SolicitudesAdmin   from '@/blocks/platform/admin/SolicitudesAdmin';
import SuscripcionAdmin   from '@/blocks/platform/admin/SuscripcionAdmin';
import ConfiguracionAdmin from '@/blocks/platform/admin/ConfiguracionAdmin';
import BloquesAdmin       from '@/blocks/platform/admin/BloquesAdmin';
// Funcionales
import CalendarAdmin  from '@/blocks/calendar/admin/CalendarAdmin';
import CrmAdmin       from '@/blocks/crm/admin/CrmAdmin';
import ReviewsAdmin   from '@/blocks/reviews/admin/ReviewsAdmin';
import MarketingAdmin from '@/blocks/marketing/admin/MarketingAdmin';

// ─── Lógica de visibilidad para "solicitudes" — idéntica al legacy ────────────
// Visible si: booking.requestDeposit=true OR booking.requireManualConfirmation=true
// OR ya existen turnos pendientes/esperando_senia (caso retroactivo).
function solicitudesVisible(shared: BlockSharedData, negocio: any): boolean {
  let cfg = negocio?.config_web || {};
  if (typeof cfg === 'string') { try { cfg = JSON.parse(cfg); } catch { cfg = {}; } }

  const hayTurnos = shared.turnos.some(
    t => t.estado === 'pendiente' || t.estado === 'esperando_senia'
  );
  if (hayTurnos) return true; // siempre mostrar si ya hay algo pendiente

  if (!cfg.booking) return false; // sin booking configurado → ocultar
  const pideSena   = cfg.booking.requestDeposit            === true || cfg.booking.requestDeposit            === 'true';
  const pideManual = cfg.booking.requireManualConfirmation  === true || cfg.booking.requireManualConfirmation  === 'true';
  return pideSena || pideManual;
}

// ─── Registry ─────────────────────────────────────────────────────────────────
export const BLOCKS_REGISTRY: Record<BlockId, BlockDefinition> = {

  // ── PLATFORM — alwaysActive: true, sin fila en tenant_blocks ─────────────

  resumen: {
    id: 'resumen', name: 'General', description: 'Resumen de actividad del negocio.',
    category: 'platform', priceARS: 0, agencyPriceARS: 0, dependencies: [],
    icon: 'LayoutDashboard', available: true,
    alwaysActive: true, adminOrder: 1,
    AdminComponent: ResumenAdmin,
  },

  solicitudes: {
    id: 'solicitudes', name: 'Solicitudes', description: 'Confirmaciones manuales y cobro de seña.',
    category: 'platform', priceARS: 0, agencyPriceARS: 0, dependencies: [],
    icon: 'Bell', available: true,
    alwaysActive: true, adminOrder: 4,
    sidebarVisible: solicitudesVisible,
    sidebarBadge: (shared) => {
      const n = shared.turnos.filter(t => t.estado === 'pendiente' || t.estado === 'esperando_senia').length;
      return n > 0 ? n : undefined;
    },
    AdminComponent: SolicitudesAdmin,
  },

  suscripcion: {
    id: 'suscripcion', name: 'Suscripción', description: 'Gestión de plan y facturación.',
    category: 'platform', priceARS: 0, agencyPriceARS: 0, dependencies: [],
    icon: 'CreditCard', available: true,
    alwaysActive: true, adminOrder: 9,
    AdminComponent: SuscripcionAdmin,
  },

  bloques: {
    id: 'bloques', name: 'Mis Bloques', description: 'Activá funcionalidades y configurá el orden de secciones.',
    category: 'platform', priceARS: 0, agencyPriceARS: 0, dependencies: [],
    icon: 'Puzzle', available: true,
    alwaysActive: true, adminOrder: 10,
    AdminComponent: BloquesAdmin,
  },

  configuracion: {
    id: 'configuracion', name: 'Configuración', description: 'Dominio, integraciones y seguridad.',
    category: 'platform', priceARS: 0, agencyPriceARS: 0, dependencies: [],
    icon: 'Settings', available: true,
    alwaysActive: true, adminOrder: 11,
    AdminComponent: ConfiguracionAdmin,
  },

  // ── CORE — gratis, auto-activado al crear negocio ─────────────────────────
  // Sin adminOrder → no genera tab en el dashboard

  landing: {
    id: 'landing', name: 'Landing Page', description: 'Página pública del negocio.',
    category: 'core', priceARS: 0, agencyPriceARS: 0, dependencies: [],
    icon: 'Globe', available: true,
    SectionComponent: HeroSection,
  },

  // ── FUNCIONALES ───────────────────────────────────────────────────────────

  calendar: {
    id: 'calendar', name: 'Turnos & Calendario',
    description: 'Reservas online, calendario semanal, gestión de horarios y promociones.',
    category: 'services', priceARS: 2500, agencyPriceARS: 1750, dependencies: ['landing'],
    icon: 'CalendarDays', available: true, adminOrder: 2,
    sidebarBadge: (_, negocio) => !negocio.google_calendar_connected ? '!' : undefined,
    SectionComponent: CalendarSection,
    AdminComponent:   CalendarAdmin,
  },

  crm: {
    id: 'crm', name: 'Clientes',
    description: 'Base de clientes, historial y contacto directo por WhatsApp o email.',
    category: 'services', priceARS: 1500, agencyPriceARS: 1050, dependencies: [],
    icon: 'Users', available: true, adminOrder: 3,
    SectionComponent: ContactSection,
    AdminComponent:   CrmAdmin,
  },

  reviews: {
    id: 'reviews', name: 'Valoraciones', description: 'Reseñas y valoraciones de clientes.',
    category: 'services', priceARS: 700, agencyPriceARS: 490, dependencies: [],
    icon: 'Star', available: true, adminOrder: 5,
    SectionComponent: ReviewsSection,
    AdminComponent:   ReviewsAdmin,
  },

  gallery: {
    id: 'gallery', name: 'Galería', description: 'Galería visual de trabajos o portfolio.',
    category: 'services', priceARS: 800, agencyPriceARS: 560, dependencies: [],
    icon: 'Images', available: true, adminOrder: 6,
    SectionComponent: GallerySection,
    // AdminComponent: GalleryAdmin — pendiente Fase 3
  },

  analytics: {
    id: 'analytics', name: 'Analytics', description: 'Métricas de visitas y conversión.',
    category: 'marketing', priceARS: 1500, agencyPriceARS: 1050, dependencies: [],
    icon: 'BarChart2', available: true, adminOrder: 7,
    // AdminComponent: AnalyticsAdmin — pendiente Fase 4
  },

  marketing: {
    id: 'marketing', name: 'Marketing', description: 'Campañas y comunicación con clientes.',
    category: 'marketing', priceARS: 1000, agencyPriceARS: 700, dependencies: [],
    icon: 'Megaphone', available: true, adminOrder: 8,
    AdminComponent: MarketingAdmin,
  },

  payments: {
    id: 'payments', name: 'Pagos', description: 'Cobros online y gestión de seña.',
    category: 'commerce', priceARS: 2000, agencyPriceARS: 1400, dependencies: [],
    icon: 'CreditCard', available: true,
    // AdminComponent: PaymentsAdmin — pendiente Fase 5
  },

  chat: {
    id: 'chat', name: 'Chat', description: 'Chat en tiempo real con visitantes.',
    category: 'marketing', priceARS: 1000, agencyPriceARS: 700, dependencies: [],
    icon: 'MessageCircle', available: true,
  },

  shop: {
    id: 'shop', name: 'Tienda Online', description: 'Catálogo de productos y carrito.',
    category: 'commerce', priceARS: 4000, agencyPriceARS: 2800, dependencies: ['payments'],
    icon: 'ShoppingCart', available: false,
  },

  academy: {
    id: 'academy', name: 'Academia', description: 'Cursos y contenido educativo.',
    category: 'commerce', priceARS: 3500, agencyPriceARS: 2450, dependencies: ['payments'],
    icon: 'GraduationCap', available: false,
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