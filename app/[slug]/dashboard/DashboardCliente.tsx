"use client";

// app/[slug]/dashboard/DashboardCliente.tsx
// Factory simplificado: solo ConfirmBooking es el tipo activo.
// Los otros tipos (service_booking, project_portfolio) quedan
// como legacy pero no se crean negocios nuevos con ellos.

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

const ConfirmBookingDashboard = dynamic(
  () => import("@/components/dashboards/ConfirmBookingDashboard"),
  { loading: () => <LoadingScreen /> }
);

// Legacy — solo para negocios existentes, no se crean nuevos
const ServiceBookingDashboard = dynamic(
  () => import("@/components/dashboards/ServiceBookingDashboard"),
  { loading: () => <LoadingScreen /> }
);
const ProjectDashboard = dynamic(
  () => import("@/components/dashboards/ProjectDashboard"),
  { loading: () => <LoadingScreen /> }
);

export default function DashboardCliente() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [negocio, setNegocio] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initDashboard() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user?.email) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("negocios")
        .select("*")
        .eq("slug", params.slug)
        .single();

      // Verificar propiedad
      if (!data || data.email !== user.email) {
        router.push("/login");
        return;
      }

      setNegocio(data);
      setLoading(false);
    }

    initDashboard();
  }, [params.slug, router]);

  if (loading) return <LoadingScreen />;
  if (!negocio) return null;

  const category = negocio.category || "confirm_booking";

  // ── Tipo activo ────────────────────────────────────────────────────────────
  if (category === "confirm_booking") {
    return <ConfirmBookingDashboard initialData={negocio} />;
  }

  // ── Legacy (negocios existentes que no migraron) ───────────────────────────
  if (category === "service_booking") {
    return <ServiceBookingDashboard initialData={negocio} />;
  }
  if (category === "project_portfolio") {
    return <ProjectDashboard negocio={negocio} />;
  }

  return (
    <div className="p-10 text-center text-red-500">
      Categoría desconocida: {category}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-zinc-900" size={32} />
        <p className="text-zinc-400 text-sm animate-pulse">Iniciando panel...</p>
      </div>
    </div>
  );
}