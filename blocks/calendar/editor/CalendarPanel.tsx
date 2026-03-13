"use client";
// blocks/calendar/editor/CalendarPanel.tsx
// Paneles: Servicios · Equipo · Reservas · Horarios
// Edita las secciones de config_web que CalendarSection y ContactSection consumen.

import { useState, useRef } from "react";
import type { RefObject } from "react";
import { 
  Plus, Trash2, ChevronDown, ChevronUp, Minus, User, Mail, 
  MessageCircle, CreditCard, Instagram, Phone, Users 
} from "lucide-react";
import { ImageUpload } from "@/components/ui/ImageUpload";
import ScheduleEditor  from "@/components/editors/ScheduleEditor";
import type { BlockEditorProps } from "@/types/blocks";

const PRIMARY = "#577a2c";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1">{children}</label>;
}
function Input({ value, onChange, placeholder, type = "text" }: any) {
  return (
    <input type={type} value={value ?? ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#577a2c]/30 outline-none" />
  );
}
function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      {label && <span className="text-sm font-medium text-zinc-600 flex-1">{label}</span>}
      <button onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${value ? "bg-[#577a2c]" : "bg-zinc-300"}`}>
        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${value ? "translate-x-5" : "translate-x-1"}`} />
      </button>
    </div>
  );
}
function SectionCard({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const dots: Record<string, string> = { emerald: "bg-emerald-500", blue: "bg-blue-500", amber: "bg-amber-500", violet: "bg-violet-500" };
  return (
    <section className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
        <span className={`w-2 h-2 rounded-full ${dots[color] || "bg-zinc-400"}`} />
        <h3 className="font-bold text-zinc-800 text-xs uppercase tracking-wide">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function fmtDur(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return `${h}h${m > 0 ? ` ${m}m` : ""}`;
}

// ─── Panel principal ──────────────────────────────────────────────────────────
export default function CalendarPanel({
  config, updateConfig, updateConfigRoot, updateArray,
  pushToArray, removeFromArray,
}: BlockEditorProps) {
  const servicios = config.servicios || { mostrar: true, titulo: "Nuestros Servicios", items: [] };
  const equipo    = config.equipo    || { mostrar: false, titulo: "Nuestro Equipo", items: [], scheduleType: "unified" };
  const booking   = config.booking   || { requestDeposit: false, requireManualConfirmation: true, depositPercentage: 50 };
  const schedule  = config.schedule  || {};

  const [openWorker, setOpenWorker] = useState<number | null>(null);

  // ── Servicios ─────────────────────────────────────────────────────────────
  const addServicio = () => pushToArray("servicios", {
    titulo: "Nuevo Servicio", desc: "", precio: 0, duracion: 60, imagenUrl: "",
  });

  // ── Equipo ────────────────────────────────────────────────────────────────
  const addMiembro = () => pushToArray("equipo", {
  id: crypto.randomUUID(), 
  nombre: "Nuevo Profesional",
  role: "Profesional", 
  photoUrl: "", 
  email: "",
  paymentLink: "",
  aliasCvu: "",
  telefono: "",
  instagram: "",
  allowSimultaneous: false,
  simultaneousCapacity: 2,
  schedule: schedule,
});

  const stepDur = (i: number, dir: 1 | -1) => {
    const cur  = Number(servicios.items?.[i]?.duracion ?? 60);
    const step = cur < 60 ? 15 : 30;
    updateArray("servicios", i, "duracion", Math.max(15, cur + dir * step));
  };

  return (
    <div className="space-y-8">

      {/* ── Servicios ──────────────────────────────────────────────────── */}
      <SectionCard title="Servicios" color="emerald">
        <div className="flex items-center justify-between">
          <Toggle label="Mostrar sección" value={!!servicios.mostrar}
            onChange={v => updateConfig("servicios", "mostrar", v)} />
        </div>

        {servicios.mostrar !== false && (
          <div className="space-y-4 animate-in fade-in">
            <div>
              <Label>Título de la sección</Label>
              <Input value={servicios.titulo}
                onChange={(v: string) => updateConfig("servicios", "titulo", v)}
                placeholder="Nuestros Servicios" />
            </div>

            <div className="space-y-3">
              {(servicios.items || []).map((item: any, i: number) => (
                <div key={i} className="p-3 border border-zinc-200 rounded-xl bg-zinc-50 relative space-y-3">
                  <button onClick={() => removeFromArray("servicios", i)}
                    className="absolute top-2 right-2 p-1 text-zinc-300 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                  <div className="pr-6">
                    <Label>Nombre del servicio</Label>
                    <Input value={item.titulo}
                      onChange={(v: string) => updateArray("servicios", i, "titulo", v)}
                      placeholder="Corte de pelo" />
                  </div>
                  <div>
                    <Label>Descripción breve</Label>
                    <Input value={item.desc}
                      onChange={(v: string) => updateArray("servicios", i, "desc", v)}
                      placeholder="Descripción opcional" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Precio ($)</Label>
                      <Input type="number" value={item.precio}
                        onChange={(v: string) => updateArray("servicios", i, "precio", Number(v))}
                        placeholder="0" />
                    </div>
                    <div>
                      <Label>Duración</Label>
                      <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-lg p-1">
                        <button onClick={() => stepDur(i, -1)}
                          className="p-1 text-zinc-400 hover:text-zinc-700 transition-colors">
                          <Minus size={14} />
                        </button>
                        <span className="flex-1 text-center text-sm font-bold text-zinc-700">
                          {fmtDur(Number(item.duracion ?? 60))}
                        </span>
                        <button onClick={() => stepDur(i, 1)}
                          className="p-1 text-zinc-400 hover:text-zinc-700 transition-colors">
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <ImageUpload label="Imagen del servicio (opcional)"
                    value={item.imagenUrl}
                    onChange={url => updateArray("servicios", i, "imagenUrl", url)} />

                  {/* Profesionales que realizan este servicio */}
                  {equipo.mostrar && (equipo.items || []).length > 0 && (
                    <div>
                      <Label>Profesionales que lo realizan (vacío = todos)</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {(equipo.items || []).map((worker: any) => {
                          const wid = worker.id || worker.nombre;
                          const workerIds: string[] = item.workerIds || [];
                          const isSelected = workerIds.includes(wid);
                          return (
                            <button
                              key={wid}
                              type="button"
                              onClick={() => {
                                const next = isSelected
                                  ? workerIds.filter((id: string) => id !== wid)
                                  : [...workerIds, wid];
                                updateArray("servicios", i, "workerIds", next);
                              }}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                                isSelected
                                  ? "text-white border-transparent"
                                  : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400"
                              }`}
                              style={isSelected ? { backgroundColor: PRIMARY } : {}}
                            >
                              {worker.nombre}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button onClick={addServicio}
              className="w-full py-2.5 border-2 border-dashed border-zinc-300 rounded-xl text-zinc-500 text-sm font-bold hover:border-[#577a2c] hover:text-[#577a2c] hover:bg-[#577a2c]/5 transition-all flex items-center justify-center gap-2">
              <Plus size={16} /> Agregar servicio
            </button>
          </div>
        )}
      </SectionCard>

      {/* ── Equipo ─────────────────────────────────────────────────────── */}
      <SectionCard title="Equipo / Profesionales" color="blue">
        <div className="flex items-center justify-between">
          <Toggle label="Mostrar equipo en la web" value={!!equipo.mostrar}
            onChange={v => updateConfig("equipo", "mostrar", v)} />
        </div>

        {equipo.mostrar && (
          <div className="space-y-3 animate-in fade-in">
            <div>
              <Label>Modo de horarios</Label>
              <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200">
                {[["unified","Horario General"],["per_worker","Por Profesional"]].map(([val, lbl]) => (
                  <button key={val} onClick={() => updateConfig("equipo", "scheduleType", val)}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${(equipo.scheduleType || "unified") === val ? "bg-white shadow text-[#577a2c]" : "text-zinc-500"}`}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Modo de disponibilidad</Label>
              <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200">
                {[["sala_unica","Sala Única"],["simultaneo","Simultáneo"]].map(([val, lbl]) => (
                  <button key={val} onClick={() => updateConfig("equipo", "availabilityMode", val)}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${(equipo.availabilityMode || "sala_unica") === val ? "bg-white shadow text-[#577a2c]" : "text-zinc-500"}`}>
                    {lbl}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">
                Sala Única: un turno ocupa el local completo. Simultáneo: cada profesional maneja su propia agenda.
              </p>
            </div>

            {(equipo.items || []).map((m: any, i: number) => (
              <div key={m.id || i} className="border border-zinc-200 rounded-xl bg-zinc-50 overflow-hidden">
                {/* Cabecera */}
                <div className="flex items-center justify-between p-3">
                  <button onClick={() => setOpenWorker(openWorker === i ? null : i)}
                    className="flex items-center gap-2 text-left flex-1 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center shrink-0">
                      {m.photoUrl
                        ? <img src={m.photoUrl} className="w-full h-full object-cover rounded-full" alt="" />
                        : <User size={14} className="text-zinc-500" />}
                    </div>
                    <span className="font-bold text-sm text-zinc-800 truncate">{m.nombre || "Profesional"}</span>
                    {openWorker === i ? <ChevronUp size={14} className="ml-auto shrink-0 text-zinc-400" /> : <ChevronDown size={14} className="ml-auto shrink-0 text-zinc-400" />}
                  </button>
                  <button onClick={() => removeFromArray("equipo", i)}
                    className="p-1.5 text-zinc-300 hover:text-red-500 transition-colors ml-2 shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>

                {openWorker === i && (
                  <div className="px-3 pb-3 space-y-3 border-t border-zinc-100 pt-3 animate-in fade-in">
                    <div>
                      <Label>Nombre</Label>
                      <Input value={m.nombre}
                        onChange={(v: string) => updateArray("equipo", i, "nombre", v)} />
                    </div>
                    
                    <div>
                      <Label>Rol / Especialidad</Label>
                      <Input value={m.role}
                        onChange={(v: string) => updateArray("equipo", i, "role", v)}
                        placeholder="Ej: Estilista" />
                    </div>
                    {/* Campos de Contacto, Pagos y Simultaneidad */}
                    <div className="space-y-3">
                      <div>
                        <Label>Email para notificaciones</Label>
                        <Input value={m.email} onChange={(v: string) => updateArray("equipo", i, "email", v)} placeholder="profesional@correo.com" />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Teléfono / WhatsApp</Label>
                          <Input value={m.telefono} onChange={(v: string) => updateArray("equipo", i, "telefono", v)} placeholder="Ej: 54911..." />
                        </div>
                        <div>
                          <Label>Instagram (@usuario)</Label>
                          <Input value={m.instagram} onChange={(v: string) => updateArray("equipo", i, "instagram", v)} placeholder="@usuario" />
                        </div>
                      </div>

                      <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 space-y-2">
                        <Label><span className="text-indigo-700 flex items-center gap-1"><CreditCard size={12}/> Link de pago (MP)</span></Label>
                        <Input value={m.paymentLink} onChange={(v: string) => updateArray("equipo", i, "paymentLink", v)} placeholder="https://mpago.la/..." />
                      </div>

                      <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 space-y-2">
                        <Label><span className="text-emerald-700">Alias / CBU para Señas</span></Label>
                        <Input value={m.aliasCvu} onChange={(v: string) => updateArray("equipo", i, "aliasCvu", v)} placeholder="mi.alias.mp" />
                      </div>

                      {(equipo.availabilityMode || 'sala_unica') !== 'sala_unica' && (
                      <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 space-y-3">
                        <Toggle
                          label="¿Atiende a más de uno a la vez?"
                          value={!!m.allowSimultaneous}
                          onChange={(v) => {
                            updateArray("equipo", i, "allowSimultaneous", v);
                            if (v && (!m.simultaneousCapacity || m.simultaneousCapacity < 2)) {
                              updateArray("equipo", i, "simultaneousCapacity", 2);
                            }
                          }}
                        />
                        {m.allowSimultaneous && (
                          <div className="animate-in fade-in">
                            <Label>Capacidad máxima (personas)</Label>
                            <Input type="number" min="2" value={m.simultaneousCapacity} onChange={(v: any) => updateArray("equipo", i, "simultaneousCapacity", parseInt(v))} />
                          </div>
                        )}
                      </div>
                      )}
                    </div>
                    <ImageUpload label="Foto" value={m.photoUrl}
                      onChange={url => updateArray("equipo", i, "photoUrl", url)} />
                    {equipo.scheduleType === "per_worker" && (
                      <div>
                        <Label>Horario de {m.nombre || "este profesional"}</Label>
                        <ScheduleEditor
                          schedule={m.schedule || schedule}
                          onChange={s => updateArray("equipo", i, "schedule", s)}
                        />
                      </div>
                    )}
                  </div>
                  
                )}
              </div>
            ))}

            <button onClick={addMiembro}
              className="w-full py-2.5 border-2 border-dashed border-zinc-300 rounded-xl text-zinc-500 text-sm font-bold hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2">
              <Plus size={16} /> Agregar profesional
            </button>
          </div>
        )}
      </SectionCard>

      {/* ── Configuración de Reservas ───────────────────────────────────── */}
      <SectionCard title="Configuración de Reservas" color="amber">
        <div className="space-y-4">
          <Toggle label="Confirmación manual de turnos" value={!!booking.requireManualConfirmation}
            onChange={v => updateConfig("booking", "requireManualConfirmation", v)} />
          <p className="text-xs text-zinc-400 -mt-2">
            Si está activado, los turnos quedan pendientes hasta que los aprobés.
          </p>

          <div className="h-px bg-zinc-100" />

          <Toggle label="Cobrar seña al reservar" value={!!booking.requestDeposit}
            onChange={v => updateConfig("booking", "requestDeposit", v)} />

          {booking.requestDeposit && (
            <div className="pl-2 animate-in fade-in">
              <Label>Porcentaje de seña ({booking.depositPercentage ?? 50}%)</Label>
              <input type="range" min="10" max="100" step="5"
                value={booking.depositPercentage ?? 50}
                onChange={e => updateConfig("booking", "depositPercentage", Number(e.target.value))}
                className="w-full accent-[#577a2c]" />
            </div>
          )}
        </div>
      </SectionCard>

      {/* ── Horarios generales ──────────────────────────────────────────── */}
      {(!equipo.mostrar || equipo.scheduleType !== "per_worker") && (
        <SectionCard title="Horarios de Atención" color="violet">
          <ScheduleEditor
            schedule={schedule}
            onChange={s => updateConfigRoot("schedule", s)}
          />
        </SectionCard>
      )}

      {/* ── Notificaciones ─────────────────────────────────────────────── */}
      <NotificationsPanel config={config} updateConfig={updateConfig} />
    </div>
  );
}

// ─── Notificaciones ───────────────────────────────────────────────────────────
const NOTIF_TYPES = [
  { id: "confirmation", label: "Confirmación" },
  { id: "deposit",      label: "Seña"         },
  { id: "reminder",     label: "Recordatorio" },
] as const;

const DEFAULT_NOTIF = {
  enabled: true, sendViaEmail: true, sendViaWhatsapp: true,
  subject: "", body: "", whatsappBody: "", bannerUrl: "",
};

const AVAILABLE_VARIABLES = [
  { key: "cliente",             label: "Nombre del cliente" },
  { key: "servicio",            label: "Servicio" },
  { key: "fecha",               label: "Fecha" },
  { key: "hora",                label: "Hora" },
  { key: "profesional",         label: "Profesional" },
  { key: "precio_total",        label: "Precio total" },
  { key: "monto_senia",         label: "Seña" },
  { key: "link_pago",           label: "Link de pago" },
  { key: "precio_a_pagar",      label: "Precio a pagar" },
  { key: "alias",               label: "Alias/CVU" },
  { key: "telefono_trabajador", label: "Tel. profesional" },
];

function insertVariable(
  variable: string,
  ref: RefObject<HTMLTextAreaElement | null>,
  currentValue: string,
  onChange: (v: string) => void
) {
  const el = ref.current;
  const pos = el ? (el.selectionStart ?? currentValue.length) : currentValue.length;
  const tag = `{{${variable}}}`;
  onChange(currentValue.slice(0, pos) + tag + currentValue.slice(pos));
  // Restaurar foco y cursor después del tag insertado
  setTimeout(() => {
    if (el) { el.focus(); el.setSelectionRange(pos + tag.length, pos + tag.length); }
  }, 0);
}

function VariablesPicker({ onInsert }: { onInsert: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {AVAILABLE_VARIABLES.map(v => (
        <button key={v.key} type="button" onClick={() => onInsert(v.key)}
          title={v.label}
          className="px-2 py-0.5 text-[10px] font-mono bg-zinc-100 hover:bg-[#577a2c]/10 hover:text-[#577a2c] border border-zinc-200 rounded-md transition-colors text-zinc-600">
          {`{{${v.key}}}`}
        </button>
      ))}
    </div>
  );
}

function NotificationsPanel({ config, updateConfig }: Pick<BlockEditorProps, "config" | "updateConfig">) {
  const [activeType, setActiveType] = useState<"confirmation" | "deposit" | "reminder">("confirmation");
  const notifications = (config.notifications as any) || {};
  const tmpl = { ...DEFAULT_NOTIF, ...(notifications[activeType] || {}) };
  const emailBodyRef = useRef<HTMLTextAreaElement>(null);
  const wpBodyRef    = useRef<HTMLTextAreaElement>(null);

  const update = (patch: Partial<typeof DEFAULT_NOTIF>) =>
    updateConfig("notifications", activeType, { ...tmpl, ...patch });

  return (
    <SectionCard title="Notificaciones" color="emerald">
      <p className="text-xs text-zinc-400 -mt-2 mb-3">
        Configurá los mensajes automáticos que recibe el cliente al reservar.
      </p>

      {/* Tabs tipo */}
      <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200 mb-4">
        {NOTIF_TYPES.map(t => (
          <button key={t.id} onClick={() => setActiveType(t.id)}
            className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${activeType === t.id ? "bg-white shadow text-[#577a2c]" : "text-zinc-500"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-4 animate-in fade-in">
        {/* Activar / canales */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-700">Activar esta notificación</span>
          <button onClick={() => update({ enabled: !tmpl.enabled })}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${tmpl.enabled ? "bg-[#577a2c]" : "bg-zinc-300"}`}>
            <span className={`inline-block h-3 w-3 rounded-full bg-white transition-transform ${tmpl.enabled ? "translate-x-5" : "translate-x-1"}`} />
          </button>
        </div>

        {tmpl.enabled && (
          <>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer">
                <input type="checkbox" checked={tmpl.sendViaEmail !== false}
                  onChange={e => update({ sendViaEmail: e.target.checked })}
                  className="accent-[#577a2c] w-3.5 h-3.5" />
                <Mail size={12} /> Por Email
              </label>
              <label className="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer">
                <input type="checkbox" checked={!!tmpl.sendViaWhatsapp}
                  onChange={e => update({ sendViaWhatsapp: e.target.checked })}
                  className="accent-green-600 w-3.5 h-3.5" />
                <MessageCircle size={12} className="text-green-600" /> Por WhatsApp
              </label>
            </div>

            <div>
              <Label>Asunto (Email / Título WhatsApp)</Label>
              <input value={tmpl.subject}
                onChange={e => update({ subject: e.target.value })}
                className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#577a2c]/30 outline-none text-zinc-900"
                placeholder="Tu turno fue confirmado" />
            </div>

            {tmpl.sendViaEmail !== false && (
              <div>
                <Label>Mensaje Email (HTML)</Label>
                <textarea ref={emailBodyRef} rows={4} value={tmpl.body}
                  onChange={e => update({ body: e.target.value })}
                  className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#577a2c]/30 outline-none resize-none text-zinc-900"
                  placeholder="<p>Hola {{cliente}}, tu turno...</p>" />
                <VariablesPicker onInsert={v => insertVariable(v, emailBodyRef, tmpl.body, body => update({ body }))} />
              </div>
            )}

            {tmpl.sendViaWhatsapp && (
              <div>
                <Label>Mensaje WhatsApp (texto plano)</Label>
                <textarea ref={wpBodyRef} rows={3} value={tmpl.whatsappBody}
                  onChange={e => update({ whatsappBody: e.target.value })}
                  className="w-full p-2 border border-green-200 rounded-lg text-sm bg-green-50/30 focus:ring-2 focus:ring-green-300/30 outline-none resize-none text-zinc-900"
                  placeholder="Hola {{cliente}}, tu turno para {{servicio}}..." />
                <VariablesPicker onInsert={v => insertVariable(v, wpBodyRef, tmpl.whatsappBody, whatsappBody => update({ whatsappBody }))} />
              </div>
            )}

            {tmpl.sendViaEmail !== false && (
              <ImageUpload label="Banner / Cabecera (solo email)"
                value={tmpl.bannerUrl}
                onChange={url => update({ bannerUrl: url })} />
            )}
          </>
        )}
      </div>
    </SectionCard>
  );
}