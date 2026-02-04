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
  getDocs,
  updateDoc,
  addDoc,
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
  storageBucket: "school-app-64768.firebasestorage.app",
  messagingSenderId: "721039136368",
  appId: "1:721039136368:web:cba66a0677cd88a220c6b5"
};

/* 🔌 CONNECT TO FIREBASE */
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

/* 🆕 SIGN UP */
window.signup = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const user = await createUserWithEmailAndPassword(auth, email, password);
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
    if (document.getElementById("school").style.display !== "none") {
      loadPosts();
    }
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

  if (tabId === "admin") loadPendingUsers();
  if (tabId === "school") loadPosts();
};

/* ——— ADMIN PANEL ——— */

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

/* ——— SCHOOL WORK POSTS WITH APPROVAL & FULLSCREEN ——— */

window.createPost = async function () {
  const currentUser = auth.currentUser;
  const snap = await getDoc(doc(db, "users", currentUser.uid));
  const userData = snap.data();

  const text = document.getElementById("postText").value;
  const fileInput = document.getElementById("postFile");
  let fileURL = "";

  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const storageRef = ref(storage, `posts/${currentUser.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    fileURL = await getDownloadURL(storageRef);
  }

  const status = (userData.role === "admin" || userData.role === "owner") ? "approved" : "pending";

  await addDoc(collection(db, "posts"), {
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
  loadPosts();
};

async function loadPosts() {
  const postsDiv = document.getElementById("postsList");
  postsDiv.innerHTML = "Loading...";

  const snap = await getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc")));
  let html = "<ul>";
  const currentUserSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
  const currentUserData = currentUserSnap.data();
  const isAdmin = currentUserData.role === "admin" || currentUserData.role === "owner";

  snap.forEach(docSnap => {
    const post = docSnap.data();
    if (post.status === "approved" || isAdmin) {
      html += `<li onclick="showFullPost('${docSnap.id}')">
        <b>${post.authorEmail}</b><br>
        ${post.text ? post.text : ""}<br>
        ${post.fileURL ? `<a href="${post.fileURL}" target="_blank">View File</a>` : ""}<br>
        ${isAdmin && post.status === "pending" ? `<button onclick="approvePost('${docSnap.id}'); event.stopPropagation();">Approve</button>
        <button onclick="denyPost('${docSnap.id}'); event.stopPropagation();">Deny</button>` : ""}
        ${isAdmin ? `<button onclick="deletePost('${docSnap.id}'); event.stopPropagation();">Delete</button>` : ""}
      </li><hr>`;
    }
  });
  html += "</ul>";
  postsDiv.innerHTML = html;
}

/* 🔍 FULLSCREEN POST VIEW */
window.showFullPost = async function(postId) {
  const postSnap = await getDoc(doc(db, "posts", postId));
  const post = postSnap.data();
  if (!post) return;

  let content = `<h3>${post.authorEmail}</h3>`;
  if (post.text) content += `<p>${post.text}</p>`;
  if (post.fileURL) content += `<img src="${post.fileURL}" style="max-width:90%; max-height:80vh;">`;

  // Show modal
  const modal = document.createElement("div");
  modal.id = "fullPostModal";
  modal.style.position = "fixed";
  modal.style.top = 0;
  modal.style.left = 0;
  modal.style.width = "100%";
  modal.style.height = "100%";
  modal.style.backgroundColor = "rgba(0,0,0,0.8)";
  modal.style.color = "#fff";
  modal.style.display = "flex";
  modal.style.flexDirection = "column";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.zIndex = 9999;
  modal.innerHTML = content + `<br><button onclick="closeFullPost()">Close</button>`;
  document.body.appendChild(modal);
};

window.closeFullPost = function() {
  const modal = document.getElementById("fullPostModal");
  if (modal) modal.remove();
};

/* ——— POST ADMIN ACTIONS ——— */
window.approvePost = async function(postId) {
  await updateDoc(doc(db, "posts", postId), { status: "approved" });
  alert("Post approved!");
  loadPosts();
};

window.denyPost = async function(postId) {
  await updateDoc(doc(db, "posts", postId), { status: "denied" });
  alert("Post denied!");
  loadPosts();
};

window.deletePost = async function(postId) {
  await updateDoc(doc(db, "posts", postId), { status: "deleted" });
  alert("Post deleted!");
  loadPosts();
};
