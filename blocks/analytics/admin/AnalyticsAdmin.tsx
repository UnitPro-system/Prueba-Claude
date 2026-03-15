"use client";
// blocks/analytics/admin/AnalyticsAdmin.tsx
//
// SQL para crear las tablas requeridas en Supabase:
//
// -- CREATE TABLE IF NOT EXISTS page_views (
// --   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
// --   negocio_id integer REFERENCES negocios(id) ON DELETE CASCADE,
// --   path text NOT NULL,
// --   referrer text,
// --   user_agent text,
// --   created_at timestamptz DEFAULT now()
// -- );
// -- CREATE INDEX idx_page_views_negocio_date ON page_views(negocio_id, created_at DESC);
// --
// -- CREATE TABLE IF NOT EXISTS conversion_events (
// --   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
// --   negocio_id integer REFERENCES negocios(id) ON DELETE CASCADE,
// --   event_type text NOT NULL,
// --   metadata jsonb DEFAULT '{}',
// --   created_at timestamptz DEFAULT now()
// -- );
// -- CREATE INDEX idx_conversion_events_negocio_date ON conversion_events(negocio_id, created_at DESC);

import { useState, useEffect, useCallback } from 'react';
import { BarChart2, Eye, TrendingUp, Calendar, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import type { BlockAdminProps } from '@/types/blocks';

const PRIMARY = '#577a2c';
const REFRESH_INTERVAL_MS = 60_000;

const EVENT_LABELS: Record<string, string> = {
  booking: 'Reservas',
  contact: 'Contactos',
  whatsapp_click: 'Clicks WhatsApp',
  purchase: 'Compras',
};

interface PageView {
  created_at: string;
  path: string;
}

interface ConversionEvent {
  created_at: string;
  event_type: string;
}

/** Genera array con los últimos N días en formato YYYY-MM-DD */
function buildLastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}

