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
  addDoc,
  getDocs,
  query,
  where
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

  const userCredential = await createUserWithEmailAndPassword(auth, email, password);

  // New users: role=user, status=pending
  await setDoc(doc(db, "users", userCredential.user.uid), {
    email: email,
    role: "user",
    status: "pending",
    createdAt: Date.now()
  });

  alert("Sign-up successful! Wait for admin approval.");
};

/* 🔐 LOGIN */
window.login = async function() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  await signInWithEmailAndPassword(auth, email, password);
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
    alert("User not found!");
    await signOut(auth);
    return;
  }

  if (userData.status === "pending") {
    pendingBox.style.display = "block";
  } else if (userData.status === "banned") {
    alert("You are banned.");
    await signOut(auth);
  } else {
    appBox.style.display = "block";
    if (userData.role === "admin" || userData.role === "owner") {
      loadAdminPanel();
      loadPendingPosts();
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

/* ——— CREATE SCHOOL WORK POST ——— */
window.createPost = async function() {
  const text = document.getElementById("postText").value;
  const fileInput = document.getElementById("postFile");
  const currentUser = auth.currentUser;

  let fileURL = "";
  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const storageRef = ref(storage, `posts/${currentUser.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    fileURL = await getDownloadURL(storageRef);
  }

  const userSnap = await getDoc(doc(db, "users", currentUser.uid));
  const userData = userSnap.data();
  const status = (userData.role === "admin" || userData.role === "owner") ? "approved" : (fileURL ? "pending" : "approved");

  await addDoc(collection(db, "schoolPosts"), {
    author: currentUser.uid,
    authorEmail: userData.email,
    text: text,
    fileURL: fileURL,
    status: status,
    createdAt: Date.now()
  });

  document.getElementById("postText").value = "";
  fileInput.value = "";
  alert(status === "approved" ? "Post published!" : "Post sent for approval.");
};

/* ——— CREATE SHARED MEDIA POST ——— */
window.createMediaPost = async function() {
  const text = document.getElementById("mediaText").value;
  const fileInput = document.getElementById("mediaFile");
  const currentUser = auth.currentUser;

  let fileURL = "";
  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const storageRef = ref(storage, `media/${currentUser.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    fileURL = await getDownloadURL(storageRef);
  }

  const userSnap = await getDoc(doc(db, "users", currentUser.uid));
  const userData = userSnap.data();
  const status = (userData.role === "admin" || userData.role === "owner") ? "approved" : (fileURL ? "pending" : "approved");

  await addDoc(collection(db, "mediaPosts"), {
    author: currentUser.uid,
    authorEmail: userData.email,
    text: text,
    fileURL: fileURL,
    status: status,
    createdAt: Date.now()
  });

  document.getElementById("mediaText").value = "";
  fileInput.value = "";
  alert(status === "approved" ? "Post published!" : "Post sent for approval.");
};

/* ——— THE BOYS CHAT ——— */
window.sendChatMessage = async function() {
  const currentUser = auth.currentUser;
  const userSnap = await getDoc(doc(db, "users", currentUser.uid));
  const userData = userSnap.data();
  if (!userData || userData.status !== "approved") {
    alert("You cannot send messages until approved.");
    return;
  }

  const textInput = document.getElementById("chatText");
  const fileInput = document.getElementById("chatFile");
  const text = textInput.value;
  let fileURL = "";

  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const storageRef = ref(storage, `chat/${currentUser.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    fileURL = await getDownloadURL(storageRef);
  }

  const isAdmin = userData.role === "admin" || userData.role === "owner";
  const status = (isAdmin || (!text && fileURL)) ? "approved" : (fileURL ? "pending" : "approved");

  await addDoc(collection(db, "chatMessages"), {
    author: currentUser.uid,
    authorEmail: userData.email,
    text: text,
    fileURL: fileURL,
    status: status,
    createdAt: Date.now()
  });

  textInput.value = "";
  fileInput.value = "";
  alert(status === "approved" ? "Message sent!" : "Image sent for approval.");
};

/* ——— ADMIN PANEL ——— */
async function loadAdminPanel() {
  const listDiv = document.getElementById("userList");
  const snap = await getDocs(collection(db, "users"));
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

/* ——— USER MANAGEMENT ——— */
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

/* ——— POST APPROVALS ——— */
async function loadPendingPosts() {
  const postDiv = document.getElementById("pendingPostsList");
  const snap = await getDocs(collection(db, "schoolPosts"));
  let html = "<ul>";

  snap.forEach(docSnap => {
    const p = docSnap.data();
    if (p.status === "pending") {
      html += `<li>${p.authorEmail} | ${p.text || "[File]"} 
        <button onclick="approvePost('${docSnap.id}')">Approve</button>
        <button onclick="deletePost('${docSnap.id}')">Delete</button>
      </li>`;
    }
  });

  html += "</ul>";
  postDiv.innerHTML = html;
}

window.approvePost = async function(postId) {
  await updateDoc(doc(db, "schoolPosts", postId), { status: "approved" });
  loadPendingPosts();
};

window.deletePost = async function(postId) {
  await updateDoc(doc(db, "schoolPosts", postId), { status: "deleted" });
  loadPendingPosts();
}
