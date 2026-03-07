"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { ShieldCheck, Plus, LogOut, Users, Loader2, Palette, ExternalLink, MapPin, Clock, Trash2, AlertTriangle } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import WebEditor from "./WebEditor"; 
import { BusinessCategory } from "@/types/business-types";

const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export default function DashboardAgencia() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();

  const [agency, setAgency] = useState<any>(null);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  
  // ESTADO DEL FORMULARIO
  const [newClientData, setNewClientData] = useState({ 
    email: "", 
    password: "", 
    nombre: "", 
    whatsapp: "",
    direccion: "",
    google_maps_link: "" // <--- CAMPO NUEVO AGREGADO
  });

  // SELECTOR CATEGORIA
  const [newClientCategory, setNewClientCategory] = useState<BusinessCategory| null>(null);


  // ESTADO HORARIOS
  const [scheduleConfig, setScheduleConfig] = useState({
    diaInicio: "Lunes",
    diaFin: "Viernes",
    apertura: "09:00",
    cierre: "18:00"
  });

  const [creating, setCreating] = useState(false);
  // Estado para saber cual se esta borrando y mostrar spinner
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingClient, setEditingClient] = useState<any>(null);

  

  useEffect(() => {
    checkAgencySession();
  }, []);

  async function checkAgencySession() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !user.email) { router.push("/login"); return; }

    const { data: agencyData, error } = await supabase
        .from("agencies") // Asegúrate que tu tabla se llame 'agencies' o 'agencias' según tu DB
        .select("*")
        .eq("slug", params.slug)
        .single();
    
    if (error || !agencyData || agencyData.email !== user.email) {
        console.error("Acceso denegado.");
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
      .order('created_at', { ascending: false });
      
    if (data) setClientes(data);
    setLoading(false);
  }

  // --- FUNCIÓN DE ELIMINAR ---
  const handleDeleteClient = async (id: number, nombre: string) => {
    // 1. Confirmación visual simple
    const confirmado = window.confirm(
        `⚠️ ¿Estás seguro de eliminar a "${nombre}"?\n\nEsta acción borrará PERMANENTEMENTE:\n- Sus turnos\n- Sus leads\n- Su configuración web\n\nNo se puede deshacer.`
    );

    if (!confirmado) return;

    setDeletingId(id);

    // 2. Borrar de Supabase
    // Gracias al "ON DELETE CASCADE" que configuramos en SQL, esto borrará todo lo relacionado
    const { error } = await supabase
        .from("negocios")
        .delete()
        .eq("id", id);

    if (error) {
        alert("Error al eliminar: " + error.message);
    } else {
        // 3. Actualizar UI sin recargar
        setClientes(prev => prev.filter(c => c.id !== id));
    }
    
    setDeletingId(null);
  };

  const toggleEditorAccess = async (clienteId: number, currentStatus: boolean) => {
    const { error } = await supabase
        .from("negocios")
        .update({ editor_enabled: !currentStatus })
        .eq("id", clienteId);

    if (error) {
        alert("Error al actualizar permiso: " + error.message);
    } else {
        // Actualizamos el estado local para que el toggle cambie visualmente
        setClientes(prev => prev.map(c => 
            c.id === clienteId ? { ...c, editor_enabled: !currentStatus } : c
        ));
    }
};

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientCategory) {
        alert("Por favor, selecciona un tipo de negocio antes de continuar.");
        return;
    }
    setCreating(true);

    // 1. Auth (Esto queda igual)
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newClientData.email,
        password: newClientData.password,
        options: { data: { role: 'cliente' } }
    });

    if (authError) { 
      alert("Error Auth: " + authError.message); 
      setCreating(false); 
      return; 
    }

    if (authData.user) {
        const slug = newClientData.nombre.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-') + "-" + Math.floor(Math.random() * 1000);
        const horarioFinal = `${scheduleConfig.diaInicio} a ${scheduleConfig.diaFin}: ${scheduleConfig.apertura} - ${scheduleConfig.cierre}`;

        // --- LÓGICA DINÁMICA DE CONFIGURACIÓN ---
        let initialConfigWeb = {};

        // Si es CITAS, usamos tu estructura clásica
        if (newClientCategory === 'service_booking') {
            initialConfigWeb = {
                template: "modern",
                hero: { 
                    titulo: newClientData.nombre, 
                    subtitulo: "Reserva tu cita online con los mejores profesionales.", 
                    ctaTexto: "Reservar Turno", 
                    mostrar: true 
                },
                beneficios: { 
                    mostrar: true, 
                    titulo: "Por qué elegirnos", 
                    items: [{titulo: "Atención Premium", desc: "Nos enfocamos en los detalles."}]
                }
            };
        }
        else if (newClientCategory === 'project_portfolio') {
            initialConfigWeb = {
                template: "modern",
                hero: { 
                    titulo: newClientData.nombre, 
                    subtitulo: "Explora nuestro portafolio de proyectos.", 
                    ctaTexto: "Ver Proyectos", 
                    mostrar: true 
                },
                beneficios: { 
                    mostrar: true, 
                    titulo: "Por qué elegirnos", 
                    items: [{titulo: "Experiencia", desc: "Proyectos exitosos en todo el país."}]
                }
            };
        }
        if (newClientCategory === 'confirm_booking') {
            initialConfigWeb = {
                template: "modern",
                hero: { 
                    titulo: newClientData.nombre, 
                    subtitulo: "Reserva tu cita online con los mejores profesionales.", 
                    ctaTexto: "Reservar Turno", 
                    mostrar: true 
                },
                beneficios: { 
                    mostrar: true, 
                    titulo: "Por qué elegirnos", 
                    items: [{titulo: "Atención Premium", desc: "Nos enfocamos en los detalles."}]
                }
            };
        }
        

        // 2. Insertar en Base de Datos
        const { error: dbError } = await supabase.from("negocios").insert([{
            user_id: authData.user.id,
            email: newClientData.email,
            agency_id: agency.id,
            nombre: newClientData.nombre,
            slug: slug,
            category: newClientCategory, // <--- CAMPO NUEVO IMPORTANTE
            whatsapp: newClientData.whatsapp,
            direccion: newClientData.direccion,
            google_maps_link: newClientData.google_maps_link,
            horarios: horarioFinal,
            mensaje_bienvenida: `Bienvenidos a ${newClientData.nombre}`,
            color_principal: '#000000',
            estado_plan: 'activo', 
            config_web: initialConfigWeb // <--- JSON DINÁMICO
        }]);

        if (!dbError) {
            setShowModal(false);
            // Reseteamos el formulario
            setNewClientData({ email: "", password: "", nombre: "", whatsapp: "", direccion: "", google_maps_link: "" });
            setNewClientCategory(null); // Volver al default
            cargarClientes(agency.id);
        } else {
            alert("Error BD: " + dbError.message);
        }
    }
    setCreating(false);
  };
  

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600"/></div>;

  return (
    <div className="min-h-screen bg-[#eee9dd] text-slate-900 font-sans selection:bg-indigo-100">
      
      {/* HEADER */}
      <header className="bg-[#eee9dd]/50 backdrop-blur-md border-b border-slate-200 px-6 lg:px-8 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
            <div className="bg-[#4c6618] text-white p-2 rounded-lg shadow-md shadow-[#4c6618]/20">
              <ShieldCheck size={24}/>
            </div>
            <div>
                <h1 className="text-xl font-bold leading-tight">{agency?.name || agency?.nombre_agencia}</h1>
                <p className="text-xs text-slate-500 font-medium">Panel de Control</p>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-red-600 flex items-center gap-2 font-medium transition-colors px-3 py-2 hover:bg-red-50 rounded-lg">
                <LogOut size={16}/> Salir
            </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
                <Users className="text-slate-400"/> Tus Clientes
              </h2>
              <p className="text-slate-500 text-sm mt-1">Gestiona las webs y suscripciones de tus negocios.</p>
            </div>
            <button 
              onClick={() => setShowModal(true)} 
              className="bg-[#4c6618] hover:bg-[#3a4e12] text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-[#4c6618]/30 hover:-translate-y-0.5"
            >
                <Plus size={20}/> Nuevo Cliente
            </button>
        </div>

        {/* LISTA DE CLIENTES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clientes.map((cliente) => (
                <div key={cliente.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all p-6 flex flex-col justify-between group relative">
                    
                    {/* BOTÓN DE ELIMINAR */}
                    <button 
                        onClick={() => handleDeleteClient(cliente.id, cliente.nombre)}
                        disabled={deletingId === cliente.id}
                        className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                        title="Eliminar negocio"
                    >
                        {deletingId === cliente.id ? <Loader2 size={18} className="animate-spin text-red-600"/> : <Trash2 size={18} />}
                    </button>

                    <div>
                        <div className="flex justify-between items-start mb-4 pr-8">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md" style={{backgroundColor: cliente.color_principal || '#000'}}>
                                {cliente.nombre.substring(0,1)}
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold border tracking-wide ${cliente.estado_plan === 'activo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                {cliente.estado_plan}
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors pr-6">{cliente.nombre}</h3>
                        <p className="text-sm text-slate-400 mb-2 truncate font-mono bg-slate-50 inline-block px-2 py-0.5 rounded">
                            {cliente.email}
                        </p>
                        <div className="flex items-center justify-between mt-4 p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Acceso al Editor</span>
                            <button 
                                onClick={() => toggleEditorAccess(cliente.id, cliente.editor_enabled)}
                                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${cliente.editor_enabled ? 'bg-[#4c6618]' : 'bg-slate-300'}`}
                            >
                                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${cliente.editor_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                        
                        <div className="text-xs text-slate-500 space-y-1 mb-4 border-t border-slate-100 pt-2">
                           {cliente.horarios && <p className="flex items-center gap-1"><Clock size={12}/> {cliente.horarios}</p>}
                           {cliente.direccion && <p className="flex items-center gap-1"><MapPin size={12}/> {cliente.direccion}</p>}
                        </div>
                    </div>
                    
                    <div className="flex gap-3 mt-auto pt-4 border-t border-slate-100">
                        <button onClick={() => setEditingClient(cliente)} className="flex-1 text-center py-2.5 bg-[#4c6618]/10 hover:bg-[#4c6618]/20 rounded-xl text-xs font-bold text-[#4c6618] flex items-center justify-center gap-2 transition-colors border border-[#4c6618]/20">
                            <Palette size={14}/> Diseñar
                        </button>
                        {/* LÓGICA DE URL: Si tiene custom_domain, úsalo con https. Si no, usa el slug relativo */}
                        <a 
                            href={cliente.custom_domain ? `https://${cliente.custom_domain}` : `/${cliente.slug}`} 
                            target="_blank" 
                            className="flex-1 text-center py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 transition-colors border border-slate-200"
                        >
                            <ExternalLink size={14}/> Ver Web
                        </a>
                    </div>
                </div>
            ))}
        </div>
      </main>

      {/* MODAL DE CREACIÓN */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md animate-in zoom-in-95 duration-300 relative max-h-[90vh] overflow-y-auto">
                <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                    <LogOut size={20} className="rotate-45" /> 
                </button>
                <h3 className="text-2xl font-bold mb-6 text-slate-900">Nuevo Cliente</h3>
                
                <form onSubmit={handleCreateClient} className="space-y-4">
                    <div className="mb-6">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Tipo de Negocio</label>
                        <div className="grid grid-cols-2 gap-3">
                            {/* Opción 1: Servicios (Activa) */}
                            <button 
                                type="button"
                                onClick={() => setNewClientCategory('project_portfolio')}
                                className={`p-3 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${newClientCategory === 'project_portfolio' ? 'border-[#4c6618] bg-[#4c6618]/10 text-[#4c6618] ring-2 ring-[#4c6618]/20' : 'border-slate-200 text-slate-500 hover:border-slate-300 bg-white'}`}
                            >
                                <span></span> Project / Portfolio
                            </button>
                            <button 
                                type="button"
                                onClick={() => setNewClientCategory('confirm_booking')}
                                className={`p-3 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${newClientCategory === 'confirm_booking' ? 'border-[#4c6618] bg-[#4c6618]/10 text-[#4c6618] ring-2 ring-[#4c6618]/20' : 'border-slate-200 text-slate-500 hover:border-slate-300 bg-white'}`}
                            >
                                <span></span> Citas / Servicios 
                            </button>
                            
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nombre Negocio</label>
                            <input required placeholder="Ej: Barbería Vintage" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#4c6618] outline-none" onChange={e => setNewClientData({...newClientData, nombre: e.target.value})}/>
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Email (Login)</label>
                            <input required type="email" placeholder="cliente@gmail.com" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#4c6618] outline-none" onChange={e => setNewClientData({...newClientData, email: e.target.value})}/>
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Contraseña</label>
                            <input required type="password" placeholder="******" className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#4c6618] outline-none" onChange={e => setNewClientData({...newClientData, password: e.target.value})}/>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 my-2"></div>
                    
                    {/* SECCIÓN DIRECCIÓN Y MAPAS */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Dirección</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 text-slate-400" size={16} />
                            <input 
                                placeholder="Av. Siempre Viva 123" 
                                className="w-full pl-10 p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                                onChange={e => setNewClientData({...newClientData, direccion: e.target.value})}
                            />
                        </div>
                    </div>

                    {/* NUEVO CAMPO: LINK DE GOOGLE MAPS */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Link de Google Maps</label>
                        <div className="relative">
                            <ExternalLink className="absolute left-3 top-3 text-slate-400" size={16} />
                            <input 
                                placeholder="https://goo.gl/maps/..." 
                                className="w-full pl-10 p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                                onChange={e => setNewClientData({...newClientData, google_maps_link: e.target.value})}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Horario de Atención</label>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] text-slate-400 font-bold mb-1 block uppercase">Desde</label>
                                    <select 
                                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                                        value={scheduleConfig.diaInicio}
                                        onChange={e => setScheduleConfig({...scheduleConfig, diaInicio: e.target.value})}
                                    >
                                        {DIAS_SEMANA.map(dia => <option key={dia} value={dia}>{dia}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 font-bold mb-1 block uppercase">Hasta</label>
                                    <select 
                                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                                        value={scheduleConfig.diaFin}
                                        onChange={e => setScheduleConfig({...scheduleConfig, diaFin: e.target.value})}
                                    >
                                        {DIAS_SEMANA.map(dia => <option key={dia} value={dia}>{dia}</option>)}
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
                                        onChange={e => setScheduleConfig({...scheduleConfig, apertura: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 font-bold mb-1 block uppercase">Cierre</label>
                                    <input 
                                        type="time" 
                                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                                        value={scheduleConfig.cierre}
                                        onChange={e => setScheduleConfig({...scheduleConfig, cierre: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 my-2"></div>

                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">WhatsApp</label>
                      <input placeholder="+549..." className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" onChange={e => setNewClientData({...newClientData, whatsapp: e.target.value})}/>
                    </div>
                    
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                        <button 
                            type="submit" 
                            disabled={creating || !newClientCategory} // Deshabilitar si está creando o si no hay categoría
                            className={`flex-1 py-3 font-bold rounded-xl flex justify-center items-center gap-2 transition-all ${
                                !newClientCategory ? 'bg-slate-300 cursor-not-allowed' : 'bg-[#4c6618] hover:bg-[#3a4e12] shadow-lg shadow-[#4c6618]/20'
                            } text-white`}
                        >
                            {creating ? <Loader2 className="animate-spin"/> : "Crear Cuenta"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {editingClient && (
        <WebEditor 
            initialData={editingClient}    // <--- Cambio de nombre (antes 'negocio')
            model="negocio"                // <--- Propiedad requerida que faltaba
            onClose={() => setEditingClient(null)} 
            onSave={() => cargarClientes(agency.id)} 
        />
        )}
    </div>
  );
}