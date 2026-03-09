"use client";
// blocks/crm/admin/CrmAdmin.tsx

import { useState } from "react";
import {
  Users, Phone, Mail, Briefcase, Calendar,
  ChevronDown, ChevronUp, MessageCircle, Search,
} from "lucide-react";
import type { BlockAdminProps } from "@/types/blocks";

const PRIMARY = "#577a2c";

export default function CrmAdmin({ negocio, sharedData }: BlockAdminProps) {
  const { turnos, openContactModal } = sharedData;

  const [search,       setSearch]       = useState("");
  const [filtroWorker, setFiltroWorker] = useState("Todos");
  const [expandedId,   setExpandedId]   = useState<string | null>(null);

  const toggle = (id: string) => setExpandedId(prev => prev === id ? null : id);

  // Trabajadores disponibles para el filtro
  const equipo       = negocio?.config_web?.equipo?.items || negocio?.config_web?.equipo?.members || [];
  const trabajadores: string[] = equipo.map((m: any) => m.nombre || m.name).filter(Boolean);

  // Deduplicar por email (mismo algoritmo que el legacy)
  const clientesDedup = turnos.filter((obj: any, idx: number, self: any[]) =>
    idx === self.findIndex((t: any) =>
      t.cliente_email?.trim().toLowerCase() === obj.cliente_email?.trim().toLowerCase() && t.cliente_email
    )
  );

  // Filtro por trabajador
  const filtradosPorWorker = filtroWorker === "Todos"
    ? clientesDedup
    : clientesDedup.filter((t: any) => {
        const fromSvc = typeof t.servicio === "string" && t.servicio.includes(" - ")
          ? t.servicio.split(" - ")[1]?.trim()
          : "";
        return (t.worker_name?.trim() || fromSvc) === filtroWorker;
      });

  // Buscador — nombre, email, teléfono, servicio
  const q = search.toLowerCase();
  const clientes = q === ""
    ? filtradosPorWorker
    : filtradosPorWorker.filter((t: any) =>
        (t.cliente_nombre   || "").toLowerCase().includes(q) ||
        (t.cliente_email    || "").toLowerCase().includes(q) ||
        (t.cliente_telefono || "").toLowerCase().includes(q) ||
        (t.servicio         || "").toLowerCase().includes(q)
      );

  const fmtFecha = (iso: string) => {
    if (!iso) return "Sin fecha";
    try {
      const [fecha, hora] = iso.split("T");
      return `${fecha.split("-").reverse().join("/")} - ${hora?.slice(0, 5) ?? ""}`;
    } catch { return iso; }
  };

  const waLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "")}`;

  return (
    <div className="animate-in fade-in space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Base de Clientes</h1>
        <p className="text-zinc-500 text-sm">{clientesDedup.length} clientes únicos registrados.</p>
      </header>

      {/* Buscador + filtro trabajador */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            placeholder="Buscar por nombre, email, teléfono o servicio..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30 text-zinc-900 bg-white"
          />
        </div>
        {trabajadores.length > 0 && (
          <select
            value={filtroWorker}
            onChange={e => setFiltroWorker(e.target.value)}
            className="px-3 py-2.5 border border-zinc-200 rounded-xl text-sm outline-none bg-white text-zinc-700 focus:ring-2 focus:ring-[#577a2c]/30"
          >
            <option value="Todos">Todos los profesionales</option>
            {trabajadores.map((w: string) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        )}
      </div>

      {clientes.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-zinc-200">
          <Users size={40} className="mx-auto text-zinc-200 mb-3" />
          <p className="text-zinc-400 text-sm">
            {search || filtroWorker !== "Todos"
              ? "No hay clientes que coincidan con la búsqueda."
              : "No hay clientes registrados aún."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">

          {/* ── Desktop ── */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50/50 border-b border-zinc-100">
                <tr>
                  {["Nombre", "Teléfono", "Email", "Servicio", "Último Turno", ""].map(h => (
                    <th key={h} className="px-6 py-4 font-semibold text-zinc-500 text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {clientes.map((c: any) => (
                  <tr key={c.id} className="group hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-zinc-900">{c.cliente_nombre}</td>
                    <td className="px-6 py-4 font-mono text-zinc-600">{c.cliente_telefono || "Sin teléfono"}</td>
                    <td className="px-6 py-4 text-zinc-500">{c.cliente_email}</td>
                    <td className="px-6 py-4 text-zinc-500 max-w-[180px] truncate">{c.servicio || "General"}</td>
                    <td className="px-6 py-4 font-mono text-zinc-600 text-xs">{fmtFecha(c.fecha_inicio)}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        {c.cliente_telefono && (
                          <a href={waLink(c.cliente_telefono)} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors font-bold text-xs">
                            <MessageCircle size={14} /> WhatsApp
                          </a>
                        )}
                        {openContactModal && (
                          <button onClick={() => openContactModal(c.cliente_email, c.cliente_nombre)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors font-bold text-xs">
                            <Mail size={14} /> Email
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Móvil (cards expandibles) ── */}
          <div className="lg:hidden divide-y divide-zinc-100">
            {clientes.map((c: any) => (
              <div key={c.id} className="flex flex-col">
                <div onClick={() => toggle(c.id)}
                  className="p-4 flex items-center justify-between active:bg-zinc-50 cursor-pointer">
                  <div>
                    <span className="font-bold text-zinc-900 block">{c.cliente_nombre}</span>
                    <span className="text-sm text-zinc-500 flex items-center gap-1.5">
                      <Phone size={12} className="text-zinc-400" />
                      {c.cliente_telefono || "Sin teléfono"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {c.cliente_telefono && (
                      <a href={waLink(c.cliente_telefono)} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="p-2 bg-emerald-50 text-emerald-600 rounded-full">
                        <MessageCircle size={14} />
                      </a>
                    )}
                    <span className="text-zinc-400">
                      {expandedId === c.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </span>
                  </div>
                </div>

                {expandedId === c.id && (
                  <div className="px-4 pb-4 pt-2 bg-zinc-50/50 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="space-y-3 border-t border-zinc-100 pt-3">
                      <div className="flex items-center gap-3 text-sm">
                        <Mail size={16} className="text-zinc-400 shrink-0" />
                        <span className="text-zinc-600 truncate">{c.cliente_email}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Briefcase size={16} className="text-zinc-400 shrink-0" />
                        <span className="text-zinc-600">{c.servicio || "General"}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Calendar size={16} className="text-zinc-400 shrink-0" />
                        <span className="text-zinc-600 font-mono text-xs">Último: {fmtFecha(c.fecha_inicio)}</span>
                      </div>
                      {openContactModal && (
                        <button
                          onClick={e => { e.stopPropagation(); openContactModal(c.cliente_email, c.cliente_nombre); }}
                          className="w-full mt-2 flex items-center justify-center gap-2 py-3 text-white rounded-xl font-bold text-sm"
                          style={{ backgroundColor: PRIMARY }}>
                          <Mail size={16} /> Enviar Email Profesional
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}