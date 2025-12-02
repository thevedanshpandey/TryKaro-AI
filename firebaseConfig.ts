import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  User 
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB1br5bYMcEtBU27nf6hnevpGEDKWXiH6U",
  authDomain: "trykaro-ai.firebaseapp.com",
  projectId: "trykaro-ai",
  storageBucket: "trykaro-ai.firebasestorage.app",
  messagingSenderId: "607543801784",
  appId: "1:607543801784:web:9dfe919f688e689b49c14d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { 
  auth, 
  db,
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  signOut, 
  onAuthStateChanged 
};

export type { User };

export interface AuthError {
  code: string;
  message: string;
}