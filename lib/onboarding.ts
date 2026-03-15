// lib/onboarding.ts
// Verticals and block mapping for the onboarding wizard.

import type { BlockId } from '@/types/blocks';

export const VERTICAL_IDS = ['peluqueria', 'clinica', 'gimnasio', 'restaurant', 'spa', 'otro'] as const;
export type VerticalId = typeof VERTICAL_IDS[number];

export const VERTICALS: { id: VerticalId; label: string; icon: string }[] = [
  { id: 'peluqueria', label: 'Peluquería / Barbería', icon: '✂️' },
  { id: 'clinica',    label: 'Clínica / Consultorio', icon: '🏥' },
  { id: 'gimnasio',   label: 'Gimnasio / Pilates',    icon: '💪' },
  { id: 'restaurant', label: 'Restaurant / Café',     icon: '🍽️' },
  { id: 'spa',        label: 'Spa / Estética',         icon: '✨' },
  { id: 'otro',       label: 'Otro',                   icon: '🏢' },
];

// Maps each vertical to suggested block IDs (only available blocks).
export const VERTICAL_BLOCK_MAP: Record<VerticalId, BlockId[]> = {
  peluqueria: ['landing', 'calendar', 'marketing', 'about'],
  clinica:    ['landing', 'calendar', 'crm', 'about'],
  gimnasio:   ['landing', 'calendar', 'marketing', 'about'],
  restaurant: ['landing', 'marketing', 'about', 'gallery'],
  spa:        ['landing', 'calendar', 'marketing', 'about'],
  otro:       ['landing', 'about'],
};
