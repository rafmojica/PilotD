import React, { useState, useEffect, useRef } from "react";
import Svg, { Circle, Line, Path } from "react-native-svg";
import FadeInView from "../components/FadeInView";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  collection,
  query as firestoreQuery,
  where,
  limit,
  getDocs,
} from "firebase/firestore";
import { db, auth } from "../config/firebase.js";

// ─── API ──────────────────────────────────────────────────────────────────────

const TVMAZE = "https://api.tvmaze.com";
const DEBOUNCE_MS = 350;

const TRENDING_SEARCHES = [
  "Severance",
  "The Bear",
  "Slow Horses",
  "Andor",
  "Succession",
];

// ─── Colors ───────────────────────────────────────────────────────────────────

const C = {
  bg: "#081C15",
  surface: "#0d2b1d",
  card: "#1B4332",
  border: "#2D6A4F",
  borderSubtle: "rgba(45,106,79,0.15)",
  accent: "#52B788",
  text: "#D8F3DC",
  textSec: "#95D5B2",
  muted: "#40916C",
  star: "#F4A827",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const stripHtml = (html) => (html ? html.replace(/<[^>]*>/g, "").trim() : "");

const initials = (name = "") =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

// ─── Sub-components ───────────────────────────────────────────────────────────

const Stars = ({ rating }) => {
  if (!rating) return null;
  const scaled = Math.round((rating / 10) * 10) / 2;
  const full = Math.floor(scaled);
  const half = scaled % 1 >= 0.5;
  return (
    <View style={{ flexDirection: "row", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text
          key={i}
          style={{
            fontSize: 10,
            color: i <= full ? C.star : half && i === full + 1 ? C.star : C.muted,
            opacity: half && i === full + 1 ? 0.55 : 1,
          }}
        >
          ★
        </Text>
      ))}
    </View>
  );
};

const PosterPlaceholder = ({ name }) => (
  <View style={styles.posterPlaceholder}>
    <Text style={styles.posterInitials}>{initials(name)}</Text>
  </View>
);

