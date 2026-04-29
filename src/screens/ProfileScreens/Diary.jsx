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
} from "react-native";
import { auth, db } from "../../config/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
} from "firebase/firestore";
import { useFocusEffect } from "@react-navigation/native";
import Svg, { Path } from "react-native-svg";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toDate = (val) => {
  if (!val) return new Date();
  if (val?.toDate) return val.toDate();
  if (val instanceof Date) return val;
  return new Date(val);
};

const groupByMonth = (entries) => {
  const groups = {};
  entries.forEach((entry) => {
    const d = toDate(entry.watchedDate);
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!groups[label]) groups[label] = [];
    groups[label].push(entry);
  });
  return Object.entries(groups).map(([month, entries]) => ({ month, entries }));
};

// ─── Stars ────────────────────────────────────────────────────────────────────

const Stars = ({ rating, size = 12 }) => {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <View style={{ flexDirection: "row", gap: 1 }}>
      {Array(full).fill(null).map((_, i) => (
        <Text key={`f${i}`} style={{ color: C.gold, fontSize: size }}>★</Text>
      ))}
      {half && <Text style={{ color: C.gold, fontSize: size, opacity: 0.6 }}>★</Text>}
      {Array(empty).fill(null).map((_, i) => (
        <Text key={`e${i}`} style={{ color: C.muted, fontSize: size }}>★</Text>
      ))}
    </View>
  );
};

// ─── Entry type label ─────────────────────────────────────────────────────────

const EntryTypeLabel = ({ entry }) => {
  let label = "Show";
  let color = C.accent;
  if (entry.type === "season") {
    label = `S${entry.seasonNumber}`;
    color = C.gold;
  } else if (entry.type === "episode") {
    label = `S${entry.seasonNumber}E${entry.episodeNumber}`;
    color = "#A78BFA";
  }
  return (
    <View style={[styles.typeTag, { backgroundColor: color + "25" }]}>
      <Text style={[styles.typeTagText, { color }]}>{label}</Text>
    </View>
  );
};

// ─── Diary entry row ──────────────────────────────────────────────────────────

