"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import {
  ShieldCheck, Plus, LogOut, Users, Loader2, Palette,
  ExternalLink, MapPin, Clock, Trash2, Puzzle, X,
  CalendarDays, Star, Images, Globe, ChevronRight,
  ArrowLeft, CheckCircle, Layers,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import WebEditor from "./WebEditor";
import BlockMarketplace from "@/components/dashboards/BlockMarketplace";

const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const SELECTABLE_BLOCKS = [
  { id: "calendar", name: "Turnos & Agenda",    desc: "Reservas online, servicios, equipo",     price: "$2.500/mes" },
  { id: "reviews",  name: "Valoraciones",        desc: "Reseñas de clientes, Google Reviews",    price: "$700/mes"   },
  { id: "gallery",  name: "Galería",             desc: "Fotos de trabajos y portfolio",           price: "$800/mes"   },
  { id: "crm",      name: "Base de Clientes",    desc: "Historial y datos de clientes",           price: "$1.500/mes" },
];

const TEMPLATES = [
  {
    id: "confirm_booking",
    name: "Turnos Online",
    desc: "Landing + agenda de turnos + valoraciones. Ideal para peluquerías, clínicas, estudios.",
    blocks: ["landing", "calendar", "reviews"],
    color: "from-blue-500 to-indigo-600",
  },
];

