import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { ShoppingBag, Calendar, ArrowUpRight } from 'lucide-react';

export default function HistorialVentas() {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Apuntamos a la nueva colección 'ventas' ordenando por las más recientes
    const q = query(collection(db, "ventas"), orderBy("fecha", "desc"));
    
    const unsub = onSnapshot(q, (snapshot) => {
      const listaVentas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVentas(listaVentas);
      setLoading(false);
    }, (error) => {
      console.error("Error al leer las ventas: ", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (loading) {
    return <div className="p-6 text-center text-slate-500">Cargando historial de ventas...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <ShoppingBag className="text-[#003399]" /> Historial de Ventas Online
          </h2>
          <p className="text-sm text-slate-500">Monitoreo en tiempo real de transacciones de la web</p>
        </div>
        <span className="bg-blue-50 text-[#003399] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          {ventas.length} Pedidos
        </span>
      </div>

      {ventas.length === 0 ? (
        <div className="text-center py-12 text-slate-400 font-medium">
          Aún no se registran ventas online en este período.
        </div>
      ) : (
        <div className="space-y-3">
          {ventas.map((venta) => {
            // Formatear la fecha de Firestore de manera limpia
            const fechaFormateada = venta.fecha?.toDate 
              ? venta.fecha.toDate().toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
              : 'Fecha pendiente';

            return (
              <div 
                key={venta.id} 
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/70 rounded-2xl border border-slate-100 transition-all gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm text-slate-600 shrink-0">
                    <ArrowUpRight className="text-green-500" size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 uppercase text-sm tracking-wide">
                      {venta.producto || 'Producto Genérico'}
                    </h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Calendar size={12} /> {fechaFormateada}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                  <div className="text-left sm:text-right">
                    <span className="text-xs font-bold text-slate-400 block uppercase tracking-widest">Cantidad</span>
                    <span className="font-black text-slate-700 text-sm">{venta.cantidad} u.</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-400 block uppercase tracking-widest">Total</span>
                    <span className="font-black text-[#003399] text-base">
                      ${((venta.precioUnitario || 0) * (venta.cantidad || 1)).toLocaleString('es-CL')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}