/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import type { Venta, Producto, Sucursal } from '../types';
import { TrendingUp, DollarSign, ShoppingBag, ArrowUpRight, AlertCircle, Calendar, Activity } from 'lucide-react';

interface DashboardProps { ventas: Venta[]; productos: Producto[]; sucursales: Sucursal[]; onNavigate: (tab: string) => void; }

export default function Dashboard({ ventas, productos, sucursales, onNavigate }: DashboardProps) {
  // 1. Selector de mes por defecto: Mes actual
  const [mesSeleccionado, setMesSeleccionado] = useState(() => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  });

  // 2. Extraer los meses disponibles automáticamente del historial
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

  // 3. Filtrar ventas solo del mes elegido
  const ventasDelMes = useMemo(() => {
    return ventas.filter(v => {
      const date = new Date(v.fecha);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` === mesSeleccionado;
    });
  }, [ventas, mesSeleccionado]);

  // 4. Cálculos Mensuales
  const totalVentas = ventasDelMes.reduce((acc, v) => acc + v.total, 0);
  const totalTransacciones = ventasDelMes.length;
  const ticketPromedio = totalTransacciones > 0 ? Math.round(totalVentas / totalTransacciones) : 0;
  
  const alertasStock: { producto: Producto; sucursalNombre: string; sucursalId: string; stock: number }[] = [];
  productos.forEach(p => {
    if (p.categoria !== 'Servicios') {
      sucursales.forEach(s => {
        const stockSucursal = p.stockPorSucursal[s.id] ?? 0;
        if (stockSucursal <= p.minStock) alertasStock.push({ producto: p, sucursalNombre: s.nombre.replace('Serviteca VJ - ', ''), sucursalId: s.id, stock: stockSucursal });
      });
    }
  });

  const formatCLP = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);
  const formatearMes = (mesStr: string) => {
    const [year, month] = mesStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' }).format(date).toUpperCase();
  };

  return (
    <div className="p-8 space-y-8 overflow-y-auto h-screen w-full bg-slate-950 text-slate-100">
      <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Cuadro de Mando</h1>
          <p className="text-slate-400 text-sm mt-1">Estadísticas consolidadas por mes.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex items-center bg-blue-600/10 border border-blue-500/30 rounded-xl px-3 py-2">
            <Calendar className="w-4 h-4 text-blue-400 mr-2" />
            <select 
              value={mesSeleccionado} 
              onChange={(e) => setMesSeleccionado(e.target.value)}
              className="bg-transparent text-xs text-blue-300 font-bold focus:outline-none uppercase cursor-pointer"
            >
              {mesesDisponibles.map(mes => (
                <option key={mes} value={mes} className="bg-slate-900 text-white">{formatearMes(mes)}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl text-xs font-mono text-slate-300">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>SISTEMA ONLINE</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-all"></div>
          <div className="flex justify-between items-start mb-4"><span className="text-slate-400 text-[10px] font-mono uppercase tracking-wider">Recaudación Mensual</span><div className="p-2 bg-blue-500/10 rounded-xl text-blue-400"><DollarSign className="w-5 h-5" /></div></div>
          <p className="text-2xl font-bold text-white tracking-tight">{formatCLP(totalVentas)}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl group-hover:bg-purple-500/10 transition-all"></div>
          <div className="flex justify-between items-start mb-4"><span className="text-slate-400 text-[10px] font-mono uppercase tracking-wider">Boletas del Mes</span><div className="p-2 bg-purple-500/10 rounded-xl text-purple-400"><ShoppingBag className="w-5 h-5" /></div></div>
          <p className="text-2xl font-bold text-white tracking-tight">{totalTransacciones}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-all"></div>
          <div className="flex justify-between items-start mb-4"><span className="text-slate-400 text-[10px] font-mono uppercase tracking-wider">Ticket Promedio</span><div className="p-2 bg-amber-500/10 rounded-xl text-amber-400"><TrendingUp className="w-5 h-5" /></div></div>
          <p className="text-2xl font-bold text-white tracking-tight">{formatCLP(ticketPromedio)}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-xl group-hover:bg-red-500/10 transition-all"></div>
          <div className="flex justify-between items-start mb-4"><span className="text-slate-400 text-[10px] font-mono uppercase tracking-wider">Alertas Stock Global</span><div className="p-2 bg-red-500/10 rounded-xl text-red-400"><AlertCircle className="w-5 h-5" /></div></div>
          <p className="text-2xl font-bold text-white tracking-tight">{alertasStock.length} alertas</p>
          {alertasStock.length > 0 && <button onClick={() => onNavigate('inventario')} className="flex items-center gap-1 text-[10px] text-red-400 font-medium hover:underline mt-2 cursor-pointer">Verificar quiebres <ArrowUpRight className="w-3.5 h-3.5" /></button>}
        </div>
      </div>
    </div>
  );
}