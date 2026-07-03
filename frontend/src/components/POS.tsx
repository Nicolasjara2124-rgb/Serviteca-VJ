/**
* @license
* SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Producto, Sucursal, Usuario, Venta, VentaItem, MetodoPago } from '../types';
import {
Search,
Barcode,
Trash2,
Plus,
Minus,
CreditCard,
DollarSign,
Coins,
Receipt,
ShoppingCart,
MapPin,
X,
Printer,
RefreshCw
} from 'lucide-react';

/**
* ARCHITECTURAL DOCUMENTATION: POS.tsx (Punto de Venta)
* ====================================================
* This component acts as the frontline cashier terminal of the Serviteca VJ ERP.
*
* Communication Flow & Data Sync:
* 1. Read Operations: Consumes live lists of `productos` and `sucursales` from parent App state,
* which are originally retrieved from localStorage on boot (via `db.ts`).
* 2. Write Operations: On successful checkout, triggers the callback `onRegistrarVenta(nuevaVenta)`.
* This propagates upward to App.tsx, which writes the transaction using `registrarVenta` inside `db.ts`.
* This in turn decrements physical stock for each item in the respective branch in localStorage and triggers a state refresh.
* 3. Reactive Binding: Stock displays dynamically update in real-time within the POS view as soon as stock changes.
*/

interface POSProps {
productos: Producto[];
sucursales: Sucursal[];
usuario: Usuario;
onRegistrarVenta: (venta: Venta) => Promise<void> |void;
}

