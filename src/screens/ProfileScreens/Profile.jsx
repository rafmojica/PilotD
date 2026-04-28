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
} from "react-native";
import { signOut } from "firebase/auth";
import { auth, db } from "../../config/firebase";
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import Stars from "../../components/Stars";

// ─── Constants ────────────────────────────────────────────────────────────────
// Same palette as PublicLists.jsx — keep these in sync across screens

const TVMAZE = "https://api.tvmaze.com";

const C = {
  bg: "#081C15",
  surface: "#0D2319",
  card: "#1B4332",
  accent: "#52B788",
  accentSoft: "#52B78822",
  gold: "#F59E0B",
  goldSoft: "#F59E0B20",
  text: "#D8F3DC",
  subtext: "#74C69D",
  muted: "#2D6A4F",
  border: "#1B4332",
  border2: "#2D6A4F",
  heart: "#EF4444",
  heartSoft: "#EF444420",
};

// ─── Rating Distribution Bar Chart ───────────────────────────────────────────

const RatingChart = ({ distribution }) => {
  const values = Object.values(distribution);
  const maxVal = Math.max(...values, 1);
  const labels = Object.keys(distribution);

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.sectionTitle}>Rating Distribution</Text>
      <View style={styles.chart}>
        {labels.map((label, i) => {
          const barHeight = Math.max(4, (values[i] / maxVal) * 80);
          return (
            <View key={label} style={styles.barWrapper}>
              <Text style={styles.barCount}>{values[i]}</Text>
              <View style={[styles.bar, { height: barHeight }]} />
              <Text style={styles.barLabel}>{label}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.chartStarRow}>
        <Text style={{ color: C.gold, fontSize: 11 }}>★</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: C.muted, marginHorizontal: 6 }} />
        <Text style={{ color: C.gold, fontSize: 11 }}>★★★★★</Text>
      </View>
    </View>
  );
};

// ─── Recent Activity Card ─────────────────────────────────────────────────────

