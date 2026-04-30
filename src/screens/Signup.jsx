import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../config/firebase.js";
import { useGoogleAuth } from "../hooks/useGoogleAuth";

const Signup = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { request, loading: googleLoading, error: googleError, signInWithGoogle } = useGoogleAuth();

  const handleSignup = async () => {
    if (!email || !password || !username || !displayName) {
      setError("All fields are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(doc(db, "users", user.uid), {
        username: username.trim().toLowerCase(),
        displayName: displayName.trim(),
        bio: "",
        photoURL: user.photoURL ?? null,
        followerCount: 0,
        followingCount: 0,
        totpEnabled: false,
        createdAt: serverTimestamp(),
        avatarColor: ["#52B788", "#F59E0B", "#EF4444", "#8B5CF6", "#0EA5E9"][Math.floor(Math.random() * 5)],
      });

      // Create a Default watchlist
      await setDoc(doc(db, "lists", `${user.uid}_watchlist`), {
        userId: user.uid,
        title: "Watchlist",
        description: "Shows I want to watch",
        showIds: [],
        isPublic: true,
        isWatchlist: true,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Signup error:", err.code, err.message);
      setError(friendlyError(err.code));
      setLoading(false);
      return;
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Track every show you watch.</Text>

        <TextInput
          style={styles.input}
          placeholder="Display Name"
          placeholderTextColor="#2D6A4F"
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
        />
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#2D6A4F"
          value={username}
          onChangeText={(t) => setUsername(t.replace(/\s/g, ""))}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#2D6A4F"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#2D6A4F"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={[styles.googleButton, (googleLoading || !request) && styles.buttonDisabled]}
          onPress={signInWithGoogle}
          disabled={googleLoading || !request}
        >
          {googleLoading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          )}
        </TouchableOpacity>

        {googleError ? <Text style={styles.error}>{googleError}</Text> : null}

        {navigation && (
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.loginLink}>
              Already have an account? <Text style={styles.loginLinkBold}>Log in</Text>
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const friendlyError = (code) => {
  switch (code) {
    case "auth/email-already-in-use":
      return "That email is already in use.";
    case "auth/invalid-email":
      return "Please enter a valid email.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    default:
      return "Something went wrong. Please try again.";
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#081C15",
  },
  inner: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 48,
  },
  title: {
    fontSize: 36,
    fontFamily: "DMSerifDisplay_400Regular",
    color: "#D8F3DC",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: "#74C69D",
    marginBottom: 36,
  },
  input: {
    backgroundColor: "#0D2319",
    color: "#D8F3DC",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#1B4332",
  },
  button: {
    backgroundColor: "#52B788",
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#081C15",
    fontSize: 16,
    fontWeight: "700",
  },
  error: {
    color: "#EF4444",
    fontSize: 13,
    marginBottom: 10,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#1B4332",
  },
  dividerText: {
    color: "#2D6A4F",
    marginHorizontal: 12,
    fontSize: 13,
  },
  googleButton: {
    backgroundColor: "transparent",
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2D6A4F",
  },
  googleButtonText: {
    color: "#95D5B2",
    fontSize: 16,
    fontWeight: "600",
  },
  loginLink: {
    color: "#74C69D",
    textAlign: "center",
    marginTop: 24,
    fontSize: 14,
  },
  loginLinkBold: {
    color: "#52B788",
    fontWeight: "600",
  },
});

export default Signup;
