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

  const userCredential = await createUserWithEmailAndPassword(auth, email, password);

  // ✅ New users: role = user, status = pending
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
  }
}

/* 🔄 AUTO-REFRESH FOR PENDING USERS */
let pendingInterval;
onAuthStateChanged(auth, async (user) => {
  if (pendingInterval) clearInterval(pendingInterval);
  checkUser(user);

  if (user) {
    const userRef = doc(db, "users", user.uid);
    pendingInterval = setInterval(async () => {
      const snap = await getDoc(userRef);
      const data = snap.data();
      if (data && data.status === "approved") {
        clearInterval(pendingInterval);
        checkUser(user);
      }
    }, 3000);
  }
});

/* 🗂 TAB SWITCHING */
window.showTab = function(tabId) {
  const tabs = ["school", "media", "boys", "info", "admin"];
  tabs.forEach(t => document.getElementById(t).style.display = "none");
  document.getElementById(tabId).style.display = "block";
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
  // ✅ Approve sets role = user, status = approved
  await updateDoc(doc(db, "users", uid), {
    role: "user",
    status: "approved"
  });
  loadPendingUsers();
};

window.banUser = async function(uid) {
  await updateDoc(doc(db, "users", uid), { status: "banned" });
  loadPendingUsers();
};

window.makeAdmin = async function(uid) {
  await updateDoc(doc(db, "users", uid), { 
    role: "admin",
    status: "approved"
  });
  loadPendingUsers();
};
