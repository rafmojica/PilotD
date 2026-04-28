import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { TOTP, Secret } from "otpauth";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../config/firebase";

const TotpVerify = ({ onVerified }) => {
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const secondRef = useRef(null);

  const handleVerify = async (code) => {
    setLoading(true);
    setError("");
    try {
      const uid = auth.currentUser.uid;
      const snap = await getDoc(doc(db, "private", uid));
      const { totpSecret } = snap.data();

      const totp = new TOTP({
        secret: Secret.fromBase32(totpSecret),
        digits: 6,
        period: 30,
      });
      const delta = totp.validate({ token: code, window: 1 });

      if (delta !== null) {
        onVerified();
      } else {
        setError("Invalid code. Try again.");
        setFirst("");
        setSecond("");
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const handleFirstChange = (t) => {
    const val = t.replace(/\D/g, "").slice(0, 3);
    setFirst(val);
    if (val.length === 3) secondRef.current?.focus();
  };

  const handleSecondChange = (t) => {
    const val = t.replace(/\D/g, "").slice(0, 3);
    setSecond(val);
    if (val.length === 3) handleVerify(first + val);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Two-Factor Authentication</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code from your Google Authenticator app.
        </Text>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.block}
            placeholder="000"
            placeholderTextColor="#444"
            value={first}
            onChangeText={handleFirstChange}
            keyboardType="numeric"
            maxLength={3}
            textAlign="center"
            autoFocus
            editable={!loading}
          />
          <Text style={styles.separator}>–</Text>
          <TextInput
            ref={secondRef}
            style={styles.block}
            placeholder="000"
            placeholderTextColor="#444"
            value={second}
            onChangeText={handleSecondChange}
            keyboardType="numeric"
            maxLength={3}
            textAlign="center"
            editable={!loading}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, (loading || first.length + second.length < 6) && styles.buttonDisabled]}
          onPress={() => handleVerify(first + second)}
          disabled={loading || first.length + second.length < 6}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => signOut(auth)} style={styles.signOutLink}>
          <Text style={styles.signOutText}>Sign out and use a different account</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f0f" },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    marginBottom: 36,
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    gap: 12,
  },
  block: {
    width: 120,
    backgroundColor: "#1c1c1c",
    color: "#fff",
    borderRadius: 10,
    paddingVertical: 16,
    fontSize: 32,
    letterSpacing: 8,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    textAlign: "center",
  },
  separator: {
    color: "#444",
    fontSize: 28,
    fontWeight: "300",
  },
  error: { color: "#e63946", fontSize: 13, marginBottom: 10 },
  button: {
    backgroundColor: "#e63946",
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  signOutLink: { marginTop: 28, alignItems: "center" },
  signOutText: { color: "#555", fontSize: 13 },
});

export default TotpVerify;
