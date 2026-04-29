import React, { useState, useCallback } from "react";
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
  Modal,
} from "react-native";
import { auth, db } from "../../config/firebase";
import {
  collection,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import Stars from "../../components/Stars";
import { useFocusEffect } from "@react-navigation/native";

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
  heartSoft: "#EF444420",
  danger: "#DC2626",
};

// ─── Filter options ────────────────────────────────────────────────────────────

const FILTER_OPTIONS = ["All", "Liked", "Highest Rated", "Lowest Rated", "Recent"];

// ─── Review Item ──────────────────────────────────────────────────────────────

const ReviewItem = ({ item, onPress, onLongPress }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = item.review && item.review.length > 120;

  return (
    <TouchableOpacity
      style={styles.reviewItem}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
    >
      {/* Poster */}
      {item.posterUri ? (
        <Image
          source={{ uri: item.posterUri }}
          style={styles.poster}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.poster, styles.posterPlaceholder]}>
          <Text style={{ fontSize: 22 }}>📺</Text>
        </View>
      )}

      {/* Content */}
      <View style={styles.reviewContent}>
        {/* Show name + year */}
        <View style={styles.reviewTitleRow}>
          <Text style={styles.showName} numberOfLines={1}>
            {item.showName ?? "Unknown Show"}
          </Text>
          {item.year ? (
            <Text style={styles.yearText}>{item.year}</Text>
          ) : null}
        </View>

        {/* Stars + heart */}
        <View style={styles.reviewMetaRow}>
          <Stars rating={item.rating ?? 0} size={13} />
          {item.liked ? (
            <Text style={styles.heartIcon}>♥</Text>
          ) : null}
        </View>

        {/* Review text */}
        {item.review ? (
          <TouchableOpacity
            onPress={() => setExpanded((p) => !p)}
            activeOpacity={0.7}
          >
            <Text
              style={styles.reviewText}
              numberOfLines={expanded ? undefined : 3}
            >
              {item.review}
            </Text>
            {isLong && (
              <Text style={styles.expandHint}>
                {expanded ? "less" : "more"}
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <Text style={styles.noReviewText}>No written review</Text>
        )}

        {/* Date */}
        {item.watchedDate && (
          <Text style={styles.dateText}>
            {item.watchedDate?.toDate?.().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }) ?? ""}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ─── Delete confirmation modal ────────────────────────────────────────────────

const DeleteModal = ({ visible, onCancel, onConfirm, showName }) => (
  <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
    <View style={styles.modalBackdrop}>
      <View style={styles.deleteSheet}>
        <Text style={styles.deleteTitle}>Delete Review</Text>
        <Text style={styles.deleteBody}>
          Remove your review of{" "}
          <Text style={{ color: C.text, fontWeight: "700" }}>{showName}</Text>?
          {"\n"}This cannot be undone.
        </Text>
        <View style={styles.deleteActions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={onConfirm}>
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyState = ({ activeFilter }) => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyEmoji}>✍️</Text>
    <Text style={styles.emptyTitle}>No reviews yet</Text>
    <Text style={styles.emptySubtitle}>
      {activeFilter !== "All"
        ? `No reviews match "${activeFilter}"`
        : "Rate and review shows to see them here."}
    </Text>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

const Reviews = ({ navigation }) => {
  const [reviews, setReviews] = useState([]);
  const [posters, setPosters] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, showName }

  // ── Fetch diary entries that have a review ──
  const fetchReviews = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setLoading(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, "users", uid, "diary"),
          orderBy("watchedDate", "desc")
        )
      );
      const all = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((e) => e.review); // only entries with written reviews

      setReviews(all);

      // Fetch posters
      const ids = [...new Set(all.map((e) => e.showId).filter(Boolean))];
      const results = await Promise.allSettled(
        ids.map((id) =>
          fetch(`${TVMAZE}/shows/${id}`)
            .then((r) => r.json())
            .then((data) => ({ id, uri: data?.image?.medium ?? null, year: data?.premiered?.slice(0, 4) ?? null }))
        )
      );
      const map = {};
      const yearMap = {};
      results.forEach((r) => {
        if (r.status === "fulfilled") {
          if (r.value.uri) map[r.value.id] = r.value.uri;
          if (r.value.year) yearMap[r.value.id] = r.value.year;
        }
      });
      setPosters({ ...map, _years: yearMap });
    } catch (err) {
      console.error("[Reviews] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchReviews();
    }, [fetchReviews])
  );

  // ── Delete a review ──
  const handleDelete = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !deleteTarget) return;
    try {
      await deleteDoc(doc(db, "users", uid, "diary", deleteTarget.id));
      setReviews((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    } catch (err) {
      console.error("[Reviews] delete error:", err);
    } finally {
      setDeleteTarget(null);
    }
  };

  // ── Filtered list ──
  const filtered = (() => {
    let list = [...reviews];
    if (activeFilter === "Liked") list = list.filter((r) => r.liked);
    if (activeFilter === "Highest Rated") list = list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    if (activeFilter === "Lowest Rated") list = list.sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0));
    // "Recent" and "All" already sorted by watchedDate desc from Firestore
    return list;
  })();

  // ── Loading ──
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>Loading reviews…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation?.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reviews</Text>
        {/* Filter icon placeholder — tap to cycle or could open a sheet */}
        <TouchableOpacity
          style={styles.filterIconBtn}
          onPress={() => {
            // cycle to next filter
            const idx = FILTER_OPTIONS.indexOf(activeFilter);
            setActiveFilter(FILTER_OPTIONS[(idx + 1) % FILTER_OPTIONS.length]);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.filterIcon}>⊟</Text>
        </TouchableOpacity>
      </View>

      {/* ── Filter pills ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterBarContent}
      >
        {FILTER_OPTIONS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterPill, activeFilter === f && styles.filterPillActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text
              style={[styles.filterPillText, activeFilter === f && styles.filterPillTextActive]}
            >
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Count ── */}
      {filtered.length > 0 && (
        <Text style={styles.countText}>
          {filtered.length} review{filtered.length !== 1 ? "s" : ""}
        </Text>
      )}

      {/* ── List ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          filtered.length === 0 && styles.listEmpty,
        ]}
      >
        {filtered.length === 0 ? (
          <EmptyState activeFilter={activeFilter} />
        ) : (
          filtered.map((item, index) => (
            <View key={item.id}>
              <ReviewItem
                item={{
                  ...item,
                  posterUri: posters[item.showId] ?? null,
                  year: posters._years?.[item.showId] ?? null,
                }}
                onPress={() =>
                  navigation?.navigate("ShowCard", { showId: item.showId })
                }
                onLongPress={() =>
                  setDeleteTarget({ id: item.id, showName: item.showName ?? "this show" })
                }
              />
              {index < filtered.length - 1 && <View style={styles.divider} />}
            </View>
          ))
        )}
      </ScrollView>

      {/* ── Delete modal ── */}
      <DeleteModal
        visible={!!deleteTarget}
        showName={deleteTarget?.showName ?? ""}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  loadingScreen: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
  },
  loadingText: { color: C.subtext, fontSize: 14, fontWeight: "500" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: { paddingRight: 12 },
  backText: { fontSize: 28, color: C.text, lineHeight: 32 },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.3,
  },
  filterIconBtn: { padding: 4 },
  filterIcon: { fontSize: 20, color: C.subtext },

  // Filter bar
  filterBar: { flexGrow: 0 },
  filterBarContent: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
    flexDirection: "row",
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border2,
  },
  filterPillActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  filterPillText: {
    fontSize: 12,
    color: C.subtext,
    fontWeight: "600",
  },
  filterPillTextActive: {
    color: "#fff",
  },

  // Count
  countText: {
    fontSize: 11,
    color: C.muted,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    paddingHorizontal: 18,
    marginBottom: 8,
  },

  // List
  list: { paddingBottom: 48 },
  listEmpty: { flex: 1, justifyContent: "center" },

  // Review item
  reviewItem: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
    alignItems: "flex-start",
  },
  poster: {
    width: 66,
    height: 96,
    borderRadius: 8,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border2,
  },
  posterPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  reviewContent: { flex: 1, gap: 5 },
  reviewTitleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    flexWrap: "wrap",
  },
  showName: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text,
    flexShrink: 1,
  },
  yearText: {
    fontSize: 13,
    color: C.muted,
    fontWeight: "500",
  },
  reviewMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heartIcon: {
    fontSize: 13,
    color: C.heart,
  },
  reviewText: {
    fontSize: 13,
    color: C.subtext,
    lineHeight: 19,
  },
  expandHint: {
    fontSize: 11,
    color: C.accent,
    fontWeight: "600",
    marginTop: 2,
  },
  noReviewText: {
    fontSize: 12,
    color: C.muted,
    fontStyle: "italic",
  },
  dateText: {
    fontSize: 11,
    color: C.muted,
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 16,
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: C.muted,
    textAlign: "center",
    lineHeight: 20,
  },

  // Delete modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteSheet: {
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 24,
    marginHorizontal: 32,
    borderWidth: 1,
    borderColor: C.border2,
    gap: 12,
    alignItems: "center",
  },
  deleteTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: C.text,
  },
  deleteBody: {
    fontSize: 14,
    color: C.subtext,
    textAlign: "center",
    lineHeight: 20,
  },
  deleteActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    width: "100%",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border2,
    alignItems: "center",
  },
  cancelBtnText: { color: C.subtext, fontWeight: "600" },
  deleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: C.danger,
    alignItems: "center",
  },
  deleteBtnText: { color: "#fff", fontWeight: "700" },
});

export default Reviews;