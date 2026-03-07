/**
 * components/LandingModular.tsx
 *
 * Server Component — Fase 1.
 *
 * Lee los bloques activos del tenant desde `tenant_blocks`,
 * los ordena por `id` (orden de activación) y renderiza el
 * SectionComponent de cada bloque según BLOCKS_REGISTRY.
 *
 * Nomenclatura real del proyecto:
 *   - BLOCKS_REGISTRY  (no BLOCK_REGISTRY)
 *   - block_id         (no block_key)
 *   - active           (no activo)
 */

import { createClient } from "@/lib/supabase-server";
import { BLOCKS_REGISTRY } from "@/blocks/_registry";
import type { TenantBlock } from "@/types/blocks";

interface LandingModularProps {
  negocio: any; // mismo tipo que recibe LandingCliente
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getActiveBlocks(negocioId: number): Promise<TenantBlock[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tenant_blocks")
    .select("id, negocio_id, block_id, active, activated_at, config, price_override")
    .eq("negocio_id", negocioId)
    .eq("active", true)
    .order("id", { ascending: true }); // orden de activación

  if (error) {
    console.error("[LandingModular] Error cargando bloques:", error.message);
    return [];
  }

  return data ?? [];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default async function LandingModular({ negocio }: LandingModularProps) {
  const blocks = await getActiveBlocks(negocio.id);

  if (blocks.length === 0) {
    return <EmptyLanding negocio={negocio} />;
  }

  return (
    <main className="flex flex-col w-full min-h-screen">
      {blocks.map((block) => {
        const entry = BLOCKS_REGISTRY[block.block_id];

        // Bloque no registrado o sin vista pública → omitir silenciosamente
        if (!entry?.SectionComponent) return null;

        const SectionComponent = entry.SectionComponent;

        return (
          <section
            key={block.id}
            id={`section-${block.block_id}`}
            data-block={block.block_id}
          >
            <SectionComponent
              negocio={negocio}
              config={block.config ?? {}}
            />
          </section>
        );
      })}
    </main>
  );
}

// ─── Fallback ─────────────────────────────────────────────────────────────────

function EmptyLanding({ negocio }: { negocio: any }) {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-4 p-8 text-center">
      <h1 className="text-3xl font-bold tracking-tight">{negocio.nombre}</h1>
      {negocio.descripcion && (
        <p className="text-muted-foreground max-w-md">{negocio.descripcion}</p>
      )}
      <p className="text-sm text-muted-foreground mt-8">
        Estamos configurando nuestro sitio · Próximamente
      </p>
    </main>
  );
}