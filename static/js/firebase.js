import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";


// Firebase configuration
const firebaseConfig = {
    apiKey: "",
    authDomain: "giftwise-1c679.firebaseapp.com",
    projectId: "giftwise-1c679",
    storageBucket: "giftwise-1c679.firebasestorage.app",
    messagingSenderId: "510233924958",
    appId: "1:510233924958:web:4f3ab9f5a77f4bc4072bcf"
};


// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);


// Initialize Firebase services
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);


console.log("GiftWise Firebase initialized successfully!");

export { firebaseApp, auth, db };