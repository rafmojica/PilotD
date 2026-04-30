import React, { useState, useCallback, useRef, useEffect } from "react";
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
  Animated,
  Dimensions,
} from "react-native";
import { auth, db } from "../../config/firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useFocusEffect } from "@react-navigation/native";
import Svg, { Path, Polyline, Rect, Circle } from "react-native-svg";
import InitialsAvatar from "../../components/InitialsAvatar";
import Stars from "../../components/Stars";
import FadeInView from "../../components/FadeInView";
import PressScale from "../../components/PressScale";

const TVMAZE = "https://api.tvmaze.com";
const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = Math.floor((SCREEN_W - 40 - 24) / 4);
const CARD_H = Math.floor(CARD_W * 1.5);
const RATING_RANGE = ["5", "4.5", "4", "3.5", "3", "2.5", "2", "1"];
const TABS = ["Reviews", "Likes", "Tags", "Following"];

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
};

// ─── Rating Chart ─────────────────────────────────────────────────────────────

const RatingChart = ({ distribution }) => {
  const animProgress = useRef(new Animated.Value(0)).current;
  const maxVal = Math.max(...RATING_RANGE.map((r) => distribution[r] ?? 0), 1);

  useEffect(() => {
    animProgress.setValue(0);
    Animated.timing(animProgress, { toValue: 1, duration: 600, useNativeDriver: false }).start();
  }, [distribution]);

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Rating Distribution</Text>
      {RATING_RANGE.map((label) => {
        const count = distribution[label] ?? 0;
        const pct = count / maxVal;
        const fillWidth = animProgress.interpolate({
          inputRange: [0, 1],
          outputRange: ["0%", `${(pct * 100).toFixed(1)}%`],
        });
        return (
          <View key={label} style={styles.distRow}>
            <Text style={styles.distLabel}>{label}</Text>
            <Text style={styles.distStar}>★</Text>
            <View style={styles.distBarBg}>
              <Animated.View style={[styles.distBarFill, { width: fillWidth }]} />
            </View>
            <Text style={styles.distCount}>{count > 0 ? count : ""}</Text>
          </View>
        );
      })}
    </View>
  );
};

// ─── Favorite Show Card ───────────────────────────────────────────────────────

