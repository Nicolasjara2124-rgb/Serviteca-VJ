/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Producto, Sucursal, Usuario, Venta, TransferenciaStock } from '../types';

const KEYS = {
  SESION_ACTIVA: 'vj_erp_sesion_activa',
  INITIALIZED_FS: 'vj_erp_firestore_initialized_v1' // Nueva llave para saber si ya subimos los datos semilla a la nube
};

// --- DATOS SEMILLA ---
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

// --- INICIALIZACIÓN DE FIRESTORE ---
// Esta función sube tus datos iniciales a Firebase la primera vez que corre el sistema
export async function inicializarBaseDatos(): Promise<void> {
  const yaInicializada = localStorage.getItem(KEYS.INITIALIZED_FS);
  if (!yaInicializada) {
    try {
      for (const suc of SUCURSALES_SEMILLA) {
        await setDoc(doc(db, 'sucursales', suc.id), suc);
      }
      for (const usr of USUARIOS_SEMILLA) {
        await setDoc(doc(db, 'usuarios', usr.id), usr);
      }
      for (const prod of PRODUCTOS_SEMILLA) {
        await setDoc(doc(db, 'productos', prod.id), prod);
      }
      localStorage.setItem(KEYS.INITIALIZED_FS, 'true');
      console.log('Base de datos inicializada en Firestore correctamente.');
    } catch (error) {
      console.error('Error inicializando Firestore:', error);
    }
  }
}

// --- PRODUCTOS ---
export async function obtenerProductos(): Promise<Producto[]> {
  await inicializarBaseDatos();
  const querySnapshot = await getDocs(collection(db, 'productos'));
  return querySnapshot.docs.map(doc => doc.data() as Producto);
}

export async function guardarProducto(producto: Producto): Promise<Producto[]> {
  producto.stockGlobal = Object.values(producto.stockPorSucursal).reduce((acc, curr) => acc + curr, 0);
  await setDoc(doc(db, 'productos', producto.id), producto);
  return await obtenerProductos();
}

export async function eliminarProducto(id: string): Promise<Producto[]> {
  await deleteDoc(doc(db, 'productos', id));
  return await obtenerProductos();
}

// --- SUCURSALES ---
export async function obtenerSucursales(): Promise<Sucursal[]> {
  await inicializarBaseDatos();
  const querySnapshot = await getDocs(collection(db, 'sucursales'));
  return querySnapshot.docs.map(doc => doc.data() as Sucursal);
}

export async function guardarSucursal(sucursal: Sucursal): Promise<Sucursal[]> {
  await setDoc(doc(db, 'sucursales', sucursal.id), sucursal);
  return await obtenerSucursales();
}

export async function eliminarSucursal(id: string): Promise<Sucursal[]> {
  await deleteDoc(doc(db, 'sucursales', id));
  return await obtenerSucursales();
}

// --- VENTAS ---
export async function obtenerVentas(): Promise<Venta[]> {
  await inicializarBaseDatos();
  const querySnapshot = await getDocs(collection(db, 'ventas'));
  const ventas = querySnapshot.docs.map(doc => doc.data() as Venta);
  return ventas.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}

export async function registrarNuevaVenta(venta: Venta): Promise<Venta[]> {
  // 1. Guardar la venta
  await setDoc(doc(db, 'ventas', venta.id), venta);
  
  // 2. Actualizar stock de productos involucrados
  const productos = await obtenerProductos();
  for (const item of venta.items) {
    const prod = productos.find(p => p.id === item.productoId);
    if (prod && prod.categoria !== 'Servicios') {
      const stockActual = prod.stockPorSucursal[venta.sucursalId] ?? 0;
      prod.stockPorSucursal[venta.sucursalId] = Math.max(0, stockActual - item.cantidad);
      prod.stockGlobal = Object.values(prod.stockPorSucursal).reduce((acc, curr) => acc + curr, 0);
      
      // Actualizar el producto en Firestore
      await setDoc(doc(db, 'productos', prod.id), prod);
    }
  }
  return await obtenerVentas();
}

// --- TRANSFERENCIAS ---
export async function obtenerTransferencias(): Promise<TransferenciaStock[]> {
  await inicializarBaseDatos();
  const querySnapshot = await getDocs(collection(db, 'transferencias'));
  return querySnapshot.docs.map(doc => doc.data() as TransferenciaStock);
}

export async function registrarTransferencia(transferencia: TransferenciaStock): Promise<TransferenciaStock[]> {
  // 1. Guardar la transferencia
  await setDoc(doc(db, 'transferencias', transferencia.id), transferencia);
  
  // 2. Actualizar el stock origen y destino
  const productos = await obtenerProductos();
  const prod = productos.find(p => p.id === transferencia.productoId);
  
  if (prod && prod.categoria !== 'Servicios') {
    const stockOrigen = prod.stockPorSucursal[transferencia.origenId] ?? 0;
    const stockDestino = prod.stockPorSucursal[transferencia.destinoId] ?? 0;
    
    prod.stockPorSucursal[transferencia.origenId] = Math.max(0, stockOrigen - transferencia.cantidad);
    prod.stockPorSucursal[transferencia.destinoId] = stockDestino + transferencia.cantidad;
    prod.stockGlobal = Object.values(prod.stockPorSucursal).reduce((acc, curr) => acc + curr, 0);
    
    // Actualizar el producto en Firestore
    await setDoc(doc(db, 'productos', prod.id), prod);
  }
  return await obtenerTransferencias();
}

// --- USUARIOS Y SEGURIDAD ---
export async function obtenerUsuarios(): Promise<Usuario[]> {
  await inicializarBaseDatos();
  const querySnapshot = await getDocs(collection(db, 'usuarios'));
  return querySnapshot.docs.map(doc => doc.data() as Usuario);
}

// Login valida contra Firestore, pero guarda la sesión en localStorage para no pedir PIN a cada rato en el mismo PC
export async function loginUsuario(pin: string): Promise<Usuario | null> {
  const usuarios = await obtenerUsuarios();
  const usuario = usuarios.find(u => u.pin === pin);
  if (usuario) {
    localStorage.setItem(KEYS.SESION_ACTIVA, JSON.stringify(usuario));
    return usuario;
  }
  return null;
}

export function getSesionActiva(): Usuario | null {
  const data = localStorage.getItem(KEYS.SESION_ACTIVA);
  if (!data) return null;
  try {
    return JSON.parse(data) as Usuario;
  } catch (e) {
    return null;
  }
}

export function logoutUsuario(): void {
  localStorage.removeItem(KEYS.SESION_ACTIVA);
}