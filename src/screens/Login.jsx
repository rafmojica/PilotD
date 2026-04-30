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
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../config/firebase.js";
import { useGoogleAuth } from "../hooks/useGoogleAuth";

const Login = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { request, loading: googleLoading, error: googleError, signInWithGoogle } = useGoogleAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(friendlyError(err.code));
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Welcome back.</Text>
        <Text style={styles.subtitle}>Log in to your account.</Text>

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
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Log In</Text>
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

        <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
          <Text style={styles.signupLink}>
            Don't have an account? <Text style={styles.signupLinkBold}>Sign up</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const friendlyError = (code) => {
  switch (code) {
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/invalid-email":
      return "Please enter a valid email.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again later.";
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
  signupLink: {
    color: "#74C69D",
    textAlign: "center",
    marginTop: 24,
    fontSize: 14,
  },
  signupLinkBold: {
    color: "#52B788",
    fontWeight: "600",
  },
});

export default Login;
