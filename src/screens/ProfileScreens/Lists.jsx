import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  TextInput,
  Modal,
  FlatList,
} from "react-native";
import { collection, getDocs, addDoc, serverTimestamp, query, where } from "firebase/firestore";
import { db, auth } from "../../config/firebase";

// ─── Constants ────────────────────────────────────────────────────────────────

const TVMAZE = "https://api.tvmaze.com";

const C = {
  bg: "#081C15",
  surface: "#0D2319",
  card: "#1B4332",
  accent: "#52B788",
  accentSoft: "#52B78822",
  gold: "#F59E0B",
  text: "#D8F3DC",
  subtext: "#74C69D",
  muted: "#2D6A4F",
  border: "#1B4332",
  border2: "#2D6A4F",
  heart: "#EF4444",
};

// ─── Filter options ───────────────────────────────────────────────────────────

const FILTER_OPTIONS = [
  { key: "lastUpdated",    label: "Last Updated" },
  { key: "listName",       label: "List Name (A–Z)" },
  { key: "firstPublished", label: "First Published" },
  { key: "lastPublished",  label: "Last Published" },
  { key: "firstCreated",   label: "First Created" },
  { key: "lastCreated",    label: "Last Created" },
  { key: "popularity",     label: "Most Popular" },
];

// ─── Sorting logic ────────────────────────────────────────────────────────────

const sortLists = (lists, filterKey) => {
  const nonWatchlist = lists.filter((l) => !l.isWatchlist);
  const sorted = [...nonWatchlist].sort((a, b) => {
    switch (filterKey) {
      case "listName":
        return a.title.localeCompare(b.title);
      case "firstPublished":
        return (a.publishedAt ?? 0) - (b.publishedAt ?? 0);
      case "lastPublished":
        return (b.publishedAt ?? 0) - (a.publishedAt ?? 0);
      case "firstCreated":
        return a.createdAt - b.createdAt;
      case "lastCreated":
        return b.createdAt - a.createdAt;
      case "popularity":
        return b.likes - a.likes;
      case "lastUpdated":
      default:
        return b.updatedAt - a.updatedAt;
    }
  });
  return sorted;
};

// ─── Poster mosaic ────────────────────────────────────────────────────────────

const PosterMosaic = ({ posters, size = 88 }) => {
  const gap = 2;
  const tileSize = (size - gap) / 2;
  const tiles = [...posters, null, null, null, null].slice(0, 4);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        overflow: "hidden",
        flexDirection: "row",
        flexWrap: "wrap",
        gap,
        backgroundColor: C.surface,
      }}
    >
      {tiles.map((uri, i) =>
        uri ? (
          <Image
            key={i}
            source={{ uri }}
            style={{ width: tileSize, height: tileSize }}
            resizeMode="cover"
          />
        ) : (
          <View
            key={i}
            style={{
              width: tileSize,
              height: tileSize,
              backgroundColor: C.muted,
              justifyContent: "center",
              alignItems: "center",
              opacity: 0.4,
            }}
          >
            <Text style={{ fontSize: 14 }}>📺</Text>
          </View>
        )
      )}
    </View>
  );
};

// ─── List card ────────────────────────────────────────────────────────────────

const ListCard = ({ list, posterUris, onPress, onPosterPress }) => {
  const isPrivate = !list.isPublic && !list.isWatchlist;

  return (
    <TouchableOpacity
      style={[styles.listCard, list.isWatchlist && styles.watchlistCard]}
      onPress={onPress}
      activeOpacity={0.78}
    >
      {/* Poster mosaic — tapping individual posters goes to ShowCard */}
      <PosterMosaic posters={posterUris} size={88} />

      <View style={styles.listInfo}>
        <View style={styles.listTitleRow}>
          <Text style={styles.listTitle} numberOfLines={1}>
            {list.title}
          </Text>
          {list.isWatchlist && (
            <View style={styles.pinnedBadge}>
              <Text style={styles.pinnedBadgeText}>Pinned</Text>
            </View>
          )}
          {isPrivate && (
            <View style={styles.privateBadge}>
              <Text style={styles.privateBadgeText}>Private</Text>
            </View>
          )}
        </View>

        {list.description ? (
          <Text style={styles.listDesc} numberOfLines={2}>
            {list.description}
          </Text>
        ) : null}

        <View style={styles.listMeta}>
          <Text style={styles.listMetaText}>
            {list.showIds.length} show{list.showIds.length !== 1 ? "s" : ""}
          </Text>
          {list.likes > 0 && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={[styles.listMetaText, { color: C.heart }]}>
                ♥ {list.likes}
              </Text>
            </>
          )}
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.listMetaText}>
            Updated {list.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </Text>
        </View>
      </View>

      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
};

// ─── Filter modal ─────────────────────────────────────────────────────────────

