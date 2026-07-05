import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // ¡Esto faltaba!
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBctHCJ24N-W3r3W-0PqKe4HgIFsPm063Q",
  authDomain: "serviteca-vj.firebaseapp.com",
  projectId: "serviteca-vj",
  storageBucket: "serviteca-vj.firebasestorage.app",
  messagingSenderId: "349430767084",
  appId: "1:349430767084:web:4ead2192211889fb0834c9",
  measurementId: "G-Y5KJSM5FVG"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// ¡Esta línea es la que hace que tu aplicación deje de fallar!
export const db = getFirestore(app);