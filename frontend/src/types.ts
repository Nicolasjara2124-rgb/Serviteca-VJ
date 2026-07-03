/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Sucursal {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  encargado: string;
}

export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  marca?: string;
  categoria: string;
  precioCompra: number;
  precioVenta: number;
  stockGlobal: number;
  stockPorSucursal: Record<string, number>;
  minStock: number;
}

export interface VentaItem {
  productoId: string;
  nombre: string;
  codigo: string;
  precio: number;
  cantidad: number;
  totalItem: number;
}

export type MetodoPago = 'Efectivo' | 'Débito' | 'Crédito';

export interface Venta {
  id: string;
  sucursalId: string;
  sucursalNombre: string;
  items: VentaItem[];
  subtotal: number;
  iva: number;
  descuento: number;
  total: number;
  metodoPago: MetodoPago;
  fecha: string;
  vendedor: string;
}

export interface Usuario {
  id: string;
  nombre: string;
  pin: string;
  rol: 'Administrador' | 'Vendedor' | 'Supervisor';
  sucursalId?: string;
}

export interface TransferenciaStock {
  id: string;
  productoId: string;
  productoNombre: string;
  origenId: string;
  origenNombre: string;
  destinoId: string;
  destinoNombre: string;
  cantidad: number;
  fecha: string;
  encargado: string;
}