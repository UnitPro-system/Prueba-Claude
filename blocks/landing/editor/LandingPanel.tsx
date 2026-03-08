"use client";
// blocks/landing/editor/LandingPanel.tsx
// Paneles: Identidad + Apariencia + Portada (Hero)
// Siempre visibles — landing está siempre activo.

import { ImageUpload } from "@/components/ui/ImageUpload";
import type { BlockEditorProps } from "@/types/blocks";

const PRIMARY = "#577a2c";

// ─── Helpers UI ───────────────────────────────────────────────────────────────
function SectionHeader({ title, color = "zinc" }: { title: string; color?: string }) {
  const dot: Record<string, string> = {
    zinc: "bg-zinc-400", indigo: "bg-indigo-500", emerald: "bg-emerald-500",
    purple: "bg-purple-500", orange: "bg-orange-500",
  };
  return (
    <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 mb-4">
      <span className={`w-2 h-2 rounded-full shrink-0 ${dot[color] ?? dot.zinc}`} />
      <h3 className="font-bold text-zinc-800 text-xs uppercase tracking-wide">{title}</h3>
    </div>
  );
}
function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1">{children}</label>;
}
function Input({ value, onChange, placeholder, type = "text" }: any) {
  return (
    <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#577a2c]/30 outline-none" />
  );
}
function Textarea({ value, onChange, rows = 3, placeholder }: any) {
  return (
    <textarea rows={rows} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#577a2c]/30 outline-none resize-none" />
  );
}
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${value ? "bg-[#577a2c]" : "bg-zinc-300"}`}>
      <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${value ? "translate-x-5" : "translate-x-1"}`} />
    </button>
  );
}
function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between p-2 border border-zinc-200 rounded-lg bg-zinc-50">
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-zinc-400 font-mono uppercase">{value}</span>
        <input type="color" value={value || "#000000"} onChange={e => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border-none bg-transparent" />
      </div>
    </div>
  );
}

// ─── Panel principal ──────────────────────────────────────────────────────────
export default function LandingPanel({ config, updateConfig, updateConfigRoot }: BlockEditorProps) {
  const hero       = config.hero       || {};
  const colors     = config.colors     || {};
  const appearance = config.appearance || {};

  return (
    <div className="space-y-8">

      {/* ── Identidad ──────────────────────────────────────────────────── */}
      <section className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
        <SectionHeader title="Identidad" color="orange" />
        <ImageUpload
          label="Logo"
          value={config.logoUrl}
          onChange={url => updateConfigRoot("logoUrl", url)}
        />
      </section>

      {/* ── Apariencia ─────────────────────────────────────────────────── */}
      <section className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-4">
        <SectionHeader title="Apariencia" color="purple" />

        <div className="space-y-2">
          <Label>Paleta de colores</Label>
          <ColorRow label="Principal" value={colors.primary || "#000000"}
            onChange={v => updateConfig("colors", "primary", v)} />
          <ColorRow label="Fondo / Secundario" value={colors.secondary || "#f3f4f6"}
            onChange={v => updateConfig("colors", "secondary", v)} />
          <ColorRow label="Texto" value={colors.text || "#1f2937"}
            onChange={v => updateConfig("colors", "text", v)} />
        </div>

        <div>
          <Label>Tipografía</Label>
          <select value={appearance.font || "sans"} onChange={e => updateConfig("appearance", "font", e.target.value)}
            className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white outline-none">
            <option value="sans">Moderna (Sans)</option>
            <option value="serif">Elegante (Serif)</option>
            <option value="mono">Técnica (Mono)</option>
          </select>
        </div>

        <div>
          <Label>Bordes</Label>
          <div className="flex gap-2">
            {[["none","Recto"],["medium","Redondeado"],["full","Circular"]].map(([val, label]) => (
              <button key={val} onClick={() => updateConfig("appearance", "radius", val)}
                className={`flex-1 py-2 text-xs border rounded-lg transition-all font-medium ${appearance.radius === val ? "border-[#577a2c] bg-[#577a2c]/5 text-[#577a2c] font-bold" : "bg-white text-zinc-500"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Portada (Hero) ─────────────────────────────────────────────── */}
      <section className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <h3 className="font-bold text-zinc-800 text-xs uppercase tracking-wide">Portada</h3>
          </div>
          <Toggle value={!!hero.mostrar} onChange={v => updateConfig("hero", "mostrar", v)} />
        </div>

        {hero.mostrar !== false && (
          <div className="space-y-4 animate-in fade-in">
            {/* Layout */}
            <div>
              <Label>Diseño</Label>
              <div className="flex gap-2">
                {[["split","Dividido"],["full","Cinemático"]].map(([val, label]) => (
                  <button key={val} onClick={() => updateConfig("hero", "layout", val)}
                    className={`flex-1 py-2 text-xs border rounded-lg transition-all font-medium ${(hero.layout || "split") === val ? "border-[#577a2c] bg-[#577a2c]/5 text-[#577a2c] font-bold" : "bg-white text-zinc-500"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {hero.layout === "full" && (
              <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Efecto Parallax</Label>
                  <Toggle value={!!hero.parallax} onChange={v => updateConfig("hero", "parallax", v)} />
                </div>
                <div>
                  <Label>Oscuridad de overlay ({hero.overlayOpacity ?? 50}%)</Label>
                  <input type="range" min="0" max="90" value={hero.overlayOpacity ?? 50}
                    onChange={e => updateConfig("hero", "overlayOpacity", Number(e.target.value))}
                    className="w-full accent-[#577a2c]" />
                </div>
              </div>
            )}

            <div>
              <Label>Título principal</Label>
              <Input value={hero.titulo} onChange={(v: string) => updateConfig("hero", "titulo", v)}
                placeholder="Tu nombre o negocio" />
            </div>
            <div>
              <Label>Descripción breve</Label>
              <Textarea value={hero.subtitulo} onChange={(v: string) => updateConfig("hero", "subtitulo", v)}
                placeholder="Una frase que describa lo que hacés" />
            </div>
            <div>
              <Label>Texto del botón CTA</Label>
              <Input value={hero.ctaTexto} onChange={(v: string) => updateConfig("hero", "ctaTexto", v)}
                placeholder="Reservar Turno" />
            </div>
            <ImageUpload
              label="Imagen de fondo"
              value={hero.imagenUrl}
              onChange={url => updateConfig("hero", "imagenUrl", url)}
            />
          </div>
        )}
      </section>
    </div>
  );
}