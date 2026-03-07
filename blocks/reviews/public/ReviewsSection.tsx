"use client";
// blocks/reviews/public/ReviewsSection.tsx
// Carrusel de reseñas + botón para dejar valoración.

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { Star, Loader2 } from "lucide-react";
import type { BlockSectionProps } from "@/types/blocks";

export default function ReviewsSection({ negocio, config: blockConfig }: BlockSectionProps) {
  const supabase = createClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [reviews, setReviews]                   = useState<any[]>([]);
  const [showFeedback, setShowFeedback]          = useState(false);
  const [rating, setRating]                      = useState(0);
  const [comentario, setComentario]              = useState("");
  const [nombre, setNombre]                      = useState("");
  const [enviando, setEnviando]                  = useState(false);
  const [gracias, setGracias]                    = useState(false);

  // ── Config merge ──────────────────────────────────────────────────────────
  const raw      = negocio?.config_web || {};
  const cfg = {
    titulo:    (blockConfig?.titulo    as string) ?? (raw.testimonios?.titulo   as string) ?? "Lo que dicen nuestros clientes",
    subtitulo: (blockConfig?.subtitulo as string) ?? "La confianza de nuestros clientes es nuestra mejor carta de presentación.",
    colors:    { primary: negocio?.color_principal || "#000000", ...raw.colors },
  };
  const brandColor = cfg.colors.primary as string;

  useEffect(() => {
    supabase
      .from("resenas")
      .select("*")
      .eq("negocio_id", negocio.id)
      .eq("visible", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setReviews(data); });
  }, [negocio.id]);

  const handleSubmit = async () => {
    if (!rating || !nombre) return;
    setEnviando(true);
    await supabase.from("resenas").insert([{
      negocio_id:  negocio.id,
      nombre_cliente: nombre,
      puntuacion:  rating,
      comentario,
      visible:     false, // pendiente de aprobación
    }]);
    setEnviando(false);
    setGracias(true);
    setTimeout(() => { setShowFeedback(false); setGracias(false); setRating(0); setComentario(""); setNombre(""); }, 3000);
  };

  const scrollBy = (dir: number) => scrollRef.current?.scrollBy({ left: dir * 340, behavior: "smooth" });

  return (
    <>
      <section className="py-24 px-6 bg-zinc-50 border-y border-zinc-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 max-w-3xl mx-auto">
            <span className="text-sm font-bold uppercase tracking-wider opacity-60 block mb-2">Testimonios</span>
            <h2 className="text-3xl font-bold mb-4 text-zinc-900">{cfg.titulo}</h2>
            <p className="text-zinc-500 max-w-2xl mx-auto mb-8">{cfg.subtitulo}</p>
            <button
              onClick={() => setShowFeedback(true)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-white shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all text-sm"
              style={{ backgroundColor: brandColor }}
            >
              <Star size={18} className="fill-current" /> Dejar mi valoración
            </button>
          </div>

          {reviews.length > 0 ? (
            <div className="relative">
              {reviews.length > 3 && (
                <button onClick={() => scrollBy(-1)} className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 z-20 bg-white p-3 rounded-full shadow-lg border border-zinc-100 text-zinc-600 hover:scale-110 transition-all">
                  ←
                </button>
              )}
              <div ref={scrollRef}
                className={`flex gap-6 overflow-x-auto pb-8 px-6 snap-x snap-mandatory ${reviews.length > 3 ? "cursor-grab active:cursor-grabbing" : "md:justify-center"}`}
                style={{ scrollbarWidth: "none" }}>
                {reviews.map((r: any) => (
                  <div key={r.id} className="snap-center shrink-0 w-[85vw] md:w-[340px] bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 flex flex-col gap-3">
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={16} className={i < r.puntuacion ? "fill-yellow-400 text-yellow-400" : "text-zinc-200"} />
                      ))}
                    </div>
                    {r.comentario && <p className="text-zinc-700 text-sm leading-relaxed">"{r.comentario}"</p>}
                    <div className="mt-auto flex items-center gap-3 pt-3 border-t border-zinc-50">
                      <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-zinc-400 text-xs uppercase">
                        {r.nombre_cliente?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-900">{r.nombre_cliente}</p>
                        <p className="text-[10px] text-zinc-400 uppercase font-medium">{new Date(r.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {reviews.length > 3 && (
                <button onClick={() => scrollBy(1)} className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 z-20 bg-white p-3 rounded-full shadow-lg border border-zinc-100 text-zinc-600 hover:scale-110 transition-all">
                  →
                </button>
              )}
            </div>
          ) : (
            <div className="text-center text-zinc-400 py-10 italic bg-white rounded-2xl border border-dashed border-zinc-200">
              Aún no hay reseñas visibles. ¡Sé el primero en opinar!
            </div>
          )}
        </div>
      </section>

      {/* Modal de feedback */}
      {showFeedback && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-300">
            {gracias ? (
              <div className="text-center py-8">
                <Star size={40} className="fill-yellow-400 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-zinc-900 mb-2">¡Gracias por tu opinión!</h3>
                <p className="text-zinc-500 text-sm">Tu reseña será revisada y publicada pronto.</p>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-zinc-900 mb-4">Dejá tu valoración</h3>
                {/* Estrellas */}
                <div className="flex gap-2 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button key={i} onClick={() => setRating(i + 1)}>
                      <Star size={28} className={`transition-colors ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-zinc-300 hover:text-yellow-300"}`} />
                    </button>
                  ))}
                </div>
                <input placeholder="Tu nombre" value={nombre} onChange={e => setNombre(e.target.value)}
                  className="w-full p-3 border border-zinc-200 rounded-xl outline-none focus:border-zinc-400 mb-3 text-sm" />
                <textarea placeholder="¿Cómo fue tu experiencia? (opcional)" value={comentario} onChange={e => setComentario(e.target.value)}
                  rows={3} className="w-full p-3 border border-zinc-200 rounded-xl outline-none focus:border-zinc-400 resize-none text-sm" />
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setShowFeedback(false)} className="flex-1 py-2.5 text-zinc-600 font-bold hover:bg-zinc-100 rounded-xl transition-colors text-sm">
                    Cancelar
                  </button>
                  <button onClick={handleSubmit} disabled={!rating || !nombre || enviando}
                    className="flex-1 py-2.5 text-white font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                    style={{ backgroundColor: brandColor }}>
                    {enviando ? <Loader2 size={16} className="animate-spin" /> : "Enviar"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}