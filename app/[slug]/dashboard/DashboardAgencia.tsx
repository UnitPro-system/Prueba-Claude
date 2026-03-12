"use client";
// app/[slug]/dashboard/DashboardAgencia.tsx

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import {
  ShieldCheck, Plus, LogOut, Users, Loader2, Palette,
  ExternalLink, MapPin, Clock, Trash2, Puzzle, X,
  CalendarDays, Globe, ChevronRight, ArrowLeft, CheckCircle,
  Layers, Pencil, Save, Phone, KeyRound, Eye, EyeOff,
  Lock, Settings, Upload, ImageIcon, Mail,Pause, Play
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import WebEditor from "./WebEditor";
import BlockMarketplace from "@/components/dashboards/BlockMarketplace";
import LandingAgenciaEditor from "./LandingAgenciaEditor";
import {
  changeClientPassword,
  changeClientEmail,
  updateAgencyProfile,
  changeAgencyPassword,
  toggleClientPlanStatus
} from "@/app/actions/admin/agency-actions";

const PRIMARY    = "#577a2c";
const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const SELECTABLE_BLOCKS = [
  { id: "calendar", name: "Turnos & Agenda",   desc: "Reservas online, servicios, equipo",   price: "25 UC/mes" },
  { id: "reviews",  name: "Valoraciones",       desc: "Reseñas de clientes, Google Reviews",  price: "7 UC/mes"  },
  { id: "gallery",  name: "Galería",            desc: "Fotos de trabajos y portfolio",         price: "8 UC/mes"  },
  { id: "crm",      name: "Base de Clientes",   desc: "Historial y datos de clientes",         price: "15 UC/mes" },
];

const TEMPLATES = [
  {
    id: "confirm_booking", name: "Turnos Online",
    desc: "Landing + agenda de turnos + valoraciones. Ideal para peluquerías, clínicas, estudios.",
    blocks: ["landing", "calendar", "reviews"],
    color: "from-blue-500 to-indigo-600",
  },
];

// ─── Pequeño helper de campo con label ───────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

export default function DashboardAgencia() {
  const supabase = createClient();
  const router   = useRouter();
  const params   = useParams();

  const [agency,   setAgency]   = useState<any>(null);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);

  // ── Modal nuevo cliente ───────────────────────────────────────────────────
  const [showModal,   setShowModal]   = useState(false);
  const [modalStep,   setModalStep]   = useState<"choice"|"blocks"|"template"|"form">("choice");
  const [selBlocks,   setSelBlocks]   = useState<string[]>(["landing"]);
  const [newData,     setNewData]     = useState({ email:"", password:"", nombre:"", whatsapp:"", direccion:"", google_maps_link:"" });
  const [schedCfg,    setSchedCfg]    = useState({ diaInicio:"Lunes", diaFin:"Viernes", apertura:"09:00", cierre:"18:00" });
  const [creating,    setCreating]    = useState(false);
  const [deletingId,  setDeletingId]  = useState<number|null>(null);
  const [suspendingId, setSuspendingId] = useState<number|null>(null);

  const handleToggleStatus = async (id: number, currentStatus: string, nombre: string) => {
    const actionText = currentStatus === "activo" ? "suspender" : "reactivar";
    if (!window.confirm(`¿Seguro que deseas ${actionText} a "${nombre}"?\n\nSi lo suspendes, puedes bloquear su acceso más adelante.`)) return;
    
    setSuspendingId(id);
    const res = await toggleClientPlanStatus(id, currentStatus);
    
    if (res.success) {
      // Actualizamos el estado local para que la UI se refleje de inmediato
      setClientes(prev => prev.map(c => c.id === id ? { ...c, estado_plan: res.newStatus } : c));
    } else {
      alert("Error al cambiar el estado: " + res.error);
    }
    setSuspendingId(null);
  };

  // ── Editor de negocio ─────────────────────────────────────────────────────
  const [editingClient,       setEditingClient]       = useState<any>(null);
  const [blocksPanelNegocio,  setBlocksPanelNegocio]  = useState<{id:number;nombre:string}|null>(null);

  // ── Modal editar cliente (tabs: datos / contraseña) ───────────────────────
  const [qeClient,  setQeClient]  = useState<any>(null);       // quick-edit client
  const [qeTab,     setQeTab]     = useState<"datos"|"pass">("datos");
  const [qeData,    setQeData]    = useState({ nombre:"", whatsapp:"", email:"", direccion:"" });
  const [qeSaving,  setQeSaving]  = useState(false);
  const [qeSaved,   setQeSaved]   = useState(false);
  const [qeError,   setQeError]   = useState("");
  // contraseña
  const [newPass,   setNewPass]   = useState("");
  const [showPass,  setShowPass]  = useState(false);
  const [passSaving,setPassSaving]= useState(false);
  const [passSaved, setPassSaved] = useState(false);
  const [passError, setPassError] = useState("");

  // ── Modal configuración de agencia ───────────────────────────────────────
  const [showAgencyCfg,  setShowAgencyCfg]  = useState(false);
  const [agCfgTab,       setAgCfgTab]       = useState<"perfil"|"pass">("perfil");
  const [agCfgData,      setAgCfgData]      = useState({ nombre:"", email:"", logo_url:"" });
  const [agCfgSaving,    setAgCfgSaving]    = useState(false);
  const [agCfgSaved,     setAgCfgSaved]     = useState(false);
  const [agCfgError,     setAgCfgError]     = useState("");
  const [agNewPass,      setAgNewPass]      = useState("");
  const [agShowPass,     setAgShowPass]     = useState(false);
  const [agPassSaving,   setAgPassSaving]   = useState(false);
  const [agPassSaved,    setAgPassSaved]    = useState(false);
  const [agPassError,    setAgPassError]    = useState("");
  const [uploadingLogo,  setUploadingLogo]  = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // ── Landing de agencia ────────────────────────────────────────────────────
  const [showLandingEditor, setShowLandingEditor] = useState(false);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => { checkSession(); }, []);

  async function checkSession() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { router.push("/login"); return; }
    const { data: ag, error } = await supabase.from("agencies").select("*").eq("slug", params.slug).single();
    if (error || !ag || ag.email !== user.email) { router.push("/login"); return; }
    setAgency(ag);
    setAgCfgData({ nombre: ag.name || ag.nombre_agencia || "", email: ag.email || "", logo_url: ag.logo_url || "" });
    cargarClientes(ag.id);
  }

  async function cargarClientes(agencyId: number) {
    const { data } = await supabase.from("negocios").select("*")
      .eq("agency_id", agencyId)
      .neq("is_agency_site", true)           // excluir la landing propia
      .order("created_at", { ascending: false });
    if (data) setClientes(data);
    setLoading(false);
  }

  // ── Delete cliente ────────────────────────────────────────────────────────
  const handleDelete = async (id: number, nombre: string) => {
    if (!window.confirm(`⚠️ ¿Eliminar "${nombre}"?\n\nSe borrarán PERMANENTEMENTE sus turnos, reseñas, bloques y configuración.\n\nNo se puede deshacer.`)) return;
    setDeletingId(id);
    try {
      await supabase.from("tenant_blocks").delete().eq("negocio_id", id);
      await supabase.from("resenas").delete().eq("negocio_id", id);
      await supabase.from("turnos").delete().eq("negocio_id", id);
      const { error } = await supabase.from("negocios").delete().eq("id", id);
      if (error) throw error;
      setClientes(prev => prev.filter(c => c.id !== id));
    } catch (err: any) { alert("Error al eliminar: " + (err?.message || String(err))); }
    setDeletingId(null);
  };

  const toggleEditorAccess = async (id: number, current: boolean) => {
    const { error } = await supabase.from("negocios").update({ editor_enabled: !current }).eq("id", id);
    if (!error) setClientes(prev => prev.map(c => c.id === id ? { ...c, editor_enabled: !current } : c));
  };

  // ── Crear cliente ─────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: newData.email, password: newData.password,
      options: { data: { role: "cliente" } },
    });
    if (authErr) { alert("Error Auth: " + authErr.message); setCreating(false); return; }
    if (authData.user) {
      const slug = newData.nombre.toLowerCase().trim()
        .replace(/[^\w\s-]/g,"").replace(/[\s_-]+/g,"-") + "-" + Math.floor(Math.random()*1000);
      const { data: neg, error: dbErr } = await supabase.from("negocios").insert([{
        user_id: authData.user.id, email: newData.email, agency_id: agency.id,
        nombre: newData.nombre, slug, category:"confirm_booking",
        whatsapp: newData.whatsapp, direccion: newData.direccion,
        google_maps_link: newData.google_maps_link,
        horarios: `${schedCfg.diaInicio} a ${schedCfg.diaFin}: ${schedCfg.apertura} - ${schedCfg.cierre}`,
        mensaje_bienvenida: `Bienvenidos a ${newData.nombre}`,
        color_principal: "#000000", estado_plan: "activo",
        config_web: { hero: { titulo: newData.nombre, mostrar: true } },
        system: "modular",
      }]).select("id").single();
      if (dbErr) { alert("Error BD: " + dbErr.message); setCreating(false); return; }
      if (neg?.id) {
        await supabase.from("tenant_blocks").insert(
          selBlocks.map(bid => ({ negocio_id: neg.id, block_id: bid, active: true, activated_at: new Date().toISOString(), config: {} }))
        );
      }
      resetModal();
      cargarClientes(agency.id);
    }
    setCreating(false);
  };

  const resetModal = () => {
    setShowModal(false); setModalStep("choice");
    setSelBlocks(["landing"]);
    setNewData({ email:"", password:"", nombre:"", whatsapp:"", direccion:"", google_maps_link:"" });
  };

  const toggleBlock = (id: string) => {
    if (id === "landing") return;
    setSelBlocks(prev => prev.includes(id) ? prev.filter(b=>b!==id) : [...prev, id]);
  };

  // ── Quick-edit cliente ────────────────────────────────────────────────────
  const openQE = (c: any) => {
    setQeClient(c);
    setQeTab("datos");
    setQeData({ nombre: c.nombre||"", whatsapp: c.whatsapp||"", email: c.email||"", direccion: c.direccion||"" });
    setQeSaved(false); setQeError(""); setPassSaved(false); setPassError(""); setNewPass("");
  };

  const handleSaveQE = async () => {
    if (!qeClient) return;
    setQeSaving(true); setQeError("");
    // Guardar nombre, whatsapp, dirección
    const { error } = await supabase.from("negocios").update({
      nombre: qeData.nombre, whatsapp: qeData.whatsapp, direccion: qeData.direccion,
    }).eq("id", qeClient.id);

    if (error) { setQeError(error.message); setQeSaving(false); return; }

    // Si cambió el email, usar server action
    if (qeData.email !== qeClient.email) {
      const res = await changeClientEmail(qeClient.id, qeData.email);
      if (!res.success) { setQeError(res.error || "Error al cambiar email."); setQeSaving(false); return; }
    }

    setQeSaved(true);
    setClientes(prev => prev.map(c => c.id === qeClient.id
      ? { ...c, nombre: qeData.nombre, whatsapp: qeData.whatsapp, direccion: qeData.direccion, email: qeData.email }
      : c
    ));
    setTimeout(() => { setQeClient(null); setQeSaved(false); }, 1200);
    setQeSaving(false);
  };

  const handleChangeClientPass = async () => {
    if (!qeClient) return;
    setPassError(""); setPassSaving(true);
    const res = await changeClientPassword(qeClient.id, newPass);
    if (res.success) { setPassSaved(true); setNewPass(""); setTimeout(()=>setPassSaved(false),2500); }
    else setPassError(res.error || "Error inesperado.");
    setPassSaving(false);
  };

  // ── Config agencia ────────────────────────────────────────────────────────
  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !agency) return;
    setUploadingLogo(true);
    const ext  = file.name.split(".").pop();
    const path = `agency-logos/${agency.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("sites").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("sites").getPublicUrl(path);
      setAgCfgData(p => ({ ...p, logo_url: data.publicUrl }));
    } else { alert("Error subiendo logo: " + error.message); }
    setUploadingLogo(false);
    e.target.value = "";
  };

  const handleSaveAgencyCfg = async () => {
    if (!agency) return;
    setAgCfgSaving(true); setAgCfgError("");
    const userId = (await supabase.auth.getUser()).data.user?.id || "";
    const res = await updateAgencyProfile(agency.id, userId, {
      nombre:   agCfgData.nombre,
      email:    agCfgData.email !== agency.email ? agCfgData.email : undefined,
      logo_url: agCfgData.logo_url,
    });
    if (res.success) {
      setAgCfgSaved(true);
      setAgency((prev: any) => ({ ...prev, name: agCfgData.nombre, nombre_agencia: agCfgData.nombre, logo_url: agCfgData.logo_url }));
      setTimeout(() => setAgCfgSaved(false), 2000);
    } else { setAgCfgError(res.error || "Error al guardar."); }
    setAgCfgSaving(false);
  };

  const handleChangeAgencyPass = async () => {
    if (!agency) return;
    setAgPassError(""); setAgPassSaving(true);
    const userId = (await supabase.auth.getUser()).data.user?.id || "";
    const res = await changeAgencyPassword(userId, agNewPass);
    if (res.success) { setAgPassSaved(true); setAgNewPass(""); setTimeout(()=>setAgPassSaved(false),2500); }
    else setAgPassError(res.error || "Error inesperado.");
    setAgPassSaving(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login"); router.refresh(); };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#577a2c]" /></div>;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#ede9dd] text-slate-900 font-sans">

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header className="bg-[#ede9dd]/50 backdrop-blur-md border-b border-slate-200 px-6 lg:px-8 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          {agency?.logo_url
            ? <img src={agency.logo_url} alt="logo" className="w-10 h-10 rounded-lg object-cover shadow-md" />
            : <div className="bg-[#577a2c] text-white p-2 rounded-lg shadow-md"><ShieldCheck size={24} /></div>
          }
          <div>
            <h1 className="text-xl font-bold">{agency?.name || agency?.nombre_agencia}</h1>
            <p className="text-xs text-slate-500">Panel de Control</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Mi Landing */}
          <button onClick={() => setShowLandingEditor(true)}
            className="flex items-center gap-2 text-sm font-bold px-3 py-2 rounded-xl border border-[#577a2c]/30 text-[#577a2c] hover:bg-[#577a2c]/10 transition-colors">
            <Globe size={15} />
            <span className="hidden sm:inline">Mi Landing</span>
          </button>
          {/* Configuración */}
          <button onClick={() => setShowAgencyCfg(true)}
            className="flex items-center gap-2 text-sm font-bold px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-white transition-colors">
            <Settings size={15} />
            <span className="hidden sm:inline">Configuración</span>
          </button>
          {/* Salir */}
          <button onClick={handleLogout}
            className="text-sm text-slate-500 hover:text-red-600 flex items-center gap-2 font-medium px-3 py-2 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut size={16} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2"><Users className="text-slate-400" /> Tus Clientes</h2>
            <p className="text-slate-500 text-sm mt-1">Gestiona las webs y bloques de tus negocios.</p>
          </div>
          <button onClick={() => { setShowModal(true); setModalStep("choice"); }}
            className="text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg hover:-translate-y-0.5"
            style={{ backgroundColor: PRIMARY }}>
            <Plus size={20} /> Nuevo Cliente
          </button>
        </div>

        {/* ── GRID CLIENTES ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clientes.map(cliente => (
            <div key={cliente.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-[#b0c97d] transition-all p-6 flex flex-col justify-between group">
              <div>
                {/* Card header: avatar + badge + acciones */}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0"
                    style={{ backgroundColor: cliente.color_principal || "#000" }}>
                    {cliente.nombre.substring(0,1)}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold border ${
                      cliente.estado_plan === "activo"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-50 text-slate-500 border-slate-200"
                    }`}>
                      {cliente.estado_plan}
                    </span>
                    {/* Botón Suspender/Reactivar NUEVO */}
                    <button onClick={() => handleToggleStatus(cliente.id, cliente.estado_plan, cliente.nombre)} 
                      disabled={suspendingId === cliente.id}
                      className={`p-1.5 rounded-lg transition-all ${
                        cliente.estado_plan === "activo" 
                        ? "text-amber-500 hover:bg-amber-50 hover:text-amber-600" 
                        : "text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600"
                      }`}
                      title={cliente.estado_plan === "activo" ? "Suspender cliente" : "Reactivar cliente"}>
                      {suspendingId === cliente.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : cliente.estado_plan === "activo" ? (
                        <Pause size={14} />
                      ) : (
                        <Play size={14} />
                      )}
                    </button>
                    {/* Editar — ahora junto al badge, no absoluto */}
                    <button onClick={() => openQE(cliente)}
                      className="p-1.5 text-slate-300 hover:text-[#577a2c] hover:bg-[#577a2c]/10 rounded-lg transition-all"
                      title="Editar datos">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(cliente.id, cliente.nombre)} disabled={deletingId === cliente.id}
                      className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Eliminar">
                      {deletingId === cliente.id
                        ? <Loader2 size={14} className="animate-spin text-red-500" />
                        : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-[#71a22e] transition-colors">{cliente.nombre}</h3>
                <p className="text-sm text-slate-400 mb-3 truncate font-mono bg-slate-50 inline-block px-2 py-0.5 rounded">{cliente.email}</p>

                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100 mb-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Acceso al Editor</span>
                  <button onClick={() => toggleEditorAccess(cliente.id, cliente.editor_enabled)}
                    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${cliente.editor_enabled ? "bg-[#577a2c]" : "bg-slate-300"}`}>
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${cliente.editor_enabled ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>

                <div className="text-xs text-slate-500 space-y-1 border-t border-slate-100 pt-2">
                  {cliente.horarios  && <p className="flex items-center gap-1"><Clock size={12} /> {cliente.horarios}</p>}
                  {cliente.direccion && <p className="flex items-center gap-1"><MapPin size={12} /> {cliente.direccion}</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100">
                <button onClick={() => setEditingClient(cliente)}
                  className="py-2.5 bg-[#577a2c]/10 hover:bg-[#577a2c]/20 rounded-xl text-xs font-bold text-[#577a2c] flex items-center justify-center gap-1 border border-[#577a2c]/20 transition-colors">
                  <Palette size={13} /> Diseñar
                </button>
                <button onClick={() => setBlocksPanelNegocio({ id: cliente.id, nombre: cliente.nombre })}
                  className="py-2.5 bg-[#8dbb38]/10 hover:bg-[#8dbb38]/20 rounded-xl text-xs font-bold text-[#577a2c] flex items-center justify-center gap-1 border border-[#8dbb38]/40 transition-colors">
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

      {/* ── MODAL NUEVO CLIENTE ───────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                {modalStep !== "choice" && (
                  <button onClick={() => setModalStep("choice")} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"><ArrowLeft size={16} /></button>
                )}
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {{ choice:"Nuevo Cliente", blocks:"Elegí los bloques", template:"Elegí una plantilla", form:"Datos del negocio" }[modalStep]}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {{ choice:"¿Cómo querés empezar?", blocks:`${selBlocks.length} bloques · landing siempre incluido`, template:"Plantillas predefinidas", form:"Completá los datos" }[modalStep]}
                  </p>
                </div>
              </div>
              <button onClick={resetModal} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-6">
              {modalStep === "choice" && (
                <div className="space-y-3">
                  {[
                    { step:"blocks"   as const, icon:<Layers size={22}/>,  title:"Crear desde cero", desc:"Elegís los bloques que querés activar" },
                    { step:"template" as const, icon:<Globe  size={22}/>,  title:"Usar una plantilla", desc:"Bloques listos y preconfigurados" },
                  ].map(opt => (
                    <button key={opt.step} onClick={() => { if(opt.step==="blocks") setSelBlocks(["landing"]); setModalStep(opt.step); }}
                      className="w-full p-5 border-2 border-slate-200 rounded-xl hover:border-[#577a2c] hover:bg-[#577a2c]/5 transition-all group text-left flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 group-hover:bg-[#577a2c]/10 rounded-xl flex items-center justify-center shrink-0 text-slate-500 group-hover:text-[#577a2c] transition-colors">{opt.icon}</div>
                      <div className="flex-1"><p className="font-bold text-slate-900">{opt.title}</p><p className="text-sm text-slate-500 mt-0.5">{opt.desc}</p></div>
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-[#577a2c]" />
                    </button>
                  ))}
                </div>
              )}
              {modalStep === "blocks" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-[#577a2c]/5 border border-[#577a2c]/20 rounded-xl">
                    <Globe size={16} className="text-[#577a2c]" />
                    <div className="flex-1"><p className="font-bold text-sm">Landing Page</p><p className="text-xs text-zinc-500">Gratis · Siempre activo</p></div>
                    <CheckCircle size={16} className="text-[#577a2c]" />
                  </div>
                  {SELECTABLE_BLOCKS.map(b => {
                    const sel = selBlocks.includes(b.id);
                    return (
                      <button key={b.id} onClick={() => toggleBlock(b.id)}
                        className={`w-full flex items-center gap-3 p-3 border-2 rounded-xl transition-all text-left ${sel ? "border-[#577a2c] bg-[#577a2c]/5" : "border-slate-200 hover:border-slate-300"}`}>
                        <div className="flex-1 min-w-0"><p className="font-bold text-sm">{b.name}</p><p className="text-xs text-zinc-500 truncate">{b.desc} · {b.price}</p></div>
                        <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${sel ? "border-[#577a2c] bg-[#577a2c]" : "border-slate-300"}`}>
                          {sel && <CheckCircle size={10} className="text-white" />}
                        </div>
                      </button>
                    );
                  })}
                  <button onClick={() => setModalStep("form")} className="w-full mt-2 py-3 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all" style={{backgroundColor:PRIMARY}}>
                    Continuar <ChevronRight size={16} />
                  </button>
                </div>
              )}
              {modalStep === "template" && (
                <div className="space-y-3">
                  {TEMPLATES.map(t => (
                    <button key={t.id} onClick={() => { setSelBlocks(t.blocks); setModalStep("form"); }}
                      className="w-full p-5 border-2 border-slate-200 rounded-xl hover:border-[#577a2c] hover:bg-[#577a2c]/5 transition-all text-left flex items-start gap-4 group">
                      <div className={`w-14 h-14 bg-gradient-to-br ${t.color} rounded-xl flex items-center justify-center text-white shrink-0 shadow-md`}><CalendarDays size={26} /></div>
                      <div className="flex-1"><p className="font-bold text-slate-900 group-hover:text-[#577a2c]">{t.name}</p><p className="text-sm text-slate-500 mt-1">{t.desc}</p>
                        <div className="flex flex-wrap gap-1 mt-2">{t.blocks.map(b=><span key={b} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">{b}</span>)}</div>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-[#577a2c] mt-1" />
                    </button>
                  ))}
                </div>
              )}
              {modalStep === "form" && (
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="flex flex-wrap gap-1 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase w-full mb-1">Bloques a activar:</span>
                    {selBlocks.map(b=><span key={b} className="text-[11px] font-bold bg-[#577a2c]/10 text-[#577a2c] px-2 py-0.5 rounded-full capitalize">{b}</span>)}
                  </div>
                  {[
                    { label:"Nombre del Negocio", field:"nombre",   type:"text",     ph:"Ej: Barbería Vintage" },
                    { label:"Email (Login)",       field:"email",   type:"email",    ph:"cliente@gmail.com" },
                    { label:"Contraseña",          field:"password",type:"password", ph:"******" },
                  ].map(f=>(
                    <Field key={f.field} label={f.label}>
                      <input required type={f.type} placeholder={f.ph}
                        className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#577a2c] outline-none text-zinc-900"
                        onChange={e => setNewData({...newData, [f.field]: e.target.value})} />
                    </Field>
                  ))}
                  <div className="h-px bg-slate-100" />
                  <Field label="Dirección">
                    <div className="relative"><MapPin className="absolute left-3 top-3 text-slate-400" size={16} />
                      <input placeholder="Av. Siempre Viva 123" className="w-full pl-10 p-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#577a2c] text-zinc-900"
                        onChange={e=>setNewData({...newData,direccion:e.target.value})} /></div>
                  </Field>
                  <Field label="WhatsApp">
                    <input placeholder="+549..." className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#577a2c] text-zinc-900"
                      onChange={e=>setNewData({...newData,whatsapp:e.target.value})} />
                  </Field>
                  <Field label="Horario">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        {(["diaInicio","diaFin"] as const).map(k=>(
                          <div key={k}><label className="text-[10px] text-slate-400 font-bold mb-1 block uppercase">{k==="diaInicio"?"Desde":"Hasta"}</label>
                            <select className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm outline-none" value={schedCfg[k]} onChange={e=>setSchedCfg({...schedCfg,[k]:e.target.value})}>
                              {DIAS_SEMANA.map(d=><option key={d}>{d}</option>)}
                            </select></div>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {(["apertura","cierre"] as const).map(k=>(
                          <div key={k}><label className="text-[10px] text-slate-400 font-bold mb-1 block uppercase">{k==="apertura"?"Apertura":"Cierre"}</label>
                            <input type="time" className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm outline-none" value={schedCfg[k]} onChange={e=>setSchedCfg({...schedCfg,[k]:e.target.value})} /></div>
                        ))}
                      </div>
                    </div>
                  </Field>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={resetModal} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl">Cancelar</button>
                    <button type="submit" disabled={creating} className="flex-1 py-3 font-bold rounded-xl flex justify-center items-center gap-2 text-white disabled:opacity-60" style={{backgroundColor:PRIMARY}}>
                      {creating ? <Loader2 className="animate-spin" size={16}/> : "Crear Cliente"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EDITAR CLIENTE ──────────────────────────────────────────── */}
      {qeClient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow"
                  style={{backgroundColor: qeClient.color_principal||PRIMARY}}>
                  {qeClient.nombre?.charAt(0)||"N"}
                </div>
                <div><h3 className="font-bold text-sm">Editar cliente</h3><p className="text-xs text-slate-400">{qeClient.slug}</p></div>
              </div>
              <button onClick={()=>setQeClient(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={17} /></button>
            </div>
            {/* Tabs */}
            <div className="flex gap-1 mx-6 mt-4 bg-slate-100 p-1 rounded-xl">
              {([{id:"datos",label:"Datos",icon:<Pencil size={12}/>},{id:"pass",label:"Contraseña",icon:<KeyRound size={12}/>}] as {id:"datos"|"pass";label:string;icon:React.ReactNode}[]).map(t=>(
                <button key={t.id} onClick={()=>setQeTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${qeTab===t.id?"bg-white shadow text-slate-900":"text-slate-500 hover:text-slate-700"}`}>
                  {t.icon}{t.label}
                </button>
              ))}
            </div>
            {/* Tab Datos */}
            {qeTab==="datos" && (
              <>
                <div className="p-6 space-y-4">
                  <Field label="Nombre del negocio">
                    <input type="text" value={qeData.nombre} onChange={e=>setQeData(p=>({...p,nombre:e.target.value}))}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30 text-zinc-900" />
                  </Field>
                  <Field label="Email de login">
                    <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                      <input type="email" value={qeData.email} onChange={e=>setQeData(p=>({...p,email:e.target.value}))}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30 text-zinc-900"
                        placeholder="nuevo@email.com" />
                    </div>
                    {qeData.email !== qeClient.email && <p className="text-[11px] text-amber-600 mt-1">⚠️ Cambiar el email actualiza también el acceso de login.</p>}
                  </Field>
                  <Field label="WhatsApp">
                    <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                      <input type="text" value={qeData.whatsapp} onChange={e=>setQeData(p=>({...p,whatsapp:e.target.value}))}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30 text-zinc-900" placeholder="+549..." />
                    </div>
                  </Field>
                  <Field label="Dirección">
                    <div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                      <input type="text" value={qeData.direccion} onChange={e=>setQeData(p=>({...p,direccion:e.target.value}))}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30 text-zinc-900" placeholder="Av. Siempre Viva 123" />
                    </div>
                  </Field>
                  {qeError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">{qeError}</p>}
                </div>
                <div className="px-6 pb-6 flex gap-3">
                  <button onClick={()=>setQeClient(null)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl text-sm">Cancelar</button>
                  <button onClick={handleSaveQE} disabled={qeSaving||qeSaved}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${qeSaved?"bg-green-50 text-green-700 border border-green-200":"text-white hover:opacity-90"}`}
                    style={!qeSaved?{backgroundColor:PRIMARY}:{}}>
                    {qeSaving?<><Loader2 size={14} className="animate-spin"/>Guardando...</>:qeSaved?<><CheckCircle size={14}/>¡Guardado!</>:<><Save size={14}/>Guardar cambios</>}
                  </button>
                </div>
              </>
            )}
            {/* Tab Contraseña */}
            {qeTab==="pass" && (
              <>
                <div className="p-6 space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <Lock size={15} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">Cambia la contraseña del acceso al dashboard del cliente. El cambio es inmediato.</p>
                  </div>
                  <Field label="Nueva contraseña">
                    <div className="relative"><KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                      <input type={showPass?"text":"password"} value={newPass} onChange={e=>setNewPass(e.target.value)} minLength={6}
                        className="w-full pl-10 pr-12 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30 text-zinc-900"
                        placeholder="Mínimo 6 caracteres" />
                      <button type="button" onClick={()=>setShowPass(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
                        {showPass?<EyeOff size={15}/>:<Eye size={15}/>}
                      </button>
                    </div>
                  </Field>
                  {passError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">{passError}</p>}
                  {passSaved && <p className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200 flex items-center gap-2"><CheckCircle size={12}/>Contraseña actualizada.</p>}
                </div>
                <div className="px-6 pb-6 flex gap-3">
                  <button onClick={()=>setQeClient(null)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl text-sm">Cerrar</button>
                  <button onClick={handleChangeClientPass} disabled={passSaving||newPass.length<6||passSaved}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${passSaved?"bg-green-50 text-green-700 border border-green-200":newPass.length<6?"bg-slate-100 text-slate-400 cursor-not-allowed":"text-white hover:opacity-90"}`}
                    style={!passSaved&&newPass.length>=6?{backgroundColor:PRIMARY}:{}}>
                    {passSaving?<><Loader2 size={14} className="animate-spin"/>Cambiando...</>:passSaved?<><CheckCircle size={14}/>¡Listo!</>:<><KeyRound size={14}/>Cambiar contraseña</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL BLOQUES ─────────────────────────────────────────────────── */}
      {blocksPanelNegocio && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
              <div><h3 className="font-bold">Bloques de {blocksPanelNegocio.nombre}</h3><p className="text-xs text-slate-500 mt-0.5">Activá las funciones que necesita este negocio.</p></div>
              <button onClick={()=>setBlocksPanelNegocio(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={18}/></button>
            </div>
            <div className="p-6"><BlockMarketplace negocioId={blocksPanelNegocio.id} isAgency={true} /></div>
          </div>
        </div>
      )}

      {/* ── MODAL CONFIGURACIÓN AGENCIA ──────────────────────────────────── */}
      {showAgencyCfg && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{backgroundColor:PRIMARY}}><Settings size={16}/></div>
                <div><h3 className="font-bold text-sm">Configuración de la agencia</h3><p className="text-xs text-slate-400">{agency?.name||agency?.nombre_agencia}</p></div>
              </div>
              <button onClick={()=>setShowAgencyCfg(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={17}/></button>
            </div>
            {/* Tabs */}
            <div className="flex gap-1 mx-6 mt-4 bg-slate-100 p-1 rounded-xl">
              {([{id:"perfil",label:"Perfil",icon:<Settings size={12}/>},{id:"pass",label:"Contraseña",icon:<KeyRound size={12}/>}] as {id:"perfil"|"pass";label:string;icon:React.ReactNode}[]).map(t=>(
                <button key={t.id} onClick={()=>setAgCfgTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${agCfgTab===t.id?"bg-white shadow text-slate-900":"text-slate-500 hover:text-slate-700"}`}>
                  {t.icon}{t.label}
                </button>
              ))}
            </div>

            {/* Tab Perfil */}
            {agCfgTab==="perfil" && (
              <>
                <div className="p-6 space-y-4">
                  {/* Logo */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Logo de la agencia</label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 shrink-0">
                        {agCfgData.logo_url
                          ? <img src={agCfgData.logo_url} alt="logo" className="w-full h-full object-cover"/>
                          : <ImageIcon size={22} className="text-slate-300"/>}
                      </div>
                      <div className="flex-1">
                        <button onClick={()=>logoInputRef.current?.click()} disabled={uploadingLogo}
                          className="flex items-center gap-2 px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-[#577a2c] hover:text-[#577a2c] transition-all">
                          {uploadingLogo?<><Loader2 size={14} className="animate-spin"/>Subiendo...</>:<><Upload size={14}/>Subir logo</>}
                        </button>
                        <p className="text-[11px] text-slate-400 mt-1.5">PNG, JPG o WEBP. Se ve en el header.</p>
                      </div>
                      <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadLogo}/>
                    </div>
                  </div>
                  <Field label="Nombre de la agencia">
                    <input type="text" value={agCfgData.nombre} onChange={e=>setAgCfgData(p=>({...p,nombre:e.target.value}))}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30 text-zinc-900"/>
                  </Field>
                  <Field label="Email de login">
                    <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15}/>
                      <input type="email" value={agCfgData.email} onChange={e=>setAgCfgData(p=>({...p,email:e.target.value}))}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30 text-zinc-900"/>
                    </div>
                    {agCfgData.email!==agency?.email && <p className="text-[11px] text-amber-600 mt-1">⚠️ Cambiar el email actualiza también el acceso de login.</p>}
                  </Field>
                  {agCfgError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">{agCfgError}</p>}
                </div>
                <div className="px-6 pb-6 flex gap-3">
                  <button onClick={()=>setShowAgencyCfg(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl text-sm">Cancelar</button>
                  <button onClick={handleSaveAgencyCfg} disabled={agCfgSaving||agCfgSaved}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${agCfgSaved?"bg-green-50 text-green-700 border border-green-200":"text-white hover:opacity-90"}`}
                    style={!agCfgSaved?{backgroundColor:PRIMARY}:{}}>
                    {agCfgSaving?<><Loader2 size={14} className="animate-spin"/>Guardando...</>:agCfgSaved?<><CheckCircle size={14}/>¡Guardado!</>:<><Save size={14}/>Guardar</>}
                  </button>
                </div>
              </>
            )}

            {/* Tab Contraseña */}
            {agCfgTab==="pass" && (
              <>
                <div className="p-6 space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <Lock size={15} className="text-amber-500 shrink-0 mt-0.5"/>
                    <p className="text-xs text-amber-700">Cambia la contraseña de acceso al panel de agencia.</p>
                  </div>
                  <Field label="Nueva contraseña">
                    <div className="relative"><KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15}/>
                      <input type={agShowPass?"text":"password"} value={agNewPass} onChange={e=>setAgNewPass(e.target.value)} minLength={6}
                        className="w-full pl-10 pr-12 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30 text-zinc-900"
                        placeholder="Mínimo 6 caracteres"/>
                      <button type="button" onClick={()=>setAgShowPass(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1">
                        {agShowPass?<EyeOff size={15}/>:<Eye size={15}/>}
                      </button>
                    </div>
                  </Field>
                  {agPassError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">{agPassError}</p>}
                  {agPassSaved && <p className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200 flex items-center gap-2"><CheckCircle size={12}/>Contraseña actualizada.</p>}
                </div>
                <div className="px-6 pb-6 flex gap-3">
                  <button onClick={()=>setShowAgencyCfg(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl text-sm">Cerrar</button>
                  <button onClick={handleChangeAgencyPass} disabled={agPassSaving||agNewPass.length<6||agPassSaved}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${agPassSaved?"bg-green-50 text-green-700 border border-green-200":agNewPass.length<6?"bg-slate-100 text-slate-400 cursor-not-allowed":"text-white hover:opacity-90"}`}
                    style={!agPassSaved&&agNewPass.length>=6?{backgroundColor:PRIMARY}:{}}>
                    {agPassSaving?<><Loader2 size={14} className="animate-spin"/>Cambiando...</>:agPassSaved?<><CheckCircle size={14}/>¡Listo!</>:<><KeyRound size={14}/>Cambiar contraseña</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── EDITOR NEGOCIO ───────────────────────────────────────────────── */}
      {editingClient && (
        <WebEditor initialData={editingClient} model="negocio"
          onClose={() => setEditingClient(null)}
          onSave={() => { setEditingClient(null); cargarClientes(agency.id); }} />
      )}

      {/* ── EDITOR LANDING AGENCIA ───────────────────────────────────────── */}
      {showLandingEditor && agency && (
        <LandingAgenciaEditor
          agency={agency}
          onClose={() => setShowLandingEditor(false)}
          onSaved={() => {
            // Actualizar el objeto agency local con el nuevo landing_config si es necesario
          }}
        />
      )}
    </div>
  );
}