import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy, limit } from "firebase/firestore";

// TODO: Replace with your actual Firebase Config from the Firebase Console
// Go to https://console.firebase.google.com/ -> Project Settings -> General -> Your Apps
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

export const saveScanToCloud = async (userId: string, scanData: any) => {
  if (!db) return; // Fallback to local handled by component
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

export { auth, db };