'use client';

import { useRef, useState } from 'react';
import { X, Settings, KeyRound, Mail, Lock, Eye, EyeOff, Loader2, Upload, ImageIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { updateAgencyProfile, changeAgencyPassword } from '@/app/actions/admin/agency-actions';
import { AgencyProfile } from '@/types/agency';
import InlineAlert from '@/components/ui/InlineAlert';
import SaveButton, { SaveStatus } from '@/components/ui/SaveButton';

const PRIMARY = '#577a2c';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

interface AgencySettingsModalProps {
  open: boolean;
  agency: AgencyProfile;
  onClose: () => void;
  onSaved: (updated: Partial<AgencyProfile>) => void;
}

export default function AgencySettingsModal({ open, agency, onClose, onSaved }: AgencySettingsModalProps) {
  const supabase = createClient();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'perfil' | 'pass'>('perfil');

  // Perfil
  const [cfgData, setCfgData] = useState({
    nombre: agency.name || agency.nombre_agencia || '',
    email: agency.email || '',
    logo_url: agency.logo_url || '',
  });
  const [profileStatus, setProfileStatus] = useState<SaveStatus>('idle');
  const [profileError, setProfileError] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState('');

  // Contraseña
  const [newPass, setNewPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [passStatus, setPassStatus] = useState<SaveStatus>('idle');
  const [passError, setPassError] = useState('');

  if (!open) return null;

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError('');
    setUploadingLogo(true);
    const ext = file.name.split('.').pop();
    const path = `agency-logos/${agency.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('sites').upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from('sites').getPublicUrl(path);
      setCfgData(p => ({ ...p, logo_url: data.publicUrl }));
    } else {
      setLogoError('Error al subir el logo: ' + error.message);
    }
    setUploadingLogo(false);
    e.target.value = '';
  };

  const handleSaveProfile = async () => {
    setProfileError('');
    setProfileStatus('saving');
    const userId = (await supabase.auth.getUser()).data.user?.id || '';
    const res = await updateAgencyProfile(agency.id, userId, {
      nombre: cfgData.nombre,
      email: cfgData.email !== agency.email ? cfgData.email : undefined,
      logo_url: cfgData.logo_url,
    });
    if (res.success) {
      setProfileStatus('saved');
      onSaved({ name: cfgData.nombre, nombre_agencia: cfgData.nombre, logo_url: cfgData.logo_url });
      setTimeout(() => setProfileStatus('idle'), 2000);
    } else {
      setProfileError(res.error || 'Error al guardar.');
      setProfileStatus('error');
    }
  };

  const handleChangePassword = async () => {
    if (newPass.length < 8) { setPassError('La contraseña debe tener al menos 8 caracteres.'); return; }
    setPassError('');
    setPassStatus('saving');
    const userId = (await supabase.auth.getUser()).data.user?.id || '';
    const res = await changeAgencyPassword(userId, newPass);
    if (res.success) {
      setPassStatus('saved');
      setNewPass('');
      setTimeout(() => setPassStatus('idle'), 2500);
    } else {
      setPassError(res.error || 'Error inesperado.');
      setPassStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: PRIMARY }}>
              <Settings size={16} />
            </div>
            <div>
              <h3 className="font-bold text-sm">Configuración de la agencia</h3>
              <p className="text-xs text-slate-400">{agency.name || agency.nombre_agencia}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg">
            <X size={17} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mx-6 mt-4 bg-slate-100 p-1 rounded-xl">
          {([
            { id: 'perfil' as const, label: 'Perfil', icon: <Settings size={12} /> },
            { id: 'pass' as const,  label: 'Contraseña', icon: <KeyRound size={12} /> },
          ]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${tab === t.id ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Tab: Perfil */}
        {tab === 'perfil' && (
          <>
            <div className="p-6 space-y-4">
              {/* Logo upload */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Logo de la agencia</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 shrink-0">
                    {cfgData.logo_url
                      ? <img src={cfgData.logo_url} alt="logo" className="w-full h-full object-cover" />
                      : <ImageIcon size={22} className="text-slate-300" />}
                  </div>
                  <div className="flex-1">
                    <button onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}
                      className="flex items-center gap-2 px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-[#577a2c] hover:text-[#577a2c] transition-all">
                      {uploadingLogo
                        ? <><Loader2 size={14} className="animate-spin" />Subiendo...</>
                        : <><Upload size={14} />Subir logo</>}
                    </button>
                    <p className="text-[11px] text-slate-400 mt-1.5">PNG, JPG o WEBP. Se ve en el header.</p>
                  </div>
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadLogo} />
                </div>
                {logoError && <InlineAlert type="error" message={logoError} onDismiss={() => setLogoError('')} className="mt-2" />}
              </div>

              <Field label="Nombre de la agencia">
                <input type="text" value={cfgData.nombre}
                  onChange={e => setCfgData(p => ({ ...p, nombre: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30 text-zinc-900" />
              </Field>
              <Field label="Email de login">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input type="email" value={cfgData.email}
                    onChange={e => setCfgData(p => ({ ...p, email: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30 text-zinc-900" />
                </div>
                {cfgData.email !== agency.email && (
                  <p className="text-[11px] text-amber-600 mt-1">⚠️ Cambiar el email actualiza también el acceso de login.</p>
                )}
              </Field>

              {profileError && <InlineAlert type="error" message={profileError} onDismiss={() => setProfileError('')} />}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl text-sm">
                Cancelar
              </button>
              <SaveButton
                status={profileStatus}
                onClick={handleSaveProfile}
                className="flex-1 py-3 justify-center"
              />
            </div>
          </>
        )}

        {/* Tab: Contraseña */}
        {tab === 'pass' && (
          <>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <Lock size={15} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">Cambia la contraseña de acceso al panel de agencia.</p>
              </div>
              <Field label="Nueva contraseña">
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input type={showPass ? 'text' : 'password'} value={newPass}
                    onChange={e => setNewPass(e.target.value)} minLength={8}
                    className="w-full pl-10 pr-12 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30 text-zinc-900"
                    placeholder="Mínimo 8 caracteres" />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>
              {passError && <InlineAlert type="error" message={passError} onDismiss={() => setPassError('')} />}
              {passStatus === 'saved' && <InlineAlert type="success" message="Contraseña actualizada correctamente." />}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl text-sm">
                Cerrar
              </button>
              <SaveButton
                status={passStatus}
                onClick={handleChangePassword}
                disabled={newPass.length < 8}
                idleLabel="Cambiar contraseña"
                savedLabel="¡Listo!"
                className="flex-1 py-3 justify-center"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