const FilterModal = ({ visible, activeFilter, onSelect, onClose }) => (
  <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
    <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} activeOpacity={1}>
      <View style={styles.filterSheet}>
        <View style={styles.filterHandle} />
        <Text style={styles.filterTitle}>Sort Lists By</Text>

        {FILTER_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[
              styles.filterRow,
              activeFilter === opt.key && styles.filterRowActive,
            ]}
            onPress={() => { onSelect(opt.key); onClose(); }}
          >
            <Text
              style={[
                styles.filterRowText,
                activeFilter === opt.key && styles.filterRowTextActive,
              ]}
            >
              {opt.label}
            </Text>
            {activeFilter === opt.key && (
              <Text style={styles.filterCheck}>✓</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </TouchableOpacity>
  </Modal>
);

// ─── Create List modal ────────────────────────────────────────────────────────

const CreateListModal = ({ visible, onClose, onCreate }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const handleCreate = () => {
    if (!title.trim()) return;
    // TODO: write new list to Firebase
    // await addDoc(collection(db, "users", uid, "lists"), {
    //   title: title.trim(),
    //   description: description.trim(),
    //   isPublic,
    //   showIds: [],
    //   isWatchlist: false,
    //   createdAt: serverTimestamp(),
    //   updatedAt: serverTimestamp(),
    //   publishedAt: isPublic ? serverTimestamp() : null,
    //   likes: 0,
    // });
    onCreate({ title, description, isPublic });
    setTitle("");
    setDescription("");
    setIsPublic(false);
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} activeOpacity={1}>
        <TouchableOpacity activeOpacity={1} style={styles.createSheet}>
          <View style={styles.filterHandle} />
          <Text style={styles.filterTitle}>New List</Text>

          <Text style={styles.inputLabel}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="List name..."
            placeholderTextColor={C.muted}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.inputLabel}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            placeholder="What's this list about?"
            placeholderTextColor={C.muted}
            multiline
            value={description}
            onChangeText={setDescription}
          />

          {/* Public / Private toggle */}
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setIsPublic((p) => !p)}
          >
            <View>
              <Text style={styles.toggleLabel}>Make Public</Text>
              <Text style={styles.toggleSub}>Others can see and like this list</Text>
            </View>
            <View style={[styles.toggle, isPublic && styles.toggleOn]}>
              <View style={[styles.toggleThumb, isPublic && styles.toggleThumbOn]} />
            </View>
          </TouchableOpacity>

          <View style={styles.createActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createBtn, !title.trim() && styles.createBtnDisabled]}
              disabled={!title.trim()}
              onPress={handleCreate}
            >
              <Text style={styles.createBtnText}>Create List</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// ─── Main screen ──────────────────────────────────────────────────────────────

