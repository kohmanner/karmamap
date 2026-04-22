import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: `${process.env.REACT_APP_FIREBASE_PROJECT_ID || "karmamap-dd922"}.firebaseapp.com`,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "karmamap-dd922",
  storageBucket: `${process.env.REACT_APP_FIREBASE_PROJECT_ID || "karmamap-dd922"}.firebasestorage.app`,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const fbApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(fbApp);