/** Agrupa registros por fecha (slice de created_at) */
function groupByDay(rows: { created_at: string }[]): Record<string, number> {
  return rows.reduce((acc, row) => {
    const day = row.created_at.slice(0, 10);
    acc[day] = (acc[day] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

export default function AnalyticsAdmin({ negocio }: BlockAdminProps) {
  const supabase = createClient();
  const negocioId: number = negocio?.id;

  const [pageViews, setPageViews] = useState<PageView[]>([]);
  const [events, setEvents] = useState<ConversionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  /** Carga datos de los últimos 30 días */
  const fetchData = useCallback(async () => {
    if (!negocioId) return;
    setError(null);

    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceIso = since.toISOString();

    try {
      const [pvRes, evRes] = await Promise.all([
        supabase
          .from('page_views')
          .select('created_at, path')
          .eq('negocio_id', negocioId)
          .gte('created_at', sinceIso),
        supabase
          .from('conversion_events')
          .select('created_at, event_type')
          .eq('negocio_id', negocioId)
          .gte('created_at', sinceIso),
      ]);

      if (pvRes.error) throw pvRes.error;
      if (evRes.error) throw evRes.error;

      setPageViews(pvRes.data ?? []);
      setEvents(evRes.data ?? []);
      setLastRefresh(new Date());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar datos';
      console.error('[AnalyticsAdmin] fetchData error:', err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [negocioId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Carga inicial + auto-refresh cada 60 segundos
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Cálculos derivados ────────────────────────────────────────────────────
  const last30Days = buildLastNDays(30);
  const last7Days  = buildLastNDays(7);

  const viewsByDay = groupByDay(pageViews);
  const maxViews   = Math.max(...last30Days.map(d => viewsByDay[d] ?? 0), 1);

  const activeDays = last30Days.filter(d => (viewsByDay[d] ?? 0) > 0).length;
  const totalViews = pageViews.length;
  const totalConversions = events.length;
  const conversionRate = totalViews > 0
    ? ((totalConversions / totalViews) * 100).toFixed(1)
    : '0.0';

  // Top 5 páginas — últimos 7 días
  const last7Views = pageViews.filter(pv => last7Days.includes(pv.created_at.slice(0, 10)));
  const pathCounts = last7Views.reduce((acc, pv) => {
    acc[pv.path] = (acc[pv.path] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topPages = Object.entries(pathCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Conversiones por tipo
  const eventCounts = events.reduce((acc, ev) => {
    acc[ev.event_type] = (acc[ev.event_type] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const eventEntries = Object.entries(eventCounts).sort((a, b) => b[1] - a[1]);

  const hasData = totalViews > 0 || totalConversions > 0;

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw size={24} className="animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart2 style={{ color: PRIMARY }} /> Analytics
          </h1>
          <p className="text-zinc-500 text-sm mt-0.5">Métricas de los últimos 30 días.</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 transition-colors mt-1"
          title="Actualizar datos"
        >
          <RefreshCw size={14} />
          {lastRefresh.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
        </button>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!hasData ? (
        /* Empty state */
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-zinc-200">
          <BarChart2 size={40} className="mx-auto text-zinc-200 mb-3" />
          <h3 className="text-lg font-bold text-zinc-900">Sin datos aún</h3>
          <p className="text-zinc-500 text-sm mt-1">
            Las métricas aparecerán cuando haya visitas en tu landing page.
          </p>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={<Eye size={18} />} label="Total Vistas" value={totalViews.toLocaleString('es-AR')} />
            <StatCard icon={<Calendar size={18} />} label="Días activos" value={`${activeDays} / 30`} />
            <StatCard icon={<TrendingUp size={18} />} label="Conversiones" value={totalConversions.toLocaleString('es-AR')} />
            <StatCard icon={<BarChart2 size={18} />} label="Tasa de conv." value={`${conversionRate}%`} />
          </div>

          {/* Bar chart — últimos 30 días */}
          <section className="bg-white rounded-2xl border border-zinc-200 p-5">
            <h2 className="text-sm font-semibold text-zinc-700 mb-4">Visitas diarias — últimos 30 días</h2>
            <div className="flex items-end gap-0.5 h-32 w-full" aria-label="Gráfico de visitas diarias">
              {last30Days.map(day => {
                const count = viewsByDay[day] ?? 0;
                const heightPct = Math.round((count / maxViews) * 100);
                return (
                  <div
                    key={day}
                    className="flex-1 flex flex-col items-center justify-end"
                    title={`${day}: ${count} visita${count !== 1 ? 's' : ''}`}
                  >
                    <div
                      className="w-full rounded-t-sm transition-all"
                      style={{ height: `${Math.max(heightPct, 2)}%`, backgroundColor: PRIMARY }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-zinc-400 mt-1.5">
              <span>{last30Days[0]}</span>
              <span>{last30Days[last30Days.length - 1]}</span>
            </div>
          </section>

          {/* Tables row */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Top pages */}
            <section className="bg-white rounded-2xl border border-zinc-200 p-5">
              <h2 className="text-sm font-semibold text-zinc-700 mb-3">Top páginas — últimos 7 días</h2>
              {topPages.length === 0 ? (
                <p className="text-zinc-400 text-sm">Sin visitas en los últimos 7 días.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-zinc-400 border-b border-zinc-100">
                      <th className="pb-2 font-medium">Ruta</th>
                      <th className="pb-2 font-medium text-right">Visitas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPages.map(([path, count]) => (
                      <tr key={path} className="border-b border-zinc-50 last:border-0">
                        <td className="py-2 text-zinc-700 truncate max-w-[180px]" title={path}>{path || '/'}</td>
                        <td className="py-2 text-right font-semibold" style={{ color: PRIMARY }}>{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            {/* Conversions by type */}
            <section className="bg-white rounded-2xl border border-zinc-200 p-5">
              <h2 className="text-sm font-semibold text-zinc-700 mb-3">Conversiones por tipo</h2>
              {eventEntries.length === 0 ? (
                <p className="text-zinc-400 text-sm">Sin conversiones registradas aún.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-zinc-400 border-b border-zinc-100">
                      <th className="pb-2 font-medium">Evento</th>
                      <th className="pb-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventEntries.map(([type, count]) => (
                      <tr key={type} className="border-b border-zinc-50 last:border-0">
                        <td className="py-2 text-zinc-700">{EVENT_LABELS[type] ?? type}</td>
                        <td className="py-2 text-right font-semibold" style={{ color: PRIMARY }}>{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

// ── Sub-componente StatCard ───────────────────────────────────────────────────
function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-4 flex flex-col gap-2">
      <span className="text-zinc-400">{icon}</span>
      <p className="text-2xl font-bold text-zinc-900 leading-none">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}