const ActivityCard = ({ showId, rating, posterUri, onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
    <View style={styles.activityCard}>
      {posterUri ? (
        <Image source={{ uri: posterUri }} style={styles.activityPoster} resizeMode="cover" />
      ) : (
        <View style={[styles.activityPoster, styles.posterPlaceholder]}>
          <Text style={{ fontSize: 22 }}>📺</Text>
        </View>
      )}
      <View style={styles.activityRating}>
        <Stars rating={rating} size={10} />
      </View>
    </View>
  </TouchableOpacity>
);

// ─── Stats Row ────────────────────────────────────────────────────────────────
// Each row is tappable — navigation.navigate() calls are stubbed for now.
// When you create sub-screens (e.g. AllShows.jsx), replace the TODO comment
// with: navigation.navigate("AllShows")  etc.

const StatRow = ({ label, value, onPress, heart }) => (
  <TouchableOpacity style={styles.statRow} onPress={onPress} activeOpacity={0.7}>
    <Text style={[styles.statLabel, heart && { color: C.heart }]}>{label}</Text>
    <View style={styles.statRight}>
      {value !== undefined && (
        <Text style={styles.statValue}>{value}</Text>
      )}
      <Text style={styles.statChevron}>›</Text>
    </View>
  </TouchableOpacity>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

const Profile = ({ navigation }) => {
  const [posters, setPosters] = useState({});
  const [loading, setLoading] = useState(true);
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [user, setUser] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [ratingDistribution, setRatingDistribution] = useState({});
  const [counts, setCounts] = useState({ showsCount: 0, diaryCount: 0, listsCount: 0, reviewsCount: 0, likesCount: 0, followingCount: 0, followersCount: 0, tagsCount: 0 });

  const fetchAll = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      // Fetch user profile
      const userSnap = await getDoc(doc(db, "users", uid));
      if (userSnap.exists()) setUser({ uid, ...userSnap.data() });

      // Fetch TOTP
      setTotpEnabled(!!userSnap.data()?.totpEnabled);

      // Fetch 4 most recent diary entries
      const diarySnap = await getDocs(
        query(collection(db, "users", uid, "diary"), orderBy("watchedDate", "desc"), limit(4))
      );
      const activity = diarySnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRecentActivity(activity);

      // Fetch rating distribution from showRatings
      const ratingsSnap = await getDocs(collection(db, "users", uid, "showRatings"));
      const dist = {};
      ratingsSnap.docs.forEach((d) => {
        const r = d.data().rating;
        if (r) dist[r] = (dist[r] ?? 0) + 1;
      });
      setRatingDistribution(dist);

      // Fetch counts
      const [listsSnap, diaryCountSnap, likesSnap, followingSnap, followersSnap] =
        await Promise.all([
          getDocs(collection(db, "users", uid, "lists")),
          getDocs(collection(db, "users", uid, "diary")),
          getDocs(collection(db, "users", uid, "likes")),
          getDocs(collection(db, "users", uid, "following")),
          getDocs(collection(db, "users", uid, "followers")),
        ]);
      setCounts({
        showsCount: ratingsSnap.size,
        diaryCount: diaryCountSnap.size,
        listsCount: listsSnap.size,
        likesCount: likesSnap.size,
        followingCount: followingSnap.size,
        followersCount: followersSnap.size,
        reviewsCount: 0, // TODO: add reviews collection
        tagsCount: 0,    // TODO: add tags collection
      });

      // Fetch posters for recent activity
      const showIds = [...new Set(activity.map((e) => e.showId).filter(Boolean))];
      const results = await Promise.allSettled(
        showIds.map((id) =>
          fetch(`${TVMAZE}/shows/${id}`)
            .then((r) => r.json())
            .then((data) => ({ id, uri: data?.image?.medium ?? null }))
        )
      );
      const map = {};
      results.forEach((r) => {
        if (r.status === "fulfilled" && r.value.uri) map[r.value.id] = r.value.uri;
      });
      setPosters(map);
    } catch (err) {
      console.error("[Profile] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>Loading profile…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            {/* Avatar */}
            <View style={[styles.avatar, { backgroundColor: user?.avatarColor }]}>
              <Text style={styles.avatarText}>{user?.initials}</Text>
            </View>

            <View style={styles.headerInfo}>
              <Text style={styles.displayName}>{user?.displayName}</Text>
              <Text style={styles.username}>{user?.username}</Text>
              {user?.bio ? (
                <Text style={styles.bio}>{user.bio}</Text>
              ) : null}
            </View>

            <TouchableOpacity style={styles.editBtn}>
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Recent Activity ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activityRow}>
            {recentActivity.map((entry ) => (
              <ActivityCard
                key={entry.id}
                showId={entry.showId}
                rating={entry.rating}
                posterUri={posters[entry.showId]}
                onPress={() => navigation.navigate("ShowCard", { showId: entry.showId })}
              />
            ))}
          </ScrollView>
        </View>

        {/* ── Rating Distribution ── */}
        <RatingChart distribution={ratingDistribution}/>

        {/* ── Stats ── */}
        <View style={styles.statsSection}>

          {/* 
            TODO: Replace navigation.navigate stubs below with real screen names
            once those sub-screens are built.
            e.g. navigation.navigate("AllShows"), navigation.navigate("AllReviews"), etc.
          */}
          <StatRow
            label="Diary"
            value={counts.diaryCount}
            onPress={() => navigation.navigate("Diary")}
          />
          <View style={styles.divider} />

          <StatRow
            label="Lists"
            value={counts.listsCount}
            onPress={() => navigation.navigate("Lists")}
          />
          <View style={styles.divider} />

          <StatRow
            label="Shows"
            value={counts.showsCount}
            onPress={() => console.log("TODO: navigate to AllShows")}
          />
          <View style={styles.divider} />

          <StatRow
            label="Reviews"
            value={counts.reviewsCount}
            onPress={() => console.log("TODO: navigate to AllReviews")}
          />
          <View style={styles.divider} />

          <StatRow
            label="Likes"
            value={counts.likesCount}
            heart
            onPress={() => console.log("TODO: navigate to Likes")}
          />
          <View style={styles.divider} />

          <StatRow
            label="Tags"
            value={counts.tagsCount}
            onPress={() => console.log("TODO: navigate to Tags")}
          />
          <View style={styles.divider} />

          <StatRow
            label="Following"
            value={counts.followingCount}
            onPress={() => console.log("TODO: navigate to Following")}
          />
          <View style={styles.divider} />

          <StatRow
            label="Followers"
            value={counts.followersCount}
            onPress={() => console.log("TODO: navigate to Followers")}
          />
        </View>

        {totpEnabled ? (
          <View style={styles.twoFactorEnabled}>
            <Text style={styles.twoFactorEnabledText}>✓  Two-Factor Auth Enabled</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.twoFactorBtn}
            onPress={() => navigation.navigate("TotpSetup")}
          >
            <Text style={styles.twoFactorText}>Enable Two-Factor Auth</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.signOutBtn} onPress={() => signOut(auth)}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

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

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 22, fontWeight: "800" },
  headerInfo: { flex: 1 },
  displayName: {
    fontSize: 20,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.3,
  },
  username: {
    fontSize: 13,
    color: C.subtext,
    marginTop: 2,
    fontWeight: "500",
  },
  bio: {
    fontSize: 12,
    color: C.subtext,
    marginTop: 5,
    lineHeight: 17,
  },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.border2,
  },
  editBtnText: { fontSize: 12, color: C.subtext, fontWeight: "600" },

  // Sections
  section: {
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.subtext,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },

  // Recent Activity
  activityRow: { flexDirection: "row" },
  activityCard: { marginRight: 10, alignItems: "center" },
  activityPoster: {
    width: 80,
    height: 116,
    borderRadius: 8,
    backgroundColor: C.surface,
  },
  posterPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  activityRating: { marginTop: 5 },

  // Rating chart
  chartContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 100,
    gap: 3,
  },
  barWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    backgroundColor: C.accent,
    borderRadius: 3,
    opacity: 0.85,
  },
  barCount: {
    fontSize: 7,
    color: C.subtext,
    marginBottom: 2,
  },
  barLabel: {
    fontSize: 7,
    color: C.muted,
    marginTop: 3,
  },
  chartStarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },

  // Stats list
  statsSection: {
    marginTop: 24,
    marginHorizontal: 16,
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  statLabel: {
    fontSize: 15,
    color: C.text,
    fontWeight: "500",
  },
  statRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statValue: {
    fontSize: 14,
    color: C.subtext,
    fontWeight: "500",
  },
  statChevron: {
    fontSize: 20,
    color: C.muted,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 16,
  },
  twoFactorBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border2,
    backgroundColor: C.surface,
    alignItems: "center",
  },
  twoFactorText: {
    color: C.accent,
    fontSize: 15,
    fontWeight: "600",
  },
  twoFactorEnabled: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.accent,
    backgroundColor: C.accentSoft,
    alignItems: "center",
  },
  twoFactorEnabledText: {
    color: C.accent,
    fontSize: 15,
    fontWeight: "700",
  },
  signOutBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#3d1a1a",
    backgroundColor: "#1a0a0a",
    alignItems: "center",
  },
  signOutText: {
    color: "#EF4444",
    fontSize: 15,
    fontWeight: "600",
  },
});

export default Profile;