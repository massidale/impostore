// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from 'firebase/database';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA6vCGiQmXvynNGVwqf7jVvEemCBWHPUNM",
  authDomain: "impostore-c0ef1.firebaseapp.com",
  databaseURL: "https://impostore-c0ef1-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "impostore-c0ef1",
  storageBucket: "impostore-c0ef1.firebasestorage.app",
  messagingSenderId: "346509804532",
  appId: "1:346509804532:web:893a26f3e25f86426fefa1",
  measurementId: "G-ED7VYPWEF1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
export const database = getDatabase(app);
export default app;