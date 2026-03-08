"use client";
// components/editors/ModularEditor.tsx
//
// Editor de página full-screen para negocios system = 'modular'.
// Arquitectura:
//   - Izquierda (60%): iframe preview del slug real. Refresca al guardar.
//   - Derecha (40%): sidebar con pestañas por bloque activo.
//
// El editor NO sabe qué hay dentro de cada panel. Itera BLOCKS_REGISTRY
// y renderiza def.EditorPanel para cada bloque activo que lo tenga.
// landing siempre aparece primero (EditorPanel de identidad + apariencia + portada).
//
// Un único handleSave guarda:
//   · config_web  (negocio.config_web)
//   · columnas DB (direccion, whatsapp, instagram, etc.)

import { useEffect, useState, useCallback } from "react";
import {
  X, Save, Monitor, Smartphone, ExternalLink,
  ChevronLeft, Loader2, Check, Pencil,
} from "lucide-react";
import { createClient }    from "@/lib/supabase";
import { BLOCKS_REGISTRY } from "@/blocks/_registry";
import type { BlockId, BlockEditorProps } from "@/types/blocks";

const PRIMARY      = "#577a2c";
const PRIMARY_DARK = "#486423";
const BG           = "#eee9dd";

// Campos de DB que el editor puede tocar
const DB_FIELDS = ["direccion","horarios","google_maps_link","whatsapp","instagram","facebook","linkedin","website"] as const;

interface ModularEditorProps {
  negocio:  any;      // data completa del negocio
  onClose:  () => void;
  onSaved?: () => void;
}

