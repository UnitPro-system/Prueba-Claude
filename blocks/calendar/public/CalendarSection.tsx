"use client";
// blocks/calendar/public/CalendarSection.tsx
// Servicios, equipo y modal de reserva completo.
// Toda la lógica de booking vive acá — sin depender del landing legacy.

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import {
  CalendarIcon, Clock, CheckCircle, X, Loader2,
  ChevronLeft, ChevronRight, User, Mail, Phone,
  Tag, Users, Star
} from "lucide-react";
import { checkAvailability } from "@/app/actions/confirm-booking/check-availability";
import { createAppointment } from "@/app/actions/confirm-booking/manage-appointment";
import type { BlockSectionProps } from "@/types/blocks";

export default function CalendarSection({ negocio, config: blockConfig }: BlockSectionProps) {
  const supabase = createClient();

  // ── Config merge: tenant_blocks.config > config_web ──────────────────────
  const raw = negocio?.config_web || {};
  const cfg = {
    colors:    { primary: negocio?.color_principal || "#000000", ...raw.colors, ...(blockConfig?.colors as object) },
    servicios: { mostrar: true, titulo: "Nuestros Servicios", items: [], ...raw.servicios, ...(blockConfig?.servicios as object) },
    equipo:    { mostrar: false, items: [], ...raw.equipo, ...(blockConfig?.equipo as object) },
    appearance:{ font: "sans", radius: "medium", ...(blockConfig?.appearance as object) ?? raw.appearance },
    booking:   { ...raw.booking, ...(blockConfig?.booking as object) },
  };

  const brandColor = cfg.colors.primary as string;
  const textColor  = (raw.colors?.text as string) || "#1f2937";
  const radiusClass = { none: "rounded-none", medium: "rounded-2xl", full: "rounded-[2.5rem]" }[(cfg.appearance as any).radius as string] ?? "rounded-2xl";
  const btnRadius   = { none: "rounded-none", medium: "rounded-xl",   full: "rounded-full"    }[(cfg.appearance as any).radius as string] ?? "rounded-xl";

  // ── Estado booking ────────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [bookingStep, setBookingStep]   = useState(1);
  const [busySlots, setBusySlots]       = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [enviando, setEnviando]         = useState(false);
  const [mostrarGracias, setMostrarGracias] = useState(false);

  const [bookingData, setBookingData] = useState<{
    service: any; date: string; time: string; worker: any;
    clientName: string; clientPhone: string; clientEmail: string;
    message: string; clientAreaCode: string; clientLocalNumber: string;
  }>({
    service: null, date: "", time: "", worker: null,
    clientName: "", clientPhone: "", clientEmail: "",
    message: "", clientAreaCode: "", clientLocalNumber: "",
  });

  // ── Slots disponibles ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!bookingData.date || !bookingData.service) return;
    setLoadingSlots(true);
    checkAvailability(
      negocio.slug,
      bookingData.date,
      bookingData.worker?.id,
    ).then(r => {
      // La acción devuelve { busy: [{start, end}] }
      setBusySlots((r as any).busy || []);
      setLoadingSlots(false);
    });
  }, [bookingData.date, bookingData.service, bookingData.worker]);

  // ── Generar slots de tiempo ───────────────────────────────────────────────
  const generateSlots = () => {
    const schedule = raw.schedule || {};
    const d = new Date(bookingData.date + "T12:00:00");
    const dayKey = String(d.getDay());
    const dayConfig = schedule[dayKey];
    if (!dayConfig?.isOpen || !dayConfig?.ranges?.length) return [];

    const slots: string[] = [];
    const dur = bookingData.service?.duracion || bookingData.service?.duration || 60;

    dayConfig.ranges.forEach((range: any) => {
      let [h, m] = range.start.split(":").map(Number);
      const [endH, endM] = range.end.split(":").map(Number);
      while (h * 60 + m + dur <= endH * 60 + endM) {
        slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
        m += dur; h += Math.floor(m / 60); m %= 60;
      }
    });
    return slots;
  };

  // busy[].start es ISO string, ej: "2026-03-07T10:00:00-03:00"
  const isSlotBusy = (time: string) =>
    busySlots.some(s => s.start && s.start.includes(`T${time}`));

  // ── Submit reserva ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!bookingData.service || !bookingData.date || !bookingData.time) return;
    setEnviando(true);

    const phone = bookingData.clientAreaCode && bookingData.clientLocalNumber
      ? `${bookingData.clientAreaCode}${bookingData.clientLocalNumber}`
      : bookingData.clientPhone;

    const dur = bookingData.service?.duracion || bookingData.service?.duration || 60;
    const [h, m] = bookingData.time.split(":").map(Number);
    const start = new Date(`${bookingData.date}T${bookingData.time}:00`);
    const end   = new Date(start.getTime() + dur * 60 * 1000);

    await createAppointment(negocio.slug, {
      service:     bookingData.service.titulo || bookingData.service.name,
      workerName:  bookingData.worker?.nombre || null,
      workerId:    bookingData.worker?.id     || null,
      clientName:  bookingData.clientName,
      clientEmail: bookingData.clientEmail,
      clientPhone: phone,
      start:       start.toISOString(),
      end:         end.toISOString(),
      message:     bookingData.message,
      images:      [],
    });

    setEnviando(false);
    setMostrarGracias(true);
    setTimeout(() => { setIsModalOpen(false); setMostrarGracias(false); setBookingStep(1); }, 3000);
  };

  const allServices = [...((cfg.servicios as any)?.items || []), ...(negocio.config_web?.services || [])];
  const equipo      = (cfg.equipo as any)?.items || [];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Sección Servicios ─────────────────────────────────────────────── */}
      <section id="servicios" className="py-24 px-6" style={{ color: textColor }}>
        <div className="max-w-7xl mx-auto">
          {(cfg.servicios as any)?.titulo && (
            <div className="text-center mb-16">
              <span className="text-sm font-bold uppercase tracking-wider opacity-60">Lo que hacemos</span>
              <h2 className="text-3xl md:text-4xl font-bold mt-2" style={{ color: textColor }}>
                {(cfg.servicios as any).titulo}
              </h2>
              <div className="w-20 h-1.5 mt-4 mx-auto rounded-full" style={{ backgroundColor: brandColor }} />
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-8">
            {allServices.map((service: any, i: number) => {
              let isPromo = service.isPromo && service.promoEndDate;
              if (isPromo && new Date(service.promoEndDate + "T23:59:59") < new Date()) isPromo = false;
              const titulo  = service.name  || service.titulo;
              const precio  = service.price || service.precio;
              const desc    = service.description || service.desc;
              const duracion = service.duration || service.duracion || 60;
              const imagenUrl = service.image || service.imagenUrl;

              return (
                <div
                  key={service.id || i}
                  onClick={() => { setBookingData(p => ({ ...p, service })); setBookingStep(2); setIsModalOpen(true); }}
                  className={`relative p-8 transition-all duration-300 group cursor-pointer overflow-hidden ${radiusClass} ${
                    isPromo
                      ? "bg-gradient-to-br from-pink-50 to-white border-2 border-pink-200 shadow-lg shadow-pink-100 hover:-translate-y-2"
                      : "border border-zinc-500/10 shadow-sm hover:shadow-xl hover:-translate-y-2"
                  }`}
                  style={{ backgroundColor: isPromo ? undefined : "rgba(255,255,255,0.05)" }}
                >
                  {isPromo && (
                    <div className="absolute top-4 right-4 bg-pink-600 text-white text-[10px] font-bold px-3 py-1 rounded-full z-10 flex items-center gap-1">
                      <Tag size={10} /> Oferta
                    </div>
                  )}
                  {imagenUrl ? (
                    <div className="w-full h-48 mb-6 rounded-xl overflow-hidden shadow-md">
                      <img src={imagenUrl} alt={titulo} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 mb-6 text-white rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: isPromo ? "#db2777" : brandColor }}>
                      {isPromo ? <Tag size={28} /> : <CheckCircle size={28} />}
                    </div>
                  )}
                  <h3 className="font-bold text-xl mb-3" style={{ color: isPromo ? undefined : textColor }}>{titulo}</h3>
                  <p className="opacity-70 mb-4 font-medium">
                    {typeof precio === "number" || !isNaN(Number(precio)) ? `$${precio}` : precio}
                  </p>
                  {isPromo && (
                    <div className="mb-4 text-xs font-bold text-pink-600 bg-pink-100/50 p-2 rounded-lg text-center border border-pink-100">
                      🔥 Válido hasta el {new Date(service.promoEndDate).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 mb-2">
                    <Clock size={12} /><span>{duracion} min</span>
                  </div>
                  <p className="opacity-70 text-sm line-clamp-3">{desc}</p>
                  <div className={`mt-6 w-full py-2 rounded-lg text-center text-sm font-bold transition-colors ${
                    isPromo ? "bg-pink-600 text-white" : "bg-zinc-100 text-zinc-600 group-hover:bg-zinc-900 group-hover:text-white"
                  }`}>
                    Reservar Turno
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Sección Equipo ────────────────────────────────────────────────── */}
      {(cfg.equipo as any)?.mostrar && equipo.length > 0 && (
        <section id="equipo" className="py-24 px-6 bg-zinc-50 border-t border-zinc-200">
          <div className="max-w-7xl mx-auto text-center mb-12">
            <span className="text-sm font-bold uppercase tracking-wider opacity-60">Nuestro Equipo</span>
            <h2 className="text-3xl font-bold mt-2 mb-4 text-zinc-900">{(cfg.equipo as any).titulo}</h2>
            {(cfg.equipo as any).subtitulo && <p className="text-zinc-500 max-w-2xl mx-auto">{(cfg.equipo as any).subtitulo}</p>}
          </div>
          <div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-8">
            {equipo.map((item: any, i: number) => (
              <div key={i} className="w-full sm:w-[calc(50%-2rem)] md:w-[280px] flex flex-col items-center text-center p-6 bg-white rounded-2xl shadow-sm border border-zinc-100 hover:shadow-lg hover:-translate-y-1 transition-all">
                <div className="w-24 h-24 rounded-full overflow-hidden mb-4 bg-zinc-100 border-2 border-white shadow-md">
                  {item.imagenUrl ? (
                    <img src={item.imagenUrl} className="w-full h-full object-cover" alt={item.nombre} />
                  ) : (
                    <Users className="w-full h-full p-6 text-zinc-300" />
                  )}
                </div>
                <h3 className="font-bold text-lg text-zinc-900">{item.nombre}</h3>
                <p className="text-zinc-500">{item.cargo}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Modal de Reserva ──────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className={`bg-white w-full sm:max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl ${btnRadius} p-6 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300`}>

            {/* Gracias */}
            {mostrarGracias ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: brandColor + "20" }}>
                  <CheckCircle size={32} style={{ color: brandColor }} />
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 mb-2">¡Solicitud enviada!</h3>
                <p className="text-zinc-500">Te contactaremos para confirmar tu turno.</p>
              </div>
            ) : (
              <>
                {/* Header modal */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                      <CalendarIcon size={20} style={{ color: brandColor }} /> Agendar Turno
                    </h3>
                    <p className="text-zinc-400 text-sm">Paso {bookingStep} de 4</p>
                  </div>
                  <button onClick={() => { setIsModalOpen(false); setBookingStep(1); }} className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-100">
                    <X size={20} />
                  </button>
                </div>

                {/* Barra de progreso */}
                <div className="h-1 bg-zinc-100 rounded-full mb-6 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(bookingStep / 4) * 100}%`, backgroundColor: brandColor }} />
                </div>

                {/* Paso 1: Servicio */}
                {bookingStep === 1 && (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    <p className="font-bold text-zinc-700 mb-2">Seleccioná un servicio:</p>
                    {allServices.length === 0 ? (
                      <p className="text-center text-zinc-400 text-sm py-4">No hay servicios configurados.</p>
                    ) : allServices.map((item: any, i: number) => {
                      const titulo  = item.name  || item.titulo;
                      const precio  = item.price || item.precio;
                      const duracion = item.duration || item.duracion || 60;
                      return (
                        <button key={item.id || i} onClick={() => { setBookingData(p => ({ ...p, service: item })); setBookingStep(2); }}
                          className="w-full p-4 border border-zinc-200 rounded-xl text-left hover:border-zinc-400 hover:bg-zinc-50 transition-all">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-zinc-900">{titulo}</span>
                            {precio && <span className="font-semibold bg-zinc-100 text-zinc-900 px-2 py-1 rounded text-sm">${precio}</span>}
                          </div>
                          <span className="text-xs text-zinc-400 flex items-center gap-1 mt-1"><Clock size={12} /> {duracion} min</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Paso 2: Profesional */}
                {bookingStep === 2 && (
                  <div className="space-y-4">
                    <button onClick={() => setBookingStep(1)} className="text-xs text-zinc-400 flex items-center gap-1"><ChevronLeft size={14} /> Volver</button>
                    <h4 className="font-bold text-lg">¿Con quién te querés atender?</h4>
                    {equipo.length === 0 ? (
                      <button onClick={() => setBookingStep(3)} className={`w-full py-3 text-white font-bold ${btnRadius}`} style={{ backgroundColor: brandColor }}>
                        Continuar
                      </button>
                    ) : (
                      <>
                        <button onClick={() => { setBookingData(p => ({ ...p, worker: null })); setBookingStep(3); }}
                          className="w-full p-4 border border-zinc-200 rounded-xl text-left hover:border-zinc-400 transition-all flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center"><Users size={18} className="text-zinc-400" /></div>
                          <span className="font-medium text-zinc-700">Sin preferencia</span>
                        </button>
                        {equipo.map((w: any, i: number) => (
                          <button key={i} onClick={() => { setBookingData(p => ({ ...p, worker: w })); setBookingStep(3); }}
                            className="w-full p-4 border border-zinc-200 rounded-xl text-left hover:border-zinc-400 transition-all flex items-center gap-3">
                            {w.imagenUrl ? (
                              <img src={w.imagenUrl} className="w-10 h-10 rounded-full object-cover" alt={w.nombre} />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center"><User size={18} className="text-zinc-400" /></div>
                            )}
                            <div>
                              <p className="font-bold text-zinc-900">{w.nombre}</p>
                              <p className="text-xs text-zinc-400">{w.cargo}</p>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}

                {/* Paso 3: Fecha y hora */}
                {bookingStep === 3 && (
                  <div className="space-y-4">
                    <button onClick={() => setBookingStep(2)} className="text-xs text-zinc-400 flex items-center gap-1"><ChevronLeft size={14} /> Volver</button>
                    <h4 className="font-bold text-lg">Elegí fecha y hora</h4>
                    <input
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      value={bookingData.date}
                      onChange={e => setBookingData(p => ({ ...p, date: e.target.value, time: "" }))}
                      className="w-full p-3 border border-zinc-200 rounded-xl focus:ring-2 outline-none"
                      style={{ "--tw-ring-color": brandColor } as any}
                    />
                    {bookingData.date && (
                      loadingSlots ? (
                        <div className="flex justify-center py-4"><Loader2 className="animate-spin text-zinc-400" /></div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
                          {generateSlots().length === 0 ? (
                            <p className="col-span-3 text-center text-zinc-400 text-sm py-4">No hay turnos disponibles este día.</p>
                          ) : generateSlots().map(slot => (
                            <button
                              key={slot}
                              disabled={isSlotBusy(slot)}
                              onClick={() => setBookingData(p => ({ ...p, time: slot }))}
                              className={`py-2 text-sm font-medium rounded-xl border transition-all ${
                                bookingData.time === slot
                                  ? "text-white border-transparent"
                                  : isSlotBusy(slot)
                                  ? "bg-zinc-50 text-zinc-300 border-zinc-100 cursor-not-allowed"
                                  : "bg-white border-zinc-200 text-zinc-700 hover:border-zinc-400"
                              }`}
                              style={bookingData.time === slot ? { backgroundColor: brandColor } : {}}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      )
                    )}
                    {bookingData.date && bookingData.time && (
                      <button onClick={() => setBookingStep(4)} className={`w-full py-3 text-white font-bold ${btnRadius}`} style={{ backgroundColor: brandColor }}>
                        Continuar
                      </button>
                    )}
                  </div>
                )}

                {/* Paso 4: Datos del cliente */}
                {bookingStep === 4 && (
                  <div className="space-y-4">
                    <button onClick={() => setBookingStep(3)} className="text-xs text-zinc-400 flex items-center gap-1"><ChevronLeft size={14} /> Volver</button>
                    <h4 className="font-bold text-lg">Tus datos</h4>
                    <input placeholder="Tu nombre completo" value={bookingData.clientName}
                      onChange={e => setBookingData(p => ({ ...p, clientName: e.target.value }))}
                      className="w-full p-3 border border-zinc-200 rounded-xl outline-none focus:border-zinc-400" />
                    <input type="email" placeholder="Email" value={bookingData.clientEmail}
                      onChange={e => setBookingData(p => ({ ...p, clientEmail: e.target.value }))}
                      className="w-full p-3 border border-zinc-200 rounded-xl outline-none focus:border-zinc-400" />
                    <div className="flex gap-2">
                      <input placeholder="Código (ej: 343)" value={bookingData.clientAreaCode}
                        onChange={e => setBookingData(p => ({ ...p, clientAreaCode: e.target.value }))}
                        className="w-28 p-3 border border-zinc-200 rounded-xl outline-none focus:border-zinc-400" />
                      <input placeholder="Número" value={bookingData.clientLocalNumber}
                        onChange={e => setBookingData(p => ({ ...p, clientLocalNumber: e.target.value }))}
                        className="flex-1 p-3 border border-zinc-200 rounded-xl outline-none focus:border-zinc-400" />
                    </div>
                    <textarea placeholder="Mensaje o aclaración (opcional)" value={bookingData.message}
                      onChange={e => setBookingData(p => ({ ...p, message: e.target.value }))}
                      rows={3}
                      className="w-full p-3 border border-zinc-200 rounded-xl outline-none focus:border-zinc-400 resize-none" />
                    <button
                      onClick={handleSubmit}
                      disabled={!bookingData.clientName || !bookingData.clientEmail || enviando}
                      className={`w-full py-3.5 text-white font-bold flex items-center justify-center gap-2 ${btnRadius} disabled:opacity-50`}
                      style={{ backgroundColor: brandColor }}
                    >
                      {enviando ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle size={18} /> Confirmar Turno</>}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}