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
  updateDoc,
  collection,
  getDocs,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

/* 🔥 FIREBASE CONFIG */
const firebaseConfig = {
  apiKey: "AIzaSyD6rzXchnhijiz1pmNGS-tyvuUmMLR3RNc",
  authDomain: "school-app-64768.firebaseapp.com",
  projectId: "school-app-64768",
  storageBucket: "school-app-64768.appspot.com",
  messagingSenderId: "721039136368",
  appId: "1:721039136368:web:cba66a0677cd88a220c6b5"
};

/* 🔌 INIT FIREBASE */
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

/* 🔐 SIGN UP */
window.signup = async function() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (!email || !password) return alert("Enter email and password");

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    // New users: role=user, status=pending
    await setDoc(doc(db, "users", userCredential.user.uid), {
      email: email,
      role: "user",
      status: "pending",
      createdAt: Date.now()
    });

    alert("Sign-up successful! Wait for admin approval.");

    loadAdminPanel(); // Show new user in admin panel immediately
  } catch (err) {
    alert("Error: " + err.message);
  }
};

/* 🔐 LOGIN */
window.login = async function() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    alert("Login failed: " + err.message);
  }
};

/* 🚪 LOGOUT */
window.logout = async function() {
  await signOut(auth);
};

/* 👀 CHECK USER STATUS */
async function checkUser(user) {
  const loginBox = document.getElementById("loginBox");
  const pendingBox = document.getElementById("pendingBox");
  const appBox = document.getElementById("appBox");
  const adminPanel = document.getElementById("adminPanel");

  loginBox.style.display = "none";
  pendingBox.style.display = "none";
  appBox.style.display = "none";
  if (adminPanel) adminPanel.style.display = "none";

  if (!user) return loginBox.style.display = "block";

  const userSnap = await getDoc(doc(db, "users", user.uid));
  const userData = userSnap.data();

  if (!userData) {
    alert("User data not found.");
    await signOut(auth);
    return;
  }

  if (userData.status === "pending") {
    pendingBox.style.display = "block";
  } else if (userData.status === "banned") {
    alert("You are banned.");
    await signOut(auth);
    return;
  } else {
    appBox.style.display = "block";
    if (userData.role === "admin" || userData.role === "owner") {
      if (adminPanel) adminPanel.style.display = "block";
      loadAdminPanel();
    }
  }
}

/* 🔄 RUN WHEN LOGIN STATE CHANGES */
onAuthStateChanged(auth, checkUser);

/* 🗂 TAB SWITCHING */
window.showTab = function(tabId) {
  const tabs = ["school", "media", "boys", "info"];
  tabs.forEach(t => {
    const el = document.getElementById(t);
    if (el) el.style.display = "none";
  });

  const selected = document.getElementById(tabId);
  if (selected) selected.style.display = "block";
};

/* ——— ADMIN PANEL ——— */
async function loadAdminPanel() {
  const adminUsersDiv = document.getElementById("adminUsers");
  if (!adminUsersDiv) return;

  try {
    const usersSnap = await getDocs(collection(db, "users"));
    let html = "<ul>";

    usersSnap.forEach(docSnap => {
      const u = docSnap.data();
      html += `<li>
        ${u.email} | Status: ${u.status} | Role:
        <select onchange="changeRole('${docSnap.id}', this.value)">
          <option value="user" ${u.role==='user'?'selected':''}>User</option>
          <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
          <option value="owner" ${u.role==='owner'?'selected':''}>Owner</option>
        </select>
        <button onclick="approveUser('${docSnap.id}')">Approve</button>
        <button onclick="banUser('${docSnap.id}')">Ban</button>
        <button onclick="unbanUser('${docSnap.id}')">Unban</button>
      </li>`;
    });

    html += "</ul>";
    adminUsersDiv.innerHTML = html;
  } catch (err) {
    console.error("Failed to load admin users:", err);
    adminUsersDiv.innerHTML = "Error loading users.";
  }
}

/* ——— USER MANAGEMENT FUNCTIONS ——— */
window.approveUser = async function(uid) {
  await updateDoc(doc(db, "users", uid), {
    role: "user",
    status: "approved"
  });
  loadAdminPanel();
};

window.banUser = async function(uid) {
  await updateDoc(doc(db, "users", uid), { status: "banned" });
  loadAdminPanel();
};

