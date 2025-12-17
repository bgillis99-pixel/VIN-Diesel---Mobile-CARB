import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs, doc, deleteDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { Truck } from "../types";

// TODO: Replace with your actual Firebase Config from the Firebase Console
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

let app;
let auth: any;
let db: any;
let googleProvider: any;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
} catch (e) {
  console.warn("Firebase not configured. Using local fallback mode.");
}

export const signInWithGoogle = async () => {
  if (!auth) throw new Error("Firebase not configured");
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Login failed", error);
    throw error;
  }
};

export const logoutUser = async () => {
  if (!auth) return;
  await firebaseSignOut(auth);
};

// --- HISTORY & SCANS ---

export const saveScanToCloud = async (userId: string, scanData: any) => {
  if (!db) return;
  try {
    await addDoc(collection(db, "users", userId, "history"), {
      ...scanData,
      timestamp: Date.now()
    });
  } catch (e) {
    console.error("Error saving to cloud", e);
  }
};

export const getHistoryFromCloud = async (userId: string) => {
  if (!db) return [];
  try {
    const q = query(
      collection(db, "users", userId, "history"), 
      orderBy("timestamp", "desc"), 
      limit(50)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.error("Error fetching history", e);
    return [];
  }
};

// --- GARAGE (TRUCKS) ---

export const addTruckToGarage = async (userId: string, truck: Omit<Truck, 'id'>) => {
  if (!db) return null;
  try {
    const docRef = await addDoc(collection(db, "users", userId, "trucks"), truck);
    return { id: docRef.id, ...truck };
  } catch (e) {
    console.error("Error adding truck", e);
    throw e;
  }
};

export const deleteTruckFromGarage = async (userId: string, truckId: string) => {
  if (!db) return;
  try {
    await deleteDoc(doc(db, "users", userId, "trucks", truckId));
  } catch (e) {
    console.error("Error deleting truck", e);
    throw e;
  }
};

export const updateTruckStatus = async (userId: string, truckId: string, status: string, lastChecked: number) => {
  if (!db) return;
  try {
    await updateDoc(doc(db, "users", userId, "trucks", truckId), {
      status,
      lastChecked
    });
  } catch (e) {
    console.error("Error updating truck", e);
    throw e;
  }
};

export const subscribeToGarage = (userId: string, callback: (trucks: Truck[]) => void) => {
  if (!db) return () => {};
  const q = query(collection(db, "users", userId, "trucks"), orderBy("lastChecked", "desc"));
  return onSnapshot(q, (snapshot) => {
    const trucks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Truck));
    callback(trucks);
  });
};

export { auth, db };