const Lists = ({ navigation }) => {
  const [posterMap, setPosterMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("lastUpdated");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [lists, setLists] = useState([]);

  // ── Fetch posters for all show IDs across all lists ──
  const fetchAll = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      const snap = await getDocs(
        query(collection(db, "lists"), where("userId", "==", uid))
      );
      const fetched = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate() ?? new Date(),
        updatedAt: d.data().updatedAt?.toDate() ?? new Date(),
        publishedAt: d.data().publishedAt?.toDate() ?? null,
      }));
      setLists(fetched);

      const allIds = [...new Set(fetched.flatMap((l) => l.showIds ?? []))];
      const results = await Promise.allSettled(
        allIds.map((id) =>
          fetch(`${TVMAZE}/shows/${id}`)
            .then((r) => r.json())
            .then((data) => ({ id, uri: data?.image?.medium ?? null }))
        )
      );
      const map = {};
      results.forEach((r) => {
        if (r.status === "fulfilled" && r.value.uri) map[r.value.id] = r.value.uri;
      });
      setPosterMap(map);
    } catch (err) {
      console.error("[Lists] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getPostersForList = (list) =>
    list.showIds.map((id) => posterMap[id]).filter(Boolean);

  // Watchlist is always pinned at top; rest sorted by active filter
  const watchlist = lists.find((l) => l.isWatchlist);
  const sortedLists = sortLists(lists, activeFilter);

  const activeFilterLabel =
    FILTER_OPTIONS.find((o) => o.key === activeFilter)?.label ?? "Sort";

  const handleCreate = async (newList) => {
    const uid = auth.currentUser?.uid;
    console.log("Creating list for uid:", uid, newList);
    if (!uid) return;
    try {
      await addDoc(collection(db, "lists"), {
        userId: uid,
        title: newList.title.trim(),
        description: newList.description?.trim() ?? "",
        isPublic: newList.isPublic,
        isWatchlist: false,
        showIds: [],
        likes: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        publishedAt: newList.isPublic ? serverTimestamp() : null,
      });
      fetchAll();
    } catch (err) {
      console.error("[Lists] create error:", err);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>Loading lists…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <Text style={styles.pageTitle}>My Lists</Text>
          <View style={styles.topActions}>
            {/* Filter button */}
            <TouchableOpacity
              style={styles.filterBtn}
              onPress={() => setShowFilterModal(true)}
            >
              <Text style={styles.filterBtnText}>⇅ {activeFilterLabel}</Text>
            </TouchableOpacity>

            {/* New list button */}
            <TouchableOpacity
              style={styles.newListBtn}
              onPress={() => setShowCreateModal(true)}
            >
              <Text style={styles.newListBtnText}>+ New List</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.listCount}>
          {lists.length} list{lists.length !== 1 ? "s" : ""}
        </Text>

        {/* ── Watchlist (always first) ── */}
        {watchlist && (
          <>
            <ListCard
              list={watchlist}
              posterUris={getPostersForList(watchlist)}
              onPress={() => navigation.navigate("ListDetail", { listId: watchlist.id, listTitle: watchlist.title })}
              onPosterPress={(showId) => {
                navigation.navigate("ShowCard", { showId });
              }}
            />
            {sortedLists.length > 0 && <View style={styles.divider} />}
          </>
        )}

        {/* ── Sorted lists ── */}
        {sortedLists.map((list) => (
          <ListCard
            key={list.id}
            list={list}
            posterUris={getPostersForList(list)}
            onPress={() => navigation.navigate("ListDetail", { listId: list.id, listTitle: list.title })}
            onPosterPress={(showId) => {
              navigation.navigate("ShowCard", { showId });
            }}
          />
        ))}

        {sortedLists.length === 0 && !watchlist && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No lists yet</Text>
            <Text style={styles.emptySubtitle}>
              Create a list to organize your favourite shows
            </Text>
            <TouchableOpacity
              style={styles.newListBtn}
              onPress={() => setShowCreateModal(true)}
            >
              <Text style={styles.newListBtnText}>+ Create your first list</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── Modals ── */}
      <FilterModal
        visible={showFilterModal}
        activeFilter={activeFilter}
        onSelect={setActiveFilter}
        onClose={() => setShowFilterModal(false)}
      />

      <CreateListModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 48 },
  loadingScreen: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
  },
  loadingText: { color: C.subtext, fontSize: 14, fontWeight: "500" },

  // Top bar
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
    gap: 10,
  },
  pageTitle: {
    fontSize: 28,
    fontFamily: "DMSerifDisplay_400Regular",
    color: C.text,
    letterSpacing: -0.4,
  },
  topActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border2,
    backgroundColor: C.surface,
    alignItems: "center",
  },
  filterBtnText: {
    fontSize: 13,
    color: C.subtext,
    fontWeight: "600",
  },
  newListBtn: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: C.accent,
  },
  newListBtnText: {
    fontSize: 13,
    color: "#fff",
    fontWeight: "700",
  },
  listCount: {
    fontSize: 11,
    color: C.muted,
    fontWeight: "500",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    paddingHorizontal: 16,
    marginBottom: 12,
  },

  // List card
  listCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  watchlistCard: {
    borderColor: C.accent + "50",
    backgroundColor: C.accentSoft,
  },
  listInfo: { flex: 1, gap: 4 },
  listTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  listTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text,
    flex: 1,
  },
  pinnedBadge: {
    backgroundColor: C.accent + "30",
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  pinnedBadgeText: {
    fontSize: 10,
    color: C.accent,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  privateBadge: {
    backgroundColor: C.muted + "40",
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  privateBadgeText: {
    fontSize: 10,
    color: C.subtext,
    fontWeight: "600",
  },
  listDesc: {
    fontSize: 12,
    color: C.subtext,
    lineHeight: 17,
  },
  listMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
  },
  listMetaText: {
    fontSize: 11,
    color: C.muted,
    fontWeight: "500",
  },
  metaDot: { fontSize: 11, color: C.muted },
  chevron: { fontSize: 22, color: C.muted, lineHeight: 24 },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 16,
    marginBottom: 10,
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: C.text },
  emptySubtitle: {
    fontSize: 13,
    color: C.subtext,
    textAlign: "center",
    lineHeight: 19,
  },

  // Filter modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  filterSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    gap: 2,
    borderTopWidth: 1,
    borderColor: C.border2,
  },
  filterHandle: {
    width: 36,
    height: 4,
    backgroundColor: C.muted,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: C.text,
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  filterRowActive: { backgroundColor: C.accentSoft },
  filterRowText: { fontSize: 14, color: C.text, fontWeight: "500" },
  filterRowTextActive: { color: C.accent, fontWeight: "700" },
  filterCheck: { fontSize: 16, color: C.accent, fontWeight: "700" },

  // Create list modal
  createSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    gap: 6,
    borderTopWidth: 1,
    borderColor: C.border2,
  },
  inputLabel: {
    fontSize: 12,
    color: C.subtext,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: C.card,
    borderRadius: 10,
    padding: 12,
    color: C.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: C.border2,
  },
  inputMulti: {
    minHeight: 72,
    textAlignVertical: "top",
  },

  // Toggle
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingVertical: 4,
  },
  toggleLabel: { fontSize: 14, color: C.text, fontWeight: "600" },
  toggleSub: { fontSize: 11, color: C.subtext, marginTop: 2 },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.muted,
    justifyContent: "center",
    padding: 3,
  },
  toggleOn: { backgroundColor: C.accent },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  toggleThumbOn: { alignSelf: "flex-end" },

  createActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: C.border2,
    alignItems: "center",
  },
  cancelBtnText: { color: C.subtext, fontWeight: "600", fontSize: 14 },
  createBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 11,
    backgroundColor: C.accent,
    alignItems: "center",
  },
  createBtnDisabled: { opacity: 0.4 },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});

export default Lists;