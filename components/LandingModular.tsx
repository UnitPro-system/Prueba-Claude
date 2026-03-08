// components/LandingModular.tsx
// Server Component — lee bloques activos, respeta el orden configurado
// y aplica el color de fondo del negocio.

import { createClient } from "@/lib/supabase-server";
import { BLOCKS_REGISTRY } from "@/blocks/_registry";
import type { BlockId } from "@/types/blocks";

interface LandingModularProps {
  negocio: any;
}

export default async function LandingModular({ negocio }: LandingModularProps) {
  const supabase = await createClient();

  // 1. Traer todos los bloques activos
  const { data: tenantBlocks } = await supabase
    .from("tenant_blocks")
    .select("block_id, active, config")
    .eq("negocio_id", negocio.id)
    .eq("active", true);

  const activeBlocks = tenantBlocks ?? [];

  if (activeBlocks.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-zinc-400 text-sm">Este negocio aún no tiene bloques activos.</p>
      </div>
    );
  }

  // 2. Leer orden desde config del bloque 'landing'
  const landingBlock = activeBlocks.find(b => b.block_id === "landing");
  const savedOrder: BlockId[] = (landingBlock?.config?.sectionOrder as BlockId[]) ?? [];

  // 3. Construir orden final:
  //    - 'landing' siempre primero (hard-coded)
  //    - luego los bloques en el orden guardado
  //    - luego cualquier bloque activo que no esté en el orden guardado (por si se activó después)
  const activeIds = activeBlocks.map(b => b.block_id as BlockId);

  const ordered: BlockId[] = [
    "landing",
    ...savedOrder.filter(id => id !== "landing" && activeIds.includes(id)),
    ...activeIds.filter(id => id !== "landing" && !savedOrder.includes(id)),
  ];

  // 4. Color de fondo del negocio (igual que ConfirmBookingLanding)
  const raw = negocio?.config_web || {};
  const bgColor = raw.colors?.secondary || "#ffffff";
  const textColor = raw.colors?.text || "#1f2937";

  // 5. Renderizar
  return (
    <div style={{ backgroundColor: bgColor, color: textColor, minHeight: "100vh" }}>
      {ordered.map(blockId => {
        const definition = BLOCKS_REGISTRY[blockId];
        if (!definition?.SectionComponent) return null;

        const dbBlock = activeBlocks.find(b => b.block_id === blockId);
        const Section = definition.SectionComponent;

        return (
          <Section
            key={blockId}
            negocio={negocio}
            config={dbBlock?.config ?? {}}
          />
        );
      })}
    </div>
  );
}