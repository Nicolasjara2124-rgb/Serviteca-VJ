import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBcTHCJ24N-W3r3W-0PqKe4HgIFsPmO63Q",
  authDomain: "serviteca-vj.firebaseapp.com",
  projectId: "serviteca-vj",
  storageBucket: "serviteca-vj.firebasestorage.app",
  messagingSenderId: "349430767084",
  appId: "1:349430767084:web:4ead2192211889fb0834c9",
  measurementId: "G-Y5KJSM5FVG"
};

const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);

// ¡Esta es la línea vital que hace que se conecte a tu inventario!
export const db = getFirestore(app);