const ShowResult = ({ item, onPress }) => {
  const show = item.show;
  const year = show.premiered?.slice(0, 4) ?? "—";
  const genre = show.genres?.[0] ?? "";
  const rating = show.rating?.average;

  return (
    <Pressable style={({ pressed }) => [styles.resultRow, pressed && { backgroundColor: "rgba(82,183,136,0.05)" }]} onPress={onPress}>
      {show.image?.medium ? (
        <Image source={{ uri: show.image.medium }} style={styles.showThumb} resizeMode="cover" />
      ) : (
        <PosterPlaceholder name={show.name} />
      )}
      <View style={styles.resultInfo}>
        <Text style={styles.resultName} numberOfLines={1}>{show.name}</Text>
        <Text style={styles.resultSub} numberOfLines={1}>
          {[genre, year, show.status].filter(Boolean).join(" · ")}
        </Text>
        {rating ? (
          <View style={styles.ratingRow}>
            <Stars rating={rating} />
            <Text style={styles.ratingNum}>{(rating / 2).toFixed(1)}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
};

const UserResult = ({ user, followed, onToggleFollow }) => (
  <TouchableOpacity style={styles.resultRow} activeOpacity={0.75}>
    {user.photoURL ? (
      <Image source={{ uri: user.photoURL }} style={styles.personThumb} resizeMode="cover" />
    ) : (
      <View style={[styles.personThumb, styles.personPlaceholder]}>
        <Text style={styles.posterInitials}>
          {initials(user.displayName || user.username)}
        </Text>
      </View>
    )}
    <View style={styles.resultInfo}>
      <Text style={styles.resultName} numberOfLines={1}>{user.displayName}</Text>
      <Text style={styles.resultSub} numberOfLines={1}>@{user.username}</Text>
    </View>
    <TouchableOpacity
      style={[styles.followBtn, followed && styles.followBtnFollowing]}
      onPress={onToggleFollow}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={[styles.followBtnText, followed && styles.followBtnTextFollowing]}>
        {followed ? "Following" : "Follow"}
      </Text>
    </TouchableOpacity>
  </TouchableOpacity>
);

// ─── Screen ──────────────────────────────────────────────────────────────────

const Search = () => {
  const [searchText, setSearchText] = useState("");
  const [shows, setShows] = useState([]);
  const [appUsers, setAppUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [followed, setFollowed] = useState({});
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!searchText.trim()) {
      setShows([]);
      setAppUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const encoded = encodeURIComponent(searchText.trim());
        const lower = searchText.trim().toLowerCase();
        const currentUid = auth.currentUser?.uid;

        const [showRes, byUsername, byDisplayName] = await Promise.all([
          fetch(`${TVMAZE}/search/shows?q=${encoded}`).then((r) => r.json()),
          getDocs(
            firestoreQuery(
              collection(db, "users"),
              where("username", ">=", lower),
              where("username", "<=", lower + ""),
              limit(10)
            )
          ),
          getDocs(
            firestoreQuery(
              collection(db, "users"),
              where("displayName", ">=", searchText.trim()),
              where("displayName", "<=", searchText.trim() + ""),
              limit(10)
            )
          ),
        ]);

        setShows(Array.isArray(showRes) ? showRes.slice(0, 5) : []);

        const seen = new Set();
        const results = [];
        for (const snap of [byUsername, byDisplayName]) {
          snap.forEach((doc) => {
            if (!seen.has(doc.id) && doc.id !== currentUid) {
              seen.add(doc.id);
              results.push({ uid: doc.id, ...doc.data() });
            }
          });
        }
        setAppUsers(results.slice(0, 5));
      } catch (err) {
        console.error("[Search] fetch error:", err);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [searchText]);

  const toggleFollow = (uid) =>
    setFollowed((prev) => ({ ...prev, [uid]: !prev[uid] }));

  const handleShowPress = (show) => {
    Alert.alert(
      show.name,
      [
        show.genres?.join(", "),
        show.premiered?.slice(0, 4),
        show.summary ? stripHtml(show.summary).slice(0, 120) + "…" : null,
      ]
        .filter(Boolean)
        .join("\n\n"),
      [{ text: "OK" }]
    );
  };

  const hasResults = shows.length > 0 || appUsers.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <FadeInView>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round">
            <Circle cx="11" cy="11" r="8" />
            <Line x1="21" y1="21" x2="16.65" y2="16.65" />
          </Svg>
          <TextInput
            style={styles.input}
            placeholder="Shows, people…"
            placeholderTextColor={C.muted}
            value={searchText}
            onChangeText={setSearchText}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {loading && (
            <ActivityIndicator size="small" color={C.accent} style={{ marginRight: 4 }} />
          )}
          {searchText.length > 0 && !loading && (
            <TouchableOpacity
              onPress={() => setSearchText("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5" strokeLinecap="round">
                <Path d="M18 6L6 18M6 6l12 12" />
              </Svg>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Show results */}
        {shows.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Shows</Text>
            {shows.map((item) => (
              <ShowResult
                key={item.show.id}
                item={item}
                onPress={() => handleShowPress(item.show)}
              />
            ))}
          </>
        )}

        {/* App user results */}
        {appUsers.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, shows.length > 0 && { marginTop: 12 }]}>
              People
            </Text>
            {appUsers.map((user) => (
              <UserResult
                key={user.uid}
                user={user}
                followed={!!followed[user.uid]}
                onToggleFollow={() => toggleFollow(user.uid)}
              />
            ))}
          </>
        )}

        {/* No results */}
        {searchText.trim().length > 0 && !loading && !hasResults && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{`No results for "${searchText}"`}</Text>
            <Text style={styles.emptySub}>Try a different search term.</Text>
          </View>
        )}

        {/* Trending (empty state) */}
        {!searchText && (
          <View>
            <Text style={styles.sectionLabel}>Trending</Text>
            {TRENDING_SEARCHES.map((t) => (
              <TouchableOpacity
                key={t}
                style={styles.trendingRow}
                onPress={() => setSearchText(t)}
                activeOpacity={0.7}
              >
                <Text style={styles.trendingArrow}>↗</Text>
                <Text style={styles.trendingText}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
      </FadeInView>
    </SafeAreaView>
  );
};

export default Search;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.5,
  },

  searchWrap: { paddingHorizontal: 20, paddingBottom: 16 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  input: {
    flex: 1,
    color: C.text,
    fontSize: 15,
  },
  sectionLabel: {
    paddingHorizontal: 20,
    paddingBottom: 6,
    fontSize: 11,
    fontWeight: "700",
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.borderSubtle,
    gap: 12,
  },
  resultRowPressed: {
    backgroundColor: "rgba(82,183,136,0.05)",
  },
  showThumb: {
    width: 44,
    height: 64,
    borderRadius: 7,
    backgroundColor: C.card,
    flexShrink: 0,
  },
  posterPlaceholder: {
    width: 44,
    height: 64,
    borderRadius: 7,
    backgroundColor: C.card,
    flexShrink: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  posterInitials: {
    fontSize: 14,
    fontWeight: "700",
    color: C.accent,
    opacity: 0.8,
  },
  personThumb: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.card,
    flexShrink: 0,
  },
  personPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  resultInfo: { flex: 1, gap: 3 },
  resultName: { fontSize: 14, fontWeight: "500", color: C.text },
  resultSub: { fontSize: 12, color: C.textSec },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  ratingNum: { fontSize: 11, color: C.star, fontWeight: "600" },
  chevron: { fontSize: 22, color: C.border, lineHeight: 26 },

  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: C.accent,
  },
  followBtnFollowing: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: C.accent,
  },
  followBtnText: { color: "#081C15", fontSize: 12, fontWeight: "600" },
  followBtnTextFollowing: { color: C.accent },

  trendingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(45,106,79,0.1)",
    gap: 10,
  },
  trendingArrow: { fontSize: 13, color: C.muted },
  trendingText: { fontSize: 14, color: C.textSec },

  empty: {
    paddingTop: 48,
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 40,
  },
  emptyTitle: { color: C.text, fontSize: 16, fontWeight: "600", textAlign: "center" },
  emptySub: { color: C.muted, fontSize: 13, textAlign: "center" },
});
