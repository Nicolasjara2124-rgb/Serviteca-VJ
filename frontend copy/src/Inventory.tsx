import { useState, useEffect } from 'react';
import axios from 'axios';

export const Inventory = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({ code: '', name: '', brand: '', price: 0 });

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get('http://localhost:5001/api/products');
        setProducts(res.data);
      } catch (err) {
        console.error("Error al cargar:", err);
      }
    };
    fetchProducts();
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5001/api/products', formData);
      alert("¡Producto guardado!");
      // Aquí podrías recargar la lista
    } catch (err) {
      alert("Error al guardar");
    }
  };

  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold mb-6">Inventario SERVITECA VJ</h1>
      <form onSubmit={handleSubmit} className="flex gap-2 mb-10">
        <input placeholder="Código" onChange={e => setFormData({...formData, code: e.target.value})} />
        <input placeholder="Nombre" onChange={e => setFormData({...formData, name: e.target.value})} />
        <button type="submit">Guardar</button>
      </form>
      <div>
        {products.map((p: any, i: number) => (
          <div key={i}>{p.code} - {p.name}</div>
        ))}
      </div>
    </div>
  );
};