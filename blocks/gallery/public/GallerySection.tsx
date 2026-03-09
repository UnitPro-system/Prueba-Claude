"use client";
// blocks/gallery/public/GallerySection.tsx

import { useState, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import type { BlockSectionProps } from "@/types/blocks";

export default function GallerySection({ negocio, config: blockConfig }: BlockSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const raw = negocio?.config_web || {};

  // Fuente 1: tenant_blocks.config.gallery (nuevo)
  const galleryImages: string[] = (blockConfig?.images as string[]) || [];

  // Fuente 2: legacy customSections
  const legacySection = (raw.customSections || []).find((s: any) => s.type === "gallery");
  const legacyImages: string[] = (legacySection?.imagenes || [])
    .map((img: any) => (typeof img === "string" ? img : img?.url))
    .filter(Boolean);

  // Unificadas, sin duplicados, nuevas primero
  const imagenes: string[] = [
    ...galleryImages,
    ...legacyImages.filter((url: string) => !galleryImages.includes(url)),
  ];

  const titulo    = (blockConfig?.titulo    as string) ?? legacySection?.titulo ?? "Nuestros Trabajos";
  // FIX #13: color del título configurable
  // Color del título: usa el color de texto global de config_web.colors.text
  const textColor = (raw.colors?.text as string) ?? "#18181b";

  const appearance = raw.appearance || {};
  const cardRadius = { none: "rounded-none", medium: "rounded-2xl", full: "rounded-[2.5rem]" }[
    appearance.radius as string
  ] ?? "rounded-2xl";

  if (imagenes.length === 0) return null;

  const scrollBy = (dir: number) => scrollRef.current?.scrollBy({ left: dir * 340, behavior: "smooth" });

  return (
    <>
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold mb-12 text-center" style={{ color: textColor }}>
          {titulo}
        </h2>

        <div className="relative">
          {imagenes.length > 3 && (
            <button onClick={() => scrollBy(-1)}
              className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 z-20 bg-white p-3 rounded-full shadow-lg border border-zinc-100 text-zinc-600 hover:text-zinc-900 hover:scale-110 transition-all">
              <ChevronLeft size={24} />
            </button>
          )}

          <div ref={scrollRef}
            className={`flex gap-4 overflow-x-auto pb-8 px-2 snap-x snap-mandatory ${imagenes.length > 3 ? "cursor-grab active:cursor-grabbing" : "justify-center"}`}
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {imagenes.map((url: string, i: number) => (
              <div key={url + i}
                onClick={() => setSelectedImage(url)}
                className={`snap-center shrink-0 w-[70vw] md:w-[250px] lg:w-[300px] group relative aspect-square overflow-hidden bg-zinc-100 cursor-zoom-in ${cardRadius}`}>
                <img src={url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 className="text-white drop-shadow-md" size={24} />
                </div>
              </div>
            ))}
          </div>

          {imagenes.length > 3 && (
            <button onClick={() => scrollBy(1)}
              className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 z-20 bg-white p-3 rounded-full shadow-lg border border-zinc-100 text-zinc-600 hover:text-zinc-900 hover:scale-110 transition-all">
              <ChevronRight size={24} />
            </button>
          )}
        </div>
      </section>

      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setSelectedImage(null)}>
          <button onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-3 bg-white/10 text-white hover:bg-white/20 rounded-full transition-colors z-50">
            <X size={24} />
          </button>
          <img src={selectedImage}
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={e => e.stopPropagation()} alt="Vista completa" />
        </div>
      )}
    </>
  );
}