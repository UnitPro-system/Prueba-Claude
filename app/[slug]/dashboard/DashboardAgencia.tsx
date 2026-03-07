"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import {
  ShieldCheck, Plus, LogOut, Users, Loader2, Palette,
  ExternalLink, MapPin, Clock, Trash2, Puzzle, X
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import WebEditor from "./WebEditor";
import BlockMarketplace from "@/components/dashboards/BlockMarketplace";

const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export default function DashboardAgencia() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();

  const [agency, setAgency] = useState<any>(null);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Estado del formulario de nuevo cliente
  const [newClientData, setNewClientData] = useState({
    email: "",
    password: "",
    nombre: "",
    whatsapp: "",
    direccion: "",
    google_maps_link: "",
  });

  // Estado horarios
  const [scheduleConfig, setScheduleConfig] = useState({
    diaInicio: "Lunes",
    diaFin: "Viernes",
    apertura: "09:00",
    cierre: "18:00",
  });

  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingClient, setEditingClient] = useState<any>(null);

  // ── BlockMarketplace: negocio seleccionado para gestionar bloques ──────────
  const [blocksPanelNegocio, setBlocksPanelNegocio] = useState<{
    id: number;
    nombre: string;
  } | null>(null);

  useEffect(() => {
    checkAgencySession();
  }, []);

  async function checkAgencySession() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) { router.push("/login"); return; }

    const { data: agencyData, error } = await supabase
      .from("agencies")
      .select("*")
      .eq("slug", params.slug)
      .single();

    if (error || !agencyData || agencyData.email !== user.email) {
      router.push("/login");
      return;
    }

    setAgency(agencyData);
    cargarClientes(agencyData.id);
  }

  async function cargarClientes(agencyId: number) {
    const { data } = await supabase
      .from("negocios")
      .select("*")
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false });

    if (data) setClientes(data);
    setLoading(false);
  }

  const handleDeleteClient = async (id: number, nombre: string) => {
    const confirmado = window.confirm(
      `⚠️ ¿Estás seguro de eliminar a "${nombre}"?\n\nEsta acción borrará PERMANENTEMENTE:\n- Sus turnos\n- Sus leads\n- Su configuración web\n\nNo se puede deshacer.`
    );
    if (!confirmado) return;

    setDeletingId(id);
    const { error } = await supabase.from("negocios").delete().eq("id", id);

    if (error) {
      alert("Error al eliminar: " + error.message);
    } else {
      setClientes((prev) => prev.filter((c) => c.id !== id));
    }
    setDeletingId(null);
  };

  const toggleEditorAccess = async (clienteId: number, currentStatus: boolean) => {
    const { error } = await supabase
      .from("negocios")
      .update({ editor_enabled: !currentStatus })
      .eq("id", clienteId);

    if (!error) {
      setClientes((prev) =>
        prev.map((c) =>
          c.id === clienteId ? { ...c, editor_enabled: !currentStatus } : c
        )
      );
    } else {
      alert("Error al actualizar permiso: " + error.message);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    // 1. Crear usuario en Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: newClientData.email,
      password: newClientData.password,
      options: { data: { role: "cliente" } },
    });

    if (authError) {
      alert("Error Auth: " + authError.message);
      setCreating(false);
      return;
    }

    if (authData.user) {
      const slug =
        newClientData.nombre
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, "")
          .replace(/[\s_-]+/g, "-") +
        "-" +
        Math.floor(Math.random() * 1000);

      const horarioFinal = `${scheduleConfig.diaInicio} a ${scheduleConfig.diaFin}: ${scheduleConfig.apertura} - ${scheduleConfig.cierre}`;

      // Config inicial para confirm_booking (único tipo activo)
      const initialConfigWeb = {
        template: "modern",
        hero: {
          titulo: newClientData.nombre,
          subtitulo: "Reserva tu cita online con los mejores profesionales.",
          ctaTexto: "Reservar Turno",
          mostrar: true,
        },
        beneficios: {
          mostrar: true,
          titulo: "Por qué elegirnos",
          items: [{ titulo: "Atención Premium", desc: "Nos enfocamos en los detalles." }],
        },
      };

      // 2. Insertar negocio — system: 'modular' porque es nuevo
      const { data: nuevoNegocio, error: dbError } = await supabase
        .from("negocios")
        .insert([{
          user_id: authData.user.id,
          email: newClientData.email,
          agency_id: agency.id,
          nombre: newClientData.nombre,
          slug,
          category: "confirm_booking",
          whatsapp: newClientData.whatsapp,
          direccion: newClientData.direccion,
          google_maps_link: newClientData.google_maps_link,
          horarios: horarioFinal,
          mensaje_bienvenida: `Bienvenidos a ${newClientData.nombre}`,
          color_principal: "#000000",
          estado_plan: "activo",
          config_web: initialConfigWeb,
          system: "modular",       // ← nuevo, todos los negocios creados desde acá son modulares
        }])
        .select("id")
        .single();

      if (dbError) {
        alert("Error BD: " + dbError.message);
        setCreating(false);
        return;
      }

      // 3. Activar bloque landing automáticamente (es gratis y siempre va)
      if (nuevoNegocio?.id) {
        await supabase.from("tenant_blocks").insert({
          negocio_id: nuevoNegocio.id,
          block_id: "landing",
          active: true,
          activated_at: new Date().toISOString(),
          config: {},
        });
      }

      setShowModal(false);
      setNewClientData({ email: "", password: "", nombre: "", whatsapp: "", direccion: "", google_maps_link: "" });
      cargarClientes(agency.id);
    }

    setCreating(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-[#577a2c]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#ede9dd] text-slate-900 font-sans selection:bg-[#b0c97d]/40">

      {/* HEADER */}
      <header className="bg-[#ede9dd]/50 backdrop-blur-md border-b border-slate-200 px-6 lg:px-8 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-[#577a2c] text-white p-2 rounded-lg shadow-md shadow-[#577a2c]/20">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">
              {agency?.name || agency?.nombre_agencia}
            </h1>
            <p className="text-xs text-slate-500 font-medium">Panel de Control</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-slate-500 hover:text-red-600 flex items-center gap-2 font-medium transition-colors px-3 py-2 hover:bg-red-50 rounded-lg"
        >
          <LogOut size={16} /> Salir
        </button>
      </header>

      <main className="max-w-7xl mx-auto p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
              <Users className="text-slate-400" /> Tus Clientes
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Gestiona las webs y bloques de tus negocios.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#577a2c] hover:bg-[#486423] text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-[#577a2c]/30 hover:-translate-y-0.5"
          >
            <Plus size={20} /> Nuevo Cliente
          </button>
        </div>

        {/* LISTA DE CLIENTES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clientes.map((cliente) => (
            <div
              key={cliente.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-[#b0c97d] transition-all p-6 flex flex-col justify-between group relative"
            >
              {/* Botón eliminar */}
              <button
                onClick={() => handleDeleteClient(cliente.id, cliente.nombre)}
                disabled={deletingId === cliente.id}
                className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                title="Eliminar negocio"
              >
                {deletingId === cliente.id
                  ? <Loader2 size={18} className="animate-spin text-red-600" />
                  : <Trash2 size={18} />
                }
              </button>

              <div>
                <div className="flex justify-between items-start mb-4 pr-8">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md"
                    style={{ backgroundColor: cliente.color_principal || "#000" }}
                  >
                    {cliente.nombre.substring(0, 1)}
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold border tracking-wide ${
                    cliente.estado_plan === "activo"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-50 text-slate-500 border-slate-200"
                  }`}>
                    {cliente.estado_plan}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-[#71a22e] transition-colors pr-6">
                  {cliente.nombre}
                </h3>
                <p className="text-sm text-slate-400 mb-2 truncate font-mono bg-slate-50 inline-block px-2 py-0.5 rounded">
                  {cliente.email}
                </p>

                {/* Toggle acceso al editor */}
                <div className="flex items-center justify-between mt-4 p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                    Acceso al Editor
                  </span>
                  <button
                    onClick={() => toggleEditorAccess(cliente.id, cliente.editor_enabled)}
                    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                      cliente.editor_enabled ? "bg-[#577a2c]" : "bg-slate-300"
                    }`}
                  >
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      cliente.editor_enabled ? "translate-x-6" : "translate-x-1"
                    }`} />
                  </button>
                </div>

                <div className="text-xs text-slate-500 space-y-1 mb-4 border-t border-slate-100 pt-2">
                  {cliente.horarios && (
                    <p className="flex items-center gap-1">
                      <Clock size={12} /> {cliente.horarios}
                    </p>
                  )}
                  {cliente.direccion && (
                    <p className="flex items-center gap-1">
                      <MapPin size={12} /> {cliente.direccion}
                    </p>
                  )}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="grid grid-cols-3 gap-2 mt-auto pt-4 border-t border-slate-100">
                <button
                  onClick={() => setEditingClient(cliente)}
                  className="py-2.5 bg-[#577a2c]/10 hover:bg-[#577a2c]/20 rounded-xl text-xs font-bold text-[#577a2c] flex items-center justify-center gap-1 transition-colors border border-[#577a2c]/20"
                >
                  <Palette size={13} /> Diseñar
                </button>

                {/* ── BOTÓN BLOQUES ── */}
                <button
                  onClick={() => setBlocksPanelNegocio({ id: cliente.id, nombre: cliente.nombre })}
                  className="py-2.5 bg-[#8dbb38]/10 hover:bg-[#8dbb38]/20 rounded-xl text-xs font-bold text-[#577a2c] flex items-center justify-center gap-1 transition-colors border border-[#8dbb38]/40"
                >
                  <Puzzle size={13} /> Bloques
                </button>

                <a
                  href={cliente.custom_domain ? `https://${cliente.custom_domain}` : `/${cliente.slug}`}
                  target="_blank"
                  className="py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1 transition-colors border border-slate-200"
                >
                  <ExternalLink size={13} /> Ver Web
                </a>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* ── MODAL DE CREACIÓN ──────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md animate-in zoom-in-95 duration-300 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
            <h3 className="text-2xl font-bold mb-6 text-slate-900">Nuevo Cliente</h3>

            <form onSubmit={handleCreateClient} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                    Nombre del Negocio
                  </label>
                  <input
                    required
                    placeholder="Ej: Barbería Vintage"
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#577a2c] outline-none"
                    onChange={(e) => setNewClientData({ ...newClientData, nombre: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                    Email (Login del cliente)
                  </label>
                  <input
                    required
                    type="email"
                    placeholder="cliente@gmail.com"
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#577a2c] outline-none"
                    onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                    Contraseña
                  </label>
                  <input
                    required
                    type="password"
                    placeholder="******"
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#577a2c] outline-none"
                    onChange={(e) => setNewClientData({ ...newClientData, password: e.target.value })}
                  />
                </div>
              </div>

              <div className="h-px bg-slate-100 my-2" />

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                  Dirección
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-slate-400" size={16} />
                  <input
                    placeholder="Av. Siempre Viva 123"
                    className="w-full pl-10 p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#577a2c] outline-none"
                    onChange={(e) => setNewClientData({ ...newClientData, direccion: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                  Link de Google Maps
                </label>
                <div className="relative">
                  <ExternalLink className="absolute left-3 top-3 text-slate-400" size={16} />
                  <input
                    placeholder="https://goo.gl/maps/..."
                    className="w-full pl-10 p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#577a2c] outline-none"
                    onChange={(e) => setNewClientData({ ...newClientData, google_maps_link: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                  Horario de Atención
                </label>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold mb-1 block uppercase">Desde</label>
                      <select
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                        value={scheduleConfig.diaInicio}
                        onChange={(e) => setScheduleConfig({ ...scheduleConfig, diaInicio: e.target.value })}
                      >
                        {DIAS_SEMANA.map((dia) => <option key={dia}>{dia}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold mb-1 block uppercase">Hasta</label>
                      <select
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                        value={scheduleConfig.diaFin}
                        onChange={(e) => setScheduleConfig({ ...scheduleConfig, diaFin: e.target.value })}
                      >
                        {DIAS_SEMANA.map((dia) => <option key={dia}>{dia}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold mb-1 block uppercase">Apertura</label>
                      <input
                        type="time"
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                        value={scheduleConfig.apertura}
                        onChange={(e) => setScheduleConfig({ ...scheduleConfig, apertura: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold mb-1 block uppercase">Cierre</label>
                      <input
                        type="time"
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                        value={scheduleConfig.cierre}
                        onChange={(e) => setScheduleConfig({ ...scheduleConfig, cierre: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-100 my-2" />

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">WhatsApp</label>
                <input
                  placeholder="+549..."
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#577a2c] outline-none"
                  onChange={(e) => setNewClientData({ ...newClientData, whatsapp: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-3 font-bold rounded-xl flex justify-center items-center gap-2 bg-[#577a2c] hover:bg-[#486423] shadow-lg shadow-[#577a2c]/20 text-white disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {creating ? <Loader2 className="animate-spin" /> : "Crear Cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL DE BLOQUES ───────────────────────────────────────────────────── */}
      {blocksPanelNegocio && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h3 className="font-bold text-slate-900">Bloques de {blocksPanelNegocio.nombre}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Activá las funciones que necesita este negocio.
                </p>
              </div>
              <button
                onClick={() => setBlocksPanelNegocio(null)}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <BlockMarketplace
                negocioId={blocksPanelNegocio.id}
                isAgency={true}  // usa precios de agencia
              />
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE EDITOR WEB ────────────────────────────────────────────────── */}
      {editingClient && (
        <WebEditor
          initialData={editingClient}
          model="negocio"
          onClose={() => setEditingClient(null)}
          onSave={() => cargarClientes(agency.id)}
        />
      )}
    </div>
  );
}