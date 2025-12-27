
import * as firebase_app from "firebase/app";
import * as firebase_auth from "firebase/auth";
import * as firebase_firestore from "firebase/firestore";
import { Truck, HistoryItem, Job, Vehicle, IntakeSubmission } from "../types";

const { initializeApp, getApp, getApps } = firebase_app as any;
const { getAuth, GoogleAuthProvider, signInWithPopup, signOut: firebaseSignOut, onAuthStateChanged: firebaseOnAuthStateChanged } = firebase_auth as any;
const { getFirestore, collection, addDoc, query, orderBy, limit, getDocs, doc, deleteDoc, updateDoc, onSnapshot, where } = firebase_firestore as any;

const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const isConfigValid = firebaseConfig.apiKey && 
                     firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY" && 
                     firebaseConfig.projectId !== "your-project-id";

const isMockMode = !isConfigValid;

let app: any;
let auth: any;
let db: any;
let googleProvider: any;

if (!isMockMode) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
  } catch (e) {
    console.warn("Firebase initialization failed. Mock Mode Active.");
  }
}

const mockAuth = {
  currentUser: JSON.parse(localStorage.getItem('carb_mock_user') || 'null'),
  onAuthStateChanged: (callback: (user: any) => void) => {
    const user = JSON.parse(localStorage.getItem('carb_mock_user') || 'null');
    callback(user);
    const handler = (e: StorageEvent) => {
        if (e.key === 'carb_mock_user') callback(JSON.parse(e.newValue || 'null'));
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }
};

export const signInWithGoogle = async () => {
  if (isMockMode || !auth) {
    const mockUser = {
      uid: 'mock-user-fleet-id',
      email: 'operator@norcalcarb.com',
      displayName: 'Fleet Commander'
    };
    localStorage.setItem('carb_mock_user', JSON.stringify(mockUser));
    window.location.reload(); 
    return mockUser;
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    throw error;
  }
};

export const logoutUser = async () => {
  if (isMockMode || !auth) {
    localStorage.removeItem('carb_mock_user');
    window.location.reload();
    return;
  }
  await firebaseSignOut(auth);
};

// --- INTAKE SUBMISSIONS ---

export const saveIntakeSubmission = async (submission: Omit<IntakeSubmission, 'id'>) => {
  if (isMockMode || !db) {
    const submissions = JSON.parse(localStorage.getItem('inbound_intakes') || '[]');
    const newSub = { ...submission, id: Date.now().toString() };
    submissions.unshift(newSub);
    localStorage.setItem('inbound_intakes', JSON.stringify(submissions));
    return newSub;
  }
  const docRef = await addDoc(collection(db, "intakes"), submission);
  return { id: docRef.id, ...submission };
};

export const subscribeToInboundIntakes = (callback: (data: IntakeSubmission[]) => void) => {
  if (isMockMode || !db) {
    const data = JSON.parse(localStorage.getItem('inbound_intakes') || '[]');
    callback(data);
    return () => {};
  }
  const q = query(collection(db, "intakes"), orderBy("timestamp", "desc"));
  return onSnapshot(q, (snapshot: any) => {
    callback(snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })));
  });
};

// --- JOBS & VEHICLES DATA LAYER ---

export const createJobInCloud = async (userId: string, jobData: Omit<Job, 'id'>) => {
  if (isMockMode || !db) {
    const jobs = JSON.parse(localStorage.getItem(`jobs_${userId}`) || '[]');
    const newJob = { ...jobData, id: Date.now().toString() };
    jobs.unshift(newJob);
    localStorage.setItem(`jobs_${userId}`, JSON.stringify(jobs));
    return newJob;
  }
  const docRef = await addDoc(collection(db, "jobs"), { ...jobData, userId });
  return { id: docRef.id, ...jobData };
};

export const addVehicleToJobInCloud = async (jobId: string, vehicleData: Omit<Vehicle, 'id'>) => {
  if (isMockMode || !db) {
    const vKey = `vehicles_${jobId}`;
    const vehicles = JSON.parse(localStorage.getItem(vKey) || '[]');
    const newVehicle = { ...vehicleData, id: Date.now().toString() };
    vehicles.push(newVehicle);
    localStorage.setItem(vKey, JSON.stringify(vehicles));
    return newVehicle;
  }
  const docRef = await addDoc(collection(db, "jobs", jobId, "vehicles"), vehicleData);
  return { id: docRef.id, ...vehicleData };
};

