/**
 * blocks/confirm_booking/Section.tsx
 *
 * Sección pública del bloque "Calendario & Turnos" (block_id: 'calendar').
 * Wrappea el ConfirmBookingLanding existente para reutilizar toda su lógica
 * sin duplicar código.
 *
 * Es un Client Component porque ConfirmBookingLanding ya lo es.
 */

"use client";

import ConfirmBookingLanding from "@/components/landings/ConfirmBookingLanding";
import type { BlockSectionProps } from "@/types/blocks";

export default function CalendarSection({ negocio, config }: BlockSectionProps) {
  // ConfirmBookingLanding espera `initialData` con la forma completa del negocio.
  // Pasamos `negocio` directamente — es el mismo objeto que venía de page.tsx.
  return <ConfirmBookingLanding initialData={negocio} />;
}