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
  orderBy
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

  await setDoc(doc(db, "users", userCredential.user.uid), {
    email: email,
    role: "pending",
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
  }
}

onAuthStateChanged(auth, checkUser);

/* 🗂 TAB SWITCHING */
window.showTab = function(tabId) {
  const tabs = ["school", "media", "boys", "info", "admin"];
  tabs.forEach(t => document.getElementById(t).style.display = "none");
  document.getElementById(tabId).style.display = "block";

  if (tabId === "boys") loadChatMessages();
  if (tabId === "admin") loadPendingUsers();
};

/* ——— SCHOOL WORK POSTS ——— */
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
  const status = (userData.role === "admin" || userData.role === "owner") ? "approved" : "pending";

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

/* ——— SHARED MEDIA POSTS ——— */
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
  const status = (userData.role === "admin" || userData.role === "owner") ? "approved" : "pending";

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
  const status = (isAdmin || (!text && fileURL)) ? "approved" : fileURL ? "pending" : "approved";

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
  loadChatMessages();
};

async function loadChatMessages() {
  const chatDiv = document.getElementById("chatMessages");
  chatDiv.innerHTML = "Loading...";
  const snap = await getDocs(query(collection(db, "chatMessages"), orderBy("createdAt")));
  const currentUserSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
  const currentUserData = currentUserSnap.data();
  const isAdmin = currentUserData.role === "admin" || currentUserData.role === "owner";

  let html = "<ul>";
  snap.forEach(docSnap => {
    const msg = docSnap.data();
    if (msg.status === "approved" || isAdmin) {
      html += `<li>
        <b>${msg.authorEmail}</b>: ${msg.text || ""} <br>
        ${msg.fileURL ? `<img src="${msg.fileURL}" style="max-width:150px; cursor:pointer;" onclick="showFullChatImage('${docSnap.id}')">` : ""}
        ${isAdmin && msg.status === "pending" ? `<br>
        <button onclick="approveChatImage('${docSnap.id}'); event.stopPropagation();">Approve</button>
        <button onclick="denyChatImage('${docSnap.id}'); event.stopPropagation();">Deny</button>` : ""}
        ${isAdmin ? `<button onclick="deleteChatMessage('${docSnap.id}'); event.stopPropagation();">Delete</button>` : ""}
      </li><hr>`;
    }
  });
  html += "</ul>";
  chatDiv.innerHTML = html;
}

window.showFullChatImage = async function(msgId) {
  const msgSnap = await getDoc(doc(db, "chatMessages", msgId));
  const msg = msgSnap.data();
  if (!msg || !msg.fileURL) return;

  const modal = document.createElement("div");
  modal.id = "fullChatImageModal";
  modal.style.position = "fixed";
  modal.style.top = 0;
  modal.style.left = 0;
  modal.style.width = "100%";
  modal.style.height = "100%";
  modal.style.backgroundColor = "rgba(0,0,0,0.8)";
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.zIndex = 9999;
  modal.innerHTML = `<img src="${msg.fileURL}" style="max-width:90%; max-height:80vh;">
                     <br><button onclick="closeFullChatImage()">Close</button>`;
  document.body.appendChild(modal);
};

window.closeFullChatImage = function() {
  const modal = document.getElementById("fullChatImageModal");
  if (modal) modal.remove();
};

window.approveChatImage = async function(msgId) {
  await updateDoc(doc(db, "chatMessages", msgId), { status: "approved" });
  loadChatMessages();
};

window.denyChatImage = async function(msgId) {
  await updateDoc(doc(db, "chatMessages", msgId), { status: "denied" });
  loadChatMessages();
};

window.deleteChatMessage = async function(msgId) {
  await updateDoc(doc(db, "chatMessages", msgId), { status: "deleted" });
  loadChatMessages();
};

/* ——— ADMIN PANEL ——— */
async function loadPendingUsers() {
  const listDiv = document.getElementById("pendingUsersList");
  const snap = await getDocs(collection(db, "users"));
  let html = "<ul>";
  snap.forEach(docSnap => {
    const u = docSnap.data();
    if (u.status === "pending") {
      html += `<li>${u.email} 
        <button onclick="approveUser('${docSnap.id}')">Approve</button> 
        <button onclick="banUser('${docSnap.id}')">Ban</button>
        <button onclick="makeAdmin('${docSnap.id}')">Make Admin</button>
      </li>`;
    }
  });
  html += "</ul>";
  listDiv.innerHTML = html;
}

window.approveUser = async function(uid) {
  await updateDoc(doc(db, "users", uid), { status: "approved" });
  loadPendingUsers();
};

window.banUser = async function(uid) {
  await updateDoc(doc(db, "users", uid), { status: "banned" });
  loadPendingUsers();
};

window.makeAdmin = async function(uid) {
  await updateDoc(doc(db, "users", uid), { role: "admin" });
  loadPendingUsers();
};
