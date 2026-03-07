// lib/blocks.ts
// Funciones para interactuar con tenant_blocks en Supabase.
// Usa el cliente server (con cookies) para respetar RLS.

import { createClient } from '@/lib/supabase-server';
import { createClient as createBrowserClient } from '@/lib/supabase';
import {
  BLOCKS_REGISTRY,
  getBlockPrice,
  checkDependencies,
} from '@/blocks/_registry';
import type { BlockId, BlockStatus, BlocksBillingSummary, TenantBlock } from '@/types/blocks';

// ─── LECTURA ──────────────────────────────────────────────────────────────────

/**
 * Obtener todos los bloques de un negocio con su estado.
 * Combina la DB con el registry para devolver un estado completo.
 * Usar en Server Components y Server Actions.
 */
export async function getBlocksStatus(
  negocioId: number,
  isAgency = false
): Promise<BlockStatus[]> {
  const supabase = await createClient();

  const { data: tenantBlocks } = await supabase
    .from('tenant_blocks')
    .select('*')
    .eq('negocio_id', negocioId);

  // Mapeamos cada bloque del registry contra lo que hay en la DB
  return Object.values(BLOCKS_REGISTRY).map((definition) => {
    const dbBlock = tenantBlocks?.find(
      (b: TenantBlock) => b.block_id === definition.id
    );

    const effectivePriceARS =
      dbBlock?.price_override !== null && dbBlock?.price_override !== undefined
        ? dbBlock.price_override
        : getBlockPrice(definition.id, isAgency);

    return {
      definition,
      isActive: dbBlock?.active ?? false,
      activatedAt: dbBlock?.activated_at ?? null,
      config: dbBlock?.config ?? {},
      effectivePriceARS,
    };
  });
}

/**
 * Obtener solo los IDs de los bloques activos de un negocio.
 * Versión liviana para chequeos rápidos (middleware, guards, etc).
 */
export async function getActiveBlockIds(negocioId: number): Promise<BlockId[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('tenant_blocks')
    .select('block_id')
    .eq('negocio_id', negocioId)
    .eq('active', true);

  return (data ?? []).map((b: { block_id: string }) => b.block_id as BlockId);
}

/**
 * Verificar si un negocio tiene un bloque específico activo.
 * Útil para proteger rutas o mostrar/ocultar secciones.
 */
export async function hasActiveBlock(
  negocioId: number,
  blockId: BlockId
): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('tenant_blocks')
    .select('active')
    .eq('negocio_id', negocioId)
    .eq('block_id', blockId)
    .single();

  return data?.active ?? false;
}

/**
 * Resumen de facturación: bloques activos + total mensual.
 */
export async function getBlocksBillingSummary(
  negocioId: number,
  isAgency = false
): Promise<BlocksBillingSummary> {
  const blocks = await getBlocksStatus(negocioId, isAgency);
  const activeBlocks = blocks.filter((b) => b.isActive);
  const totalARS = activeBlocks.reduce((sum, b) => sum + b.effectivePriceARS, 0);

  return { blocks, totalARS, isAgency };
}

// ─── ESCRITURA (browser client — se usa desde Client Components) ──────────────

/**
 * Activar un bloque para un negocio.
 * Verifica dependencias antes de activar.
 * Retorna error si faltan dependencias.
 */
export async function activateBlock(
  negocioId: number,
  blockId: BlockId
): Promise<{ success: boolean; error?: string; missingDeps?: BlockId[] }> {
  const supabase = createBrowserClient();

  // 1. Verificar dependencias
  const { data: activeData } = await supabase
    .from('tenant_blocks')
    .select('block_id')
    .eq('negocio_id', negocioId)
    .eq('active', true);

  const activeIds = (activeData ?? []).map((b: { block_id: string }) => b.block_id as BlockId);
  const { satisfied, missing } = checkDependencies(blockId, activeIds);

  if (!satisfied) {
    const missingNames = missing.map((id) => BLOCKS_REGISTRY[id].name).join(', ');
    return {
      success: false,
      error: `Primero tenés que activar: ${missingNames}`,
      missingDeps: missing,
    };
  }

  // 2. Upsert en tenant_blocks
  const { error } = await supabase
    .from('tenant_blocks')
    .upsert(
      {
        negocio_id: negocioId,
        block_id: blockId,
        active: true,
        activated_at: new Date().toISOString(),
      },
      { onConflict: 'negocio_id,block_id' }
    );

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Desactivar un bloque para un negocio.
 * Verifica que ningún bloque activo dependa de este antes de desactivarlo.
 */
export async function deactivateBlock(
  negocioId: number,
  blockId: BlockId
): Promise<{ success: boolean; error?: string; dependents?: BlockId[] }> {
  const supabase = createBrowserClient();

  // 1. Verificar que ningún bloque activo depende de este
  const { data: activeData } = await supabase
    .from('tenant_blocks')
    .select('block_id')
    .eq('negocio_id', negocioId)
    .eq('active', true);

  const activeIds = (activeData ?? []).map((b: { block_id: string }) => b.block_id as BlockId);

  const dependents = activeIds.filter((id) => {
    return BLOCKS_REGISTRY[id].dependencies.includes(blockId);
  });

  if (dependents.length > 0) {
    const depNames = dependents.map((id) => BLOCKS_REGISTRY[id].name).join(', ');
    return {
      success: false,
      error: `No podés desactivar este bloque porque lo requieren: ${depNames}`,
      dependents,
    };
  }

  // 2. Desactivar (no borramos, mantenemos el registro histórico)
  const { error } = await supabase
    .from('tenant_blocks')
    .update({ active: false })
    .eq('negocio_id', negocioId)
    .eq('block_id', blockId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Actualizar la configuración de un bloque específico.
 * Útil para guardar settings del bloque (ej: config del calendario).
 */
export async function updateBlockConfig(
  negocioId: number,
  blockId: BlockId,
  config: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createBrowserClient();

  const { error } = await supabase
    .from('tenant_blocks')
    .update({ config })
    .eq('negocio_id', negocioId)
    .eq('block_id', blockId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}