"use client";
// blocks/academy/editor/AcademyPanel.tsx

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

export default function AcademyPanel({ config, updateConfig, editorMode }: BlockEditorProps) {
  const mode = editorMode ?? 'easy';
  const academy = (config.academy as any) || {};

  return (
    <div className="space-y-6">
      {/* ── Sección siempre visible ─────────────────────────────── */}
      <section className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <h3 className="font-bold text-zinc-800 text-xs uppercase tracking-wide">Academia</h3>
        </div>

        <div className="flex items-center justify-between">
          <Label>Mostrar sección</Label>
          <Toggle
            value={academy.mostrar !== false}
            onChange={v => updateConfig('academy', 'mostrar', v)}
          />
        </div>

        <div>
          <Label>Título de sección</Label>
          <input
            type="text"
            value={academy.titulo || 'Academia'}
            onChange={e => updateConfig('academy', 'titulo', e.target.value)}
            className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#577a2c]/30 outline-none"
          />
        </div>

        <div>
          <Label>Subtítulo</Label>
          <input
            type="text"
            value={academy.subtitulo || 'Aprendé a tu ritmo'}
            onChange={e => updateConfig('academy', 'subtitulo', e.target.value)}
            className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#577a2c]/30 outline-none"
          />
        </div>

        <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
          <p className="text-xs text-zinc-500">
            Administra tus cursos desde el <strong>Dashboard &rarr; Academia</strong>.
          </p>
        </div>
      </section>

      {/* ── Sección PRO ─────────────────────────────────────────── */}
      {mode === 'pro' && (
        <section className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <h3 className="font-bold text-zinc-800 text-xs uppercase tracking-wide">
              Configuración avanzada
            </h3>
          </div>

          {/* Layout */}
          <div>
            <Label>Layout</Label>
            <div className="flex gap-2">
              {(['grid', 'lista'] as const).map(val => (
                <button
                  key={val}
                  onClick={() => updateConfig('academy', 'layout', val)}
                  className={`flex-1 py-2 text-xs border rounded-lg font-medium transition-all capitalize ${
                    (academy.layout || 'grid') === val
                      ? 'border-[#577a2c] bg-[#577a2c]/5 text-[#577a2c] font-bold'
                      : 'bg-white text-zinc-500 border-zinc-200'
                  }`}
                >
                  {val === 'grid' ? 'Grid' : 'Lista'}
                </button>
              ))}
            </div>
          </div>

          {/* Columnas — solo visible si layout es grid */}
          {(academy.layout || 'grid') === 'grid' && (
            <div>
              <Label>Columnas</Label>
              <div className="flex gap-2">
                {(['2', '3'] as const).map(val => (
                  <button
                    key={val}
                    onClick={() => updateConfig('academy', 'columns', val)}
                    className={`flex-1 py-2 text-xs border rounded-lg font-medium transition-all ${
                      (academy.columns || '3') === val
                        ? 'border-[#577a2c] bg-[#577a2c]/5 text-[#577a2c] font-bold'
                        : 'bg-white text-zinc-500 border-zinc-200'
                    }`}
                  >
                    {val} cols
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Texto del botón CTA */}
          <div>
            <Label>Texto botón CTA</Label>
            <input
              type="text"
              value={academy.ctaText || 'Inscribirme'}
              onChange={e => updateConfig('academy', 'ctaText', e.target.value)}
              className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#577a2c]/30 outline-none"
            />
          </div>

          {/* Mostrar precio */}
          <div className="flex items-center justify-between">
            <Label>Mostrar precio</Label>
            <Toggle
              value={academy.mostrarPrecio !== false}
              onChange={v => updateConfig('academy', 'mostrarPrecio', v)}
            />
          </div>

          {/* Mostrar duración */}
          <div className="flex items-center justify-between">
            <Label>Mostrar duración</Label>
            <Toggle
              value={academy.mostrarDuracion !== false}
              onChange={v => updateConfig('academy', 'mostrarDuracion', v)}
            />
          </div>
        </section>
      )}
    </div>
  );
}
