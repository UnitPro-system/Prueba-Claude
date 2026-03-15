"use client";
// blocks/shop/editor/ShopPanel.tsx

import type { BlockEditorProps } from '@/types/blocks';

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1">
      {children}
    </label>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        value ? 'bg-[#577a2c]' : 'bg-zinc-300'
      }`}
      aria-label={value ? 'Desactivar' : 'Activar'}
    >
      <span
        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
          value ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function ShopPanel({ config, updateConfig, editorMode }: BlockEditorProps) {
  const mode = editorMode ?? 'easy';
  const shop = (config.shop as any) || {};

  return (
    <div className="space-y-6">
      {/* ── Sección siempre visible ─────────────────────────────── */}
      <section className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <h3 className="font-bold text-zinc-800 text-xs uppercase tracking-wide">Tienda</h3>
        </div>

        <div className="flex items-center justify-between">
          <Label>Mostrar sección</Label>
          <Toggle
            value={shop.mostrar !== false}
            onChange={v => updateConfig('shop', 'mostrar', v)}
          />
        </div>

        <div>
          <Label>Título de sección</Label>
          <input
            type="text"
            value={shop.titulo || 'Tienda'}
            onChange={e => updateConfig('shop', 'titulo', e.target.value)}
            className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#577a2c]/30 outline-none"
          />
        </div>

        <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
          <p className="text-xs text-zinc-500">
            Administra tus productos desde el <strong>Dashboard &rarr; Tienda</strong>.
          </p>
        </div>
      </section>

      {/* ── Sección PRO ─────────────────────────────────────────── */}
      {mode === 'pro' && (
        <section className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <h3 className="font-bold text-zinc-800 text-xs uppercase tracking-wide">
              Configuracion avanzada
            </h3>
          </div>

          {/* Columnas de la grilla */}
          <div>
            <Label>Columnas en grilla</Label>
            <div className="flex gap-2">
              {([['2', '2 cols'], ['3', '3 cols'], ['4', '4 cols']] as [string, string][]).map(
                ([val, lbl]) => (
                  <button
                    key={val}
                    onClick={() => updateConfig('shop', 'columns', val)}
                    className={`flex-1 py-2 text-xs border rounded-lg font-medium transition-all ${
                      (shop.columns || '3') === val
                        ? 'border-[#577a2c] bg-[#577a2c]/5 text-[#577a2c] font-bold'
                        : 'bg-white text-zinc-500 border-zinc-200'
                    }`}
                  >
                    {lbl}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Mostrar filtros */}
          <div className="flex items-center justify-between">
            <Label>Mostrar filtros</Label>
            <Toggle
              value={shop.showFilters !== false}
              onChange={v => updateConfig('shop', 'showFilters', v)}
            />
          </div>

          {/* Texto del boton CTA */}
          <div>
            <Label>Texto del boton</Label>
            <input
              type="text"
              value={shop.ctaText || 'Agregar'}
              onChange={e => updateConfig('shop', 'ctaText', e.target.value)}
              className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#577a2c]/30 outline-none"
            />
          </div>
        </section>
      )}
    </div>
  );
}