const DiaryEntry = ({ entry, posterUri, onPress, onToggleLike }) => {
  const [liked, setLiked] = useState(entry.liked ?? false);
  const date = toDate(entry.watchedDate);

  return (
    <TouchableOpacity style={styles.entryRow} onPress={onPress} activeOpacity={0.78}>
      {/* Date column */}
      <View style={styles.dateCol}>
        <Text style={styles.dateDay}>
          {date.toLocaleDateString("en-US", { day: "numeric" })}
        </Text>
        <Text style={styles.dateMon}>
          {date.toLocaleDateString("en-US", { month: "short" })}
        </Text>
      </View>

      {/* Poster */}
      {posterUri ? (
        <Image source={{ uri: posterUri }} style={styles.poster} resizeMode="cover" />
      ) : (
        <View style={[styles.poster, styles.posterPlaceholder]}>
          <Text style={{ fontSize: 20 }}>📺</Text>
        </View>
      )}

      {/* Info */}
      <View style={styles.entryInfo}>
        <View style={styles.entryTitleRow}>
          <Text style={styles.entryTitle} numberOfLines={1}>
            {entry.showName}
          </Text>
          <EntryTypeLabel entry={entry} />
        </View>

        {entry.type === "episode" && entry.episodeName && (
          <Text style={styles.episodeName} numberOfLines={1}>
            {`"${entry.episodeName}"`}
          </Text>
        )}

        <View style={styles.entryMeta}>
          {entry.rating > 0 && <Stars rating={entry.rating} size={12} />}
          {entry.rewatch && (
            <View style={styles.rewatchBadge}>
              <Text style={styles.rewatchText}>↺ Rewatch</Text>
            </View>
          )}
        </View>

        {entry.review && (
          <Text style={styles.reviewSnippet} numberOfLines={2}>
            {entry.review}
          </Text>
        )}
      </View>

      {/* Like button */}
      <TouchableOpacity
        style={styles.likeBtn}
        onPress={(e) => {
          e.stopPropagation?.();
          const next = !liked;
          setLiked(next);
          onToggleLike?.(next);
        }}
      >
        <Text style={[styles.likeIcon, { color: liked ? C.heart : C.muted }]}>
          {liked ? "♥" : "♡"}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

// ─── Month group header ───────────────────────────────────────────────────────

const MonthHeader = ({ month, count }) => (
  <View style={styles.monthHeader}>
    <Text style={styles.monthLabel}>{month}</Text>
    <Text style={styles.monthCount}>{count} {count === 1 ? "entry" : "entries"}</Text>
  </View>
);

// ─── Main screen ──────────────────────────────────────────────────────────────

const Diary = ({ navigation }) => {
  const [entries, setEntries] = useState([]);
  const [posterMap, setPosterMap] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchDiary = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }

    try {
      const snap = await getDocs(
        query(
          collection(db, "users", uid, "diary"),
          orderBy("watchedDate", "desc"),
        ),
      );

      const loaded = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setEntries(loaded);

      const showIds = [...new Set(loaded.map((e) => e.showId).filter(Boolean))];
      const results = await Promise.allSettled(
        showIds.map((id) =>
          fetch(`${TVMAZE}/shows/${id}`)
            .then((r) => r.json())
            .then((data) => ({ id, uri: data?.image?.medium ?? null })),
        ),
      );
      const map = {};
      results.forEach((r) => {
        if (r.status === "fulfilled" && r.value.uri) map[r.value.id] = r.value.uri;
      });
      setPosterMap(map);
    } catch (err) {
      console.error("[Diary] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchDiary();
    }, [fetchDiary]),
  );

  const handleToggleLike = async (entryId, liked) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await updateDoc(doc(db, "users", uid, "diary", entryId), { liked });
    } catch (err) {
      console.error("[Diary] like update error:", err);
    }
  };

  const grouped = groupByMonth(entries);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>Loading diary…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Back button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#95D5B2"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <Path d="M19 12H5" />
          <Path d="M12 19l-7-7 7-7" />
        </Svg>
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Diary</Text>
          <Text style={styles.pageSub}>{entries.length} {entries.length === 1 ? "entry" : "entries"}</Text>
        </View>

        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📖</Text>
            <Text style={styles.emptyTitle}>Your diary is empty</Text>
            <Text style={styles.emptySub}>
              Start watching and rating shows to fill your diary
            </Text>
          </View>
        ) : (
          grouped.map(({ month, entries: monthEntries }) => (
            <View key={month}>
              <MonthHeader month={month} count={monthEntries.length} />
              {monthEntries.map((entry, index) => (
                <View key={entry.id}>
                  <DiaryEntry
                    entry={entry}
                    posterUri={posterMap[entry.showId]}
                    onPress={() =>
                      navigation.navigate("ShowCard", { showId: entry.showId })
                    }
                    onToggleLike={(liked) => handleToggleLike(entry.id, liked)}
                  />
                  {index < monthEntries.length - 1 && (
                    <View style={styles.entryDivider} />
                  )}
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
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

  backBtn: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    alignSelf: "flex-start",
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  pageTitle: {
    fontSize: 28,
    fontFamily: "DMSerifDisplay_400Regular",
    color: C.text,
    letterSpacing: -0.4,
  },
  pageSub: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: C.subtext,
    marginTop: 2,
  },

  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 10,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.2,
  },
  monthCount: {
    fontSize: 11,
    color: C.muted,
    fontWeight: "500",
  },

  entryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  entryDivider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 16,
  },

  dateCol: {
    width: 32,
    alignItems: "center",
    paddingTop: 2,
  },
  dateDay: {
    fontSize: 17,
    fontWeight: "800",
    color: C.text,
    lineHeight: 20,
  },
  dateMon: {
    fontSize: 10,
    color: C.muted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  poster: {
    width: 52,
    height: 76,
    borderRadius: 7,
    backgroundColor: C.surface,
  },
  posterPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },

  entryInfo: { flex: 1, gap: 4 },
  entryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flexWrap: "wrap",
  },
  entryTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
    flex: 1,
  },
  episodeName: {
    fontSize: 11,
    color: C.subtext,
    fontStyle: "italic",
  },
  entryMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  rewatchBadge: {
    backgroundColor: C.accentSoft,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  rewatchText: {
    fontSize: 10,
    color: C.accent,
    fontWeight: "600",
  },
  reviewSnippet: {
    fontSize: 12,
    color: C.subtext,
    lineHeight: 17,
    fontStyle: "italic",
  },

  typeTag: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeTagText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },

  likeBtn: {
    paddingTop: 2,
    paddingLeft: 4,
  },
  likeIcon: { fontSize: 18 },

  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: C.text },
  emptySub: {
    fontSize: 13,
    color: C.subtext,
    textAlign: "center",
    lineHeight: 19,
  },
});

export default Diary;
