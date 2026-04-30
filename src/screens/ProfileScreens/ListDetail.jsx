import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, FlatList,
  TouchableOpacity, Image, ActivityIndicator, SafeAreaView,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from "react-native";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../config/firebase";

const TVMAZE = "https://api.tvmaze.com";

const C = {
  bg: "#081C15", surface: "#0D2319", card: "#1B4332",
  accent: "#52B788", accentSoft: "#52B78822", text: "#D8F3DC",
  subtext: "#74C69D", muted: "#2D6A4F", border: "#1B4332", border2: "#2D6A4F",
};

// ─── Add Show Modal ───────────────────────────────────────────────────────────

const AddShowModal = ({ visible, onClose, listShowIds, onToggle }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${TVMAZE}/search/shows?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data.map((d) => d.show));
      } catch (err) {
        console.error("[ListDetail] search error:", err);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const handleClose = () => {
    setQuery("");
    setResults([]);
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableOpacity style={modalStyles.backdrop} onPress={handleClose} activeOpacity={1}>
          <TouchableOpacity activeOpacity={1} style={modalStyles.sheet}>
            <View style={modalStyles.handle} />
            <Text style={modalStyles.title}>Add Show</Text>

            <TextInput
              style={modalStyles.input}
              placeholder="Search for a show…"
              placeholderTextColor={C.muted}
              value={query}
              onChangeText={setQuery}
              autoFocus
              returnKeyType="search"
            />

            {searching && (
              <ActivityIndicator color={C.accent} style={{ marginTop: 16 }} />
            )}

            {!searching && results.length === 0 && query.trim().length > 0 && (
              <Text style={modalStyles.empty}>No results found.</Text>
            )}

            <FlatList
              data={results}
              keyExtractor={(item) => String(item.id)}
              style={{ marginTop: 10 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const inList = listShowIds.includes(item.id);
                return (
                  <TouchableOpacity
                    style={modalStyles.resultRow}
                    onPress={() => onToggle(item.id, item)}
                    activeOpacity={0.75}
                  >
                    {item.image?.medium ? (
                      <Image source={{ uri: item.image.medium }} style={modalStyles.poster} resizeMode="cover" />
                    ) : (
                      <View style={[modalStyles.poster, modalStyles.posterPlaceholder]}>
                        <Text style={{ fontSize: 16 }}>📺</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={modalStyles.resultName} numberOfLines={1}>{item.name}</Text>
                      <Text style={modalStyles.resultMeta}>
                        {item.premiered?.slice(0, 4)}
                        {item.network?.name ? `  ·  ${item.network.name}` : ""}
                      </Text>
                    </View>
                    <View style={[modalStyles.addBtn, inList && modalStyles.addBtnAdded]}>
                      <Text style={[modalStyles.addBtnText, inList && modalStyles.addBtnTextAdded]}>
                        {inList ? "✓" : "+"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Main screen ──────────────────────────────────────────────────────────────

const ListDetail = ({ route, navigation }) => {
  const { listId, listTitle } = route?.params ?? {};
  const [list, setList] = useState(null);
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const snap = await getDoc(doc(db, "lists", listId));
      if (!snap.exists()) return;
      const data = { id: snap.id, ...snap.data() };
      setList(data);

      const results = await Promise.allSettled(
        (data.showIds ?? []).map((id) =>
          fetch(`${TVMAZE}/shows/${id}`).then((r) => r.json())
        )
      );
      setShows(results.filter((r) => r.status === "fulfilled").map((r) => r.value));
    } catch (err) {
      console.error("[ListDetail] error:", err);
    } finally {
      setLoading(false);
    }
  }, [listId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const toggleShow = async (showId, showData) => {
    const currentIds = list?.showIds ?? [];
    const inList = currentIds.includes(showId);
    const newIds = inList
      ? currentIds.filter((id) => id !== showId)
      : [...currentIds, showId];

    setList((prev) => ({ ...prev, showIds: newIds }));
    if (inList) {
      setShows((prev) => prev.filter((s) => s.id !== showId));
    } else if (showData) {
      setShows((prev) => [...prev, showData]);
    }

    await updateDoc(doc(db, "lists", listId), {
      showIds: newIds,
      updatedAt: serverTimestamp(),
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator size="large" color={C.accent} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const listShowIds = list?.showIds ?? [];

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addShowBtn} onPress={() => setShowAddModal(true)}>
          <Text style={styles.addShowBtnText}>＋ Add Show</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{list?.title}</Text>
        {list?.description ? (
          <Text style={styles.desc}>{list.description}</Text>
        ) : null}
        <Text style={styles.count}>{shows.length} show{shows.length !== 1 ? "s" : ""}</Text>

        {shows.length === 0 && (
          <Text style={styles.empty}>No shows yet — tap "＋ Add Show" to get started.</Text>
        )}

        {shows.map((show) => (
          <TouchableOpacity
            key={show.id}
            style={styles.showRow}
            onPress={() => navigation.navigate("ShowCard", { showId: show.id })}
            activeOpacity={0.78}
          >
            {show.image?.medium ? (
              <Image source={{ uri: show.image.medium }} style={styles.poster} resizeMode="cover" />
            ) : (
              <View style={[styles.poster, styles.posterPlaceholder]}>
                <Text style={{ fontSize: 20 }}>📺</Text>
              </View>
            )}
            <View style={styles.showInfo}>
              <Text style={styles.showName}>{show.name}</Text>
              <Text style={styles.showMeta}>
                {show.premiered?.slice(0, 4)}
                {show.network?.name ? `  ·  ${show.network.name}` : ""}
              </Text>
              {show.genres?.length > 0 && (
                <Text style={styles.showMeta}>{show.genres.slice(0, 2).join(", ")}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => toggleShow(show.id, null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.removeBtnText}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <AddShowModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        listShowIds={listShowIds}
        onToggle={toggleShow}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 48, paddingTop: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtn: { paddingVertical: 4 },
  backText: { color: C.accent, fontSize: 15, fontWeight: "600" },
  addShowBtn: {
    backgroundColor: C.accent,
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addShowBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  title: { fontSize: 26, fontWeight: "800", color: C.text, paddingHorizontal: 16, marginBottom: 4 },
  desc: { fontSize: 13, color: C.subtext, paddingHorizontal: 16, marginBottom: 8, lineHeight: 19 },
  count: { fontSize: 11, color: C.muted, paddingHorizontal: 16, marginBottom: 16, textTransform: "uppercase", letterSpacing: 0.8 },
  empty: { fontSize: 14, color: C.muted, textAlign: "center", marginTop: 40, fontStyle: "italic", paddingHorizontal: 32 },
  showRow: {
    flexDirection: "row", alignItems: "center", marginHorizontal: 16,
    marginBottom: 10, backgroundColor: C.surface, borderRadius: 12,
    padding: 10, gap: 12, borderWidth: 1, borderColor: C.border,
  },
  poster: { width: 52, height: 76, borderRadius: 7, backgroundColor: C.card },
  posterPlaceholder: { justifyContent: "center", alignItems: "center" },
  showInfo: { flex: 1 },
  showName: { fontSize: 14, fontWeight: "700", color: C.text },
  showMeta: { fontSize: 12, color: C.subtext, marginTop: 2 },
  removeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.card, justifyContent: "center", alignItems: "center",
  },
  removeBtnText: { fontSize: 11, color: C.muted, fontWeight: "700" },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36,
    maxHeight: "85%",
    borderTopWidth: 1, borderColor: C.border2,
  },
  handle: {
    width: 36, height: 4, backgroundColor: C.muted,
    borderRadius: 2, alignSelf: "center", marginBottom: 16,
  },
  title: { fontSize: 16, fontWeight: "800", color: C.text, marginBottom: 12 },
  input: {
    backgroundColor: C.card, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    color: C.text, fontSize: 14,
    borderWidth: 1, borderColor: C.border2,
  },
  empty: { color: C.muted, fontSize: 13, fontStyle: "italic", textAlign: "center", marginTop: 20 },
  resultRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  poster: { width: 40, height: 58, borderRadius: 6, backgroundColor: C.card },
  posterPlaceholder: { justifyContent: "center", alignItems: "center" },
  resultName: { fontSize: 14, fontWeight: "700", color: C.text },
  resultMeta: { fontSize: 11, color: C.subtext, marginTop: 2 },
  addBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border2,
    justifyContent: "center", alignItems: "center",
  },
  addBtnAdded: { backgroundColor: C.accentSoft, borderColor: C.accent + "60" },
  addBtnText: { fontSize: 16, color: C.muted, fontWeight: "700", lineHeight: 20 },
  addBtnTextAdded: { color: C.accent },
});

export default ListDetail;
