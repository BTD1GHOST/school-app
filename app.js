import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* 🔥 YOUR FIREBASE CONFIG */
const firebaseConfig = {
  apiKey: "PASTE",
  authDomain: "PASTE",
  projectId: "PASTE",
  storageBucket: "PASTE",
  messagingSenderId: "PASTE",
  appId: "PASTE"
};

/* 🔌 CONNECT TO FIREBASE */
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

/* 🆕 SIGN UP */
window.signup = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const user = await createUserWithEmailAndPassword(auth, email, password);

  // Create user in database
  await setDoc(doc(db, "users", user.user.uid), {
    role: "pending",
    createdAt: Date.now()
  });
};

/* 🔐 LOGIN */
window.login = async function () {
  await signInWithEmailAndPassword(
    auth,
    email.value,
    password.value
  );
};

/* 🚪 LOGOUT */
window.logout = async function () {
  await signOut(auth);
};

/* 👀 CHECK USER STATUS */
async function checkUser(user) {
  // Hide everything
  loginBox.style.display = "none";
  pendingBox.style.display = "none";
  appBox.style.display = "none";

  if (!user) {
    loginBox.style.display = "block";
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));
  const data = snap.data();

  if (data.role === "pending") {
    pendingBox.style.display = "block";
  } else {
    appBox.style.display = "block";
  }
}

/* 🔄 RUN WHEN LOGIN STATE CHANGES */
onAuthStateChanged(auth, checkUser);

/* 🗂 TAB SWITCHING */
window.showTab = function (tabId) {
  school.style.display = "none";
  media.style.display = "none";
  boys.style.display = "none";
  info.style.display = "none";

  document.getElementById(tabId).style.display = "block";
};
