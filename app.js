// ——— FIREBASE IMPORTS ———
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// ——— FIREBASE CONFIG ———
const firebaseConfig = {
  apiKey: "AIzaSyD6rzXchnhijiz1pmNGS-tyvuUmMLR3RNc",
  authDomain: "school-app-64768.firebaseapp.com",
  projectId: "school-app-64768",
  storageBucket: "school-app-64768.appspot.com",
  messagingSenderId: "721039136368",
  appId: "1:721039136368:web:cba66a0677cd88a220c6b5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

// ——— UTILITY ———
function getElem(id){ return document.getElementById(id); }

// ——— SIGNUP ———
window.signup = async function() {
  const email = getElem("email").value;
  const password = getElem("password").value;
  if(!email || !password) return alert("Enter email and password");

  try {
    const userCred = await createUserWithEmailAndPassword(auth,email,password);
    await setDoc(doc(db,"users",userCred.user.uid),{
      email: email,
      role: "user",
      status: "pending",
      createdAt: Date.now()
    });
    alert("Sign-up successful! Wait for admin approval.");
    loadAdminPanel(); // so new user shows up
  } catch(e){ alert(e.message); }
};

// ——— LOGIN ———
window.login = async function() {
  const email = getElem("email").value;
  const password = getElem("password").value;
  try { await signInWithEmailAndPassword(auth,email,password); }
  catch(e){ alert("Login failed: "+e.message); }
};

// ——— LOGOUT ———
window.logout = async function(){ await signOut(auth); };

// ——— CHECK USER ———
async function checkUser(user){
  getElem("loginBox").style.display="none";
  getElem("pendingBox").style.display="none";
  getElem("appBox").style.display="none";
  getElem("adminPanel").style.display="none";

  if(!user){ getElem("loginBox").style.display="block"; return; }

  const snap = await getDoc(doc(db,"users",user.uid));
  const uData = snap.data();
  if(!uData){ await signOut(auth); return alert("User not found"); }

  if(uData.status==="pending"){ getElem("pendingBox").style.display="block"; }
  else if(uData.status==="banned"){ await signOut(auth); return alert("You are banned"); }
  else{
    getElem("appBox").style.display="block";
    if(uData.role==="admin" || uData.role==="owner"){ getElem("adminPanel").style.display="block"; loadAdminPanel(); }
    loadPosts("school"); loadPosts("media"); loadChat();
  }
}
onAuthStateChanged(auth,checkUser);

// ——— TAB SWITCH ———
window.showTab = function(tab){
  ["school","media","boys","info"].forEach(t=>getElem(t).style.display="none");
  getElem(tab).style.display="block";
};

// ——— ADMIN PANEL ———
async function loadAdminPanel(){
  const listDiv = getElem("adminUsers");
  if(!listDiv) return;
  const snap = await getDocs(collection(db,"users"));
  let html="<ul>";
  snap.forEach(d=>{
    const u=d.data();
    html+=`<li>${u.email || 'Unknown'} | Status: ${u.status || 'pending'} | Role:
      <select onchange="changeRole('${d.id}', this.value)">
        <option value='user' ${u.role==='user'?'selected':''}>User</option>
        <option value='admin' ${u.role==='admin'?'selected':''}>Admin</option>
        <option value='owner' ${u.role==='owner'?'selected':''}>Owner</option>
      </select>
      <button onclick="approveUser('${d.id}')">Approve</button>
      <button onclick="banUser('${d.id}')">Ban</button>
      <button onclick="unbanUser('${d.id}')">Unban</button>
    </li>`;
  });
  html+="</ul>";
  listDiv.innerHTML=html;
}

// ——— ADMIN FUNCTIONS ———
window.approveUser = async uid => { await updateDoc(doc(db,"users",uid),{ role:"user", status:"approved"}); loadAdminPanel(); }
window.banUser = async uid => { await updateDoc(doc(db,"users",uid),{ status:"banned"}); loadAdminPanel(); }
window.unbanUser = async uid => { await updateDoc(doc(db,"users",uid),{ status:"approved"}); loadAdminPanel(); }
window.changeRole = async (uid,role) => { await updateDoc(doc(db,"users",uid),{ role, status:"approved"}); loadAdminPanel(); }

// ——— POSTS ———
window.createPost = async tab=>{
  const cUser = auth.currentUser;
  if(!cUser) return alert("Not logged in");

  const textInput = getElem(tab+"Text");
  const fileInput = getElem(tab+"File");
  const text = textInput?.value||"";
  let fileURL="";
  if(fileInput?.files?.length>0){
    const f=fileInput.files[0];
    const sRef=ref(storage,`posts/${tab}/${cUser.uid}/${Date.now()}_${f.name}`);
    await uploadBytes(sRef,f);
    fileURL=await getDownloadURL(sRef);
  }

  const uSnap = await getDoc(doc(db,"users",cUser.uid));
  const uData = uSnap.data();
  const authorEmail = uData.email || "Unknown";
  const status=(uData.role==="admin"||uData.role==="owner") ? "approved" : (fileURL ? "pending":"approved");

  await setDoc(doc(collection(db,tab+"Posts")),{
    author:cUser.uid, authorEmail, text, fileURL, status, createdAt:Date.now()
  });

  if(textInput) textInput.value="";
  if(fileInput) fileInput.value="";
  alert(status==="approved"?"Post published!":"Post sent for approval.");
  loadPosts(tab);
};

async function loadPosts(tab){
  const container = getElem(tab+"Container");
  if(!container) return;
  const snap = await getDocs(collection(db,tab+"Posts"));
  let html="";
  snap.forEach(d=>{
    const p=d.data();
    if(p.status==="approved"){
      html+=`<div><strong>${p.authorEmail}</strong>: ${p.text||""} ${p.fileURL?`<a href="${p.fileURL}" target="_blank">[File]</a>`:""}</div>`;
    }
  });
  container.innerHTML=html;
}

// ——— CHAT ———
window.sendChatMessage=async function(){
  const cUser = auth.currentUser;
  if(!cUser) return alert("Not logged in");

  const textInput = getElem("boysMessageInput");
  const fileInput = getElem("boysFile");
  const text = textInput?.value||"";
  let fileURL="";
  if(fileInput?.files?.length>0){
    const f=fileInput.files[0];
    const sRef = ref(storage,`chat/${cUser.uid}/${Date.now()}_${f.name}`);
    await uploadBytes(sRef,f);
    fileURL = await getDownloadURL(sRef);
  }

  const uSnap = await getDoc(doc(db,"users",cUser.uid));
  const uData = uSnap.data();
  if(uData.status!=="approved") return alert("Account not approved");
  const status=(uData.role==="admin"||uData.role==="owner")?"approved":(fileURL?"pending":"approved");

  await setDoc(doc(collection(db,"boysChat")),{
    author:cUser.uid, authorEmail:uData.email||"Unknown", text, fileURL, status, createdAt:Date.now()
  });

  if(textInput) textInput.value="";
  if(fileInput) fileInput.value="";
  if(status==="approved") loadChat(); else alert("Image sent for approval");
};

async function loadChat(){
  const container = getElem("boysContainer");
  if(!container) return;
  const snap = await getDocs(collection(db,"boysChat"));
  let html="";
  snap.forEach(d=>{
    const c=d.data();
    if(c.status==="approved"){
      html+=`<div><strong>${c.authorEmail}</strong>: ${c.text||""} ${c.fileURL?`<a href="${c.fileURL}" target="_blank">[File]</a>`:""}</div>`;
    }
  });
  container.innerHTML=html;
}

// ——— AUTO REFRESH POSTS, CHAT, ADMIN PANEL ———
setInterval(()=>{
  loadPosts("school"); loadPosts("media"); loadChat();
  const cUser = auth.currentUser;
  if(!cUser) return;
  getDoc(doc(db,"users",cUser.uid)).then(d=>{
    const u=d.data();
    if(u && (u.role==="admin"||u.role==="owner")) loadAdminPanel();
  });
},3000);
