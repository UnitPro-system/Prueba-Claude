"use server";
// app/actions/admin/change-password.ts
// Cambia la contraseña de un usuario usando el service role de Supabase.
// Solo debe llamarse desde contextos de agencia autenticados.

import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function changeClientPassword(
  negocioId: number,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: "La contraseña debe tener al menos 6 caracteres." };
    }

    // 1. Obtener el user_id del negocio
    const { data: negocio, error: fetchErr } = await supabaseAdmin
      .from("negocios")
      .select("user_id, nombre")
      .eq("id", negocioId)
      .single();

    if (fetchErr || !negocio?.user_id) {
      return { success: false, error: "No se encontró el usuario del negocio." };
    }

    // 2. Cambiar contraseña via Admin API (no requiere la contraseña actual)
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
      negocio.user_id,
      { password: newPassword }
    );

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Error inesperado." };
  }
}