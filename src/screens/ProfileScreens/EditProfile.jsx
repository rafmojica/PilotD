import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { updateProfile } from "firebase/auth";
import { doc, updateDoc, getDoc, collection, getDocs, query, where, limit } from "firebase/firestore";
import { auth, db } from "../../config/firebase";
import { useFocusEffect } from "@react-navigation/native";
import InitialsAvatar from "../../components/InitialsAvatar";
import Svg, { Path, Circle } from "react-native-svg";

const TVMAZE = "https://api.tvmaze.com";

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

const ALL_TAGS = [
  "Acting", "Writing", "Cinematography", "Costume Design",
  "Set Design", "Screenplay", "Score", "Direction", "Pacing", "Dialogue",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const Field = ({ label, value, onChangeText, placeholder, multiline, disabled, hint }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      style={[
        styles.fieldInput,
        multiline && styles.fieldInputMulti,
        disabled && styles.fieldInputDisabled,
      ]}
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

// ─── Show Search Modal ────────────────────────────────────────────────────────

const ShowSearchModal = ({ visible, onClose, onSelect }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const search = async (text) => {
    setQuery(text);
    if (!text.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const data = await fetch(
        `${TVMAZE}/search/shows?q=${encodeURIComponent(text.trim())}`,
      ).then((r) => r.json());
      setResults(Array.isArray(data) ? data.slice(0, 8) : []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.searchModalBackdrop}>
        <View style={styles.searchModalSheet}>
          <View style={styles.searchModalHeader}>
            <Text style={styles.searchModalTitle}>Choose a Show</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.searchModalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchModalBar}>
            <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round">
              <Circle cx="11" cy="11" r="8" />
              <Path d="m21 21-4.35-4.35" />
            </Svg>
            <TextInput
              style={styles.searchModalInput}
              placeholder="Search shows…"
              placeholderTextColor={C.muted}
              value={query}
              onChangeText={search}
              autoFocus
              autoCorrect={false}
            />
            {searching && <ActivityIndicator size="small" color={C.accent} />}
          </View>

          <FlatList
            data={results}
            keyExtractor={(item) => String(item.show.id)}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const show = item.show;
              return (
                <TouchableOpacity
                  style={styles.searchResultRow}
                  activeOpacity={0.75}
                  onPress={() => {
                    onSelect({
                      showId: show.id,
                      showName: show.name,
                      posterUri: show.image?.medium ?? null,
                    });
                    onClose();
                    setQuery("");
                    setResults([]);
                  }}
                >
                  {show.image?.medium ? (
                    <Image
                      source={{ uri: show.image.medium }}
                      style={styles.searchResultThumb}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.searchResultThumb, { backgroundColor: C.card, justifyContent: "center", alignItems: "center" }]}>
                      <Text style={{ fontSize: 11, color: C.accent }}>
                        {show.name.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.searchResultInfo}>
                    <Text style={styles.searchResultName} numberOfLines={1}>{show.name}</Text>
                    <Text style={styles.searchResultMeta} numberOfLines={1}>
                      {[show.genres?.[0], show.premiered?.slice(0, 4)].filter(Boolean).join(" · ")}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              query.length > 0 && !searching ? (
                <Text style={styles.searchEmpty}>No shows found</Text>
              ) : null
            }
          />
        </View>
      </View>
    </Modal>
  );
};

// ─── Favorite Show Editor ─────────────────────────────────────────────────────

const FavoriteShowEditor = ({ favShow, onChangeFavShow }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);

  const updateField = (key, value) => onChangeFavShow({ ...favShow, [key]: value });

  const toggleTag = (tag) => {
    const current = favShow.tags ?? [];
    if (current.includes(tag)) {
      updateField("tags", current.filter((t) => t !== tag));
    } else if (current.length < 3) {
      updateField("tags", [...current, tag]);
    }
  };

  const activeTags = favShow.tags ?? [];

  return (
    <View style={styles.favSection}>
      <Text style={styles.fieldLabel}>Favorite Show</Text>

      <View style={styles.favCard}>
        {/* Poster */}
        <TouchableOpacity style={styles.favPoster} onPress={() => setShowPicker(true)} activeOpacity={0.8}>
          {favShow.posterUri ? (
            <Image source={{ uri: favShow.posterUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={styles.favPosterPlaceholder}>
              {favShow.showName ? (
                <Text style={styles.favPosterInitials}>
                  {favShow.showName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                </Text>
              ) : (
                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round">
                  <Circle cx="11" cy="11" r="8" />
                  <Path d="m21 21-4.35-4.35" />
                </Svg>
              )}
            </View>
          )}
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.favInfo}>
          {favShow.showName ? (
            <Text style={styles.favTitle} numberOfLines={2}>{favShow.showName}</Text>
          ) : (
            <Text style={styles.favTitlePlaceholder}>No show selected</Text>
          )}

          {/* One-liner */}
          <View style={styles.favOneLinerRow}>
            <Svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#40916C" strokeWidth="2" strokeLinecap="round">
              <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </Svg>
            <TextInput
              style={styles.favOneLinerInput}
              value={favShow.oneLiner ?? ""}
              onChangeText={(v) => updateField("oneLiner", v)}
              placeholder="One sentence about this show…"
              placeholderTextColor={C.muted}
              multiline
              autoCorrect={false}
            />
          </View>

          {/* Tags */}
          <View style={styles.favTags}>
            {activeTags.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={styles.favTagActive}
                onPress={() => toggleTag(tag)}
              >
                <Text style={styles.favTagActiveText}>{tag}</Text>
                <Text style={styles.favTagRemove}>×</Text>
              </TouchableOpacity>
            ))}
            {activeTags.length < 3 && (
              <TouchableOpacity
                style={styles.favTagAdd}
                onPress={() => setShowTagPicker((v) => !v)}
              >
                <Text style={styles.favTagAddText}>+ Tags</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Tag picker */}
          {showTagPicker && (
            <View style={styles.tagPickerWrap}>
              <View style={styles.tagPickerDivider} />
              <Text style={styles.tagPickerLabel}>Pick up to 3 tags</Text>
              <View style={styles.tagPickerGrid}>
                {ALL_TAGS.map((tag) => {
                  const isActive = activeTags.includes(tag);
                  const isDisabled = !isActive && activeTags.length >= 3;
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.tagPickerChip, isActive && styles.tagPickerChipActive, isDisabled && { opacity: 0.4 }]}
                      onPress={() => !isDisabled && toggleTag(tag)}
                      activeOpacity={isDisabled ? 1 : 0.7}
                    >
                      <Text style={[styles.tagPickerChipText, isActive && styles.tagPickerChipTextActive]}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Change show link */}
          <TouchableOpacity
            style={styles.changeShowBtn}
            onPress={() => setShowPicker(true)}
          >
            <Svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round">
              <Circle cx="11" cy="11" r="8" />
              <Path d="m21 21-4.35-4.35" />
            </Svg>
            <Text style={styles.changeShowText}>Change show</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ShowSearchModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={(picked) =>
          onChangeFavShow({ ...favShow, showId: picked.showId, showName: picked.showName, posterUri: picked.posterUri })
        }
      />
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const EditProfile = ({ navigation }) => {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [photoURL, setPhotoURL] = useState(null);
  const [pendingPhotoUri, setPendingPhotoUri] = useState(null);
  const [favShow, setFavShow] = useState({ showId: null, showName: "", posterUri: null, oneLiner: "", tags: [] });
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

        const resolvedPhoto = d.photoURL ?? auth.currentUser?.photoURL ?? null;
        setPhotoURL(resolvedPhoto);
        setPendingPhotoUri(null);

        if (!d.photoURL && auth.currentUser?.photoURL) {
          updateDoc(doc(db, "users", uid), { photoURL: auth.currentUser.photoURL });
        }

        if (d.favoriteShow) {
          setFavShow({
            showId: d.favoriteShow.showId ?? null,
            showName: d.favoriteShow.showName ?? "",
            posterUri: d.favoriteShow.posterUri ?? null,
            oneLiner: d.favoriteShow.oneLiner ?? "",
            tags: d.favoriteShow.tags ?? [],
          });
        }
      });
    }, []),
  );

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo library access to change your profile photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPendingPhotoUri(result.assets[0].uri);
    }
  };

  const uploadPhoto = async (uid, localUri) => {
    const response = await fetch(localUri);
    const blob = await response.blob();
    const formData = new FormData();
    formData.append("file", blob, `avatar_${uid}.jpg`);
    formData.append("public_id", `avatars/${uid}_${Date.now()}`);
    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/dyrhenmlt/image/upload?upload_preset=pilotd_profile_photos`,
      { method: "POST", body: formData, headers: { Accept: "application/json" } },
    );
    const data = await uploadResponse.json();
    if (!data.secure_url) throw new Error(data.error?.message || "Upload failed");
    return data.secure_url;
  };

  const backfillReviewDisplayNames = async (uid, newDisplayName) => {
    try {
      const diarySnap = await getDocs(collection(db, "users", uid, "diary"));
      const showIds = [...new Set(diarySnap.docs.map((d) => d.data().showId).filter(Boolean))];
      await Promise.allSettled(
        showIds.map(async (showId) => {
          const snap = await getDocs(
            query(collection(db, "shows", String(showId), "reviews"), where("uid", "==", uid), limit(1))
          );
          if (!snap.empty) {
            await updateDoc(snap.docs[0].ref, { displayName: newDisplayName });
          }
        })
      );
    } catch (err) {
      console.error("[EditProfile] backfill error:", err);
    }
  };

  const handleSave = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const trimmedName = displayName.trim();
    if (!trimmedName) { Alert.alert("Display name can't be empty."); return; }
    setSaving(true);
    try {
      let newPhotoURL = photoURL;
      if (pendingPhotoUri) newPhotoURL = await uploadPhoto(uid, pendingPhotoUri);

      const favShowData = favShow.showName
        ? {
            showId: favShow.showId ?? null,
            showName: favShow.showName,
            posterUri: favShow.posterUri ?? null,
            oneLiner: favShow.oneLiner?.trim() ?? "",
            tags: favShow.tags ?? [],
          }
        : null;

      const originalName = auth.currentUser.displayName;
      await Promise.all([
        updateProfile(auth.currentUser, {
          displayName: trimmedName,
          ...(newPhotoURL ? { photoURL: newPhotoURL } : {}),
        }),
        updateDoc(doc(db, "users", uid), {
          displayName: trimmedName,
          bio: bio.trim(),
          location: location.trim(),
          pronouns: pronouns.trim(),
          ...(newPhotoURL ? { photoURL: newPhotoURL } : {}),
          ...(favShowData !== null ? { favoriteShow: favShowData } : {}),
        }),
      ]);
      if (trimmedName !== originalName) {
        await backfillReviewDisplayNames(uid, trimmedName);
      }
      navigation.goBack();
    } catch {
      Alert.alert("Error", "Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const avatarUri = pendingPhotoUri ?? photoURL;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backChevron}>‹</Text>
          <Text style={styles.backLabel}>Profile</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={handleSave} disabled={saving}>
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
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.8} style={styles.avatarWrap}>
              <InitialsAvatar
                name={displayName || "?"}
                photoURL={avatarUri}
                size={90}
                style={{ borderWidth: 2.5, borderColor: C.accent }}
              />
              <View style={styles.cameraBadge}>
                <Text style={styles.cameraEmoji}>📷</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.7} style={styles.changePhotoBtn}>
              <Text style={styles.changePhotoText}>
                {pendingPhotoUri ? "Photo selected ✓" : "Change Photo"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Fields */}
          <View style={styles.form}>
            <Field label="Display Name" value={displayName} onChangeText={setDisplayName} placeholder="Your name" />
            <Field
              label="Username"
              value={`@${username}`}
              placeholder="@username"
              disabled
              hint="Username can only be changed once every 6 months."
            />
            <Field label="Bio" value={bio} onChangeText={setBio} placeholder="Tell people a bit about yourself…" multiline />
            <Field label="Location" value={location} onChangeText={setLocation} placeholder="City, Country" />
            <Field label="Pronouns" value={pronouns} onChangeText={setPronouns} placeholder="e.g. they/them" />
          </View>

          {/* ── Favorite Show ── */}
          <View style={styles.favSectionWrap}>
            <FavoriteShowEditor favShow={favShow} onChangeFavShow={setFavShow} />
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

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  title: { fontFamily: "DMSerifDisplay_400Regular", fontSize: 18, color: C.text },
  saveBtn: { width: 80, alignItems: "flex-end" },
  saveBtnText: { fontSize: 14, color: C.accent, fontWeight: "600" },

  scroll: { paddingBottom: 24 },

  avatarSection: { alignItems: "center", paddingVertical: 28, gap: 12 },
  avatarWrap: { position: "relative" },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  cameraEmoji: { fontSize: 13 },
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
  fieldInputMulti: { minHeight: 90, textAlignVertical: "top" },
  fieldInputDisabled: { color: C.muted },
  fieldHint: { fontSize: 11, color: C.muted, lineHeight: 16, marginTop: 2 },

  // Favorite Show section
  favSectionWrap: { paddingHorizontal: 20, marginTop: 24 },
  favSection: { gap: 8 },
  favCard: {
    backgroundColor: "#0d2b1d",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(45,106,79,0.3)",
    flexDirection: "row",
    gap: 12,
  },
  favPoster: {
    width: 66,
    alignSelf: "stretch",
    minHeight: 96,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(45,106,79,0.3)",
    overflow: "hidden",
    backgroundColor: C.card,
  },
  favPosterPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a2218",
  },
  favPosterInitials: {
    fontFamily: "DMSerifDisplay_400Regular",
    fontSize: 22,
    color: "#52B788",
    opacity: 0.7,
  },
  favInfo: { flex: 1, gap: 8 },
  favTitle: {
    fontFamily: "DMSerifDisplay_400Regular",
    fontSize: 15,
    color: C.text,
    lineHeight: 20,
  },
  favTitlePlaceholder: {
    fontSize: 14,
    color: C.muted,
    fontStyle: "italic",
  },
  favOneLinerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#081C15",
    borderRadius: 7,
    padding: 7,
  },
  favOneLinerInput: {
    flex: 1,
    fontSize: 12,
    color: "#95D5B2",
    fontStyle: "italic",
    paddingTop: 0,
    paddingBottom: 0,
    lineHeight: 17,
  },
  favTags: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  favTagActive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: "rgba(82,183,136,0.15)",
    borderWidth: 1,
    borderColor: "#52B788",
  },
  favTagActiveText: { fontSize: 10, fontWeight: "500", color: "#52B788" },
  favTagRemove: { fontSize: 11, color: "#52B788", opacity: 0.7 },
  favTagAdd: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.muted,
    borderStyle: "dashed",
  },
  favTagAddText: { fontSize: 10, fontWeight: "500", color: C.muted },

  // Tag picker
  tagPickerWrap: { gap: 8 },
  tagPickerDivider: {
    height: 1,
    backgroundColor: "rgba(45,106,79,0.2)",
    marginVertical: 4,
  },
  tagPickerLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tagPickerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tagPickerChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(45,106,79,0.4)",
  },
  tagPickerChipActive: {
    backgroundColor: "rgba(82,183,136,0.15)",
    borderColor: "#52B788",
  },
  tagPickerChipText: { fontSize: 11, color: "#95D5B2", fontWeight: "500" },
  tagPickerChipTextActive: { color: "#52B788" },

  changeShowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
  },
  changeShowText: { fontSize: 11, color: C.muted },

  // Show search modal
  searchModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  searchModalSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingBottom: 20,
  },
  searchModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(45,106,79,0.2)",
  },
  searchModalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
    fontFamily: "DMSerifDisplay_400Regular",
  },
  searchModalClose: { fontSize: 16, color: C.subtext, fontWeight: "600", paddingHorizontal: 4 },
  searchModalBar: {
    flexDirection: "row",
    alignItems: "center",
    margin: 14,
    backgroundColor: "#0d2b1d",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(45,106,79,0.35)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchModalInput: { flex: 1, color: C.text, fontSize: 14 },
  searchResultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(45,106,79,0.12)",
  },
  searchResultThumb: {
    width: 40,
    height: 58,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: C.card,
  },
  searchResultInfo: { flex: 1 },
  searchResultName: { fontSize: 14, fontWeight: "500", color: C.text, marginBottom: 3 },
  searchResultMeta: { fontSize: 12, color: C.subtext },
  searchEmpty: {
    textAlign: "center",
    padding: 24,
    fontSize: 13,
    color: C.muted,
    fontStyle: "italic",
  },

  saveFullBtn: {
    marginHorizontal: 20,
    marginTop: 28,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.accent,
    alignItems: "center",
  },
  saveFullBtnText: { fontSize: 15, fontWeight: "700", color: "#081C15" },
});
