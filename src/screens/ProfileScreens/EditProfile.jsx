import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { updateProfile } from "firebase/auth";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../../config/firebase";
import { useFocusEffect } from "@react-navigation/native";
import InitialsAvatar from "../../components/InitialsAvatar";

const C = {
  bg: "#081C15",
  surface: "#0D2319",
  card: "#1B4332",
  accent: "#52B788",
  text: "#D8F3DC",
  subtext: "#74C69D",
  muted: "#2D6A4F",
  border: "rgba(45,106,79,0.18)",
  placeholder: "#2D6A4F",
};

const Field = ({ label, value, onChangeText, placeholder, multiline, disabled, hint }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      style={[styles.fieldInput, multiline && styles.fieldInputMulti, disabled && styles.fieldInputDisabled]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={C.placeholder}
      multiline={multiline}
      editable={!disabled}
      autoCorrect={false}
      autoCapitalize="none"
    />
    {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
  </View>
);

const EditProfile = ({ navigation }) => {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      getDoc(doc(db, "users", uid)).then((snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        setDisplayName(d.displayName ?? "");
        setUsername(d.username ?? "");
        setBio(d.bio ?? "");
        setLocation(d.location ?? "");
        setPronouns(d.pronouns ?? "");
      });
    }, [])
  );

  const handleSave = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      Alert.alert("Display name can't be empty.");
      return;
    }
    setSaving(true);
    try {
      await Promise.all([
        updateProfile(auth.currentUser, { displayName: trimmedName }),
        updateDoc(doc(db, "users", uid), {
          displayName: trimmedName,
          bio: bio.trim(),
          location: location.trim(),
          pronouns: pronouns.trim(),
        }),
      ]);
      navigation.goBack();
    } catch {
      Alert.alert("Error", "Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backChevron}>‹</Text>
          <Text style={styles.backLabel}>Profile</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={C.accent} />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          <View style={styles.avatarSection}>
            <InitialsAvatar
              name={displayName || "?"}
              size={80}
              style={{ borderWidth: 2.5, borderColor: C.accent }}
            />
            <TouchableOpacity style={styles.changePhotoBtn} activeOpacity={0.7}>
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <Field
              label="Display Name"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
            />
            <Field
              label="Username"
              value={`@${username}`}
              placeholder="@username"
              disabled
              hint="Username can only be changed once every 6 months."
            />
            <Field
              label="Bio"
              value={bio}
              onChangeText={setBio}
              placeholder="Tell people a bit about yourself…"
              multiline
            />
            <Field
              label="Location"
              value={location}
              onChangeText={setLocation}
              placeholder="City, Country"
            />
            <Field
              label="Pronouns"
              value={pronouns}
              onChangeText={setPronouns}
              placeholder="e.g. they/them"
            />
          </View>

          <TouchableOpacity
            style={[styles.saveFullBtn, saving && { opacity: 0.5 }]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#081C15" />
            ) : (
              <Text style={styles.saveFullBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default EditProfile;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, width: 80 },
  backChevron: { fontSize: 22, color: C.accent, lineHeight: 26 },
  backLabel: { fontSize: 14, color: C.accent, fontWeight: "500" },
  title: {
    fontFamily: "DMSerifDisplay_400Regular",
    fontSize: 18,
    color: C.text,
  },
  saveBtn: { width: 80, alignItems: "flex-end" },
  saveBtnText: { fontSize: 14, color: C.accent, fontWeight: "600" },

  scroll: { paddingBottom: 24 },

  avatarSection: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 12,
  },
  changePhotoBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.accent,
  },
  changePhotoText: { fontSize: 13, color: C.accent, fontWeight: "500" },

  form: { paddingHorizontal: 20, gap: 20 },

  field: { gap: 6 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  fieldInput: {
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.text,
    fontSize: 15,
  },
  fieldInputMulti: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  fieldInputDisabled: {
    color: C.muted,
  },
  fieldHint: {
    fontSize: 11,
    color: C.muted,
    lineHeight: 16,
    marginTop: 2,
  },

  saveFullBtn: {
    marginHorizontal: 20,
    marginTop: 28,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.accent,
    alignItems: "center",
  },
  saveFullBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#081C15",
  },
});
