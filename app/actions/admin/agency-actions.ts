"use server";
// app/actions/admin/agency-actions.ts
// Acciones admin para gestionar la agencia: email, contraseña, datos, logo.
// Usa service role — solo llamar desde contextos autenticados como agencia.

import { createClient as createAdmin } from "@supabase/supabase-js";

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Cambiar contraseña del cliente (negocio) ──────────────────────────────────
export async function changeClientPassword(
  negocioId: number,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!newPassword || newPassword.length < 6)
    return { success: false, error: "Mínimo 6 caracteres." };

  const { data: negocio, error: fetchErr } = await supabaseAdmin
    .from("negocios").select("user_id").eq("id", negocioId).single();

  if (fetchErr || !negocio?.user_id)
    return { success: false, error: "Usuario no encontrado." };

  const { error } = await supabaseAdmin.auth.admin.updateUserById(
    negocio.user_id, { password: newPassword }
  );
  return error ? { success: false, error: error.message } : { success: true };
}

// ── Cambiar email del cliente (negocio) ───────────────────────────────────────
export async function changeClientEmail(
  negocioId: number,
  newEmail: string
): Promise<{ success: boolean; error?: string }> {
  if (!newEmail || !newEmail.includes("@"))
    return { success: false, error: "Email inválido." };

  const { data: negocio, error: fetchErr } = await supabaseAdmin
    .from("negocios").select("user_id").eq("id", negocioId).single();

  if (fetchErr || !negocio?.user_id)
    return { success: false, error: "Usuario no encontrado." };

  // Actualizar auth
  const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
    negocio.user_id, { email: newEmail }
  );
  if (authErr) return { success: false, error: authErr.message };

  // Actualizar tabla negocios
  await supabaseAdmin.from("negocios").update({ email: newEmail }).eq("id", negocioId);
  return { success: true };
}

// ── Cambiar datos de la agencia (nombre, email) ───────────────────────────────
export async function updateAgencyProfile(
  agencyId: number,
  userId: string,
  data: { nombre?: string; email?: string; logo_url?: string }
): Promise<{ success: boolean; error?: string }> {
  const updates: any = {};
  if (data.nombre)   { updates.name = data.nombre; updates.nombre_agencia = data.nombre; }
  if (data.logo_url) { updates.logo_url = data.logo_url; }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabaseAdmin
      .from("agencies").update(updates).eq("id", agencyId);
    if (error) return { success: false, error: error.message };
  }

  // Si cambia el email, actualizar auth + tabla
  if (data.email) {
    const { error: authErr } = await supabaseAdmin.auth.admin
      .updateUserById(userId, { email: data.email });
    if (authErr) return { success: false, error: authErr.message };
    await supabaseAdmin.from("agencies").update({ email: data.email }).eq("id", agencyId);
  }

  return { success: true };
}

// ── Cambiar contraseña de la agencia ─────────────────────────────────────────
export async function changeAgencyPassword(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!newPassword || newPassword.length < 6)
    return { success: false, error: "Mínimo 6 caracteres." };

  const { error } = await supabaseAdmin.auth.admin
    .updateUserById(userId, { password: newPassword });
  return error ? { success: false, error: error.message } : { success: true };
}

// ── Buscar o crear el negocio-landing de la agencia ───────────────────────────
// Cada agencia tiene opcionalmente un negocio con is_agency_site=true
// que actúa como su propia landing pública.
export async function getOrCreateAgencyLanding(
  agencyId: number,
  agencySlug: string,
  agencyName: string
): Promise<{ success: boolean; negocio?: any; error?: string }> {
  // 1. Buscar si ya existe
  const { data: existing } = await supabaseAdmin
    .from("negocios")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("is_agency_site", true)
    .single();

  if (existing) return { success: true, negocio: existing };

  // 2. Crear uno nuevo (sin user_id — pertenece a la agencia misma)
  const landingSlug = `${agencySlug}-landing-${Date.now()}`;
  const { data: nuevo, error } = await supabaseAdmin
    .from("negocios")
    .insert({
      agency_id:       agencyId,
      nombre:          agencyName,
      slug:            landingSlug,
      system:          "modular",
      is_agency_site:  true,
      estado_plan:     "activo",
      color_principal: "#577a2c",
      config_web:      { hero: { titulo: agencyName, mostrar: true } },
    })
    .select("*")
    .single();

  if (error) return { success: false, error: error.message };

  // Activar bloque landing por defecto
  await supabaseAdmin.from("tenant_blocks").insert({
    negocio_id: nuevo.id, block_id: "landing", active: true,
    activated_at: new Date().toISOString(), config: {},
  });

  return { success: true, negocio: nuevo };
}