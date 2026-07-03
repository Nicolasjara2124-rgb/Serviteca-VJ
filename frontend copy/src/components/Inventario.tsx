/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import type { Producto, Sucursal, Usuario, TransferenciaStock } from '../types';
import { 
  Search, 
  Plus, 
  ArrowRightLeft, 
  AlertTriangle, 
  SlidersHorizontal,
  FolderOpen,
  ArrowRight,
  ShieldCheck,
  Edit2,
  Trash2,
  PlusCircle,
  X,
  History,
  Barcode
} from 'lucide-react';

interface InventarioProps {
  productos: Producto[];
  sucursales: Sucursal[];
  usuario: Usuario;
  onSaveProducto: (prod: Producto) => void;
  onDeleteProducto: (id: string) => void;
  onTransferirStock: (trans: TransferenciaStock) => void;
  transferencias: TransferenciaStock[];
}

export default function Inventario({ 
  productos, 
  sucursales, 
  usuario, 
  onSaveProducto, 
  onDeleteProducto, 
  onTransferirStock,
  transferencias 
}: InventarioProps) {
  
  // Estados de control
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [filterLowStock, setFilterLowStock] = useState(false);
  
  // Modales
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferProduct, setTransferProduct] = useState<Producto | null>(null);

  // Campos para transferencia
  const [transferOrigenId, setTransferOrigenId] = useState('');
  const [transferDestinoId, setTransferDestinoId] = useState('');
  const [transferCantidad, setTransferCantidad] = useState<number>(1);

  // Campos para agregar/editar producto
  const [prodCodigo, setProdCodigo] = useState('');
  const [prodNombre, setProdNombre] = useState('');
  const [prodMarca, setProdMarca] = useState('');
  const [prodCategoria, setProdCategoria] = useState('Lubricantes');
  const [prodPrecioCompra, setProdPrecioCompra] = useState<number>(0);
  const [prodPrecioVenta, setProdPrecioVenta] = useState<number>(0);
  const [prodMinStock, setProdMinStock] = useState<number>(5);
  const [prodStocks, setProdStocks] = useState<Record<string, number>>({});

  // Categorías de productos
  const categorias = ['Lubricantes', 'Neumáticos', 'Frenos', 'Filtros', 'Eléctrico', 'Suspensión', 'Servicios'];

  // Validaciones y permisos
  const esAdmin = usuario.rol === 'Administrador' || usuario.rol === 'Supervisor';

  // 1. Filtrado de productos
  const productosFiltrados = useMemo(() => {
    return productos.filter(p => {
      const coincideBusqueda = p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
                               p.codigo.includes(searchQuery);
      
      const coincideCategoria = selectedCategory === 'todos' || p.categoria === selectedCategory;
      
      // Alerta de stock bajo en cualquier sucursal
      const stockBajo = filterLowStock ? 
        (p.categoria !== 'Servicios' && sucursales.some(s => (p.stockPorSucursal[s.id] ?? 0) <= p.minStock)) : 
        true;

      return coincideBusqueda && coincideCategoria && stockBajo;
    });
  }, [productos, searchQuery, selectedCategory, filterLowStock, sucursales]);

  // 2. Abrir modal para nuevo producto
  const handleOpenNuevo = () => {
    setEditingProducto(null);
    setProdCodigo('');
    setProdNombre('');
    setProdMarca('');
    setProdCategoria('Lubricantes');
    setProdPrecioCompra(0);
    setProdPrecioVenta(0);
    setProdMinStock(5);
    
    // Inicializar stocks de sucursales en 0
    const inicialStocks: Record<string, number> = {};
    sucursales.forEach(s => {
      inicialStocks[s.id] = 0;
    });
    setProdStocks(inicialStocks);
    
    setShowProductModal(true);
  };

  // 3. Abrir modal para editar producto
  const handleOpenEditar = (prod: Producto) => {
    setEditingProducto(prod);
    setProdCodigo(prod.codigo);
    setProdNombre(prod.nombre);
    setProdMarca(prod.marca || '');
    setProdCategoria(prod.categoria);
    setProdPrecioCompra(prod.precioCompra);
    setProdPrecioVenta(prod.precioVenta);
    setProdMinStock(prod.minStock);
    
    // Copiar stocks existentes
    const copiaStocks: Record<string, number> = {};
    sucursales.forEach(s => {
      copiaStocks[s.id] = prod.stockPorSucursal[s.id] ?? 0;
    });
    setProdStocks(copiaStocks);

    setShowProductModal(true);
  };

  // 4. Guardar producto (Nuevo o Editado)
  const handleSaveProductoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodCodigo || !prodNombre) {
      alert('Código y nombre son obligatorios');
      return;
    }

    const nuevoProd: Producto = {
      id: editingProducto ? editingProducto.id : `prod-${Date.now()}`,
      codigo: prodCodigo,
      nombre: prodNombre,
      marca: prodMarca,
      categoria: prodCategoria,
      precioCompra: Number(prodPrecioCompra),
      precioVenta: Number(prodPrecioVenta),
      stockGlobal: prodCategoria === 'Servicios' ? 9999 : (Object.values(prodStocks) as number[]).reduce((a: number, b: number) => a + b, 0),
      stockPorSucursal: prodCategoria === 'Servicios' ? 
        sucursales.reduce((acc, s) => ({ ...acc, [s.id]: 9999 }), {}) : 
        { ...prodStocks },
      minStock: Number(prodMinStock)
    };

    onSaveProducto(nuevoProd);
    setShowProductModal(false);
  };

  // 5. Eliminar Producto
  const handleDeleteProductoClick = (id: string, nombre: string) => {
    if (confirm(`¿Está seguro de eliminar el producto/servicio "${nombre}" del catálogo?`)) {
      onDeleteProducto(id);
    }
  };

  // 6. Abrir modal de transferencia
  const handleOpenTransferir = (prod: Producto) => {
    setTransferProduct(prod);
    setTransferOrigenId(sucursales[0]?.id || '');
    setTransferDestinoId(sucursales[1]?.id || '');
    setTransferCantidad(1);
    setShowTransferModal(true);
  };

  // 7. Enviar Transferencia de Stock
  const handleTransferirSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferProduct) return;
    if (transferOrigenId === transferDestinoId) {
      alert('La sucursal de destino debe ser diferente de la sucursal de origen.');
      return;
    }

    const stockDisponible = transferProduct.stockPorSucursal[transferOrigenId] ?? 0;
    if (transferCantidad <= 0 || transferCantidad > stockDisponible) {
      alert(`Cantidad no válida. Disponible en origen: ${stockDisponible} unidades.`);
      return;
    }

    const origen = sucursales.find(s => s.id === transferOrigenId)!;
    const destino = sucursales.find(s => s.id === transferDestinoId)!;

    const nuevaTransferencia: TransferenciaStock = {
      id: `trf-${Date.now()}`,
      productoId: transferProduct.id,
      productoNombre: transferProduct.nombre,
      origenId: transferOrigenId,
      origenNombre: origen.nombre.replace('Serviteca VJ - ', ''),
      destinoId: transferDestinoId,
      destinoNombre: destino.nombre.replace('Serviteca VJ - ', ''),
      cantidad: transferCantidad,
      fecha: new Date().toISOString(),
      encargado: usuario.nombre
    };

    onTransferirStock(nuevaTransferencia);
    setShowTransferModal(false);
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
            Control de Inventario
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Gestione el catálogo unificado y los traspasos de mercadería entre sucursales en tiempo real.
          </p>
        </div>
        
        {esAdmin && (
          <button
            onClick={handleOpenNuevo}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/10 active:scale-95 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4.5 h-4.5" />
            <span>Agregar Insumo o Servicio</span>
          </button>
        )}
      </div>

      {/* Controles de Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        
        {/* Buscador de Producto */}
        <div className="md:col-span-2 relative flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 focus-within:border-blue-500 transition-colors">
          <Search className="w-4 h-4 text-slate-500 mr-2" />
          <input
            type="text"
            placeholder="Buscar por descripción o SKU de barras..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs text-white placeholder-slate-500 w-full focus:outline-none"
          />
        </div>

        {/* Categoría */}
        <div className="relative flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-500 mr-2" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-transparent text-xs text-slate-300 w-full focus:outline-none cursor-pointer"
          >
            <option value="todos" className="bg-slate-900">Todas las Categorías</option>
            {categorias.map(cat => (
              <option key={cat} value={cat} className="bg-slate-900">{cat}</option>
            ))}
          </select>
        </div>

        {/* Checkbox Quiebre Stock */}
        <button
          onClick={() => setFilterLowStock(!filterLowStock)}
          className={`px-3 py-2 border rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-all ${
            filterLowStock 
              ? 'bg-red-950/40 text-red-400 border-red-900/50' 
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-850'
          }`}
        >
          <AlertTriangle className={`w-4 h-4 ${filterLowStock ? 'text-red-400' : 'text-slate-500'}`} />
          <span>Filtro Quiebre Stock</span>
        </button>
      </div>

      {/* Tabla Unificada de Productos */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-mono uppercase text-slate-500 bg-slate-950/40">
                <th className="py-4 px-6 font-normal">Código / SKU</th>
                <th className="py-4 px-6 font-normal">Descripción del Producto</th>
                <th className="py-4 px-6 font-normal">Categoría</th>
                <th className="py-4 px-6 font-normal text-right">Precio Compra</th>
                <th className="py-4 px-6 font-normal text-right">Precio Venta (IVA Incl)</th>
                <th className="py-4 px-6 font-normal text-center">Stock por Sucursal</th>
                {esAdmin && <th className="py-4 px-6 font-normal text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-800/40">
              {productosFiltrados.length > 0 ? (
                productosFiltrados.map((prod) => {
                  const esServicio = prod.categoria === 'Servicios';
                  
                  return (
                    <tr key={prod.id} className="hover:bg-slate-850/30 transition-all">
                      {/* Código de barras */}
                      <td className="py-4 px-6 font-mono text-slate-400 text-[11px]">
                        {prod.codigo}
                      </td>

                      {/* Nombre / Descripción */}
                      <td className="py-4 px-6">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-white text-xs">{prod.nombre}</p>
                            {prod.marca && (
                              <span className="px-1.5 py-0.5 bg-blue-950/40 text-blue-400 font-bold border border-blue-900/30 text-[9px] uppercase font-mono rounded">
                                {prod.marca}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {prod.id}</p>
                        </div>
                      </td>

                      {/* Categoría */}
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full font-mono ${
                          prod.categoria === 'Servicios' ? 'bg-indigo-950 text-indigo-400 border border-indigo-900/30' :
                          prod.categoria === 'Neumáticos' ? 'bg-amber-950 text-amber-400 border border-amber-900/30' :
                          'bg-slate-950 text-slate-400 border border-slate-850'
                        }`}>
                          {prod.categoria}
                        </span>
                      </td>

                      {/* Precio de compra */}
                      <td className="py-4 px-6 text-right font-mono text-slate-400">
                        {esServicio ? '-' : formatCLP(prod.precioCompra)}
                      </td>

                      {/* Precio de venta */}
                      <td className="py-4 px-6 text-right font-mono font-semibold text-white">
                        {formatCLP(prod.precioVenta)}
                      </td>

                      {/* Stocks Distribuidos */}
                      <td className="py-4 px-6">
                        {esServicio ? (
                          <div className="text-center">
                            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-900/30 font-bold uppercase">
                              Servicio / Mano de Obra
                            </span>
                          </div>
                        ) : (
                          <div className="flex justify-center gap-3">
                            {sucursales.map(s => {
                              const stock = prod.stockPorSucursal[s.id] ?? 0;
                              const bajoStock = stock <= prod.minStock;
                              const nombreCorto = s.nombre.replace('Serviteca VJ - ', '').split(' ')[0];

                              return (
                                <div 
                                  key={s.id} 
                                  className={`px-2 py-1 rounded border flex flex-col items-center min-w-[70px] ${
                                    bajoStock 
                                      ? 'bg-red-950/20 text-red-400 border-red-900/30' 
                                      : 'bg-slate-950 text-slate-300 border-slate-850'
                                  }`}
                                  title={`${s.nombre}: ${stock} unidades`}
                                >
                                  <span className="text-[9px] font-mono uppercase text-slate-500 font-semibold mb-0.5">{nombreCorto}</span>
                                  <span className="text-[11px] font-mono font-bold">{stock}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* Acciones para Admin */}
                      {esAdmin && (
                        <td className="py-4 px-6 text-right">
                          <div className="flex justify-end gap-1.5">
                            
                            {/* Traspaso de stock (ocultar si es servicio) */}
                            {!esServicio && (
                              <button
                                onClick={() => handleOpenTransferir(prod)}
                                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-blue-400 rounded-lg transition-all border border-slate-800 hover:border-blue-900/40"
                                title="Traspasar mercadería"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                              </button>
                            )}
                            
                            <button
                              onClick={() => handleOpenEditar(prod)}
                              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all border border-slate-800"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            
                            <button
                              onClick={() => handleDeleteProductoClick(prod.id, prod.nombre)}
                              className="p-1.5 hover:bg-red-950/20 text-slate-500 hover:text-red-400 rounded-lg transition-all border border-slate-800 hover:border-red-900/20"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={esAdmin ? 7 : 6} className="text-center py-12 text-slate-500">
                    <FolderOpen className="w-12 h-12 text-slate-800 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-400">Sin Productos Encontrados</p>
                    <p className="text-xs text-slate-500 mt-1">Pruebe modificando los términos del buscador o filtros.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historial de Traspasos / Bitácora */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <h3 className="text-md font-bold text-white mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-blue-400" />
          Bitácora de Traspasos de Sucursal
        </h3>
        
        <div className="overflow-x-auto max-h-64 overflow-y-auto pr-1">
          {transferencias.length > 0 ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-850 text-[10px] font-mono uppercase text-slate-500 pb-2">
                  <th className="py-2">Fecha / Hora</th>
                  <th className="py-2">Insumo</th>
                  <th className="py-2 text-center">Traspaso</th>
                  <th className="py-2 text-right">Cant</th>
                  <th className="py-2 text-right">Autorizado por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/50 text-slate-300">
                {transferencias.map((tr, idx) => (
                  <tr key={idx} className="hover:bg-slate-850/10">
                    <td className="py-3 font-mono text-slate-500">{new Date(tr.fecha).toLocaleString('es-CL')}</td>
                    <td className="py-3 font-semibold text-white">{tr.productoNombre}</td>
                    <td className="py-3">
                      <div className="flex items-center justify-center gap-1.5 font-mono text-[11px]">
                        <span className="px-1.5 py-0.5 bg-slate-950 text-slate-400 rounded">{tr.origenNombre}</span>
                        <ArrowRight className="w-3 h-3 text-blue-400" />
                        <span className="px-1.5 py-0.5 bg-slate-950 text-blue-400 rounded">{tr.destinoNombre}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right font-bold font-mono text-emerald-400">+{tr.cantidad} u.</td>
                    <td className="py-3 text-right text-slate-400 font-mono">{tr.encargado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-6 text-slate-600 font-mono text-xs border border-dashed border-slate-850 rounded-xl">
              No se registran transferencias de stock en esta sesión.
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Agregar / Editar Producto */}
      {showProductModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <form onSubmit={handleSaveProductoSubmit} className="bg-slate-900 border border-slate-800 text-slate-100 w-full max-w-xl rounded-2xl p-6 shadow-2xl relative animate-scaleUp">
            
            {/* Cabecera modal */}
            <div className="flex justify-between items-center border-b border-slate-850 pb-4 mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="text-blue-500 w-5 h-5" />
                {editingProducto ? 'Editar Producto / Servicio' : 'Nuevo Producto o Servicio'}
              </h2>
              <button type="button" onClick={() => setShowProductModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Código SKU / Barras con simulador de escáner */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-mono text-slate-400 uppercase">Código SKU / Barras</label>
                  <button
                    type="button"
                    onClick={() => {
                      const barcodeMock = `780${Math.floor(1000000000 + Math.random() * 9000000000)}`;
                      setProdCodigo(barcodeMock);
                    }}
                    className="text-[9px] font-mono font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-900/30 cursor-pointer"
                    title="Simula la lectura física de un código de barras chileno (780...)"
                  >
                    <Barcode className="w-3 h-3" />
                    Pistola de Escaneo
                  </button>
                </div>
                <div className="relative flex items-center bg-slate-950 border border-slate-800 rounded-xl focus-within:border-blue-500 transition-colors">
                  <input
                    type="text"
                    required
                    placeholder="Ej: 7801234560012"
                    value={prodCodigo}
                    onChange={(e) => setProdCodigo(e.target.value)}
                    className="w-full bg-transparent px-3 py-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Categoría */}
              <div className="space-y-1">
                <label className="block text-xs font-mono text-slate-400 uppercase">Categoría</label>
                <select
                  value={prodCategoria}
                  onChange={(e) => setProdCategoria(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                >
                  {categorias.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Marca / Fabricante */}
              <div className="space-y-1 col-span-1 md:col-span-2">
                <label className="block text-xs font-mono text-slate-400 uppercase">Marca / Fabricante</label>
                <input
                  type="text"
                  placeholder="Ej: Michelin, Castrol, Brembo, OEM"
                  value={prodMarca}
                  onChange={(e) => setProdMarca(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Nombre completo */}
              <div className="col-span-1 md:col-span-2 space-y-1">
                <label className="block text-xs font-mono text-slate-400 uppercase">Nombre / Descripción Comercial</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Neumático Michelin 205/55R16 Primacy"
                  value={prodNombre}
                  onChange={(e) => setProdNombre(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Precios (Ocultar compra si es servicio) */}
              {prodCategoria !== 'Servicios' ? (
                <div className="space-y-1">
                  <label className="block text-xs font-mono text-slate-400 uppercase">Precio Compra Neto ($)</label>
                  <input
                    type="number"
                    required
                    placeholder="Ej: 45000"
                    value={prodPrecioCompra}
                    onChange={(e) => setProdPrecioCompra(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none font-mono"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="block text-xs font-mono text-slate-400 uppercase">Costo Logístico Estimado</label>
                  <input
                    type="text"
                    disabled
                    value="Costo Cero / Servicios"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-500 cursor-not-allowed font-mono"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-mono text-slate-400 uppercase">Precio Venta (IVA Incluido) ($)</label>
                <input
                  type="number"
                  required
                  placeholder="Ej: 89900"
                  value={prodPrecioVenta}
                  onChange={(e) => setProdPrecioVenta(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none font-mono"
                />
              </div>

              {/* Mínimo de Alerta Stock */}
              {prodCategoria !== 'Servicios' && (
                <div className="space-y-1 md:col-span-2">
                  <label className="block text-xs font-mono text-slate-400 uppercase">Stock Crítico de Alerta</label>
                  <input
                    type="number"
                    required
                    placeholder="Ej: 5"
                    value={prodMinStock}
                    onChange={(e) => setProdMinStock(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none font-mono"
                  />
                </div>
              )}
            </div>

            {/* Asignación de Stocks por Sucursal (sólo para productos físicos) */}
            {prodCategoria !== 'Servicios' && (
              <div className="mt-5 p-4 bg-slate-950/60 rounded-xl border border-slate-850">
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3">Inventario Inicial por Sucursal</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {sucursales.map(s => (
                    <div key={s.id} className="space-y-1">
                      <label className="block text-[10px] font-mono text-slate-500 truncate">{s.nombre.replace('Serviteca VJ - ', '')}</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={prodStocks[s.id] ?? 0}
                        onChange={(e) => setProdStocks(prev => ({ ...prev, [s.id]: Number(e.target.value) }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white text-center font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Acciones */}
            <div className="flex gap-2 justify-end mt-6 border-t border-slate-850 pt-4">
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="py-2 px-4 bg-slate-850 hover:bg-slate-800 text-slate-400 font-semibold text-xs rounded-xl border border-slate-800 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="py-2 px-5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/10 transition-all"
              >
                {editingProducto ? 'Guardar Cambios' : 'Registrar'}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* MODAL 2: Transferir Mercadería entre Sucursales */}
      {showTransferModal && transferProduct && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <form onSubmit={handleTransferirSubmit} className="bg-slate-900 border border-slate-800 text-slate-100 w-full max-w-md rounded-2xl p-6 shadow-2xl relative animate-scaleUp">
            
            <div className="flex justify-between items-center border-b border-slate-850 pb-4 mb-4">
              <h2 className="text-md font-bold text-white flex items-center gap-2">
                <ArrowRightLeft className="text-blue-500 w-5 h-5" />
                Traspaso de Mercadería
              </h2>
              <button type="button" onClick={() => setShowTransferModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4 bg-slate-950 p-3 rounded-lg leading-relaxed">
              Está iniciando un traspaso interno para el insumo <strong className="text-white">"{transferProduct.nombre}"</strong>. Esto modificará los stocks locales correspondientes.
            </p>

            <div className="space-y-4">
              
              {/* Origen */}
              <div className="space-y-1">
                <label className="block text-xs font-mono text-slate-400 uppercase">Sucursal de Origen</label>
                <select
                  value={transferOrigenId}
                  onChange={(e) => setTransferOrigenId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                >
                  {sucursales.map(s => {
                    const st = transferProduct.stockPorSucursal[s.id] ?? 0;
                    return (
                      <option key={s.id} value={s.id}>
                        {s.nombre.replace('Serviteca VJ - ', '')} (Stock: {st} u.)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Destino */}
              <div className="space-y-1">
                <label className="block text-xs font-mono text-slate-400 uppercase">Sucursal de Destino</label>
                <select
                  value={transferDestinoId}
                  onChange={(e) => setTransferDestinoId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                >
                  {sucursales.map(s => {
                    const st = transferProduct.stockPorSucursal[s.id] ?? 0;
                    return (
                      <option key={s.id} value={s.id}>
                        {s.nombre.replace('Serviteca VJ - ', '')} (Stock actual: {st} u.)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Cantidad */}
              <div className="space-y-1">
                <label className="block text-xs font-mono text-slate-400 uppercase">Cantidad a Traspasar</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={transferCantidad}
                  onChange={(e) => setTransferCantidad(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-2 justify-end mt-6 border-t border-slate-850 pt-4">
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="py-2 px-4 bg-slate-850 hover:bg-slate-800 text-slate-400 font-semibold text-xs rounded-xl border border-slate-800 transition-all"
              >
                Cancelar Traspaso
              </button>
              <button
                type="submit"
                className="py-2 px-5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/10 transition-all"
              >
                Confirmar Traspaso
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
}

// Donde tengas tus botones de acción para editar/eliminar:
{usuario.rol === 'administrador' && (
  <div className="flex gap-2">
    <button onClick={() => editarProducto(p.id)} className="text-blue-500">Editar</button>
    <button onClick={() => eliminarProducto(p.id)} className="text-red-500">Eliminar</button>
  </div>
)}
