import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  // PASTE YOUR CONFIG HERE
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

window.signup = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const userCred = await createUserWithEmailAndPassword(auth, email, password);

  await setDoc(doc(db, "users", userCred.user.uid), {
    role: "pending",
    createdAt: Date.now()
  });

  checkUser();
};

window.login = async function () {
  await signInWithEmailAndPassword(
    auth,
    email.value,
    password.value
  );
  checkUser();
};

window.logout = async function () {
  await signOut(auth);
  location.reload();
};

async function checkUser() {
  const user = auth.currentUser;
  if (!user) return;

  const snap = await getDoc(doc(db, "users", user.uid));
  const data = snap.data();

  document.getElementById("auth").style.display = "none";

  if (data.role === "pending") {
    document.getElementById("pending").style.display = "block";
  } else {
    document.getElementById("app").style.display = "block";
  }
}

auth.onAuthStateChanged(checkUser);