window.unbanUser = async function(uid) {
  await updateDoc(doc(db, "users", uid), { status: "approved" });
  loadAdminPanel();
};

window.changeRole = async function(uid, role) {
  await updateDoc(doc(db, "users", uid), { role: role, status: "approved" });
  loadAdminPanel();
};

/* ——— AUTO-REFRESH ADMIN PANEL EVERY 5 SECONDS ——— */
setInterval(async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) return;
  const snap = await getDoc(doc(db, "users", currentUser.uid));
  const data = snap.data();
  if (data && (data.role === "admin" || data.role === "owner")) loadAdminPanel();
}, 5000);

/* ——— POST CREATION ——— */
window.createPost = async function(tab) {
  const currentUser = auth.currentUser;
  if (!currentUser) return alert("Not logged in.");

  const textInput = document.getElementById(tab + "Text");
  const fileInput = document.getElementById(tab + "File");
  if (!textInput || !fileInput) return;

  const text = textInput.value || "";
  let fileURL = "";

  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const storageRef = ref(storage, `posts/${tab}/${currentUser.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    fileURL = await getDownloadURL(storageRef);
  }

  const userSnap = await getDoc(doc(db, "users", currentUser.uid));
  const userData = userSnap.data();
  let status = (userData.role === "admin" || userData.role === "owner") ? "approved" : (fileURL ? "pending" : "approved");

  await setDoc(doc(collection(db, tab + "Posts")), {
    author: currentUser.uid,
    authorEmail: userData.email,
    text,
    fileURL,
    status,
    createdAt: Date.now()
  });

  textInput.value = "";
  fileInput.value = "";

  alert(status === "approved" ? "Post published!" : "Post sent for approval.");
  loadPosts(tab);
};

/* ——— LOAD POSTS ——— */
async function loadPosts(tab) {
  const container = document.getElementById(tab + "Container");
  if (!container) return;

  try {
    const snap = await getDocs(collection(db, tab + "Posts"));
    let html = "";
    snap.forEach(docSnap => {
      const p = docSnap.data();
      if (p.status === "approved") {
        html += `<div class="post">
          <strong>${p.authorEmail}</strong>: ${p.text || ""}
          ${p.fileURL ? `<a href="${p.fileURL}" target="_blank">[File]</a>` : ""}
        </div>`;
      }
    });
    container.innerHTML = html || "No posts found.";
  } catch (err) {
    console.error("Failed to load posts:", err);
    container.innerHTML = "Error loading posts.";
  }
}

/* ——— CHAT SYSTEM ——— */
window.sendChatMessage = async function() {
  const currentUser = auth.currentUser;
  if (!currentUser) return alert("Not logged in.");

  const textInput = document.getElementById("boysMessageInput");
  if (!textInput) return;
  const text = textInput.value || "";

  const userSnap = await getDoc(doc(db, "users", currentUser.uid));
  const userData = userSnap.data();
  if (!userData || userData.status !== "approved") return alert("Your account is not approved yet.");

  const status = (userData.role === "admin" || userData.role === "owner") ? "approved" : "approved"; // text messages auto-approved

  await setDoc(doc(collection(db, "boysChat")), {
    author: currentUser.uid,
    authorEmail: userData.email,
    text,
    status,
    createdAt: Date.now()
  });

  textInput.value = "";
  loadChat();
};

async function loadChat() {
  const container = document.getElementById("boysContainer");
  if (!container) return;

  try {
    const snap = await getDocs(collection(db, "boysChat"));
    let html = "";
    snap.forEach(docSnap => {
      const c = docSnap.data();
      if (c.status === "approved") {
        html += `<div class="chatMessage">
          <strong>${c.authorEmail}</strong>: ${c.text || ""}
        </div>`;
      }
    });
    container.innerHTML = html || "No messages yet.";
  } catch (err) {
    console.error("Failed to load chat:", err);
    container.innerHTML = "Error loading chat messages.";
  }
}

/* ——— AUTO-REFRESH POSTS, CHAT & ADMIN PANEL ——— */
setInterval(() => {
  loadPosts("school");
  loadPosts("media");
  loadChat();

  const currentUser = auth.currentUser;
  if (!currentUser) return;
  getDoc(doc(db, "users", currentUser.uid)).then(userSnap => {
    const data = userSnap.data();
    if (data && (data.role === "admin" || data.role === "owner")) loadAdminPanel();
  });
}, 3000);
