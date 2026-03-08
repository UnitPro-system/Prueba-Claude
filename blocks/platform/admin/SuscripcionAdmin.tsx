"use client";
// blocks/platform/admin/SuscripcionAdmin.tsx
import type { BlockAdminProps } from "@/types/blocks";

export default function SuscripcionAdmin({ negocio }: BlockAdminProps) {
  return (
    <div className="animate-in fade-in space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Suscripción</h1>
        <p className="text-zinc-500 text-sm">Gestión de plan y facturación.</p>
      </header>
      <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-zinc-200">
        <p className="text-zinc-400 text-sm">Panel de Suscripción — próximamente.</p>
      </div>
    </div>
  );
}