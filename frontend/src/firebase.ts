import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Tus llaves de conexión a NEUMATICOS VJ
const firebaseConfig = {
  apiKey: "AIzaSyAf5ZDCPfN-tqjgWhFV3sGmLuzf7vk5McI",
  authDomain: "neumaticos-vj.firebaseapp.com",
  databaseURL: "https://neumaticos-vj-default-rtdb.firebaseio.com",
  projectId: "neumaticos-vj",
  storageBucket: "neumaticos-vj.firebasestorage.app",
  messagingSenderId: "1094394431570",
  appId: "1:1094394431570:web:09fd91c4825576d90cf78b",
  measurementId: "G-WPMSMVYDR8"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar la base de datos para usarla en el resto del sistema
export const db = getFirestore(app);