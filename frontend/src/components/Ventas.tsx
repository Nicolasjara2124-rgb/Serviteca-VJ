/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import type { Venta, Sucursal } from '../types';
import { Search, MapPin, Calendar, Eye } from 'lucide-react';

interface VentasProps { ventas: Venta[]; sucursales: Sucursal[]; }

export default function Ventas({ ventas, sucursales }: VentasProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSucursalId, setFilterSucursalId] = useState('todos');
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null);

  // Selector de meses para el historial
  const [mesSeleccionado, setMesSeleccionado] = useState(() => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  });

  const mesesDisponibles = useMemo(() => {
    const meses = new Set<string>();
    ventas.forEach(v => {
      const date = new Date(v.fecha);
      meses.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    });
    const hoy = new Date();
    meses.add(`${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`);
    return Array.from(meses).sort().reverse();
  }, [ventas]);

  const ventasFiltradas = useMemo(() => {
    return ventas.filter(v => {
      const matchSearch = v.vendedor.toLowerCase().includes(searchQuery.toLowerCase()) || v.id.includes(searchQuery);
      const matchSuc = filterSucursalId === 'todos' || v.sucursalId === filterSucursalId;
      
      const date = new Date(v.fecha);
      const matchMes = mesSeleccionado === 'todos' || `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` === mesSeleccionado;
      
      return matchSearch && matchSuc && matchMes;
    });
  }, [ventas, searchQuery, filterSucursalId, mesSeleccionado]);

  const formatCLP = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);
  const formatearMes = (mesStr: string) => {
    const [year, month] = mesStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' }).format(date).toUpperCase();
  };

  return (
    <div className="p-8 space-y-8 overflow-y-auto h-screen w-full bg-slate-950 text-slate-100 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">Historial de Ventas</h1></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="relative flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2"><Search className="w-4 h-4 text-slate-500 mr-2" /><input type="text" placeholder="Buscar por folio..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent text-xs text-white w-full focus:outline-none" /></div>
        
        <div className="relative flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
          <Calendar className="w-4 h-4 text-slate-500 mr-2" />
          <select value={mesSeleccionado} onChange={(e) => setMesSeleccionado(e.target.value)} className="bg-transparent text-xs text-slate-300 w-full focus:outline-none cursor-pointer">
            <option value="todos">Todo el Historial</option>
            {mesesDisponibles.map(mes => (<option key={mes} value={mes}>{formatearMes(mes)}</option>))}
          </select>
        </div>

        <div className="relative flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
          <MapPin className="w-4 h-4 text-slate-500 mr-2" />
          <select value={filterSucursalId} onChange={(e) => setFilterSucursalId(e.target.value)} className="bg-transparent text-xs text-slate-300 w-full focus:outline-none cursor-pointer">
            <option value="todos">Todas las Sucursales</option>
            {sucursales.map(s => (<option key={s.id} value={s.id}>{s.nombre.replace('Serviteca VJ - ', '')}</option>))}
          </select>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead><tr className="border-b border-slate-800 text-[10px] font-mono uppercase text-slate-500 bg-slate-950/40"><th className="py-4 px-6">Folio</th><th className="py-4 px-6">Fecha</th><th className="py-4 px-6">Vendedor</th><th className="py-4 px-6 text-right">Monto Neto</th><th className="py-4 px-6 text-right">Total IVA Incl</th><th className="py-4 px-6 text-right">Acción</th></tr></thead>
          <tbody className="text-xs divide-y divide-slate-800/40">
            {ventasFiltradas.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-slate-500">No se encontraron registros para este periodo.</td></tr>
            ) : (
              ventasFiltradas.map((v) => (
                <tr key={v.id} className="hover:bg-slate-850/30">
                  <td className="py-4 px-6 font-mono text-blue-400 font-bold">{v.id.split('-')[1]}</td>
                  <td className="py-4 px-6 text-slate-400">{new Date(v.fecha).toLocaleString('es-CL')}</td>
                  <td className="py-4 px-6 text-slate-400">{v.vendedor}</td>
                  <td className="py-4 px-6 text-right text-slate-400">{formatCLP(v.subtotal)}</td>
                  <td className="py-4 px-6 text-right font-bold text-white">{formatCLP(v.total)}</td>
                  <td className="py-4 px-6 text-right"><button onClick={() => setSelectedVenta(v)} className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-850 rounded-lg"><Eye className="w-4 h-4" /></button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedVenta && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white text-slate-900 w-full max-w-sm rounded-2xl p-6 shadow-2xl flex flex-col">
            <div className="text-center space-y-1 mb-4 border-b border-dashed border-slate-300 pb-4">
              <h2 className="font-bold text-sm">NEUMATICOS VJ SPA</h2><p className="text-[10px] text-slate-500">"LA EXPERIENCIA MARCA LA DIFERENCIA"</p>
            </div>
            <div className="flex justify-between font-bold text-sm text-slate-900 pt-1.5 mb-4"><span>TOTAL FINAL</span><span>{formatCLP(selectedVenta.total)}</span></div>
            <button onClick={() => setSelectedVenta(null)} className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}