export default function DashboardAgencia() {
  const supabase = createClient();
  const router   = useRouter();
  const params   = useParams();

  const [agency,   setAgency]   = useState<any>(null);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showModal,setShowModal]= useState(false);
  const [modalStep, setModalStep] = useState<"choice" | "blocks" | "template" | "form">("choice");
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>(["landing"]);
  const [chosenTemplate, setChosenTemplate] = useState<string | null>(null);

  const [newClientData, setNewClientData] = useState({ email: "", password: "", nombre: "", whatsapp: "", direccion: "", google_maps_link: "" });
  const [scheduleConfig, setScheduleConfig] = useState({ diaInicio: "Lunes", diaFin: "Viernes", apertura: "09:00", cierre: "18:00" });
  const [creating,   setCreating]   = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [blocksPanelNegocio, setBlocksPanelNegocio] = useState<{ id: number; nombre: string } | null>(null);

  useEffect(() => { checkAgencySession(); }, []);

  async function checkAgencySession() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { router.push("/login"); return; }
    const { data: agencyData, error } = await supabase.from("agencies").select("*").eq("slug", params.slug).single();
    if (error || !agencyData || agencyData.email !== user.email) { router.push("/login"); return; }
    setAgency(agencyData);
    cargarClientes(agencyData.id);
  }

  async function cargarClientes(agencyId: number) {
    const { data } = await supabase.from("negocios").select("*").eq("agency_id", agencyId).order("created_at", { ascending: false });
    if (data) setClientes(data);
    setLoading(false);
  }

  const handleDeleteClient = async (id: number, nombre: string) => {
    if (!window.confirm(`⚠️ ¿Eliminar "${nombre}"?\n\nSe borrarán PERMANENTEMENTE sus turnos, reseñas, bloques y configuración.\n\nNo se puede deshacer.`)) return;
    setDeletingId(id);
    try {
      await supabase.from("tenant_blocks").delete().eq("negocio_id", id);
      await supabase.from("resenas").delete().eq("negocio_id", id);
      await supabase.from("turnos").delete().eq("negocio_id", id);
      const { error } = await supabase.from("negocios").delete().eq("id", id);
      if (error) throw error;
      setClientes(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      alert("Error al eliminar: " + (err?.message || String(err)));
    }
    setDeletingId(null);
  };

  const toggleEditorAccess = async (clienteId: number, currentStatus: boolean) => {
    const { error } = await supabase.from("negocios").update({ editor_enabled: !currentStatus }).eq("id", clienteId);
    if (!error) setClientes(prev => prev.map(c => c.id === clienteId ? { ...c, editor_enabled: !currentStatus } : c));
    else alert("Error: " + error.message);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: newClientData.email, password: newClientData.password,
      options: { data: { role: "cliente" } },
    });
    if (authError) { alert("Error Auth: " + authError.message); setCreating(false); return; }
    if (authData.user) {
      const slug = newClientData.nombre.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-") + "-" + Math.floor(Math.random() * 1000);
      const { data: nuevoNegocio, error: dbError } = await supabase.from("negocios").insert([{
        user_id: authData.user.id, email: newClientData.email, agency_id: agency.id,
        nombre: newClientData.nombre, slug, category: "confirm_booking",
        whatsapp: newClientData.whatsapp, direccion: newClientData.direccion,
        google_maps_link: newClientData.google_maps_link,
        horarios: `${scheduleConfig.diaInicio} a ${scheduleConfig.diaFin}: ${scheduleConfig.apertura} - ${scheduleConfig.cierre}`,
        mensaje_bienvenida: `Bienvenidos a ${newClientData.nombre}`,
        color_principal: "#000000", estado_plan: "activo",
        config_web: { hero: { titulo: newClientData.nombre, mostrar: true } },
        system: "modular",
      }]).select("id").single();
      if (dbError) { alert("Error BD: " + dbError.message); setCreating(false); return; }
      if (nuevoNegocio?.id) {
        await supabase.from("tenant_blocks").insert(
          selectedBlocks.map(blockId => ({ negocio_id: nuevoNegocio.id, block_id: blockId, active: true, activated_at: new Date().toISOString(), config: {} }))
        );
      }
      resetModal();
      cargarClientes(agency.id);
    }
    setCreating(false);
  };

  const resetModal = () => {
    setShowModal(false); setModalStep("choice");
    setSelectedBlocks(["landing"]); setChosenTemplate(null);
    setNewClientData({ email: "", password: "", nombre: "", whatsapp: "", direccion: "", google_maps_link: "" });
  };
  const toggleBlock = (id: string) => {
    if (id === "landing") return;
    setSelectedBlocks(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);
  };
  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login"); router.refresh(); };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#577a2c]" /></div>;

  return (
    <div className="min-h-screen bg-[#ede9dd] text-slate-900 font-sans">
      <header className="bg-[#ede9dd]/50 backdrop-blur-md border-b border-slate-200 px-6 lg:px-8 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-[#577a2c] text-white p-2 rounded-lg shadow-md"><ShieldCheck size={24} /></div>
          <div><h1 className="text-xl font-bold">{agency?.name || agency?.nombre_agencia}</h1><p className="text-xs text-slate-500">Panel de Control</p></div>
        </div>
        <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-red-600 flex items-center gap-2 font-medium px-3 py-2 hover:bg-red-50 rounded-lg transition-colors"><LogOut size={16} /> Salir</button>
      </header>

      <main className="max-w-7xl mx-auto p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2"><Users className="text-slate-400" /> Tus Clientes</h2>
            <p className="text-slate-500 text-sm mt-1">Gestiona las webs y bloques de tus negocios.</p>
          </div>
          <button onClick={() => { setShowModal(true); setModalStep("choice"); }}
            className="bg-[#577a2c] hover:bg-[#486423] text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg hover:-translate-y-0.5">
            <Plus size={20} /> Nuevo Cliente
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clientes.map(cliente => (
            <div key={cliente.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-[#b0c97d] transition-all p-6 flex flex-col justify-between group relative">
              <button onClick={() => handleDeleteClient(cliente.id, cliente.nombre)} disabled={deletingId === cliente.id}
                className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-full transition-all">
                {deletingId === cliente.id ? <Loader2 size={18} className="animate-spin text-red-600" /> : <Trash2 size={18} />}
              </button>
              <div>
                <div className="flex justify-between items-start mb-4 pr-8">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md" style={{ backgroundColor: cliente.color_principal || "#000" }}>
                    {cliente.nombre.substring(0, 1)}
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold border ${cliente.estado_plan === "activo" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                    {cliente.estado_plan}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-[#71a22e] transition-colors pr-6">{cliente.nombre}</h3>
                <p className="text-sm text-slate-400 mb-2 truncate font-mono bg-slate-50 inline-block px-2 py-0.5 rounded">{cliente.email}</p>
                <div className="flex items-center justify-between mt-4 p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Acceso al Editor</span>
                  <button onClick={() => toggleEditorAccess(cliente.id, cliente.editor_enabled)}
                    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${cliente.editor_enabled ? "bg-[#577a2c]" : "bg-slate-300"}`}>
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${cliente.editor_enabled ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
                <div className="text-xs text-slate-500 space-y-1 mb-4 border-t border-slate-100 pt-2">
                  {cliente.horarios  && <p className="flex items-center gap-1"><Clock  size={12} /> {cliente.horarios}</p>}
                  {cliente.direccion && <p className="flex items-center gap-1"><MapPin size={12} /> {cliente.direccion}</p>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-auto pt-4 border-t border-slate-100">
                <button onClick={() => setEditingClient(cliente)} className="py-2.5 bg-[#577a2c]/10 hover:bg-[#577a2c]/20 rounded-xl text-xs font-bold text-[#577a2c] flex items-center justify-center gap-1 border border-[#577a2c]/20 transition-colors">
                  <Palette size={13} /> Diseñar
                </button>
                <button onClick={() => setBlocksPanelNegocio({ id: cliente.id, nombre: cliente.nombre })} className="py-2.5 bg-[#8dbb38]/10 hover:bg-[#8dbb38]/20 rounded-xl text-xs font-bold text-[#577a2c] flex items-center justify-center gap-1 border border-[#8dbb38]/40 transition-colors">
                  <Puzzle size={13} /> Bloques
                </button>
                <a href={cliente.custom_domain ? `https://${cliente.custom_domain}` : `/${cliente.slug}`} target="_blank"
                  className="py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1 border border-slate-200 transition-colors">
                  <ExternalLink size={13} /> Ver Web
                </a>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* ── MODAL NUEVO NEGOCIO ─────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-300 relative">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                {modalStep !== "choice" && (
                  <button onClick={() => setModalStep(modalStep === "form" ? (chosenTemplate ? "template" : "blocks") : "choice")}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                    <ArrowLeft size={18} />
                  </button>
                )}
                <div>
                  <h3 className="font-bold text-slate-900">
                    {modalStep === "choice" && "Nuevo Cliente"}
                    {modalStep === "blocks" && "Elegí los bloques"}
                    {modalStep === "template" && "Elegí una plantilla"}
                    {modalStep === "form" && "Datos del negocio"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {modalStep === "choice" && "¿Cómo querés empezar?"}
                    {modalStep === "blocks" && `${selectedBlocks.length} bloques seleccionados · landing siempre incluido`}
                    {modalStep === "template" && "Bloques preconfigurados, luego podés agregar más"}
                    {modalStep === "form" && "Completá los datos para crear el negocio"}
                  </p>
                </div>
              </div>
              <button onClick={resetModal} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><X size={20} /></button>
            </div>

            <div className="p-6">
              {/* ── Paso 0: Elección ── */}
              {modalStep === "choice" && (
                <div className="space-y-3">
                  {[
                    { step: "blocks" as const, icon: <Layers size={24} />, title: "Crear desde cero", desc: "Elegís los bloques que querés activar" },
                    { step: "template" as const, icon: <Globe size={24} />, title: "Usar una plantilla", desc: "Plantillas listas con bloques preconfigurados" },
                  ].map(opt => (
                    <button key={opt.step} onClick={() => { if (opt.step === "blocks") setSelectedBlocks(["landing"]); setModalStep(opt.step); }}
                      className="w-full p-5 border-2 border-slate-200 rounded-xl hover:border-[#577a2c] hover:bg-[#577a2c]/5 transition-all group text-left flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 group-hover:bg-[#577a2c]/10 rounded-xl flex items-center justify-center shrink-0 text-slate-500 group-hover:text-[#577a2c] transition-colors">
                        {opt.icon}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-900 group-hover:text-[#577a2c] transition-colors">{opt.title}</p>
                        <p className="text-sm text-slate-500 mt-0.5">{opt.desc}</p>
                      </div>
                      <ChevronRight size={18} className="text-slate-300 group-hover:text-[#577a2c] shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* ── Paso 1a: Bloques ── */}
              {modalStep === "blocks" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-[#577a2c]/5 border border-[#577a2c]/20 rounded-xl">
                    <div className="w-9 h-9 bg-[#577a2c]/10 rounded-lg flex items-center justify-center shrink-0">
                      <Globe size={16} className="text-[#577a2c]" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-zinc-800">Landing Page</p>
                      <p className="text-xs text-zinc-500">Página pública · Gratis · Siempre activo</p>
                    </div>
                    <CheckCircle size={16} className="text-[#577a2c]" />
                  </div>
                  {SELECTABLE_BLOCKS.map(block => {
                    const isSel = selectedBlocks.includes(block.id);
                    return (
                      <button key={block.id} onClick={() => toggleBlock(block.id)}
                        className={`w-full flex items-center gap-3 p-3 border-2 rounded-xl transition-all text-left ${isSel ? "border-[#577a2c] bg-[#577a2c]/5" : "border-slate-200 hover:border-slate-300"}`}>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-zinc-900">{block.name}</p>
                          <p className="text-xs text-zinc-500 truncate">{block.desc} · {block.price}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${isSel ? "border-[#577a2c] bg-[#577a2c]" : "border-slate-300"}`}>
                          {isSel && <CheckCircle size={10} className="text-white" />}
                        </div>
                      </button>
                    );
                  })}
                  <button onClick={() => setModalStep("form")}
                    className="w-full mt-2 py-3 bg-[#577a2c] hover:bg-[#486423] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all">
                    Continuar <ChevronRight size={16} />
                  </button>
                </div>
              )}

              {/* ── Paso 1b: Plantillas ── */}
              {modalStep === "template" && (
                <div className="space-y-3">
                  {TEMPLATES.map(tmpl => (
                    <button key={tmpl.id}
                      onClick={() => { setSelectedBlocks(tmpl.blocks); setChosenTemplate(tmpl.id); setModalStep("form"); }}
                      className="w-full p-5 border-2 border-slate-200 rounded-xl hover:border-[#577a2c] hover:bg-[#577a2c]/5 transition-all text-left flex items-start gap-4 group">
                      <div className={`w-14 h-14 bg-gradient-to-br ${tmpl.color} rounded-xl flex items-center justify-center text-white shrink-0 shadow-md`}>
                        <CalendarDays size={28} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-900 group-hover:text-[#577a2c] transition-colors">{tmpl.name}</p>
                        <p className="text-sm text-slate-500 mt-1">{tmpl.desc}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {tmpl.blocks.map(b => <span key={b} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">{b}</span>)}
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-300 group-hover:text-[#577a2c] shrink-0 mt-1" />
                    </button>
                  ))}
                  <p className="text-center text-xs text-slate-400 pt-2">Más plantillas próximamente.</p>
                </div>
              )}

              {/* ── Paso 2: Formulario ── */}
              {modalStep === "form" && (
                <form onSubmit={handleCreateClient} className="space-y-4">
                  <div className="flex flex-wrap gap-1 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase w-full mb-1">Bloques a activar:</span>
                    {selectedBlocks.map(b => <span key={b} className="text-[11px] font-bold bg-[#577a2c]/10 text-[#577a2c] px-2 py-0.5 rounded-full capitalize">{b}</span>)}
                  </div>
                  {[
                    { label: "Nombre del Negocio", field: "nombre", type: "text",     placeholder: "Ej: Barbería Vintage" },
                    { label: "Email (Login)",        field: "email",  type: "email",    placeholder: "cliente@gmail.com" },
                    { label: "Contraseña",           field: "password",type: "password",placeholder: "******" },
                  ].map(f => (
                    <div key={f.field}>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{f.label}</label>
                      <input required type={f.type} placeholder={f.placeholder}
                        className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#577a2c] outline-none text-zinc-900"
                        onChange={e => setNewClientData({ ...newClientData, [f.field]: e.target.value })} />
                    </div>
                  ))}
                  <div className="h-px bg-slate-100" />
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Dirección</label>
                    <div className="relative"><MapPin className="absolute left-3 top-3 text-slate-400" size={16} />
                      <input placeholder="Av. Siempre Viva 123" className="w-full pl-10 p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#577a2c] outline-none text-zinc-900"
                        onChange={e => setNewClientData({ ...newClientData, direccion: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Link Google Maps</label>
                    <div className="relative"><ExternalLink className="absolute left-3 top-3 text-slate-400" size={16} />
                      <input placeholder="https://goo.gl/maps/..." className="w-full pl-10 p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#577a2c] outline-none text-zinc-900"
                        onChange={e => setNewClientData({ ...newClientData, google_maps_link: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Horario</label>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        {(["diaInicio","diaFin"] as const).map(k => (
                          <div key={k}>
                            <label className="text-[10px] text-slate-400 font-bold mb-1 block uppercase">{k === "diaInicio" ? "Desde" : "Hasta"}</label>
                            <select className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                              value={scheduleConfig[k]} onChange={e => setScheduleConfig({ ...scheduleConfig, [k]: e.target.value })}>
                              {DIAS_SEMANA.map(d => <option key={d}>{d}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {(["apertura","cierre"] as const).map(k => (
                          <div key={k}>
                            <label className="text-[10px] text-slate-400 font-bold mb-1 block uppercase">{k === "apertura" ? "Apertura" : "Cierre"}</label>
                            <input type="time" className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                              value={scheduleConfig[k]} onChange={e => setScheduleConfig({ ...scheduleConfig, [k]: e.target.value })} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">WhatsApp</label>
                    <input placeholder="+549..." className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#577a2c] outline-none text-zinc-900"
                      onChange={e => setNewClientData({ ...newClientData, whatsapp: e.target.value })} />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={resetModal} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                    <button type="submit" disabled={creating}
                      className="flex-1 py-3 font-bold rounded-xl flex justify-center items-center gap-2 bg-[#577a2c] hover:bg-[#486423] text-white disabled:opacity-60 transition-all">
                      {creating ? <Loader2 className="animate-spin" size={18} /> : "Crear Cliente"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL BLOQUES ─────────────────────────────────────────────────── */}
      {blocksPanelNegocio && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
              <div><h3 className="font-bold text-slate-900">Bloques de {blocksPanelNegocio.nombre}</h3><p className="text-xs text-slate-500 mt-0.5">Activá las funciones que necesita este negocio.</p></div>
              <button onClick={() => setBlocksPanelNegocio(null)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6"><BlockMarketplace negocioId={blocksPanelNegocio.id} isAgency={true} /></div>
          </div>
        </div>
      )}

      {/* ── EDITOR ────────────────────────────────────────────────────────── */}
      {editingClient && (
        <WebEditor initialData={editingClient} model="negocio"
          onClose={() => setEditingClient(null)} onSave={() => cargarClientes(agency.id)} />
      )}
    </div>
  );
}