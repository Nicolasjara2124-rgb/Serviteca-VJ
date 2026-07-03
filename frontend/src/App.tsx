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

  // 1. Inicializar base de datos y cargar información desde la nube
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        // Inicializa las colecciones semilla si es la primera vez
        await inicializarBaseDatos();
        
        // Obtiene la sesión activa (esta sigue siendo síncrona en localStorage)
        const sesion = getSesionActiva();
        setUsuario(sesion);
        
        // Descargamos toda la información de Firestore en paralelo
        const [listaProductos, listaSucursales, listaVentas, listaTransferencias] = await Promise.all([
          obtenerProductos(),
          obtenerSucursales(),
          obtenerVentas(),
          obtenerTransferencias()
        ]);
        
        setProductos(listaProductos);
        setSucursales(listaSucursales);
        setVentas(listaVentas);
        setTransferencias(listaTransferencias);
      } catch (error) {
        console.error("Error crítico al cargar datos desde Firestore:", error);
      } finally {
        setLoading(false);
      }
    };

    cargarDatosIniciales();
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

  // 3. Operaciones de Base de Datos (Mapeadas de forma Asíncrona)
  const handleRegistrarVenta = async (nuevaVenta: Venta) => {
    try {
      await registrarNuevaVenta(nuevaVenta);
      const v = await obtenerVentas();
      const p = await obtenerProductos();
      setVentas(v);
      setProductos(p);
    } catch (error) {
      console.error("Error al registrar venta:", error);
    }
  };

  const handleSaveProducto = async (prod: Producto) => {
    try {
      await guardarProducto(prod);
      const p = await obtenerProductos();
      setProductos(p);
    } catch (error) {
      console.error("Error al guardar producto:", error);
    }
  };

  const handleDeleteProducto = async (id: string) => {
    try {
      await eliminarProducto(id);
      const p = await obtenerProductos();
      setProductos(p);
    } catch (error) {
      console.error("Error al eliminar producto:", error);
    }
  };

  const handleTransferirStock = async (trans: TransferenciaStock) => {
    try {
      await registrarTransferencia(trans);
      const p = await obtenerProductos();
      const t = await obtenerTransferencias();
      setProductos(p);
      setTransferencias(t);
    } catch (error) {
      console.error("Error al transferir stock:", error);
    }
  };

  const handleSaveSucursal = async (suc: Sucursal) => {
    try {
      await guardarSucursal(suc);
      const s = await obtenerSucursales();
      setSucursales(s);
    } catch (error) {
      console.error("Error al guardar sucursal:", error);
    }
  };

  const handleDeleteSucursal = async (id: string) => {
    try {
      await eliminarSucursal(id);
      const s = await obtenerSucursales();
      const p = await obtenerProductos();
      setSucursales(s);
      setProductos(p);
    } catch (error) {
      console.error("Error al eliminar sucursal:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center font-sans text-slate-300">
        <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-mono tracking-wider">INICIALIZANDO SERVITECA VJ ERP...</p>
      </div>
    );
  }

  // Pantalla de Login
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