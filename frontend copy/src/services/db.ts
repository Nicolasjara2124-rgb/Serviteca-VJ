/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Producto, Sucursal, Usuario, Venta, TransferenciaStock } from '../types';

const KEYS = {
  PRODUCTOS: 'vj_erp_productos',
  SUCURSALES: 'vj_erp_sucursales',
  USUARIOS: 'vj_erp_usuarios',
  VENTAS: 'vj_erp_ventas',
  TRANSFERENCIAS: 'vj_erp_transferencias',
  SESION_ACTIVA: 'vj_erp_sesion_activa',
  INITIALIZED: 'vj_erp_initialized_v3'
};

const SUCURSALES_SEMILLA: Sucursal[] = [
  {
    id: 'suc-1',
    nombre: 'Serviteca VJ - Rengo Casa Matriz',
    direccion: 'Gabriela Mistral 114, Rengo',
    telefono: '+56 9 8410 4912',
    encargado: 'Víctor Jara'
  }
];

const USUARIOS_SEMILLA: Usuario[] = [
  {
    id: 'usr-1',
    nombre: 'Víctor Jara',
    pin: '1973',
    rol: 'Administrador',
    sucursalId: 'suc-1'
  }
];

const PRODUCTOS_SEMILLA: Producto[] = [
  {
    id: 'prod-1',
    codigo: '10001',
    nombre: 'Neumático Bridgestone 205/55R16 Ecopia EP150',
    marca: 'Bridgestone',
    categoria: 'Neumáticos',
    precioCompra: 55000,
    precioVenta: 89990,
    stockGlobal: 30,
    stockPorSucursal: { 'suc-1': 30 },
    minStock: 10
  },
  {
    id: 'prod-srv-1',
    codigo: 'SRV-001',
    nombre: 'reparación de rueda',
    marca: 'VJ Serviteca',
    categoria: 'Servicios',
    precioCompra: 0,
    precioVenta: 5000,
    stockGlobal: 9999,
    stockPorSucursal: { 'suc-1': 9999 },
    minStock: 0
  }
];

function get<T>(key: string, defaultValue: T): T {
  const data = localStorage.getItem(key);
  if (!data) return defaultValue;
  try { return JSON.parse(data) as T; } catch (e) { return defaultValue; }
}

function set<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function inicializarBaseDatos(): void {
  const yaInicializada = localStorage.getItem(KEYS.INITIALIZED);
  if (!yaInicializada) {
    set(KEYS.SUCURSALES, SUCURSALES_SEMILLA);
    set(KEYS.USUARIOS, USUARIOS_SEMILLA);
    set(KEYS.PRODUCTOS, PRODUCTOS_SEMILLA);
    set(KEYS.VENTAS, []);
    set(KEYS.TRANSFERENCIAS, []);
    localStorage.setItem(KEYS.INITIALIZED, 'true');
  }
}

// --- PRODUCTOS ---
export function obtenerProductos(): Producto[] {
  inicializarBaseDatos(); return get<Producto[]>(KEYS.PRODUCTOS, []);
}
export function guardarProducto(producto: Producto): Producto[] {
  const productos = obtenerProductos();
  const index = productos.findIndex(p => p.id === producto.id);
  if (index >= 0) productos[index] = producto; else productos.push(producto);
  producto.stockGlobal = Object.values(producto.stockPorSucursal).reduce((acc, curr) => acc + curr, 0);
  set(KEYS.PRODUCTOS, productos); return productos;
}
export function eliminarProducto(id: string): Producto[] {
  const filtrados = obtenerProductos().filter(p => p.id !== id);
  set(KEYS.PRODUCTOS, filtrados); return filtrados;
}

// --- SUCURSALES ---
export function obtenerSucursales(): Sucursal[] {
  inicializarBaseDatos(); return get<Sucursal[]>(KEYS.SUCURSALES, []);
}
export function guardarSucursal(sucursal: Sucursal): Sucursal[] {
  const sucursales = obtenerSucursales();
  const index = sucursales.findIndex(s => s.id === sucursal.id);
  if (index >= 0) sucursales[index] = sucursal; else sucursales.push(sucursal);
  set(KEYS.SUCURSALES, sucursales); return sucursales;
}
export function eliminarSucursal(id: string): Sucursal[] {
  const filtrados = obtenerSucursales().filter(s => s.id !== id);
  set(KEYS.SUCURSALES, filtrados); return filtrados;
}

// --- VENTAS ---
export function obtenerVentas(): Venta[] {
  inicializarBaseDatos(); return get<Venta[]>(KEYS.VENTAS, []).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}
export function registrarNuevaVenta(venta: Venta): Venta[] {
  const ventas = obtenerVentas(); ventas.push(venta); set(KEYS.VENTAS, ventas);
  const productos = obtenerProductos();
  venta.items.forEach(item => {
    const prod = productos.find(p => p.id === item.productoId);
    if (prod && prod.categoria !== 'Servicios') {
      const stockActual = prod.stockPorSucursal[venta.sucursalId] ?? 0;
      prod.stockPorSucursal[venta.sucursalId] = Math.max(0, stockActual - item.cantidad);
      prod.stockGlobal = Object.values(prod.stockPorSucursal).reduce((acc, curr) => acc + curr, 0);
    }
  });
  set(KEYS.PRODUCTOS, productos); return ventas;
}

// --- TRANSFERENCIAS ---
export function obtenerTransferencias(): TransferenciaStock[] {
  inicializarBaseDatos(); return get<TransferenciaStock[]>(KEYS.TRANSFERENCIAS, []);
}
export function registrarTransferencia(transferencia: TransferenciaStock): TransferenciaStock[] {
  const transferencias = obtenerTransferencias(); transferencias.push(transferencia); set(KEYS.TRANSFERENCIAS, transferencias);
  const productos = obtenerProductos();
  const prod = productos.find(p => p.id === transferencia.productoId);
  if (prod && prod.categoria !== 'Servicios') {
    const stockOrigen = prod.stockPorSucursal[transferencia.origenId] ?? 0;
    const stockDestino = prod.stockPorSucursal[transferencia.destinoId] ?? 0;
    prod.stockPorSucursal[transferencia.origenId] = Math.max(0, stockOrigen - transferencia.cantidad);
    prod.stockPorSucursal[transferencia.destinoId] = stockDestino + transferencia.cantidad;
    prod.stockGlobal = Object.values(prod.stockPorSucursal).reduce((acc, curr) => acc + curr, 0);
    set(KEYS.PRODUCTOS, productos);
  }
  return transferencias;
}

// --- USUARIOS Y SEGURIDAD ---
export function obtenerUsuarios(): Usuario[] {
  inicializarBaseDatos(); return get<Usuario[]>(KEYS.USUARIOS, []);
}

export function loginUsuario(pin: string): Usuario | null {
  const usuarios = obtenerUsuarios();
  const usuario = usuarios.find(u => u.pin === pin);
  if (usuario) {
    set(KEYS.SESION_ACTIVA, usuario);
    return usuario;
  }
  return null;
}

export function getSesionActiva(): Usuario | null {
  inicializarBaseDatos();
  return get<Usuario | null>(KEYS.SESION_ACTIVA, null);
}

export function logoutUsuario(): void {
  localStorage.removeItem(KEYS.SESION_ACTIVA);
}

export const usuarios = [
  {
    pin: '0000',
    nombre: 'Administrador',
    rol: 'administrador',
    sucursalId: 'suc-1'
  },
  {
    pin: '1234',
    nombre: 'Vendedor Junior',
    rol: 'vendedor',
    sucursalId: 'suc-1'
  }
];