export const subscribeToJobs = (userId: string, callback: (jobs: Job[]) => void) => {
  if (isMockMode || !db) {
    const jobs = JSON.parse(localStorage.getItem(`jobs_${userId}`) || '[]');
    callback(jobs);
    return () => {};
  }
  const q = query(collection(db, "jobs"), where("userId", "==", userId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot: any) => {
    callback(snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })));
  });
};

export const subscribeToJobVehicles = (jobId: string, callback: (vehicles: Vehicle[]) => void) => {
  if (isMockMode || !db) {
    const vKey = `vehicles_${jobId}`;
    const vehicles = JSON.parse(localStorage.getItem(vKey) || '[]');
    callback(vehicles);
    return () => {};
  }
  const q = collection(db, "jobs", jobId, "vehicles");
  return onSnapshot(q, (snapshot: any) => {
    callback(snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })));
  });
};

export const updateJobStatusInCloud = async (jobId: string, status: Job['status']) => {
    if (isMockMode || !db) return;
    await updateDoc(doc(db, "jobs", jobId), { status });
};

// --- GARAGE DATA LAYER ---

export const addTruckToGarage = async (userId: string, truckData: Omit<Truck, 'id'>) => {
  if (isMockMode || !db) {
    const trucks = JSON.parse(localStorage.getItem(`garage_${userId}`) || '[]');
    const newTruck = { ...truckData, id: Date.now().toString() };
    trucks.unshift(newTruck);
    localStorage.setItem(`garage_${userId}`, JSON.stringify(trucks));
    return newTruck;
  }
  const docRef = await addDoc(collection(db, "users", userId, "garage"), truckData);
  return { id: docRef.id, ...truckData };
};

export const deleteTruckFromGarage = async (userId: string, truckId: string) => {
  if (isMockMode || !db) {
    const trucks = JSON.parse(localStorage.getItem(`garage_${userId}`) || '[]');
    const filtered = trucks.filter((t: any) => t.id !== truckId);
    localStorage.setItem(`garage_${userId}`, JSON.stringify(filtered));
    return;
  }
  await deleteDoc(doc(db, "users", userId, "garage", truckId));
};

export const updateTruckStatus = async (userId: string, truckId: string, status: Truck['status'], lastChecked: number) => {
  if (isMockMode || !db) {
    const trucks = JSON.parse(localStorage.getItem(`garage_${userId}`) || '[]');
    const index = trucks.findIndex((t: any) => t.id === truckId);
    if (index !== -1) {
      trucks[index].status = status;
      trucks[index].lastChecked = lastChecked;
      localStorage.setItem(`garage_${userId}`, JSON.stringify(trucks));
    }
    return;
  }
  await updateDoc(doc(db, "users", userId, "garage", truckId), { status, lastChecked });
};

export const subscribeToGarage = (userId: string, callback: (trucks: Truck[]) => void) => {
  if (isMockMode || !db) {
    const trucks = JSON.parse(localStorage.getItem(`garage_${userId}`) || '[]');
    callback(trucks);
    return () => {};
  }
  const q = query(collection(db, "users", userId, "garage"), orderBy("lastChecked", "desc"));
  return onSnapshot(q, (snapshot: any) => {
    callback(snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })));
  });
};

// --- LEGACY HISTORY ---

export const saveScanToCloud = async (userId: string, scanData: any) => {
  if (isMockMode || !db) return;
  await addDoc(collection(db, "users", userId, "history"), { ...scanData, timestamp: Date.now() });
};

export const getHistoryFromCloud = async (userId: string) => {
  if (isMockMode || !db) return JSON.parse(localStorage.getItem(`history_${userId}`) || '[]');
  const q = query(collection(db, "users", userId, "history"), orderBy("timestamp", "desc"), limit(50));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
};

const finalAuth = (isMockMode || !auth) ? mockAuth : auth;
const onAuthStateChanged = (authInstance: any, callback: any) => {
  if (authInstance && typeof authInstance.onAuthStateChanged === 'function') {
    return authInstance.onAuthStateChanged(callback);
  }
  return firebaseOnAuthStateChanged(authInstance, callback);
};

export { finalAuth as auth, onAuthStateChanged };
