import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import LandingCliente from "./LandingCliente";
import LandingAgencia from "./LandingAgencia";
import LandingModular from "@/components/LandingModular"; // 🆕 Fase 1
import { Metadata, ResolvingMetadata } from "next";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createClient();
  const { slug } = await params;

  const domainOrSlug = decodeURIComponent(slug).toLowerCase();

  // 1. DOMINIO PERSONALIZADO
  if (domainOrSlug.includes(".")) {
    const { data: negocioDominio } = await supabase
      .from("negocios")
      .select("*")
      .eq("custom_domain", domainOrSlug)
      .single();

    if (negocioDominio) {
      // 🆕 Fase 1: bifurcación por system
      if (negocioDominio.system === true) {
        return <LandingModular negocio={negocioDominio} />;
      }
      return <LandingCliente initialData={negocioDominio} />;
    }

    return notFound();
  }

  // 2. SLUG INTERNO — Negocios
  const { data: negocioSlug } = await supabase
    .from("negocios")
    .select("*")
    .eq("slug", domainOrSlug)
    .single();

  if (negocioSlug) {
    // 🆕 Fase 1: bifurcación por system
    if (negocioSlug.system === true) {
      return <LandingModular negocio={negocioSlug} />;
    }
    return <LandingCliente initialData={negocioSlug} />;
  }

  // 3. SLUG INTERNO — Agencias
  const { data: agencia } = await supabase
    .from("agencies")
    .select("*")
    .eq("slug", domainOrSlug)
    .single();

  if (agencia) {
    return <LandingAgencia initialData={agencia} />;
  }

  return notFound();
}

// ─── generateMetadata (sin cambios) ──────────────────────────────────────────

async function getNegocioData(slug: string) {
  const supabase = await createClient();
  const domainOrSlug = decodeURIComponent(slug).toLowerCase();

  if (domainOrSlug.includes(".")) {
    const { data } = await supabase.from("negocios").select("*").eq("custom_domain", domainOrSlug).single();
    return data;
  }

  const { data } = await supabase.from("negocios").select("*").eq("slug", domainOrSlug).single();
  return data;
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;
  const negocio = await getNegocioData(slug);

  const previousImages = (await parent).openGraph?.images || [];

  if (!negocio) return { title: "No encontrado" };

  console.log(`[SEO DEBUG] Slug: ${slug}`);
  console.log(`[SEO DEBUG] Config Web encontrada:`, negocio.config_web);

  const config = negocio.config_web || {};
  const meta = config.metadata || {};

  const siteName = meta.title || negocio.nombre || "Create With UnitPro";
  const favicon = meta.faviconUrl || "/favicon.png";

  console.log(`[SEO DEBUG] Título final usado: ${siteName}`);

  return {
    title: siteName,
    description: meta.description || `Bienvenido a ${siteName}`,
    icons: {
      icon: favicon,
      shortcut: favicon,
    },
    openGraph: {
      title: siteName,
      images: [config.hero?.imagenUrl || "", ...previousImages],
    },
  };
}