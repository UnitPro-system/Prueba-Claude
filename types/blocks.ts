// types/blocks.ts
// Tipos del sistema de bloques modular de UnitPro

import type { ComponentType } from "react"; // 🆕 Fase 1

// ─── IDs de bloques válidos ───────────────────────────────────────────────────
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

// 🆕 Fase 1 — Props estándar que recibe cada SectionComponent en la landing pública
export interface BlockSectionProps<
  TConfig extends Record<string, unknown> = Record<string, unknown>
> {
  negocio: any; // usa tu tipo Negocio real si lo tenés centralizado
  config: TConfig;
}

// ─── Definición de un bloque en el registry ──────────────────────────────────
export interface BlockDefinition {
  id: BlockId;
  name: string;
  description: string;
  category: BlockCategory;
  priceARS: number;
  agencyPriceARS: number;
  hasPublicView: boolean;
  hasAdminView: boolean;
  dependencies: BlockId[];
  icon: string;
  available: boolean;

  /**
   * 🆕 Fase 1 — Componente que se renderiza en la landing pública (LandingModular).
   * Opcional: si no está definido, el bloque se ignora en la landing aunque esté activo.
   * Puede ser un Server Component o un Client Component.
   */
  SectionComponent?: ComponentType<BlockSectionProps<any>>;
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
export interface BlockStatus {
  definition: BlockDefinition;
  isActive: boolean;
  activatedAt: string | null;
  config: Record<string, unknown>;
  effectivePriceARS: number;
}

// ─── Resumen de facturación de bloques activos ────────────────────────────────
export interface BlocksBillingSummary {
  blocks: BlockStatus[];
  totalARS: number;
  isAgency: boolean;
}