import { User } from "lucide-react";
import { TestimonialsSection } from "@/types/web-config";

export function Testimonials({ data, primaryColor }: { data: TestimonialsSection, primaryColor: string }) {
  if (!data.mostrar) return null;

  return (
    <section className="py-20 bg-zinc-50 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-10 text-zinc-900">
          {data.titulo}
        </h2>
        
        {/* Truco CSS para ocultar la barra de scroll y que parezca una app nativa */}
        <style>{`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {/* CONTENEDOR: Carrusel horizontal en celular / Grilla en PC */}
        <div 
          className="hide-scrollbar flex md:grid md:grid-cols-3 gap-6 overflow-x-auto snap-x snap-mandatory pb-8 md:pb-0 md:overflow-visible"
          style={{ scrollbarWidth: 'none' }} 
        >
          {data.items.map((item, i) => (
            <div 
              key={i} 
              // En celular forzamos que ocupen el 85% de la pantalla (w-[85vw]), en PC toman su tamaño automático (md:w-auto)
              className="w-[85vw] sm:w-[350px] md:w-auto shrink-0 snap-center bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-zinc-100 flex flex-col"
            >
              <div className="flex items-center gap-4 mb-4">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm" 
                  style={{ backgroundColor: primaryColor }}
                >
                  <User size={20} />
                </div>
                <div className="overflow-hidden">
                  <p className="font-bold text-sm text-zinc-900 truncate">{item.nombre}</p>
                  {item.cargo && <p className="text-xs text-zinc-500 truncate">{item.cargo}</p>}
                </div>
              </div>
              <p className="text-zinc-600 text-sm italic whitespace-normal">"{item.comentario}"</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}