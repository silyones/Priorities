import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA-ZATM_IXtoS0nrdyCyJwjwIMjGTtG3wI",
  authDomain: "priorities-18314.firebaseapp.com",
  projectId: "priorities-18314",
  storageBucket: "priorities-18314.firebasestorage.app",
  messagingSenderId: "668128183211",
  appId: "1:668128183211:web:22f0918293fd3161a548ee",
  measurementId: "G-EKNKYHQZ33",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
