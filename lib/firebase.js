import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);

// Get all products from Firestore
export async function getProducts() {
  const productsCol = collection(db, 'products');
  const productSnapshot = await getDocs(productsCol);
  return productSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

// Get all locations from Firestore
export async function getLocations() {
  const locationsCol = collection(db, 'locations');
  const locationSnapshot = await getDocs(locationsCol);
  return locationSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

// Sign in user
export async function signIn(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}

// Create new user
export async function signUp(email, password) {
  return await createUserWithEmailAndPassword(auth, email, password);
}

// Sign out user
export async function signOut() {
  return await firebaseSignOut(auth);
}
// Get user data from Firestore
export async function getUserData(userId) {
  const { doc, getDoc } = await import('firebase/firestore');
  const userDoc = doc(db, 'users', userId);
  const userSnapshot = await getDoc(userDoc);
  
  if (userSnapshot.exists()) {
    return userSnapshot.data();
  }
  return null;
}

// Create or update user in Firestore
export async function createUserProfile(userId, email, displayName) {
  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
  const userDoc = doc(db, 'users', userId);
  
  await setDoc(userDoc, {
    email: email,
    displayName: displayName,
    rewardsPoints: 250, // Welcome bonus!
    createdAt: serverTimestamp()
  });
}

// Update user rewards points
export async function updateRewardsPoints(userId, points) {
  const { doc, updateDoc } = await import('firebase/firestore');
  const userDoc = doc(db, 'users', userId);
  
  await updateDoc(userDoc, {
    rewardsPoints: points
  });
}

// Add points after purchase
export async function addPurchasePoints(userId, purchaseAmount) {
  const userData = await getUserData(userId);
  if (userData) {
    const pointsToAdd = Math.floor(purchaseAmount * 10); // $1 = 10 points
    const newTotal = userData.rewardsPoints + pointsToAdd;
    await updateRewardsPoints(userId, newTotal);
    return { pointsAdded: pointsToAdd, newTotal: newTotal };
  }
  return null;
}

// Redeem points for discount
export async function redeemPoints(userId, pointsToRedeem) {
  const userData = await getUserData(userId);
  if (userData && userData.rewardsPoints >= pointsToRedeem) {
    const newTotal = userData.rewardsPoints - pointsToRedeem;
    await updateRewardsPoints(userId, newTotal);
    return { success: true, newTotal: newTotal };
  }
  return { success: false, message: 'Not enough points' };
}

export default app;