const FavoriteShowCard = ({ favShow }) => {
  if (!favShow?.showName) return null;
  return (
    <View style={styles.favSection}>
      <Text style={styles.favSectionLabel}>All-Time Favorite Show</Text>
      <View style={styles.favCard}>
        <View style={styles.favPoster}>
          {favShow.posterUri ? (
            <Image source={{ uri: favShow.posterUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={styles.favPosterPlaceholder}>
              <Text style={styles.favPosterInitials}>
                {favShow.showName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.favInfo}>
          <Text style={styles.favTitle} numberOfLines={2}>{favShow.showName}</Text>
          {favShow.oneLiner ? (
            <View style={styles.favOneLinerRow}>
              <Svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#52B788" strokeWidth="2" strokeLinecap="round">
                <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </Svg>
              <Text style={styles.favOneLiner} numberOfLines={3}>{favShow.oneLiner}</Text>
            </View>
          ) : null}
          {favShow.tags?.length > 0 && (
            <View style={styles.favTags}>
              {favShow.tags.slice(0, 3).map((tag) => (
                <View key={tag} style={styles.favTag}>
                  <Text style={styles.favTagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

// ─── Activity Card ────────────────────────────────────────────────────────────

const ActivityCard = ({ rating, posterUri, onPress }) => (
  <PressScale scale={0.94} onPress={onPress}>
    <View style={styles.activityCard}>
      {posterUri ? (
        <Image source={{ uri: posterUri }} style={styles.activityPoster} resizeMode="cover" />
      ) : (
        <View style={[styles.activityPoster, styles.posterPlaceholder]}>
          <Svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#40916C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <Rect x="2" y="7" width="20" height="15" rx="2" />
            <Polyline points="17 2 12 7 7 2" />
          </Svg>
        </View>
      )}
      <View style={styles.activityRating}>
        <Stars rating={rating} size={10} />
      </View>
    </View>
  </PressScale>
);

// ─── Tab content ──────────────────────────────────────────────────────────────

const ReviewsList = ({ entries, navigation }) => {
  if (entries.length === 0) {
    return <View style={styles.tabEmpty}><Text style={styles.tabEmptyText}>No reviews yet</Text></View>;
  }
  return (
    <View style={styles.reviewsList}>
      {entries.map((entry) => (
        <TouchableOpacity
          key={entry.id}
          style={styles.reviewCard}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("ShowCard", { showId: entry.showId })}
        >
          <View style={styles.reviewCardHeader}>
            <Text style={styles.reviewCardTitle} numberOfLines={1}>{entry.showName}</Text>
            {entry.rating > 0 && <Stars rating={entry.rating} size={11} />}
          </View>
          <Text style={styles.reviewCardText} numberOfLines={4}>{entry.review}</Text>
          {entry.watchedDate && (
            <Text style={styles.reviewCardTime}>
              {(entry.watchedDate?.toDate?.() ?? new Date(entry.watchedDate)).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const LikesGrid = ({ entries, posters, navigation }) => {
  if (entries.length === 0) {
    return <View style={styles.tabEmpty}><Text style={styles.tabEmptyText}>No liked shows yet</Text></View>;
  }
  return (
    <View style={styles.showsGrid}>
      {entries.map((entry) => (
        <TouchableOpacity
          key={entry.id}
          style={styles.gridThumb}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("ShowCard", { showId: entry.showId })}
        >
          {posters[entry.showId] ? (
            <Image source={{ uri: posters[entry.showId] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "#0d2b1d" }]} />
          )}
          <Text style={styles.likeHeart}>♥</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const FollowingTab = ({ followingUsers, navigation }) => {
  if (followingUsers.length === 0) {
    return <View style={styles.tabEmpty}><Text style={styles.tabEmptyText}>Not following anyone yet</Text></View>;
  }
  return (
    <View>
      {followingUsers.map((u) => (
        <TouchableOpacity
          key={u.uid}
          style={styles.followingRow}
          activeOpacity={0.7}
          onPress={() => navigation.navigate("UserProfile", { userId: u.uid, displayName: u.displayName })}
        >
          <InitialsAvatar name={u.displayName} photoURL={u.photoURL} size={40} />
          <View style={styles.followingInfo}>
            <Text style={styles.followingName}>{u.displayName}</Text>
            {u.username ? <Text style={styles.followingHandle}>@{u.username}</Text> : null}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const UserProfile = ({ navigation, route }) => {
  const { userId, displayName: initialName } = route.params;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [posters, setPosters] = useState({});
  const [favShow, setFavShow] = useState(null);
  const [ratingDistribution, setRatingDistribution] = useState({});
  const [reviewEntries, setReviewEntries] = useState([]);
  const [likedEntries, setLikedEntries] = useState([]);
  const [followingUsers, setFollowingUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("Reviews");
  const [counts, setCounts] = useState({ showsCount: 0, reviewsCount: 0, followersCount: 0, followingCount: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    const currentUid = auth.currentUser?.uid;
    try {
      const [userSnap, ratingsSnap, followersSnap, followingSnap, diarySnap, followStatusSnap] = await Promise.all([
        getDoc(doc(db, "users", userId)),
        getDocs(collection(db, "users", userId, "showRatings")),
        getDocs(collection(db, "users", userId, "followers")),
        getDocs(collection(db, "users", userId, "following")),
        getDocs(query(collection(db, "users", userId, "diary"), orderBy("watchedDate", "desc"))),
        currentUid ? getDoc(doc(db, "users", currentUid, "following", userId)) : Promise.resolve({ exists: () => false }),
      ]);

      if (userSnap.exists()) {
        const data = userSnap.data();
        setUser({ uid: userId, ...data });
        if (data.favoriteShow) setFavShow(data.favoriteShow);
      }

      // Rating distribution
      const dist = {};
      ratingsSnap.docs.forEach((d) => {
        const r = d.data().rating;
        if (r) {
          const bucket = String(Math.round(r * 2) / 2);
          dist[bucket] = (dist[bucket] ?? 0) + 1;
        }
      });
      setRatingDistribution(dist);

      setIsFollowing(followStatusSnap.exists());

      const allDiary = diarySnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRecentActivity(allDiary.slice(0, 4));
      setReviewEntries(allDiary.filter((e) => e.review));
      setLikedEntries(allDiary.filter((e) => e.liked));

      setCounts({
        showsCount: ratingsSnap.size,
        reviewsCount: allDiary.filter((e) => e.review).length,
        followersCount: followersSnap.size,
        followingCount: followingSnap.size,
      });

      // Fetch following user docs
      const followingIds = followingSnap.docs.map((d) => d.id);
      const followingDocs = await Promise.allSettled(
        followingIds.slice(0, 20).map((id) => getDoc(doc(db, "users", id)))
      );
      setFollowingUsers(
        followingDocs
          .filter((r) => r.status === "fulfilled" && r.value.exists())
          .map((r) => ({ uid: r.value.id, ...r.value.data() }))
      );

      // Fetch posters
      const posterIds = [...new Set([
        ...allDiary.slice(0, 4).map((e) => e.showId),
        ...allDiary.filter((e) => e.liked).slice(0, 12).map((e) => e.showId),
      ].filter(Boolean))];
      const results = await Promise.allSettled(
        posterIds.map((id) =>
          fetch(`${TVMAZE}/shows/${id}`).then((r) => r.json()).then((data) => ({ id, uri: data?.image?.medium ?? null }))
        )
      );
      const map = {};
      results.forEach((r) => { if (r.status === "fulfilled" && r.value.uri) map[r.value.id] = r.value.uri; });
      setPosters(map);
    } catch (err) {
      console.error("[UserProfile] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { fetchProfile(); }, [fetchProfile]));

  const handleToggleFollow = async () => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid || followLoading) return;
    setFollowLoading(true);
    const willFollow = !isFollowing;
    setIsFollowing(willFollow);
    setCounts((prev) => ({ ...prev, followersCount: prev.followersCount + (willFollow ? 1 : -1) }));
    try {
      const myFollowingRef = doc(db, "users", currentUid, "following", userId);
      const theirFollowersRef = doc(db, "users", userId, "followers", currentUid);
      if (willFollow) {
        const ts = { followedAt: serverTimestamp() };
        await Promise.all([setDoc(myFollowingRef, ts), setDoc(theirFollowersRef, ts)]);
      } else {
        await Promise.all([deleteDoc(myFollowingRef), deleteDoc(theirFollowersRef)]);
      }
    } catch (err) {
      console.error("[UserProfile] follow error:", err);
      setIsFollowing(!willFollow);
      setCounts((prev) => ({ ...prev, followersCount: prev.followersCount + (willFollow ? -1 : 1) }));
    } finally {
      setFollowLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#95D5B2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M19 12H5" />
          <Path d="M12 19l-7-7 7-7" />
        </Svg>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={styles.loadingText}>Loading {initialName ? `${initialName}'s` : ""} profile…</Text>
        </View>
      ) : (
        <FadeInView>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

            {/* Header */}
            <View style={styles.header}>
              <InitialsAvatar name={user?.displayName ?? initialName} photoURL={user?.photoURL} size={70} color={user?.avatarColor} style={{ borderWidth: 2, borderColor: "#52B788" }} />
              <View style={styles.headerInfo}>
                <Text style={styles.displayName}>{user?.displayName ?? initialName}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  {user?.username ? <Text style={styles.username}>@{user.username}</Text> : null}
                  {user?.pronouns ? (
                    <>
                      <Text style={styles.username}>·</Text>
                      <Text style={styles.username}>{user.pronouns}</Text>
                    </>
                  ) : null}
                </View>
                {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
              </View>
            </View>

            {/* Stats */}
            <View style={styles.profileStats}>
              <View style={styles.profileStatItem}>
                <Text style={styles.profileStatNum}>{counts.showsCount}</Text>
                <Text style={styles.profileStatLabel}>Shows</Text>
              </View>
              <View style={styles.profileStatItem}>
                <Text style={styles.profileStatNum}>{counts.reviewsCount}</Text>
                <Text style={styles.profileStatLabel}>Reviews</Text>
              </View>
              <View style={styles.profileStatItem}>
                <Text style={styles.profileStatNum}>{counts.followersCount}</Text>
                <Text style={styles.profileStatLabel}>Followers</Text>
              </View>
              <View style={styles.profileStatItem}>
                <Text style={styles.profileStatNum}>{counts.followingCount}</Text>
                <Text style={styles.profileStatLabel}>Following</Text>
              </View>
            </View>

            {/* Follow button */}
            <TouchableOpacity
              style={[styles.followBtn, isFollowing && styles.followBtnActive]}
              onPress={handleToggleFollow}
              disabled={followLoading}
              activeOpacity={0.75}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color={isFollowing ? C.accent : C.bg} />
              ) : (
                <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                  {isFollowing ? "Following" : "Follow"}
                </Text>
              )}
            </TouchableOpacity>

            {/* Favorite Show */}
            <FavoriteShowCard favShow={favShow} />

            {/* Recent Activity */}
            {recentActivity.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                <View style={styles.activityRow}>
                  {recentActivity.map((entry) => (
                    <ActivityCard
                      key={entry.id}
                      rating={entry.rating}
                      posterUri={posters[entry.showId]}
                      onPress={() => navigation.navigate("ShowCard", { showId: entry.showId })}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Rating Distribution */}
            <RatingChart distribution={ratingDistribution} />

            {/* Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tabBar}
              contentContainerStyle={styles.tabBarContent}
            >
              {TABS.map((tab) => (
                <TouchableOpacity key={tab} style={styles.tabItem} onPress={() => setActiveTab(tab)} activeOpacity={0.7}>
                  <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>{tab}</Text>
                  {activeTab === tab && <View style={styles.tabIndicator} />}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Tab Content */}
            {activeTab === "Reviews" && <ReviewsList entries={reviewEntries} navigation={navigation} />}
            {activeTab === "Likes" && <LikesGrid entries={likedEntries} posters={posters} navigation={navigation} />}
            {activeTab === "Tags" && <View style={styles.tabEmpty}><Text style={styles.tabEmptyText}>No tags yet</Text></View>}
            {activeTab === "Following" && <FollowingTab followingUsers={followingUsers} navigation={navigation} />}

          </ScrollView>
        </FadeInView>
      )}
    </SafeAreaView>
  );
};

export default UserProfile;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 48 },

  backBtn: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, alignSelf: "flex-start" },

  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center", gap: 14 },
  loadingText: { color: C.subtext, fontSize: 14, fontWeight: "500" },

  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 0, flexDirection: "row", gap: 16, alignItems: "flex-start" },
  headerInfo: { flex: 1 },
  displayName: { fontSize: 22, fontFamily: "DMSerifDisplay_400Regular", color: C.text, marginBottom: 2 },
  username: { fontSize: 13, color: C.accent, marginBottom: 6 },
  bio: { fontSize: 13, color: "#95D5B2", lineHeight: 19 },

  profileStats: { flexDirection: "row", gap: 20, paddingHorizontal: 20, paddingVertical: 16 },
  profileStatItem: { alignItems: "center" },
  profileStatNum: { fontSize: 20, fontWeight: "700", color: C.text },
  profileStatLabel: { fontSize: 11, color: "#40916C", marginTop: 2 },

  followBtn: { marginHorizontal: 20, marginBottom: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: C.accent, alignItems: "center", justifyContent: "center", minHeight: 40 },
  followBtnActive: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#40916C" },
  followBtnText: { color: C.bg, fontSize: 14, fontWeight: "600" },
  followBtnTextActive: { color: C.accent },

  // Favorite Show
  favSection: { marginHorizontal: 20, marginBottom: 20 },
  favSectionLabel: { fontSize: 11, fontWeight: "600", color: "#40916C", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  favCard: { backgroundColor: "#0d2b1d", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "rgba(45,106,79,0.3)", flexDirection: "row", gap: 12 },
  favPoster: { width: 66, alignSelf: "stretch", minHeight: 96, borderRadius: 9, borderWidth: 1, borderColor: "rgba(45,106,79,0.3)", overflow: "hidden", backgroundColor: C.card },
  favPosterPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a2218" },
  favPosterInitials: { fontFamily: "DMSerifDisplay_400Regular", fontSize: 22, color: "#52B788", opacity: 0.7 },
  favInfo: { flex: 1, justifyContent: "space-between", gap: 6 },
  favTitle: { fontFamily: "DMSerifDisplay_400Regular", fontSize: 16, color: C.text, lineHeight: 20 },
  favOneLinerRow: { flexDirection: "row", gap: 6, alignItems: "flex-start" },
  favOneLiner: { flex: 1, fontSize: 13, color: "#95D5B2", fontStyle: "italic", lineHeight: 18 },
  favTags: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  favTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: "rgba(82,183,136,0.12)", borderWidth: 1, borderColor: "rgba(82,183,136,0.25)" },
  favTagText: { fontSize: 10, fontWeight: "500", color: "#52B788" },

  section: { paddingTop: 4, paddingHorizontal: 20, marginBottom: 4 },
  sectionTitle: { fontSize: 13, fontFamily: "DMSans_700Bold", color: C.subtext, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 },

  activityRow: { flexDirection: "row", gap: 8 },
  activityCard: { alignItems: "center" },
  activityPoster: { width: CARD_W, height: CARD_H, borderRadius: 8, backgroundColor: C.surface },
  posterPlaceholder: { justifyContent: "center", alignItems: "center" },
  activityRating: { marginTop: 5 },

  // Rating distribution
  chartContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 },
  chartTitle: { fontSize: 13, color: "#40916C", fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  distRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 5 },
  distLabel: { fontSize: 11, fontFamily: "DMSerifDisplay_400Regular", color: "#95D5B2", width: 24, textAlign: "right" },
  distStar: { fontSize: 10, color: "#F59E0B" },
  distBarBg: { flex: 1, height: 6, backgroundColor: "#1B4332", borderRadius: 3, overflow: "hidden" },
  distBarFill: { height: "100%", borderRadius: 3, backgroundColor: "#52B788" },
  distCount: { fontSize: 10, color: "#40916C", width: 20 },

  // Tabs
  tabBar: { borderBottomWidth: 1, borderBottomColor: "rgba(45,106,79,0.3)", marginTop: 16 },
  tabBarContent: { flexDirection: "row" },
  tabItem: { paddingHorizontal: 16, paddingVertical: 10, position: "relative", alignItems: "center" },
  tabLabel: { fontSize: 12, fontWeight: "500", color: "#40916C" },
  tabLabelActive: { color: "#52B788" },
  tabIndicator: { position: "absolute", bottom: -1, left: 0, right: 0, height: 2, backgroundColor: "#52B788", borderRadius: 2 },

  // Shows grid
  showsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, padding: 12, paddingHorizontal: 20 },
  gridThumb: { width: (SCREEN_W - 40 - 12) / 3, aspectRatio: 2 / 3, borderRadius: 8, backgroundColor: C.card, overflow: "hidden", position: "relative" },
  likeHeart: { position: "absolute", bottom: 4, right: 4, fontSize: 14, color: "#EF4444" },

  // Reviews
  reviewsList: { padding: 12, paddingHorizontal: 20, gap: 12 },
  reviewCard: { backgroundColor: "#0d2b1d", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "rgba(45,106,79,0.3)", gap: 6 },
  reviewCardHeader: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  reviewCardTitle: { fontFamily: "DMSerifDisplay_400Regular", fontSize: 15, color: C.text, flex: 1 },
  reviewCardText: { fontSize: 13, color: "#95D5B2", lineHeight: 19, fontStyle: "italic" },
  reviewCardTime: { fontSize: 11, color: "#40916C" },

  // Following
  followingRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(45,106,79,0.15)" },
  followingInfo: { flex: 1 },
  followingName: { fontSize: 14, fontWeight: "600", color: C.text },
  followingHandle: { fontSize: 12, color: C.accent, marginTop: 1 },

  tabEmpty: { padding: 32, alignItems: "center" },
  tabEmptyText: { fontSize: 14, color: "#40916C" },
});
