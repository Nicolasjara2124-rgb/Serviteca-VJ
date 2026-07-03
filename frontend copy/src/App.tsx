/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import type { Usuario, Producto, Sucursal, Venta, TransferenciaStock } from './types';
import { 
  inicializarBaseDatos, 
  obtenerProductos, 
  obtenerSucursales, 
  obtenerVentas, 
  obtenerTransferencias, 
  getSesionActiva, 
  logoutUsuario,
  guardarProducto,
  eliminarProducto,
  registrarNuevaVenta,
  registrarTransferencia,
  guardarSucursal,
  eliminarSucursal
} from './services/db';

import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import Inventario from './components/Inventario';
import Ventas from './components/Ventas';
import Sucursales from './components/Sucursales';

export default function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [loading, setLoading] = useState(true);

  // Estados reactivos
  const [productos, setProductos] = useState<Producto[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [transferencias, setTransferencias] = useState<TransferenciaStock[]>([]);

  // 1. Inicializar base de datos y cargar información
  useEffect(() => {
    inicializarBaseDatos();
    const sesion = getSesionActiva();
    setUsuario(sesion);
    
    setProductos(obtenerProductos());
    setSucursales(obtenerSucursales());
    setVentas(obtenerVentas());
    setTransferencias(obtenerTransferencias());
    
    setLoading(false);
  }, []);

  // 2. Control de Sesión
  const handleLoginSuccess = (user: Usuario) => {
    setUsuario(user);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    logoutUsuario();
    setUsuario(null);
  };

  // 3. Operaciones de Base de Datos
  const handleRegistrarVenta = (nuevaVenta: Venta) => {
    registrarNuevaVenta(nuevaVenta);
    setVentas(obtenerVentas());
    setProductos(obtenerProductos()); 
  };

  const handleSaveProducto = (prod: Producto) => {
    guardarProducto(prod);
    setProductos(obtenerProductos());
  };

  const handleDeleteProducto = (id: string) => {
    eliminarProducto(id);
    setProductos(obtenerProductos());
  };

  const handleTransferirStock = (trans: TransferenciaStock) => {
    registrarTransferencia(trans);
    setProductos(obtenerProductos()); 
    setTransferencias(obtenerTransferencias()); 
  };

  const handleSaveSucursal = (suc: Sucursal) => {
    guardarSucursal(suc);
    setSucursales(obtenerSucursales());
  };

  const handleDeleteSucursal = (id: string) => {
    eliminarSucursal(id);
    setSucursales(obtenerSucursales());
    setProductos(obtenerProductos()); 
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center font-sans text-slate-300">
        <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-mono tracking-wider">INICIALIZANDO SERVITECA VJ ERP...</p>
      </div>
    );
  }

  // Pantalla de Login (Bypass Automático)
  if (!usuario) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // ERP Principal
  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden font-sans">
      <Sidebar 
        usuario={usuario} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
      />
      <main className="flex-1 overflow-hidden flex flex-col h-full bg-slate-950">
        {activeTab === 'dashboard' && (
          <Dashboard ventas={ventas} productos={productos} sucursales={sucursales} onNavigate={setActiveTab} />
        )}
        {activeTab === 'pos' && (
          <POS productos={productos} sucursales={sucursales} usuario={usuario} onRegistrarVenta={handleRegistrarVenta} />
        )}
        {activeTab === 'inventario' && (
          <Inventario productos={productos} sucursales={sucursales} usuario={usuario} onSaveProducto={handleSaveProducto} onDeleteProducto={handleDeleteProducto} onTransferirStock={handleTransferirStock} transferencias={transferencias} />
        )}
        {activeTab === 'ventas' && (
          <Ventas ventas={ventas} sucursales={sucursales} />
        )}
        {activeTab === 'sucursales' && (
          <Sucursales sucursales={sucursales} ventas={ventas} usuario={usuario} onSaveSucursal={handleSaveSucursal} onDeleteSucursal={handleDeleteSucursal} onAgregar={handleSaveSucursal} onEditar={handleSaveSucursal} onEliminar={handleDeleteSucursal} />
        )}
      </main>
    </div>
  );
}