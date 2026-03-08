"use client";
// blocks/gallery/editor/GalleryPanel.tsx
// Panel: Galería de imágenes (subir, ordenar, eliminar)

import { useState } from "react";
import { Trash2, Upload, Loader2, GripVertical } from "lucide-react";
import { createClient } from "@/lib/supabase";
import type { BlockEditorProps } from "@/types/blocks";

const PRIMARY = "#577a2c";

export default function GalleryPanel({ config, updateConfigRoot, negocio }: BlockEditorProps) {
  const supabase = createClient();
  const gallery: string[] = config.gallery?.images || [];

  const [uploading, setUploading] = useState(false);
  const [dragIdx,   setDragIdx]   = useState<number | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    const newUrls: string[] = [];
    for (const file of files) {
      const ext  = file.name.split(".").pop();
      const path = `gallery/${negocio.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("sites").upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from("sites").getPublicUrl(path);
        newUrls.push(data.publicUrl);
      }
    }
    updateConfigRoot("gallery", { ...config.gallery, images: [...gallery, ...newUrls] });
    setUploading(false);
    e.target.value = "";
  };

  const remove = (i: number) => {
    updateConfigRoot("gallery", { ...config.gallery, images: gallery.filter((_, idx) => idx !== i) });
  };

  // Simple drag-and-drop reorder
  const onDragOver = (e: React.DragEvent, target: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === target) return;
    const next = [...gallery];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(target, 0, moved);
    updateConfigRoot("gallery", { ...config.gallery, images: next });
    setDragIdx(target);
  };

  return (
    <div className="space-y-6">
      <section className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <h3 className="font-bold text-zinc-800 text-xs uppercase tracking-wide">
            Galería de imágenes ({gallery.length})
          </h3>
        </div>

        {/* Upload */}
        <label className={`w-full py-4 border-2 border-dashed border-zinc-300 rounded-xl flex flex-col items-center gap-2 cursor-pointer transition-all ${uploading ? "opacity-60" : "hover:border-[#577a2c] hover:bg-[#577a2c]/5"}`}>
          {uploading
            ? <Loader2 size={20} className="text-zinc-400 animate-spin" />
            : <Upload size={20} className="text-zinc-400" />}
          <span className="text-sm text-zinc-500 font-medium">
            {uploading ? "Subiendo..." : "Subir imágenes"}
          </span>
          <span className="text-xs text-zinc-400">PNG, JPG, WEBP — múltiples a la vez</span>
          <input type="file" accept="image/*" multiple className="hidden"
            onChange={handleUpload} disabled={uploading} />
        </label>

        {/* Grid */}
        {gallery.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {gallery.map((url, i) => (
              <div key={url}
                draggable
                onDragStart={() => setDragIdx(i)}
                onDragOver={e => onDragOver(e, i)}
                onDragEnd={() => setDragIdx(null)}
                className={`relative aspect-square rounded-lg overflow-hidden border group cursor-grab active:cursor-grabbing transition-all ${dragIdx === i ? "opacity-50 ring-2 ring-[#577a2c]" : "border-zinc-200 hover:shadow-md"}`}>
                <img src={url} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                  <button onClick={() => remove(i)}
                    className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="absolute top-1 left-1 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical size={14} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-zinc-400 text-sm py-4 italic">Sin imágenes aún.</p>
        )}
        {gallery.length > 0 && (
          <p className="text-[11px] text-zinc-400 text-center">Arrastrá las imágenes para reordenarlas.</p>
        )}
      </section>
    </div>
  );
}