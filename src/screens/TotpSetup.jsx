import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { TOTP, Secret } from "otpauth";
import { doc, updateDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";

const C = {
  bg: "#081C15",
  surface: "#0D2319",
  accent: "#52B788",
  text: "#D8F3DC",
  subtext: "#74C69D",
  muted: "#2D6A4F",
  border: "#1B4332",
};

const TotpSetup = ({ navigation }) => {
  const [secret, setSecret] = useState("");
  const [uri, setUri] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const totp = new TOTP({
      issuer: "PilotD",
      label: auth.currentUser?.email ?? "user",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
    });
    setSecret(totp.secret.base32);
    setUri(totp.toString());
  }, []);

  const handleEnable = async () => {
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setLoading(true);
    setError("");

    const totp = new TOTP({
      secret: Secret.fromBase32(secret),
      digits: 6,
      period: 30,
    });
    const delta = totp.validate({ token: code, window: 1 });

    if (delta === null) {
      setError("Invalid code. Make sure your device clock is correct.");
      setLoading(false);
      return;
    }

    try {
      const uid = auth.currentUser.uid;
      await updateDoc(doc(db, "users", uid), { totpEnabled: true });
      await setDoc(doc(db, "private", uid), { totpSecret: secret });
      navigation.goBack();
    } catch (err) {
      console.error(err);
      setError("Failed to save. Please try again.");
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Set Up Two-Factor Auth</Text>
        <Text style={styles.subtitle}>
          Scan this QR code with Google Authenticator, then enter the 6-digit code to confirm.
        </Text>

        {uri ? (
          <View style={styles.qrContainer}>
            <QRCode value={uri} size={200} backgroundColor="#fff" />
          </View>
        ) : null}

        <Text style={styles.manualLabel}>Can't scan? Enter this key manually:</Text>
        <Text style={styles.secretText} selectable>{secret}</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter 6-digit code"
          placeholderTextColor={C.muted}
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
          keyboardType="numeric"
          maxLength={6}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleEnable}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Enable Two-Factor Auth</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: C.text,
    marginBottom: 10,
    alignSelf: "flex-start",
  },
  subtitle: {
    fontSize: 14,
    color: C.subtext,
    lineHeight: 21,
    marginBottom: 32,
    alignSelf: "flex-start",
  },
  qrContainer: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  manualLabel: {
    fontSize: 12,
    color: C.muted,
    marginBottom: 6,
    alignSelf: "flex-start",
  },
  secretText: {
    fontSize: 13,
    color: C.subtext,
    letterSpacing: 1.5,
    marginBottom: 28,
    alignSelf: "flex-start",
  },
  input: {
    width: "100%",
    backgroundColor: C.surface,
    color: C.text,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 22,
    letterSpacing: 8,
    textAlign: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  error: { color: "#EF4444", fontSize: 13, marginBottom: 10, alignSelf: "flex-start" },
  button: {
    width: "100%",
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});

export default TotpSetup;