export default function ModularEditor({ negocio, onClose, onSaved }: ModularEditorProps) {
  const supabase = createClient();

  // ── Estado local del editor ────────────────────────────────────────────────
  const [config, setConfig]       = useState<any>(() => {
    const raw = negocio.config_web;
    if (!raw) return {};
    if (typeof raw === "string") { try { return JSON.parse(raw); } catch { return {}; } }
    return { ...raw };
  });

  const [dbFields, setDbFields] = useState<any>(() =>
    Object.fromEntries(DB_FIELDS.map(f => [f, negocio[f] || ""]))
  );

  const [activeIds,  setActiveIds]  = useState<BlockId[]>([]);
  const [activeTab,  setActiveTab]  = useState<BlockId>("landing");
  const [viewMode,   setViewMode]   = useState<"desktop" | "mobile">("desktop");
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [dirty,      setDirty]      = useState(false);
  const [iframeKey,  setIframeKey]  = useState(0); // fuerza refresh del iframe

  // ── Cargar bloques activos ────────────────────────────────────────────────
  useEffect(() => {
    supabase.from("tenant_blocks").select("block_id")
      .eq("negocio_id", negocio.id).eq("active", true)
      .then(({ data }) => {
        if (data) setActiveIds(data.map((b: any) => b.block_id as BlockId));
      });
  }, [negocio.id]);

  // ── Construir lista de pestañas del editor ────────────────────────────────
  // landing siempre primero, luego bloques activos con EditorPanel, en orden de adminOrder
  const editorTabs = [
    BLOCKS_REGISTRY.landing,
    ...Object.values(BLOCKS_REGISTRY)
      .filter(def =>
        def.id !== "landing" &&
        !!def.EditorPanel &&
        (def.alwaysActive || activeIds.includes(def.id))
      )
      .sort((a, b) => (a.adminOrder ?? 99) - (b.adminOrder ?? 99)),
  ].filter(def => !!def.EditorPanel);

  // ── Helpers para mutar config ─────────────────────────────────────────────
  const markDirty = () => setDirty(true);

  const updateConfig = useCallback((section: string, field: string, value: any) => {
    setConfig((prev: any) => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
    markDirty();
  }, []);

  const updateConfigRoot = useCallback((field: string, value: any) => {
    setConfig((prev: any) => ({ ...prev, [field]: value }));
    markDirty();
  }, []);

  const updateArray = useCallback((section: string, index: number, field: string, value: any) => {
    setConfig((prev: any) => {
      const items = [...(prev[section]?.items || [])];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, [section]: { ...prev[section], items } };
    });
    markDirty();
  }, []);

  const pushToArray = useCallback((section: string, item: any) => {
    setConfig((prev: any) => {
      const items = [...(prev[section]?.items || []), item];
      return { ...prev, [section]: { ...prev[section], items } };
    });
    markDirty();
  }, []);

  const removeFromArray = useCallback((section: string, index: number) => {
    setConfig((prev: any) => {
      const items = (prev[section]?.items || []).filter((_: any, i: number) => i !== index);
      return { ...prev, [section]: { ...prev[section], items } };
    });
    markDirty();
  }, []);

  const updateDb = useCallback((field: string, value: any) => {
    setDbFields((prev: any) => ({ ...prev, [field]: value }));
    markDirty();
  }, []);

  // ── Guardar ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("negocios").update({
      config_web: config,
      ...Object.fromEntries(DB_FIELDS.map(f => [f, dbFields[f] || null])),
    }).eq("id", negocio.id);

    setSaving(false);
    if (error) { alert("Error al guardar: " + error.message); return; }

    setSaved(true);
    setDirty(false);
    setIframeKey(k => k + 1);   // refresca la preview
    setTimeout(() => setSaved(false), 2500);
    onSaved?.();
  };

  // Props que cada EditorPanel recibe
  const editorProps: BlockEditorProps = {
    negocio,
    config,
    dbFields,
    updateConfig,
    updateConfigRoot,
    updateArray,
    pushToArray,
    removeFromArray,
    updateDb,
  };

  const activeTabDef  = BLOCKS_REGISTRY[activeTab];
  const ActivePanel   = activeTabDef?.EditorPanel;
  const previewUrl    = `/${negocio.slug}`;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] flex font-sans text-zinc-900 overflow-hidden bg-zinc-100">

      {/* ──────────────────────────── PREVIEW (izquierda) ─────────────────── */}
      <div className="hidden lg:flex flex-1 flex-col h-full border-r border-zinc-300 relative">
        {/* Barra top de preview */}
        <div className="h-14 bg-white border-b border-zinc-200 flex items-center justify-between px-5 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-2 px-3 py-1 bg-[#577a2c]/10 text-[#577a2c] text-xs font-bold rounded-full border border-[#577a2c]/20">
            <Pencil size={12} /> Editor en vivo
          </div>
          <div className="flex bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
            <button onClick={() => setViewMode("desktop")}
              className={`p-2 rounded-md transition-all ${viewMode === "desktop" ? "bg-white shadow text-[#577a2c]" : "text-zinc-400 hover:text-zinc-600"}`}>
              <Monitor size={16} />
            </button>
            <button onClick={() => setViewMode("mobile")}
              className={`p-2 rounded-md transition-all ${viewMode === "mobile" ? "bg-white shadow text-[#577a2c]" : "text-zinc-400 hover:text-zinc-600"}`}>
              <Smartphone size={16} />
            </button>
          </div>
          <a href={previewUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs font-bold text-zinc-500 hover:text-zinc-800 flex items-center gap-1 transition-colors">
            Ver página <ExternalLink size={12} />
          </a>
        </div>

        {/* iframe */}
        <div className="flex-1 bg-zinc-200 flex items-center justify-center p-6 overflow-hidden">
          <div className={`relative bg-white shadow-2xl border border-zinc-300 overflow-hidden transition-all duration-500 ${
            viewMode === "mobile"
              ? "w-[390px] h-[844px] rounded-[3rem] border-[10px] border-zinc-800 shadow-xl max-h-full"
              : "w-full h-full rounded-xl"
          }`}>
            <iframe
              key={iframeKey}
              src={previewUrl}
              className="w-full h-full"
              style={{ border: "none" }}
              title="Preview"
            />
          </div>
        </div>

        {dirty && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-amber-50 text-amber-700 text-xs font-bold px-4 py-2 rounded-full border border-amber-200 shadow-sm animate-in fade-in">
            Hay cambios sin guardar · Guardá para ver la preview actualizada
          </div>
        )}
      </div>

      {/* ──────────────────────────── SIDEBAR (derecha) ────────────────────── */}
      <div className="w-full lg:w-[440px] bg-white flex flex-col h-full shadow-2xl shrink-0 border-l border-zinc-200">

        {/* Top bar */}
        <div className="h-14 px-4 border-b border-zinc-200 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <button onClick={onClose} title="Cerrar editor"
              className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-zinc-800 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <div>
              <p className="font-bold text-sm leading-tight truncate max-w-[180px]">{negocio.nombre}</p>
              <p className="text-xs text-zinc-400">Editor de página</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a href={`/${negocio.slug}`} target="_blank" rel="noopener noreferrer"
              className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors lg:hidden">
              <ExternalLink size={16} />
            </a>
            <button onClick={handleSave} disabled={saving || !dirty}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                saved    ? "bg-green-50 text-green-700 border border-green-200" :
                !dirty   ? "bg-zinc-100 text-zinc-400 cursor-not-allowed" :
                saving   ? "opacity-60 cursor-wait text-white" : "text-white hover:opacity-90"
              }`}
              style={!saved && dirty ? { backgroundColor: PRIMARY } : {}}>
              {saving ? <Loader2 size={14} className="animate-spin" />
               : saved ? <><Check size={14} /> Guardado</>
               : <><Save size={14} /> Guardar</>}
            </button>
          </div>
        </div>

        {/* Nav pestañas */}
        <div className="border-b border-zinc-100 bg-zinc-50 shrink-0 overflow-x-auto">
          <div className="flex gap-0.5 p-2 min-w-max">
            {editorTabs.map(def => (
              <button key={def.id} onClick={() => setActiveTab(def.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  activeTab === def.id
                    ? "bg-white shadow-sm text-zinc-900 border border-zinc-200"
                    : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"
                }`}>
                {def.editorLabel || def.name}
              </button>
            ))}
          </div>
        </div>

        {/* Panel activo */}
        <div className="flex-1 overflow-y-auto p-5 pb-24">
          {ActivePanel ? (
            <ActivePanel {...editorProps} />
          ) : (
            <div className="p-12 text-center text-zinc-400 text-sm">
              Este bloque no tiene opciones de edición aún.
            </div>
          )}
        </div>

        {/* Footer sticky con save */}
        <div className="absolute bottom-0 left-0 right-0 lg:relative p-4 bg-white border-t border-zinc-100 shrink-0">
          <button onClick={handleSave} disabled={saving || !dirty}
            className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              saved    ? "bg-green-50 text-green-700 border border-green-200" :
              !dirty   ? "bg-zinc-100 text-zinc-400 cursor-not-allowed" :
              "text-white hover:opacity-90"
            }`}
            style={!saved && dirty ? { backgroundColor: PRIMARY } : {}}>
            {saving ? <><Loader2 size={16} className="animate-spin" /> Guardando...</>
             : saved ? <><Check size={16} /> ¡Guardado!</>
             : <><Save size={16} /> Guardar cambios</>}
          </button>
          {dirty && !saving && (
            <p className="text-center text-xs text-zinc-400 mt-2">Tenés cambios sin guardar.</p>
          )}
        </div>
      </div>
    </div>
  );
}