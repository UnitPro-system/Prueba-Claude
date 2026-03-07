// types/blocks.ts
// Tipos del sistema de bloques modular de UnitPro

// ─── IDs de bloques válidos ───────────────────────────────────────────────────
// Agregar acá cada vez que se cree un bloque nuevo
export type BlockId =
  | 'landing'
  | 'calendar'
  | 'crm'
  | 'gallery'
  | 'reviews'
  | 'analytics'
  | 'payments'
  | 'chat'
  | 'shop'      // Fase 6 - futuro
  | 'academy';  // Fase 7 - futuro

// ─── Categorías de bloques ────────────────────────────────────────────────────
export type BlockCategory = 'core' | 'services' | 'commerce' | 'marketing' | 'future';

// ─── Definición de un bloque en el registry ──────────────────────────────────
export interface BlockDefinition {
  id: BlockId;
  name: string;
  description: string;
  category: BlockCategory;
  priceARS: number;          // Precio mensual en ARS (0 = gratis)
  agencyPriceARS: number;    // Precio para agencias (~30% menos)
  hasPublicView: boolean;    // ¿Tiene vista pública en la web del negocio?
  hasAdminView: boolean;     // ¿Tiene panel en el dashboard?
  dependencies: BlockId[];   // Bloques que deben estar activos primero
  icon: string;              // Nombre del ícono de lucide-react
  available: boolean;        // false = "próximamente", no se puede activar
}

// ─── Registro de un bloque activo en la DB (tabla tenant_blocks) ──────────────
export interface TenantBlock {
  id: number;
  negocio_id: number;
  block_id: BlockId;
  active: boolean;
  activated_at: string;
  config: Record<string, unknown>;
  price_override: number | null;
}

// ─── Estado de bloques de un negocio (lo que usa el UI) ──────────────────────
// Combina la definición del registry con el estado en la DB
export interface BlockStatus {
  definition: BlockDefinition;
  isActive: boolean;
  activatedAt: string | null;
  config: Record<string, unknown>;
  // Precio efectivo: price_override si existe, sino el del registry
  effectivePriceARS: number;
}

// ─── Resumen de facturación de bloques activos ────────────────────────────────
export interface BlocksBillingSummary {
  blocks: BlockStatus[];
  totalARS: number;
  isAgency: boolean; // Si true, usa precios de agencia
}