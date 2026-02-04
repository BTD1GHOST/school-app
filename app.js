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
  getDocs
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

  if (!email || !password) {
    alert("Enter email and password");
    return;
  }

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

  loginBox.style.display = "none";
  pendingBox.style.display = "none";
  appBox.style.display = "none";

  if (!user) {
    loginBox.style.display = "block";
    return;
  }

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
      loadAdminPanel();
    }
  }
}

/* 🔄 RUN WHEN LOGIN STATE CHANGES */
onAuthStateChanged(auth, checkUser);

/* 🗂 TAB SWITCHING */
window.showTab = function(tabId) {
  const tabs = ["school", "media", "boys", "info", "admin"];
  tabs.forEach(t => document.getElementById(t).style.display = "none");
  document.getElementById(tabId).style.display = "block";
};

/* ——— ADMIN PANEL ——— */
async function loadAdminPanel() {
  const listDiv = document.getElementById("userList");
  const snap = await getDocs(collection(db, "users")); // Fetch all users
  let html = "<ul>";

  snap.forEach(docSnap => {
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
  listDiv.innerHTML = html;
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
/* ——— POST CREATION ——— */
window.createPost = async function(tab) {
  const currentUser = auth.currentUser;
  const textInput = document.getElementById(tab + "Text");
  const fileInput = document.getElementById(tab + "File");

  if (!currentUser) return alert("Not logged in.");

  let text = textInput.value || "";
  let fileURL = "";

  // Upload file if exists
  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const storageRef = ref(storage, `posts/${currentUser.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    fileURL = await getDownloadURL(storageRef);
  }

  // Get user role/status
  const userSnap = await getDoc(doc(db, "users", currentUser.uid));
  const userData = userSnap.data();

  // Determine post status
  let status;
  if (userData.role === "admin" || userData.role === "owner") {
    status = "approved"; // Admin posts auto-approved
  } else {
    status = fileURL ? "pending" : "approved"; // Only images/files pending
  }

  // Save post
  await addDoc(collection(db, tab + "Posts"), {
    author: currentUser.uid,
    authorEmail: userData.email,
    text: text,
    fileURL: fileURL,
    status: status,
    createdAt: Date.now()
  });

  textInput.value = "";
  fileInput.value = "";
  alert(status === "approved" ? "Post published!" : "Post sent for approval.");
};

/* ——— LOAD POSTS ——— */
async function loadPosts(tab) {
  const container = document.getElementById(tab + "Container");
  const snap = await getDocs(collection(db, tab + "Posts"));
  let html = "";

  snap.forEach(docSnap => {
    const p = docSnap.data();
    if (p.status === "approved") {
      html += `<div>
        <strong>${p.authorEmail}</strong>: ${p.text || ""}
        ${p.fileURL ? `<a href="${p.fileURL}" target="_blank">[File]</a>` : ""}
      </div>`;
    }
  });

  container.innerHTML = html;
}

/* ——— CHAT (The Boys) ——— */
window.sendChatMessage = async function() {
  const currentUser = auth.currentUser;
  const input = document.getElementById("boysText");
  const fileInput = document.getElementById("boysFile");

  if (!currentUser) return alert("Not logged in.");

  let text = input.value || "";
  let fileURL = "";

  // Upload image/file if any
  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const storageRef = ref(storage, `chat/${currentUser.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    fileURL = await getDownloadURL(storageRef);
  }

  // Get user role/status
  const userSnap = await getDoc(doc(db, "users", currentUser.uid));
  const userData = userSnap.data();

  let status;
  if (userData.role === "admin" || userData.role === "owner") {
    status = "approved"; // Admin images auto-approved
  } else {
    status = fileURL ? "pending" : "approved"; // Only images pending
  }

  await addDoc(collection(db, "boysChat"), {
    author: currentUser.uid,
    authorEmail: userData.email,
    text: text,
    fileURL: fileURL,
    status: status,
    createdAt: Date.now()
  });

  input.value = "";
  fileInput.value = "";
};

/* ——— LOAD CHAT ——— */
async function loadChat() {
  const container = document.getElementById("boysContainer");
  const snap = await getDocs(collection(db, "boysChat"));
  let html = "";

  snap.forEach(docSnap => {
    const c = docSnap.data();
    if (c.status === "approved") {
      html += `<div>
        <strong>${c.authorEmail}</strong>: ${c.text || ""}
        ${c.fileURL ? `<a href="${c.fileURL}" target="_blank">[File]</a>` : ""}
      </div>`;
    }
  });

  container.innerHTML = html;
}

/* ——— APPROVE POSTS (ADMIN) ——— */
window.approvePost = async function(tab, postId) {
  await updateDoc(doc(db, tab + "Posts", postId), { status: "approved" });
  loadPosts(tab);
};

window.deletePost = async function(tab, postId) {
  await deleteDoc(doc(db, tab + "Posts", postId));
  loadPosts(tab);
};

/* ——— AUTOMATIC LOADING INTERVALS ——— */
setInterval(() => {
  loadPosts("school");
  loadPosts("media");
  loadChat();
}, 3000); // reload every 3s
