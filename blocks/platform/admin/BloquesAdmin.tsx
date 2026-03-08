"use client";
// blocks/platform/admin/BloquesAdmin.tsx
import BlockMarketplace    from "@/components/dashboards/BlockMarketplace";
import SectionOrderManager from "@/components/dashboards/SectionOrderManager";
import type { BlockAdminProps } from "@/types/blocks";

export default function BloquesAdmin({ negocio }: BlockAdminProps) {
  return (
    <div className="animate-in fade-in space-y-8">
      <BlockMarketplace negocioId={negocio.id} isAgency={false} />
      <div className="border-t border-zinc-100 pt-8">
        <SectionOrderManager negocioId={negocio.id} />
      </div>
    </div>
  );
}