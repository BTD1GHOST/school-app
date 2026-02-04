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
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* 🔥 FIREBASE CONFIG */
const firebaseConfig = {
  apiKey: "AIzaSyD6rzXchnhijiz1pmNGS-tyvuUmMLR3RNc",
  authDomain: "school-app-64768.firebaseapp.com",
  projectId: "school-app-64768",
  storageBucket: "school-app-64768.firebasestorage.app",
  messagingSenderId: "721039136368",
  appId: "1:721039136368:web:cba66a0677cd88a220c6b5"
};

/* 🔌 CONNECT TO FIREBASE */
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

/* 🆕 SIGN UP */
window.signup = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const user = await createUserWithEmailAndPassword(auth, email, password);

    // Create user in database
    await setDoc(doc(db, "users", user.user.uid), {
      role: "pending",
      email: email,
      status: "active",
      createdAt: Date.now()
    });
    alert("Sign up successful! Wait for approval.");
  } catch (error) {
    alert("Error signing up: " + error.message);
  }
};

/* 🔐 LOGIN */
window.login = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    // Check if user is banned
    const snap = await getDoc(doc(db, "users", userCredential.user.uid));
    const data = snap.data();
    if (data.status === "banned") {
      alert("Your account is banned!");
      await signOut(auth);
    }
  } catch (error) {
    alert("Error logging in: " + error.message);
  }
};

/* 🚪 LOGOUT */
window.logout = async function () {
  await signOut(auth);
};

/* 👀 CHECK USER STATUS */
async function checkUser(user) {
  const loginBox = document.getElementById("loginBox");
  const pendingBox = document.getElementById("pendingBox");
  const appBox = document.getElementById("appBox");

  loginBox.style.display = "none";
  pendingBox.style.display = "none";
  appBox.style.display = "none";

  if (!user) {
    loginBox.style.display = "block";
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));
  const data = snap.data();

  if (!data || data.role === "pending") {
    pendingBox.style.display = "block";
  } else {
    appBox.style.display = "block";
  }
}

/* 🔄 RUN WHEN LOGIN STATE CHANGES */
onAuthStateChanged(auth, checkUser);

/* 🗂 TAB SWITCHING */
window.showTab = function (tabId) {
  const tabs = ["school", "media", "boys", "info", "admin"];
  tabs.forEach(id => {
    document.getElementById(id).style.display = "none";
  });
  document.getElementById(tabId).style.display = "block";

  if (tabId === "admin") {
    loadPendingUsers();
  }
};

/* ——— ADMIN PANEL FUNCTIONS ——— */

async function loadPendingUsers() {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const userSnap = await getDoc(doc(db, "users", currentUser.uid));
  const userData = userSnap.data();

  if (!userData || (userData.role !== "admin" && userData.role !== "owner")) {
    document.getElementById("pendingUsersList").innerText = "Access denied.";
    return;
  }

  const q = query(collection(db, "users"));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    document.getElementById("pendingUsersList").innerText = "No users found.";
    return;
  }

  let html = "<ul>";
  querySnapshot.forEach(docSnap => {
    const user = docSnap.data();
    html += `
      <li>
        ${user.email || docSnap.id} 
        [Role: ${user.role || "user"}] 
        [Status: ${user.status || "active"}] <br>
        ${user.role === "pending" ? `<button onclick="approveUser('${docSnap.id}')">Approve</button>
        <button onclick="denyUser('${docSnap.id}')">Deny</button>` : ""}
        ${user.role !== "owner" ? `<button onclick="toggleAdmin('${docSnap.id}', '${user.role}')">Toggle Admin</button>` : ""}
        <button onclick="toggleBan('${docSnap.id}', '${user.status || "active"}')">${user.status === "banned" ? "Unban" : "Ban"}</button>
      </li>
      <hr>
    `;
  });
  html += "</ul>";

  document.getElementById("pendingUsersList").innerHTML = html;
}

window.approveUser = async function (userId) {
  await updateDoc(doc(db, "users", userId), { role: "user" });
  alert("User approved!");
  loadPendingUsers();
};

window.denyUser = async function (userId) {
  await updateDoc(doc(db, "users", userId), { role: "denied" });
  alert("User denied!");
  loadPendingUsers();
};

window.toggleAdmin = async function(userId, currentRole) {
  if (currentRole === "admin") {
    await updateDoc(doc(db, "users", userId), { role: "user" });
    alert("Admin rights removed.");
  } else if (currentRole === "user") {
    await updateDoc(doc(db, "users", userId), { role: "admin" });
    alert("User promoted to admin.");
  }
  loadPendingUsers();
};

window.toggleBan = async function(userId, currentStatus) {
  if (currentStatus === "banned") {
    await updateDoc(doc(db, "users", userId), { status: "active" });
    alert("User unbanned.");
  } else {
    await updateDoc(doc(db, "users", userId), { status: "banned" });
    alert("User banned.");
  }
  loadPendingUsers();
};
