import React, { useState, useCallback } from "react";
import FadeInView from "../../components/FadeInView";
import InitialsAvatar from "../../components/InitialsAvatar";
import Stars from "../../components/Stars";
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
  RefreshControl,
} from "react-native";
import { auth, db } from "../../config/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  getDoc,
  where,
} from "firebase/firestore";
import { useFocusEffect } from "@react-navigation/native";
import Svg, { Path, Circle, Rect, Polyline } from "react-native-svg";

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
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const timeAgo = (timestamp) => {
  if (!timestamp) return "";
  const date = timestamp?.toDate?.() ?? new Date(timestamp);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// ─── Section Header ───────────────────────────────────────────────────────────

const SectionLabel = ({ title }) => (
  <Text style={styles.sectionLabel}>{title}</Text>
);

// ─── Watch / Rating card ──────────────────────────────────────────────────────

const WatchCard = ({ item, onShowPress }) => {
  const isEpisode = item.type === "episode";
  return (
    <TouchableOpacity style={styles.card} onPress={onShowPress} activeOpacity={0.8}>
      {/* Poster */}
      {item.posterUri ? (
        <Image source={{ uri: item.posterUri }} style={styles.cardPoster} resizeMode="cover" />
      ) : (
        <View style={[styles.cardPoster, styles.posterPlaceholder]}>
          <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <Rect x="2" y="7" width="20" height="15" rx="2" />
            <Polyline points="17 2 12 7 7 2" />
          </Svg>
        </View>
      )}

      <View style={styles.cardBody}>
        {/* Friend info */}
        <View style={styles.cardUserRow}>
          <InitialsAvatar name={item.friendName} size={22} color={item.avatarColor} />
          <Text style={styles.cardUsername}>@{item.friendUsername}</Text>
          <Text style={styles.cardTime}>{timeAgo(item.timestamp)}</Text>
        </View>

        {/* Action line */}
        <View style={styles.cardActionRow}>
          <Text style={styles.cardVerb}>
            {item.rating > 0 ? "rated" : "watched"}{" "}
          </Text>
          <Text style={styles.cardShowName} numberOfLines={1}>
            {item.showName}
          </Text>
        </View>

        {isEpisode && item.episodeName ? (
          <Text style={styles.cardEpisode} numberOfLines={1}>
            S{String(item.season ?? "?").padStart(2, "0")}E{String(item.episode ?? "?").padStart(2, "0")} · {item.episodeName}
          </Text>
        ) : null}

        {item.rating > 0 && <Stars rating={item.rating} size={11} />}

        {item.liked && (
          <Text style={styles.likedTag}>♥ liked</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ─── Review card ──────────────────────────────────────────────────────────────

const ReviewCard = ({ item, onShowPress }) => (
  <TouchableOpacity style={styles.card} onPress={onShowPress} activeOpacity={0.8}>
    {item.posterUri ? (
      <Image source={{ uri: item.posterUri }} style={styles.cardPoster} resizeMode="cover" />
    ) : (
      <View style={[styles.cardPoster, styles.posterPlaceholder]}>
        <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <Rect x="2" y="7" width="20" height="15" rx="2" />
          <Polyline points="17 2 12 7 7 2" />
        </Svg>
      </View>
    )}

    <View style={styles.cardBody}>
      <View style={styles.cardUserRow}>
        <InitialsAvatar name={item.friendName} size={22} color={item.avatarColor} />
        <Text style={styles.cardUsername}>@{item.friendUsername}</Text>
        <Text style={styles.cardTime}>{timeAgo(item.timestamp)}</Text>
      </View>

      <View style={styles.cardActionRow}>
        <Text style={styles.cardVerb}>reviewed </Text>
        <Text style={styles.cardShowName} numberOfLines={1}>{item.showName}</Text>
      </View>

      {item.rating > 0 && <Stars rating={item.rating} size={11} />}

      <Text style={styles.reviewSnippet} numberOfLines={3}>
        {`"${item.reviewText}"`}
      </Text>
    </View>
  </TouchableOpacity>
);

// ─── Follow card ──────────────────────────────────────────────────────────────

const FollowCard = ({ item }) => (
  <View style={[styles.card, { alignItems: "center" }]}>
    <InitialsAvatar name={item.friendName} size={40} color={item.avatarColor} />

    <View style={styles.cardBody}>
      <View style={styles.cardUserRow}>
        <Text style={styles.cardUsername}>@{item.friendUsername}</Text>
        <Text style={styles.cardTime}>{timeAgo(item.timestamp)}</Text>
      </View>
      <View style={styles.cardActionRow}>
        <Text style={styles.cardVerb}>followed </Text>
        <Text style={styles.cardShowName}>@{item.followedUsername}</Text>
      </View>
    </View>
  </View>
);

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyFeed = ({ onNavigate }) => (
  <View style={styles.emptyWrap}>
    <Svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <Circle cx="9" cy="7" r="4" />
      <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
    <Text style={styles.emptyTitle}>No friend activity yet</Text>
    <Text style={styles.emptySubtitle}>
      Follow people to see their ratings, reviews, and watchlists here
    </Text>
    <TouchableOpacity style={styles.emptyBtn} onPress={onNavigate}>
      <Text style={styles.emptyBtnText}>Find People</Text>
    </TouchableOpacity>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

const Friends = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [watchItems, setWatchItems] = useState([]);
  const [reviewItems, setReviewItems] = useState([]);
  const [followItems, setFollowItems] = useState([]);
  const [posterMap, setPosterMap] = useState({});

  const fetchAll = useCallback(async (silent = false) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    if (!silent) setLoading(true);

    try {
      // 1. Get following list
      const followingSnap = await getDocs(
        collection(db, "users", uid, "following")
      );
      const friendUids = followingSnap.docs.map((d) => d.id);

      if (friendUids.length === 0) {
        setWatchItems([]);
        setReviewItems([]);
        setFollowItems([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // 2. Fetch friend profiles
      const profileResults = await Promise.allSettled(
        friendUids.map((fuid) => getDoc(doc(db, "users", fuid)))
      );
      const profiles = {};
      profileResults.forEach((r) => {
        if (r.status === "fulfilled" && r.value.exists()) {
          profiles[r.value.id] = r.value.data();
        }
      });

      // 3. Fetch diary entries (watches + ratings) for each friend
      const diaryResults = await Promise.allSettled(
        friendUids.map((fuid) =>
          getDocs(
            query(
              collection(db, "users", fuid, "diary"),
              orderBy("watchedDate", "desc"),
              limit(5)
            )
          ).then((snap) =>
            snap.docs.map((d) => ({ ...d.data(), friendUid: fuid }))
          )
        )
      );

      const allDiary = [];
      diaryResults.forEach((r) => {
        if (r.status === "fulfilled") allDiary.push(...r.value);
      });

      // 4. Fetch reviews for each friend from shows collection
      const reviewResults = await Promise.allSettled(
        friendUids.map((fuid) =>
          getDocs(
            query(
              // Reviews stored under shows/{showId}/reviews with uid field
              // We query globally — adjust if your schema differs
              collection(db, "users", fuid, "reviews"),
              orderBy("createdAt", "desc"),
              limit(3)
            )
          ).then((snap) =>
            snap.docs.map((d) => ({ ...d.data(), friendUid: fuid }))
          )
        )
      );

      const allReviews = [];
      reviewResults.forEach((r) => {
        if (r.status === "fulfilled") allReviews.push(...r.value);
      });

      // 5. Fetch follow events for each friend
      const followResults = await Promise.allSettled(
        friendUids.map((fuid) =>
          getDocs(
            query(
              collection(db, "users", fuid, "following"),
              orderBy("followedAt", "desc"),
              limit(3)
            )
          ).then((snap) =>
            snap.docs.map((d) => ({
              followedUid: d.id,
              timestamp: d.data().followedAt,
              friendUid: fuid,
            }))
          )
        )
      );

      const allFollows = [];
      followResults.forEach((r) => {
        if (r.status === "fulfilled") allFollows.push(...r.value);
      });

      // 6. Fetch followed-user usernames for follow events
      const followedUids = [...new Set(allFollows.map((f) => f.followedUid))];
      const followedProfiles = {};
      await Promise.allSettled(
        followedUids.map((fuid) =>
          getDoc(doc(db, "users", fuid)).then((snap) => {
            if (snap.exists()) followedProfiles[fuid] = snap.data();
          })
        )
      );

      // 7. Collect show IDs and fetch posters
      const showIds = [
        ...new Set([
          ...allDiary.map((d) => d.showId).filter(Boolean),
          ...allReviews.map((r) => r.showId).filter(Boolean),
        ]),
      ];

      const posterResults = await Promise.allSettled(
        showIds.map((id) =>
          fetch(`${TVMAZE}/shows/${id}`)
            .then((r) => r.json())
            .then((data) => ({ id: String(id), uri: data?.image?.medium ?? null }))
        )
      );
      const newPosterMap = {};
      posterResults.forEach((r) => {
        if (r.status === "fulfilled" && r.value.uri)
          newPosterMap[r.value.id] = r.value.uri;
      });
      setPosterMap(newPosterMap);

      // 8. Shape data for render
      const watches = allDiary
        .filter((d) => d.showId)
        .sort((a, b) => (b.watchedDate?.toMillis?.() ?? 0) - (a.watchedDate?.toMillis?.() ?? 0))
        .slice(0, 20)
        .map((d) => {
          const p = profiles[d.friendUid] ?? {};
          return {
            id: `${d.friendUid}-${d.showId}-${d.watchedDate?.toMillis?.()}`,
            friendName: p.displayName ?? "Friend",
            friendUsername: p.username ?? "unknown",
            avatarColor: p.avatarColor ?? C.accent,
            showName: d.showName ?? "Unknown Show",
            showId: d.showId,
            rating: d.rating ?? 0,
            liked: d.liked ?? false,
            type: d.type ?? "show",
            episodeName: d.episodeName ?? null,
            season: d.seasonNumber ?? null,
            episode: d.episodeNumber ?? null,
            posterUri: newPosterMap[String(d.showId)] ?? null,
            timestamp: d.watchedDate,
          };
        });

      const reviews = allReviews
        .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
        .slice(0, 10)
        .map((r) => {
          const p = profiles[r.friendUid] ?? {};
          return {
            id: `rev-${r.friendUid}-${r.showId}-${r.createdAt?.toMillis?.()}`,
            friendName: p.displayName ?? "Friend",
            friendUsername: p.username ?? "unknown",
            avatarColor: p.avatarColor ?? C.accent,
            showName: r.showName ?? "Unknown Show",
            showId: r.showId,
            rating: r.rating ?? 0,
            reviewText: r.text ?? r.review ?? "",
            posterUri: newPosterMap[String(r.showId)] ?? null,
            timestamp: r.createdAt,
          };
        })
        .filter((r) => r.reviewText.length > 0);

      const follows = allFollows
        .sort((a, b) => (b.timestamp?.toMillis?.() ?? 0) - (a.timestamp?.toMillis?.() ?? 0))
        .slice(0, 10)
        .map((f) => {
          const p = profiles[f.friendUid] ?? {};
          const fp = followedProfiles[f.followedUid] ?? {};
          return {
            id: `follow-${f.friendUid}-${f.followedUid}`,
            friendName: p.displayName ?? "Friend",
            friendUsername: p.username ?? "unknown",
            avatarColor: p.avatarColor ?? C.accent,
            followedUsername: fp.username ?? "someone",
            timestamp: f.timestamp,
          };
        });

      setWatchItems(watches);
      setReviewItems(reviews);
      setFollowItems(follows);
    } catch (err) {
      console.error("[Friends] fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAll(true);
  };

  const hasAny =
    watchItems.length > 0 || reviewItems.length > 0 || followItems.length > 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>Loading activity…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <FadeInView>
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Friends</Text>
          <TouchableOpacity
            style={styles.headerTab}
            onPress={() => navigation.navigate("Public")}
          >
            <Text style={styles.headerTabText}>Popular ›</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={C.accent}
            />
          }
        >
          {!hasAny ? (
            <EmptyFeed onNavigate={() => navigation.navigate("Search")} />
          ) : (
            <>
              {/* ── Recent Watches & Ratings ── */}
              {watchItems.length > 0 && (
                <View style={styles.section}>
                  <SectionLabel title="Recent Activity" />
                  {watchItems.map((item) => (
                    <WatchCard
                      key={item.id}
                      item={item}
                      onShowPress={() =>
                        navigation.navigate("ShowCard", { showId: item.showId })
                      }
                    />
                  ))}
                </View>
              )}

              {/* ── Recent Reviews ── */}
              {reviewItems.length > 0 && (
                <View style={styles.section}>
                  <SectionLabel title="Recent Reviews" />
                  {reviewItems.map((item) => (
                    <ReviewCard
                      key={item.id}
                      item={item}
                      onShowPress={() =>
                        navigation.navigate("ShowCard", { showId: item.showId })
                      }
                    />
                  ))}
                </View>
              )}

              {/* ── Recent Follows ── */}
              {followItems.length > 0 && (
                <View style={styles.section}>
                  <SectionLabel title="New Connections" />
                  {followItems.map((item) => (
                    <FollowCard key={item.id} item={item} />
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </FadeInView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 16, paddingBottom: 48, paddingTop: 4 },
  loadingScreen: {
    flex: 1, backgroundColor: C.bg,
    justifyContent: "center", alignItems: "center", gap: 14,
  },
  loadingText: { color: C.subtext, fontSize: 14, fontWeight: "500" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "DMSerifDisplay_400Regular",
    color: C.text,
    letterSpacing: -0.4,
  },
  headerTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border2,
  },
  headerTabText: {
    fontSize: 12,
    color: C.accent,
    fontWeight: "600",
  },

  // Section
  section: { marginBottom: 28 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: C.subtext,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 10,
  },

  // Cards
  card: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  cardPoster: {
    width: 52,
    height: 76,
    borderRadius: 7,
    backgroundColor: C.card,
  },
  posterPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border2,
  },
  cardBody: { flex: 1, gap: 4 },
  cardUserRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardUsername: { fontSize: 12, color: C.accent, fontWeight: "700", flex: 1 },
  cardTime: { fontSize: 11, color: C.muted },
  cardActionRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
  cardVerb: { fontSize: 13, color: C.subtext },
  cardShowName: {
    fontSize: 13,
    color: C.text,
    fontWeight: "700",
    flexShrink: 1,
  },
  cardEpisode: { fontSize: 11, color: C.muted, fontStyle: "italic" },
  likedTag: { fontSize: 11, color: C.heart, fontWeight: "600" },
  reviewSnippet: {
    fontSize: 12,
    color: C.subtext,
    lineHeight: 18,
    fontStyle: "italic",
    marginTop: 2,
  },

  // Empty
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 17,
    color: C.subtext,
    fontWeight: "700",
    fontFamily: "DMSans_700Bold",
    marginTop: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: C.muted,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 20,
    backgroundColor: C.accent,
  },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});

export default Friends;