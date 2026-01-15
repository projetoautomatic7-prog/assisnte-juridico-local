import { getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyCpMdePYuYMUC22fpijJWXw_GFDpe-Xfe0",
  authDomain: "sonic-terminal-474321-s1.firebaseapp.com",
  projectId: "sonic-terminal-474321-s1",
  storageBucket: "sonic-terminal-474321-s1.firebasestorage.app",
  messagingSenderId: "598169933649",
  appId: "1:598169933649:web:7c158e3df4fd5a76c7e570",
  measurementId: "G-G9PCMTJ1WZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { analytics, app };
