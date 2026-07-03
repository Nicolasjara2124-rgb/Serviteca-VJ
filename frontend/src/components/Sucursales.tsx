/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import type { Sucursal, Venta, Usuario } from '../types';
import { 
  Building, 
  Phone, 
  MapPin, 
  User, 
  TrendingUp, 
  ShoppingBag, 
  Plus, 
  ShieldCheck, 
  X,
  Edit,
  DollarSign,
  Trash2
} from 'lucide-react';

interface SucursalesProps {
  sucursales: Sucursal[];
  ventas: Venta[];
  usuario: Usuario;
  onSaveSucursal?: (sucursal: Sucursal) => void;
  onDeleteSucursal?: (id: string) => void;
  // Propiedades adicionales especificadas para compatibilidad con la base de datos
  onAgregar?: (sucursal: Sucursal) => void;
  onEditar?: (sucursal: Sucursal) => void;
  onEliminar?: (id: string) => void;
}

export default function Sucursales({ 
  sucursales, 
  ventas, 
  usuario, 
  onSaveSucursal, 
  onDeleteSucursal,
  onAgregar,
  onEditar,
  onEliminar
}: SucursalesProps) {
  
  const [showModal, setShowModal] = useState(false);
  const [editingSucursal, setEditingSucursal] = useState<Sucursal | null>(null);

  // Campos del formulario
  const [sucNombre, setSucNombre] = useState('');
  const [sucDireccion, setSucDireccion] = useState('');
  const [sucTelefono, setSucTelefono] = useState('');
  const [sucEncargado, setSucEncargado] = useState('');

  const esAdmin = usuario.rol === 'Administrador' || usuario.rol === 'Supervisor';

  const handleOpenNuevo = () => {
    setEditingSucursal(null);
    setSucNombre('');
    setSucDireccion('');
    setSucTelefono('');
    setSucEncargado('');
    setShowModal(true);
  };

  const handleOpenEditar = (suc: Sucursal) => {
    setEditingSucursal(suc);
    setSucNombre(suc.nombre);
    setSucDireccion(suc.direccion);
    setSucTelefono(suc.telefono);
    setSucEncargado(suc.encargado);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sucNombre.trim() || !sucDireccion.trim()) {
      alert('Nombre de la Sucursal y Dirección Física son campos requeridos.');
      return;
    }

    const nuevaSucursal: Sucursal = {
      id: editingSucursal ? editingSucursal.id : `suc-${Date.now()}`,
      nombre: sucNombre.trim(),
      direccion: sucDireccion.trim(),
      telefono: sucTelefono.trim(),
      encargado: sucEncargado.trim() || 'No Asignado'
    };

    if (editingSucursal) {
      // Editar existente
      if (onEditar) {
        onEditar(nuevaSucursal);
      } else if (onSaveSucursal) {
        onSaveSucursal(nuevaSucursal);
      }
    } else {
      // Agregar nueva sucursal
      if (onAgregar) {
        onAgregar(nuevaSucursal);
      } else if (onSaveSucursal) {
        onSaveSucursal(nuevaSucursal);
      }
    }

    setShowModal(false);
  };

  const handleEliminar = (id: string, nombreSimple: string) => {
    if (sucursales.length <= 1) {
      alert('Operación denegada. El sistema ERP requiere mantener al menos una sucursal activa para operar cajas y stock.');
      return;
    }

    const confirmacion = window.confirm(
      `¿Está completamente seguro que desea eliminar la sucursal "${nombreSimple}"?\n\nEsta acción no se puede deshacer y afectará el inventario asociado.`
    );
    
    if (confirmacion) {
      if (onEliminar) {
        onEliminar(id);
      } else if (onDeleteSucursal) {
        onDeleteSucursal(id);
      }
    }
  };

  // Calcular métricas para una sucursal específica
  const getMetricasSucursal = (sucursalId: string) => {
    const ventasSuc = ventas.filter(v => v.sucursalId === sucursalId);
    const recaudacion = ventasSuc.reduce((acc, v) => acc + v.total, 0);
    const transacciones = ventasSuc.length;
    const promedio = transacciones > 0 ? Math.round(recaudacion / transacciones) : 0;

    return {
      recaudacion,
      transacciones,
      promedio
    };
  };

  const formatCLP = (val: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="p-8 space-y-8 overflow-y-auto h-screen w-full bg-slate-950 text-slate-100 font-sans">
      
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            Gestión de Sucursales
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Gestione y supervise todas las sedes del taller de Neumáticos VJ. Agregue, modifique o remueva sucursales.
          </p>
        </div>

        {esAdmin && (
          <button
            onClick={handleOpenNuevo}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/10 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Nueva Sucursal</span>
          </button>
        )}
      </div>

      {/* Grid de Sucursales */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {sucursales.map(suc => {
          const metricas = getMetricasSucursal(suc.id);
          const nombreSimple = suc.nombre.replace('Serviteca VJ - ', '');

          return (
            <div key={suc.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 relative overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-all">
              
              {/* Información General */}
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-900/30">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm tracking-tight">{nombreSimple}</h3>
                      <span className="text-[10px] font-mono text-slate-500">ID: {suc.id}</span>
                    </div>
                  </div>

                  {esAdmin && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleOpenEditar(suc)}
                        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-850 hover:border-slate-700 transition-all text-xs cursor-pointer"
                        title="Editar sucursal"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleEliminar(suc.id, nombreSimple)}
                        className="p-1.5 hover:bg-red-950/40 text-slate-500 hover:text-red-400 rounded-lg border border-slate-850 hover:border-red-900/30 transition-all text-xs cursor-pointer"
                        title="Eliminar sucursal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Contactos y dirección */}
                <div className="space-y-2 text-xs text-slate-400 font-mono bg-slate-950/40 p-3.5 rounded-xl border border-slate-850/60">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <span className="truncate">{suc.direccion}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>{suc.telefono || 'Sin teléfono asignado'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="truncate">Encargado: <strong className="text-slate-300 font-semibold">{suc.encargado}</strong></span>
                  </div>
                </div>
              </div>

              {/* Métricas Financieras de la Sucursal */}
              <div className="border-t border-slate-850 pt-5 space-y-4">
                <h4 className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Desempeño de Sucursal</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Recaudado */}
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-emerald-400" />
                      Recaudación
                    </span>
                    <p className="text-sm font-bold text-white font-mono">{formatCLP(metricas.recaudacion)}</p>
                  </div>

                  {/* Transacciones */}
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                      <ShoppingBag className="w-3 h-3 text-purple-400" />
                      Boletas POS
                    </span>
                    <p className="text-sm font-bold text-white font-mono">{metricas.transacciones} emitidas</p>
                  </div>

                  {/* Ticket Promedio */}
                  <div className="col-span-2 space-y-0.5 border-t border-slate-850/50 pt-2 flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-mono flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                      Valor Ticket Promedio:
                    </span>
                    <span className="font-bold text-slate-300 font-mono">{formatCLP(metricas.promedio)}</span>
                  </div>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* MODAL: Crear/Editar Sucursal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 text-slate-100 w-full max-w-md rounded-2xl p-6 shadow-2xl relative animate-scaleUp">
            
            <div className="flex justify-between items-center border-b border-slate-850 pb-4 mb-4">
              <h2 className="text-md font-bold text-white flex items-center gap-2">
                <ShieldCheck className="text-blue-500 w-5 h-5" />
                {editingSucursal ? 'Editar Sucursal' : 'Nueva Sucursal'}
              </h2>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Nombre */}
              <div className="space-y-1">
                <label className="block text-xs font-mono text-slate-400 uppercase">Nombre de la Sucursal</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Providencia Express o Taller La Florida"
                  value={sucNombre}
                  onChange={(e) => setSucNombre(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Dirección */}
              <div className="space-y-1">
                <label className="block text-xs font-mono text-slate-400 uppercase">Dirección Física</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Av. Providencia 2240, Providencia"
                  value={sucDireccion}
                  onChange={(e) => setSucDireccion(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Teléfono */}
              <div className="space-y-1">
                <label className="block text-xs font-mono text-slate-400 uppercase">Teléfono de Contacto</label>
                <input
                  type="text"
                  placeholder="Ej: +56 2 2455 8902"
                  value={sucTelefono}
                  onChange={(e) => setSucTelefono(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none font-mono"
                />
              </div>

              {/* Encargado */}
              <div className="space-y-1">
                <label className="block text-xs font-mono text-slate-400 uppercase">Supervisor / Encargado Local</label>
                <input
                  type="text"
                  placeholder="Ej: Carlos González"
                  value={sucEncargado}
                  onChange={(e) => setSucEncargado(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-2 justify-end mt-6 border-t border-slate-850 pt-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="py-2 px-4 bg-slate-850 hover:bg-slate-800 text-slate-400 font-semibold text-xs rounded-xl border border-slate-800 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="py-2 px-5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/10 transition-all"
              >
                {editingSucursal ? 'Guardar Cambios' : 'Crear'}
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
}
