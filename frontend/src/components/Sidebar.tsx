/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Usuario } from '../types';
import { LayoutDashboard, ShoppingCart, Package, Building, History, LogOut, ShieldAlert } from 'lucide-react';
// Importación del logo real
import miLogo from '../assets/logo.png';

interface SidebarProps { activeTab: string; setActiveTab: (tab: string) => void; usuario: Usuario; onLogout: () => void; }

export default function Sidebar({ activeTab, setActiveTab, usuario, onLogout }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Cuadro de Mando', icon: LayoutDashboard },
    { id: 'pos', label: 'Terminal POS (Caja)', icon: ShoppingCart },
    { id: 'inventario', label: 'Control de Inventario', icon: Package },
    { id: 'sucursales', label: 'Sucursales & Talleres', icon: Building },
    { id: 'ventas', label: 'Historial / Auditoría', icon: History }
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 h-screen text-slate-300">
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        {/* Aquí está tu logo real */}
        <img src={miLogo} alt="Logo Serviteca VJ" className="w-10 h-10 object-contain" />
        <div>
          <h2 className="text-md font-bold text-white tracking-tight leading-none">Serviteca <span className="text-blue-500">VJ</span></h2>
          <span className="text-[10px] text-slate-500 font-mono tracking-wider">ERP SYSTEM</span>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon; const isActive = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold rounded-xl transition-all cursor-pointer ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'}`}>
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} /><span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-3 shrink-0">
        <div className="flex items-center gap-3 p-2 bg-slate-900/60 rounded-xl border border-slate-850">
          <div className="w-8 h-8 bg-blue-500/10 text-blue-400 rounded-lg flex items-center justify-center border border-blue-900/30"><ShieldAlert className="w-4 h-4" /></div>
          <div className="truncate">
            <p className="text-[11px] font-bold text-white truncate leading-none">{usuario.nombre}</p>
            <span className="text-[9px] font-mono text-blue-400 uppercase tracking-wider">{usuario.rol}</span>
          </div>
        </div>
        <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold rounded-xl border border-slate-800 transition-colors cursor-pointer">
          <LogOut className="w-3.5 h-3.5" /><span>Restablecer Sesión</span>
        </button>
      </div>
    </aside>
  );
}
