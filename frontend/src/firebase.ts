import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAf5ZDCPfN-tqjgWHfV3sGmLuzf7vk5McI",
  authDomain: "neumaticos-vj.firebaseapp.com",
  databaseURL: "https://neumaticos-vj-default-rtdb.firebaseio.com",
  projectId: "neumaticos-vj",
  storageBucket: "neumaticos-vj.firebasestorage.app",
  messagingSenderId: "1094394431570",
  appId: "1:1094394431570:web:09fd91c4825576d90cf78b",
  measurementId: "G-WPMSMVYDR8"
};

// Inicializamos Firebase con tu base de datos principal
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);

// Exportamos la conexión a tu bodega real
export const db = getFirestore(app);