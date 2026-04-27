import { useState, useEffect } from "react";
import { Platform } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../config/firebase";

WebBrowser.maybeCompleteAuthSession();

const createUserDocIfNeeded = async (user) => {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    const baseUsername = (user.email?.split("@")[0] ?? "user")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    await setDoc(userRef, {
      username: baseUsername,
      displayName: user.displayName || baseUsername,
      bio: "",
      photoURL: user.photoURL || "",
      followerCount: 0,
      followingCount: 0,
      createdAt: serverTimestamp(),
    });
    await setDoc(doc(db, "lists", `${user.uid}_watchlist`), {
      userId: user.uid,
      title: "Watchlist",
      description: "Shows I want to watch",
      showIds: [],
      isPublic: true,
      isWatchlist: true,
      createdAt: serverTimestamp(),
    });
  }
};

export const useGoogleAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  // Native: handle the OAuth response from expo-auth-session
  useEffect(() => {
    if (Platform.OS === "web") return;
    if (response?.type === "success") {
      setLoading(true);
      const credential = GoogleAuthProvider.credential(response.params.id_token);
      signInWithCredential(auth, credential)
        .then(({ user }) => createUserDocIfNeeded(user))
        .catch((err) => {
          console.error("Google sign-in error:", err.code, err.message);
          setError("Google sign-in failed. Please try again.");
          setLoading(false);
        });
    } else if (response?.type === "error") {
      setError("Google sign-in failed. Please try again.");
    }
  }, [response]);

  const signInWithGoogle = async () => {
    setError("");
    if (Platform.OS === "web") {
      // Web: Firebase popup handles everything, no redirect URI config needed
      try {
        setLoading(true);
        const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
        await createUserDocIfNeeded(user);
      } catch (err) {
        console.error("Google sign-in error:", err.code, err.message);
        setError("Google sign-in failed. Please try again.");
        setLoading(false);
      }
    } else {
      promptAsync();
    }
  };

  return { request, loading, error, signInWithGoogle };
};
