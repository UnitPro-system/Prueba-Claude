// types/blocks.ts
import { ComponentType, Dispatch, SetStateAction } from 'react';

// ─── Datos compartidos — cargados por ModularDashboard, pasados a cada bloque ─
// Ningún bloque fetcha sus propios datos. Todo viene de acá.
export interface BlockSharedData {
  turnos:              any[];
  resenas:             any[];
  setTurnos:           Dispatch<SetStateAction<any[]>>;
  setResenas:          Dispatch<SetStateAction<any[]>>;
  fetchData:           () => Promise<void>;
  handleConnectGoogle: () => void;
  // Modales que viven en el shell (ModularDashboard) — los bloques los disparan
  openContactModal:    (email: string, name: string) => void;
  openRescheduleModal: (id: string, currentStart: string) => void;
  openConfirmModal:    (id: string, precio: number | string, duracion: number | string) => void;
}

// ─── Props landing pública ─────────────────────────────────────────────────────
export interface BlockSectionProps {
  negocio: any;
  config:  Record<string, unknown>;
}

// ─── Props dashboard (AdminComponent) ────────────────────────────────────────
export interface BlockAdminProps {
  negocio:    any;
  config:     Record<string, unknown>; // tenant_blocks.config (o {} si alwaysActive)
  sharedData: BlockSharedData;
}

// ─── IDs ──────────────────────────────────────────────────────────────────────
export type BlockId =
  | 'resumen' | 'solicitudes' | 'suscripcion' | 'configuracion' | 'bloques'  // platform
  | 'landing'                                                                   // core
  | 'calendar' | 'crm' | 'gallery' | 'reviews'                                // funcionales
  | 'analytics' | 'marketing' | 'payments' | 'chat'                           // funcionales
  | 'shop' | 'academy';                                                         // futuro

export type BlockCategory = 'platform' | 'core' | 'services' | 'commerce' | 'marketing' | 'future';

// ─── Definición de un bloque en el registry ──────────────────────────────────
export interface BlockDefinition {
  id:              BlockId;
  name:            string;
  description:     string;
  category:        BlockCategory;
  priceARS:        number;
  agencyPriceARS:  number;
  dependencies:    BlockId[];
  icon:            string;    // nombre del ícono en lucide-react
  available:       boolean;

  // true → siempre en sidebar, sin fila en tenant_blocks
  alwaysActive?:   boolean;

  // Posición en sidebar. Sin adminOrder = no aparece como tab de dashboard
  adminOrder?:     number;

  // Visibilidad condicional en sidebar (ej: solicitudes solo si hay seña/manual)
  sidebarVisible?: (shared: BlockSharedData, negocio: any) => boolean;

  // Badge dinámico en sidebar
  sidebarBadge?:   (shared: BlockSharedData, negocio: any) => string | number | undefined;

  // Componente landing pública
  SectionComponent?: ComponentType<BlockSectionProps>;

  // Componente tab de dashboard
  AdminComponent?:   ComponentType<BlockAdminProps>;
}

// ─── Fila en tenant_blocks ────────────────────────────────────────────────────
export interface TenantBlock {
  id: number; negocio_id: number; block_id: BlockId;
  active: boolean; activated_at: string;
  config: Record<string, unknown>; price_override: number | null;
}

export interface BlockStatus {
  definition: BlockDefinition; isActive: boolean;
  activatedAt: string | null; config: Record<string, unknown>;
  effectivePriceARS: number;
}

export interface BlocksBillingSummary {
  blocks: BlockStatus[]; totalARS: number; isAgency: boolean;
}