export default function POS({ productos, sucursales, usuario, onRegistrarVenta }: POSProps) {
// Referencia para enfoque automático de pistola lectora de código de barras
const barcodeInputRef = useRef<HTMLInputElement>(null);

// 1. Estados de Selección y Entrada
const [sucursalSeleccionadaId, setSucursalSeleccionadaId] = useState<string>(
usuario.sucursalId || sucursales[0]?.id || ''
);
const [searchQuery, setSearchQuery] = useState('');
const [barcodeInput, setBarcodeInput] = useState('');
const [cart, setCart] = useState<VentaItem[]>([]);
const [metodoPago, setMetodoPago] = useState<MetodoPago>('Efectivo');
const [dineroRecibido, setDineroRecibido] = useState<string>('');
// Estado para el sistema de descuentos
const [tipoDescuento, setTipoDescuento] = useState<'fijo' | 'porcentaje'>('fijo');
const [valorDescuento, setValorDescuento] = useState<string>('0');

// Estados para venta libre / servicio custom
const [activePaso1Tab, setActivePaso1Tab] = useState<'scan' | 'manual'>('scan');
const [manualNombre, setManualNombre] = useState('reparación de rueda');
const [manualPrecio, setManualPrecio] = useState('');
const [manualCantidad, setManualCantidad] = useState('1');
// Estado para la boleta impresa (ticket final)
const [boletaFinal, setBoletaFinal] = useState<Venta | null>(null);
const [showBoletaModal, setShowBoletaModal] = useState(false);

// Permite modificar en caliente el precio unitario de cualquier producto en el carrito
// Usamos un valor que puede ser string o número para evitar que se bloquee la digitación del usuario (por ej, con decimales o campo vacío)
const updateItemPrecio = (productoId: string, nuevoPrecioRaw: string) => {
setCart(prev => prev.map(item => {
if (item.productoId === productoId) {
const parsed = parseFloat(nuevoPrecioRaw);
const validatedPrecio = isNaN(parsed) ? 0 : parsed;
return {
...item,
precio: nuevoPrecioRaw as any, // Se almacena como string temporalmente para permitir digitación fluida en el input
totalItem: validatedPrecio * item.cantidad
};
}
return item;
}));
};

// Autofoco automático al cargar el módulo POS
useEffect(() => {
if (barcodeInputRef.current) {
barcodeInputRef.current.focus();
}
}, []);


function sucursalSubnombre(suc?: Sucursal) {
if (!suc) return { id: '', nombre: 'Sin Sucursal', direccion: '', telefono: '', encargado: '' };
return {
...suc,
nombreSimplificado: suc.nombre.replace('Serviteca VJ - ', '')
};
}

// 2. Filtrar productos por búsqueda
const productosFiltrados = useMemo(() => {
if (!searchQuery) return productos;
const q = searchQuery.toLowerCase();
return productos.filter(p =>
p.nombre.toLowerCase().includes(q) ||
p.codigo.includes(q) ||
p.categoria.toLowerCase().includes(q)
);
}, [productos, searchQuery]);

// 3. Simular Escaneo de Código de Barras
const handleBarcodeSubmit = (e: React.FormEvent) => {
e.preventDefault();
const cleanInput = barcodeInput.trim();
if (!cleanInput) return;
const prod = productos.find(p => p.codigo === cleanInput);
if (prod) {
agregarAlCarrito(prod);
setBarcodeInput('');
} else {
alert(`Código de barras "${cleanInput}" no encontrado en el inventario central.`);
}
// Devolver foco al input automáticamente
if (barcodeInputRef.current) {
barcodeInputRef.current.focus();
}
};

// 3.5 Agregar Item Manual / Venta Libre
const handleAgregarManual = (e: React.FormEvent) => {
e.preventDefault();
const precioNum = parseFloat(manualPrecio);
const cantNum = parseInt(manualCantidad);
if (!manualNombre.trim()) {
alert('Por favor, ingrese un nombre o descripción para el servicio custom.');
return;
}
if (isNaN(precioNum) || precioNum < 0) {
alert('Por favor, ingrese un precio unitario válido (mayor o igual a 0).');
return;
}
if (isNaN(cantNum) || cantNum <= 0) {
alert('Por favor, ingrese una cantidad mayor que 0.');
return;
}

const uniqueId = `manual-${Date.now()}`;
const manualCodigo = `MANUAL-${Math.floor(100 + Math.random() * 900)}`;

setCart(prev => [...prev, {
productoId: uniqueId,
nombre: manualNombre.trim(),
codigo: manualCodigo,
precio: precioNum,
cantidad: cantNum,
totalItem: precioNum * cantNum
}]);

// Limpiar campos
setManualNombre('reparación de rueda');
setManualPrecio('');
setManualCantidad('1');
// Enfocar el escaner de vuelta por defecto
if (barcodeInputRef.current) {
barcodeInputRef.current.focus();
}
};

// 4. Agregar al Carrito
const agregarAlCarrito = (producto: Producto) => {
// Validar Stock en la sucursal seleccionada (a menos que sea un servicio o venta manual)
const stockDisponible = producto.stockPorSucursal[sucursalSeleccionadaId] ?? 0;
const esServicio = producto.categoria === 'Servicios';
const itemExistente = cart.find(item => item.productoId === producto.id);
const cantidadActual = itemExistente ? itemExistente.cantidad : 0;

if (!esServicio && cantidadActual >= stockDisponible) {
alert(`No hay stock suficiente de "${producto.nombre}" en esta sucursal. Disponible: ${stockDisponible}`);
return;
}

if (itemExistente) {
setCart(prev => prev.map(item => {
if (item.productoId === producto.id) {
const itemPrice = typeof item.precio === 'string' ? parseFloat(item.precio) : item.precio;
const cleanPrice = isNaN(itemPrice) ? 0 : itemPrice;
return {
...item,
cantidad: item.cantidad + 1,
totalItem: (item.cantidad + 1) * cleanPrice
};
}
return item;
}));
} else {
setCart(prev => [...prev, {
productoId: producto.id,
nombre: producto.nombre,
codigo: producto.codigo,
precio: producto.precioVenta,
cantidad: 1,
totalItem: producto.precioVenta
}]);
}

// Retener el foco en el escaner para operaciones rápidas
if (barcodeInputRef.current) {
barcodeInputRef.current.focus();
}
};

// 5. Modificar cantidad en carrito
const modificarCantidad = (productoId: string, delta: number) => {
const item = cart.find(i => i.productoId === productoId);
if (!item) return;

const nuevoValor = item.cantidad + delta;
if (nuevoValor <= 0) {
eliminarDelCarrito(productoId);
return;
}

const producto = productos.find(p => p.id === productoId);
const esServicio = producto ? producto.categoria === 'Servicios' : true;
const stockDisponible = producto ? (producto.stockPorSucursal[sucursalSeleccionadaId] ?? 0) : 999999;

if (!esServicio && delta > 0 && nuevoValor > stockDisponible) {
alert(`No hay stock suficiente disponible en esta sucursal. Máximo: ${stockDisponible}`);
return;
}

const itemPrice = typeof item.precio === 'string' ? parseFloat(item.precio) : item.precio;
const price = isNaN(itemPrice) ? 0 : itemPrice;

setCart(prev => prev.map(i =>
i.productoId === productoId
? { ...i, cantidad: nuevoValor, totalItem: nuevoValor * price }
: i
));
};

const eliminarDelCarrito = (productoId: string) => {
setCart(prev => prev.filter(i => i.productoId !== productoId));
};

const vaciarCarrito = () => {
setCart([]);
setDineroRecibido('');
setValorDescuento('0');
setTipoDescuento('fijo');
setManualNombre('reparación de rueda');
setManualPrecio('');
setManualCantidad('1');
setActivePaso1Tab('scan');
if (barcodeInputRef.current) {
barcodeInputRef.current.focus();
}
};

// 6. LÓGICA DE CAJA Y DESCUENTOS (PRECISIÓN CHILE):
// 6.1. Subtotal bruto es la suma preliminar de los ítems en el carrito.
const subtotalBruto = useMemo(() => {
return cart.reduce((acc, item) => {
const p = typeof item.precio === 'string' ? parseFloat(item.precio) : item.precio;
const cleanPrice = isNaN(p) ? 0 : p;
return acc + (cleanPrice * item.cantidad);
}, 0);
}, [cart]);

// 6.2. Cálculo del descuento aplicado (soporta monto fijo o porcentaje).
const descuentoCalculado = useMemo(() => {
const valor = parseFloat(valorDescuento);
if (isNaN(valor) || valor <= 0) return 0;
if (tipoDescuento === 'porcentaje') {
return Math.round((subtotalBruto * Math.min(valor, 100)) / 100);
} else {
return Math.min(valor, subtotalBruto);
}
}, [subtotalBruto, tipoDescuento, valorDescuento]);

// 6.3. El Total de la boleta de venta en Chile incluye el 19% de IVA y los descuentos aplicados.
const total = useMemo(() => {
return Math.max(0, subtotalBruto - descuentoCalculado);
}, [subtotalBruto, descuentoCalculado]);

// 6.4. El Neto se calcula mediante: Math.round(Total / 1.19)
const neto = useMemo(() => {
return Math.round(total / 1.19);
}, [total]);

// 6.5. El IVA correspondiente es: Total - Neto (Neto + IVA === Total exactamente)
const iva = useMemo(() => {
return total - neto;
}, [total, neto]);

const vuelto = useMemo(() => {
const recibido = parseFloat(dineroRecibido);
if (isNaN(recibido) || recibido < total) return 0;
return recibido - total;
}, [dineroRecibido, total]);

// 7. Procesar Venta
const handlePagar = async () => {
// Validación estricta para evitar emitir boletas vacías o con total cero
if (cart.length === 0 || total <= 0) {
alert('La boleta no contiene ningún ítem o el total de la transacción es $0.');
return;
}
if (metodoPago === 'Efectivo' && dineroRecibido) {
const recibido = parseFloat(dineroRecibido);
if (recibido < total) {
alert('El dinero recibido es menor que el total de la boleta.');
return;
}
}

const nuevaVenta: Venta = {
id: `vnt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
sucursalId: sucursalSeleccionadaId,
sucursalNombre: sucursales.find(s => s.id === sucursalSeleccionadaId)?.nombre || 'Santiago',
items: cart.map(item => {
const p = typeof item.precio === 'string' ? parseFloat(item.precio) : item.precio;
const cleanPrice = isNaN(p) ? 0 : p;
return {
...item,
precio: cleanPrice,
totalItem: cleanPrice * item.cantidad
};
}),
subtotal: neto,
iva: iva,
descuento: descuentoCalculado,
total: total,
metodoPago: metodoPago,
fecha: new Date().toISOString(),
vendedor: usuario.nombre,
};

await onRegistrarVenta(nuevaVenta);
setBoletaFinal(nuevaVenta);
setShowBoletaModal(true);
// WORKFLOW 'AL TIRO': Limpieza y autoenfoque inmediato después de emitir
vaciarCarrito();
};

// Formateador CLP
const formatCLP = (val: number) => {
return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);
};

return (
<div className="flex flex-col lg:flex-row h-screen w-full bg-slate-950 font-sans text-slate-100 overflow-hidden">
{/* Columna Izquierda: Punto de Venta / Carrito (Sección Principal de Trabajo) */}
<div className="flex-1 flex flex-col h-full border-r border-slate-900 p-6 overflow-hidden">
{/* Cabecera del POS */}
<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5 shrink-0">
<div>
<h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
<ShoppingCart className="text-blue-500 w-6 h-6 shrink-0" />
Terminal POS de Caja
</h1>
<p className="text-slate-400 text-xs mt-0.5">Venta rápida y facturación fiscal simplificada.</p>
</div>
{/* Selector de Sucursal */}
<div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-2.5 rounded-xl w-full md:w-auto">
<MapPin className="w-4 h-4 text-blue-400 shrink-0" />
<span className="text-xs text-slate-400 font-medium whitespace-nowrap">Sucursal:</span>
<select
value={sucursalSeleccionadaId}
onChange={(e) => {
setSucursalSeleccionadaId(e.target.value);
vaciarCarrito(); // Evitar inconsistencias de stock entre sucursales
}}
className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer pr-4"
>
{sucursales.map(s => (
<option key={s.id} value={s.id} className="bg-slate-900 text-white">
{s.nombre.replace('Serviteca VJ - ', '')}
</option>
))}
</select>
</div>
</div>

{/* PASO 1: Buscar Producto o Escanear Código o Venta Libre */}
<div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl mb-4 shrink-0 space-y-3">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
<div className="flex items-center gap-2">
<span className="text-[10px] font-mono font-bold bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded border border-blue-900/30">PASO 1</span>
<span className="text-xs font-bold text-slate-300">Método de Ingreso de Items</span>
</div>
{/* Tab switchers */}
<div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-850">
<button
type="button"
onClick={() => setActivePaso1Tab('scan')}
className={`px-3 py-1 text-[10px] font-bold font-mono rounded transition-all cursor-pointer ${
activePaso1Tab === 'scan'
? 'bg-blue-600 text-white'
: 'text-slate-400 hover:text-slate-200'
}`}
>
Escanear / Catálogo
</button>
<button
type="button"
onClick={() => setActivePaso1Tab('manual')}
className={`px-3 py-1 text-[10px] font-bold font-mono rounded transition-all cursor-pointer ${
activePaso1Tab === 'manual'
? 'bg-blue-600 text-white'
: 'text-slate-400 hover:text-slate-200'
}`}
>
Venta Libre / Custom
</button>
</div>
</div>

{activePaso1Tab === 'scan' ? (
<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
{/* Escáner de Código de Barras (Workflow "Al Tiro" Autofocus) */}
<form onSubmit={handleBarcodeSubmit} className="relative flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus-within:border-blue-500 transition-colors">
<Barcode className="w-4 h-4 text-blue-400 mr-2 shrink-0" />
<input
ref={barcodeInputRef}
type="text"
placeholder="Escanear código de barras..."
value={barcodeInput}
onChange={(e) => setBarcodeInput(e.target.value)}
className="bg-transparent text-xs text-white placeholder-slate-500 w-full focus:outline-none font-mono"
/>
<button
type="submit"
className="px-2 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded text-[10px] font-bold font-mono hover:bg-blue-600 hover:text-white transition-colors cursor-pointer"
>
Ingresar
</button>
</form>

{/* Buscador de Escritorio */}
<div className="relative flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus-within:border-blue-500 transition-colors">
<Search className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
<input
type="text"
placeholder="Buscar por nombre o categoría..."
value={searchQuery}
onChange={(e) => setSearchQuery(e.target.value)}
className="bg-transparent text-xs text-white placeholder-slate-500 w-full focus:outline-none"
/>
{searchQuery && (
<button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-slate-300">
<X className="w-4 h-4" />
</button>
)}
</div>
</div>
) : (
<form onSubmit={handleAgregarManual} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
{/* Nombre de la venta libre */}
<div className="space-y-1 md:col-span-2">
<label className="block text-[10px] font-mono text-slate-400 uppercase">Detalle del Servicio / Ítem Custom</label>
<input
type="text"
required
placeholder="Ej: Reparación de rueda de emergencia"
value={manualNombre}
onChange={(e) => setManualNombre(e.target.value)}
className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
/>
</div>

{/* Precio de la venta libre */}
<div className="space-y-1">
<label className="block text-[10px] font-mono text-slate-400 uppercase">Precio Unitario ($)</label>
<input
type="number"
required
min="0"
placeholder="Ej: 15000"
value={manualPrecio}
onChange={(e) => setManualPrecio(e.target.value)}
className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none font-mono"
/>
</div>

{/* Cantidad / Agregar */}
<div className="flex gap-2">
<div className="space-y-1 w-1/3">
<label className="block text-[10px] font-mono text-slate-400 uppercase">Cant</label>
<input
type="number"
required
min="1"
value={manualCantidad}
onChange={(e) => setManualCantidad(e.target.value)}
className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white text-center focus:border-blue-500 focus:outline-none font-mono"
/>
</div>
<button
type="submit"
className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all cursor-pointer h-[34px] flex items-center justify-center gap-1 self-end"
>
<Plus className="w-3.5 h-3.5" />
<span>Añadir</span>
</button>
</div>
</form>
)}
</div>

{/* PASO 2: Ver Lista de Venta con cálculos fiscales */}
<div className="flex-1 flex flex-col overflow-hidden bg-slate-900/20 border border-slate-900 rounded-2xl p-4">
<div className="flex justify-between items-center mb-3 shrink-0">
<div className="flex items-center gap-2">
<span className="text-[10px] font-mono font-bold bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded border border-blue-900/30">PASO 2</span>
<span className="text-xs font-bold text-slate-300">Detalle de Boleta ({cart.length} ítems)</span>
</div>
{cart.length > 0 && (
<button
onClick={vaciarCarrito}
className="text-[10px] font-bold font-mono text-red-400 hover:text-red-300 flex items-center gap-1 px-2.5 py-1 bg-red-950/20 border border-red-900/30 rounded-lg transition-colors cursor-pointer"
>
<RefreshCw className="w-3 h-3" />
Limpiar Venta
</button>
)}
</div>

<div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
{cart.length > 0 ? (
cart.map((item) => {
const prod = productos.find(p => p.id === item.productoId);
const stockRestante = prod ? (prod.stockPorSucursal[sucursalSeleccionadaId] ?? 0) - item.cantidad : 0;
const esServicio = prod ? prod.categoria === 'Servicios' : true;

return (
<div key={item.productoId} className="bg-slate-900 border border-slate-850 p-3.5 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 hover:border-slate-800 transition-all">
<div className="space-y-1.5 max-w-sm w-full md:w-auto">
<h3 className="text-xs font-semibold text-white leading-tight">{item.nombre}</h3>
<div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 font-mono">
<span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-850">CÓD: {item.codigo}</span>
<span>•</span>
<div className="flex items-center gap-1">
<span>Precio Unit: $</span>
<input
type="number"
value={item.precio}
onChange={(e) => updateItemPrecio(item.productoId, e.target.value)}
className="w-24 bg-slate-950 text-white font-bold border border-slate-800 rounded px-1.5 py-0.5 focus:border-blue-500 focus:outline-none text-xs text-center font-mono"
placeholder="0"
min="0"
/>
</div>
{!esServicio && (
<>
<span>•</span>
<span className={`${stockRestante <= 2 ? 'text-red-400 font-bold bg-red-950/20 px-1 py-0.5 rounded border border-red-900/10' : 'text-slate-400'}`}>
Stock: {stockRestante} u.
</span>
</>
)}
</div>
</div>

<div className="flex items-center justify-between w-full md:w-auto gap-4 shrink-0">
{/* Controladores de cantidad */}
<div className="flex items-center bg-slate-950 border border-slate-850 rounded-lg p-1">
<button
onClick={() => modificarCantidad(item.productoId, -1)}
className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
>
<Minus className="w-3.5 h-3.5" />
</button>
<span className="px-2 text-xs font-mono font-bold text-white text-center min-w-[20px]">
{item.cantidad}
</span>
<button
onClick={() => modificarCantidad(item.productoId, 1)}
className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
>
<Plus className="w-3.5 h-3.5" />
</button>
</div>

{/* Total y Eliminar */}
<div className="flex items-center gap-3">
<span className="text-xs font-bold font-mono text-white min-w-[65px] text-right">
{formatCLP(item.totalItem)}
</span>
<button
onClick={() => eliminarDelCarrito(item.productoId)}
className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/20 rounded transition-all"
>
<Trash2 className="w-3.5 h-3.5" />
</button>
</div>
</div>
</div>
);
})
) : (
<div className="h-full flex flex-col items-center justify-center text-slate-600 text-center py-12">
<div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-850 flex items-center justify-center text-slate-500 mb-3">
<ShoppingCart className="w-6 h-6" />
</div>
<h3 className="text-xs font-bold text-slate-400">Sin Productos Cargados</h3>
<p className="text-[11px] text-slate-500 mt-0.5 max-w-xs">Escriba o escanee en el Paso 1 para armar la boleta de servicios.</p>
</div>
)}
</div>
</div>
</div>

{/* Columna Derecha: Acceso Rápido y Flujo de Pago */}
<div className="w-full lg:w-[380px] bg-slate-900 border-l border-slate-900 flex flex-col h-full overflow-hidden shrink-0">
{/* Acceso Rápido / Selección Manual de Productos */}
<div className="flex-1 p-5 flex flex-col overflow-hidden">
<div className="flex justify-between items-center mb-2.5 shrink-0">
<h2 className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Selección Rápida</h2>
<span className="text-[9px] font-mono text-slate-500">{productosFiltrados.length} encontrados</span>
</div>
<div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2 pr-1 pb-2">
{productosFiltrados.map(prod => {
const stock = prod.stockPorSucursal[sucursalSeleccionadaId] ?? 0;
const esServicio = prod.categoria === 'Servicios';
const sinStock = !esServicio && stock <= 0;

return (
<button
key={prod.id}
disabled={sinStock}
onClick={() => agregarAlCarrito(prod)}
className={`p-3 text-left border rounded-xl flex flex-col justify-between h-[105px] transition-all active:scale-97 select-none relative ${
sinStock
? 'bg-slate-950/40 border-slate-950 text-slate-600 cursor-not-allowed'
: 'bg-slate-950 hover:bg-slate-950/80 hover:border-blue-500 border-slate-850 text-slate-300 cursor-pointer shadow-md'
}`}
>
<div className="space-y-0.5">
<span className="text-[8px] font-mono font-bold text-blue-400 uppercase tracking-wide bg-blue-950/60 px-1 py-0.5 rounded border border-blue-900/30">
{prod.categoria}
</span>
<h4 className="text-[10px] font-bold text-white line-clamp-2 mt-1 leading-tight">{prod.nombre}</h4>
</div>

<div className="flex justify-between items-end w-full">
<span className="text-xs font-bold font-mono text-white">{formatCLP(prod.precioVenta)}</span>
<span className={`text-[8px] font-mono px-1 rounded ${
esServicio ? 'bg-indigo-950 text-indigo-400 border border-indigo-900/30' :
stock <= prod.minStock ? 'bg-red-950 text-red-400 font-bold border border-red-900/20' :
'bg-slate-900 text-slate-400'
}`}>
{esServicio ? 'SERVIC' : `ST: ${stock}`}
</span>
</div>
</button>
);
})}
</div>
</div>

{/* PASO 3: Seleccionar Método de Pago -> PASO 4: Confirmar Venta */}
<div className="bg-slate-950 border-t border-slate-900 p-5 space-y-4 shrink-0">
{/* PASO 3: Selección de Método de Pago */}
<div className="space-y-1.5">
<div className="flex items-center gap-2">
<span className="text-[10px] font-mono font-bold bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded border border-blue-900/30">PASO 3</span>
<span className="text-xs font-bold text-slate-300">Seleccionar Método de Pago</span>
</div>

<div className="grid grid-cols-3 gap-2">
{[
{ id: 'Efectivo', icon: Coins },
{ id: 'Débito', icon: CreditCard },
{ id: 'Crédito', icon: CreditCard },
].map(opt => {
const Icon = opt.icon;
const isSel = metodoPago === opt.id;
return (
<button
key={opt.id}
onClick={() => {
setMetodoPago(opt.id as MetodoPago);
if (opt.id !== 'Efectivo') setDineroRecibido('');
}}
className={`py-2 px-3 border rounded-xl flex flex-col items-center gap-1 font-bold text-xs transition-all active:scale-95 cursor-pointer ${
isSel
? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/10'
: 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-400'
}`}
>
<Icon className="w-4 h-4" />
<span>{opt.id}</span>
</button>
);
})}
</div>
</div>

{/* Dinero Recibido (Sólo para Efectivo) */}
{metodoPago === 'Efectivo' && cart.length > 0 && (
<div className="space-y-1 animate-fadeIn">
<div className="flex justify-between text-[10px] font-mono">
<span className="text-slate-500">Monto Recibido CLP ($)</span>
<span className="text-emerald-400 font-bold">Vuelto: {formatCLP(vuelto)}</span>
</div>
<div className="relative flex items-center bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5">
<DollarSign className="w-3.5 h-3.5 text-slate-500 mr-1.5" />
<input
type="number"
placeholder="Ej: 50000"
value={dineroRecibido}
onChange={(e) => setDineroRecibido(e.target.value)}
className="bg-transparent text-xs text-white placeholder-slate-600 w-full focus:outline-none font-mono"
/>
</div>
</div>
)}

{/* Sistema de Descuentos */}
<div className="space-y-1.5 bg-slate-900/40 p-3 rounded-xl border border-slate-850">
<div className="flex justify-between items-center">
<span className="text-[10px] font-mono font-bold text-slate-300 uppercase">Descuento</span>
<div className="flex gap-1">
<button
type="button"
onClick={() => { setTipoDescuento('fijo'); setValorDescuento('0'); }}
className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded cursor-pointer transition-all ${tipoDescuento === 'fijo' ? 'bg-blue-600 text-white' : 'bg-slate-950 text-slate-400'}`}
>
$ CLP
</button>
<button
type="button"
onClick={() => { setTipoDescuento('porcentaje'); setValorDescuento('0'); }}
className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded cursor-pointer transition-all ${tipoDescuento === 'porcentaje' ? 'bg-blue-600 text-white' : 'bg-slate-950 text-slate-400'}`}
>
% Porc.
</button>
</div>
</div>
<div className="relative flex items-center bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 focus-within:border-blue-500/50 transition-colors">
<input
type="number"
placeholder={tipoDescuento === 'fijo' ? "Monto CLP (Ej: 5000)" : "Porcentaje % (Ej: 10)"}
value={valorDescuento === '0' ? '' : valorDescuento}
onChange={(e) => setValorDescuento(e.target.value || '0')}
className="bg-transparent text-xs text-white placeholder-slate-600 w-full focus:outline-none font-mono"
min="0"
/>
{descuentoCalculado > 0 && (
<span className="text-[10px] font-mono text-red-400 font-bold ml-1.5 shrink-0">
-{formatCLP(descuentoCalculado)}
</span>
)}
</div>
</div>

{/* PASO 4: Totales Desglosados con IVA preciso */}
<div className="bg-slate-900/60 border border-slate-850 p-3.5 rounded-xl space-y-1.5 font-mono text-xs">
<div className="flex justify-between text-[11px]">
<span className="text-slate-500">Subtotal Bruto:</span>
<span className="text-slate-300 font-bold">{formatCLP(subtotalBruto)}</span>
</div>
{descuentoCalculado > 0 && (
<div className="flex justify-between text-[11px] text-red-400">
<span>Descuento Aplicado:</span>
<span className="font-bold">-{formatCLP(descuentoCalculado)}</span>
</div>
)}
<div className="flex justify-between text-[11px] border-t border-slate-800 pt-1">
<span className="text-slate-500">Neto (sin IVA):</span>
<span className="text-slate-300 font-bold">{formatCLP(neto)}</span>
</div>
<div className="flex justify-between text-[11px]">
<span className="text-slate-500">IVA Débito (19%):</span>
<span className="text-slate-300 font-bold">{formatCLP(iva)}</span>
</div>
<div className="border-t border-slate-800 my-1 pt-1.5 flex justify-between text-xs font-bold">
<span className="text-slate-400 uppercase tracking-wider">Total Final:</span>
<span className="text-blue-400 text-sm">{formatCLP(total)}</span>
</div>
</div>

{/* Confirmar e Imprimir Boleta - Botón Primario UX */}
<button
disabled={cart.length === 0 || total <= 0}
onClick={handlePagar}
className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white transition-all transform active:scale-98 shadow-xl flex items-center justify-center gap-2 ${
cart.length === 0 || total <= 0
? 'bg-blue-600/20 text-white/30 border border-slate-900 cursor-not-allowed'
: 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20 cursor-pointer border border-blue-500'
}`}
>
<Receipt className="w-4.5 h-4.5" />
<span>Emitir Boleta {formatCLP(total)}</span>
</button>
</div>
</div>

{/* Modal de Boleta / Ticket Térmico de Prueba */}
{showBoletaModal && boletaFinal && (
<div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
<div className="bg-white text-slate-900 w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-slate-200 flex flex-col relative animate-scaleUp">
{/* Cabecera de Ticket */}
<div className="text-center space-y-1 mb-4 border-b border-dashed border-slate-300 pb-4">
<div className="w-12 h-12 bg-slate-900/10 text-slate-900 rounded-xl flex items-center justify-center mx-auto mb-2">
<Receipt className="w-6 h-6 text-slate-900" />
</div>
<h2 className="font-bold text-sm tracking-wide uppercase text-slate-900">NEUMATICOS VJ SPA</h2>
<p className="text-[10px] text-slate-500 font-bold uppercase font-sans">"LA EXPERIENCIA MARCA LA DIFERENCIA"</p>
<p className="text-[10px] text-slate-400 mt-1">GABRIELA MISTRAL 114, RENGO</p>
<p className="text-[10px] text-slate-400 font-mono">NEUMATICOSRENGOVJ@GMAIL.COM</p>
<p className="text-[9px] text-slate-400 mt-0.5">R.U.T.: 78.142.725-K • {boletaFinal.sucursalNombre}</p>
</div>

{/* Metadatos de Boleta */}
<div className="text-[10px] font-mono space-y-1 border-b border-dashed border-slate-300 pb-3 mb-3">
<div className="flex justify-between">
<span>BOLETA ELECTRÓNICA Nº:</span>
<span className="font-bold">{boletaFinal.id.split('-')[1]}</span>
</div>
<div className="flex justify-between">
<span>FECHA DE EMISIÓN:</span>
<span>{new Date(boletaFinal.fecha).toLocaleString('es-CL')}</span>
</div>
<div className="flex justify-between">
<span>CAJERO / VENDEDOR:</span>
<span>{boletaFinal.vendedor}</span>
</div>
<div className="flex justify-between">
<span>MÉTODO DE PAGO:</span>
<span className="font-bold uppercase">{boletaFinal.metodoPago}</span>
</div>
</div>

{/* Listado de Items en Boleta */}
<div className="text-[11px] font-mono flex-1 space-y-2 border-b border-dashed border-slate-300 pb-3 mb-3 max-h-40 overflow-y-auto">
<div className="grid grid-cols-12 font-bold border-b border-slate-100 pb-1 text-slate-500">
<span className="col-span-7">Detalle</span>
<span className="col-span-2 text-center">Cant</span>
<span className="col-span-3 text-right">Total</span>
</div>
{boletaFinal.items.map((it, i) => (
<div key={i} className="grid grid-cols-12 text-slate-700 leading-normal">
<span className="col-span-7 truncate pr-2">{it.nombre}</span>
<span className="col-span-2 text-center font-bold">x{it.cantidad}</span>
<span className="col-span-3 text-right">{formatCLP(it.totalItem)}</span>
</div>
))}
</div>

{/* Totales */}
<div className="text-[11px] font-mono space-y-1.5 border-b border-dashed border-slate-300 pb-4 mb-4">
<div className="flex justify-between text-slate-500">
<span>MONTO NETO</span>
<span>{formatCLP(boletaFinal.subtotal)}</span>
</div>
<div className="flex justify-between text-slate-500">
<span>I.V.A. 19.0%</span>
<span>{formatCLP(boletaFinal.iva)}</span>
</div>
{(boletaFinal.descuento ?? 0) > 0 && (
<div className="flex justify-between text-red-500 font-bold">
<span>DESCUENTO APLICADO</span>
<span>- {formatCLP(boletaFinal.descuento || 0)}</span>
</div>
)}
<div className="flex justify-between font-bold text-sm text-slate-900 border-t border-slate-100 pt-1.5">
<span>TOTAL FINAL</span>
<span>{formatCLP(boletaFinal.total)}</span>
</div>
</div>

{/* Mensaje SII */}
<div className="text-center space-y-1 text-[9px] text-slate-400 font-mono mb-4">
<p>GARANTIA SUJETA A</p>
<p>Termimos y Condiciones de Serviteca VJ</p>
<p className="text-[11px] text-slate-700 font-bold mt-2">¡Gracias por preferir Neumáticos VJ!</p>
</div>

{/* Acciones del Modal */}
<div className="flex gap-2">
<button
onClick={() => {
window.print();
}}
className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
>
<Printer className="w-4 h-4" />
Imprimir
</button>
<button
onClick={() => {
setShowBoletaModal(false);
if (barcodeInputRef.current) {
barcodeInputRef.current.focus();
}
}}
className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
>
Cerrar
</button>
</div>
</div>
</div>
)}
</div>
);
}