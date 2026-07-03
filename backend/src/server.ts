import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Servidor operativo' });
});

const PORT = 5001;
// Agrega esto en tu server.ts
app.post('/api/products', (req, res) => {
  console.log("Datos recibidos:", req.body);
  // Aquí luego irá tu lógica de Prisma para guardar
  res.json({ message: "Producto recibido correctamente" });
});

app.get('/api/products', (req, res) => {
  res.json([]); // Por ahora devuelve una lista vacía
});
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));