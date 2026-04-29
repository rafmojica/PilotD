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
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useFocusEffect } from "@react-navigation/native";
import Svg, { Path, Polyline, Rect } from "react-native-svg";
import InitialsAvatar from "../../components/InitialsAvatar";
import Stars from "../../components/Stars";
import FadeInView from "../../components/FadeInView";
import PressScale from "../../components/PressScale";

const TVMAZE = "https://api.tvmaze.com";

const C = {
  bg: "#081C15",
  surface: "#0D2319",
  accent: "#52B788",
  gold: "#F59E0B",
  text: "#D8F3DC",
  subtext: "#74C69D",
  muted: "#2D6A4F",
  border: "#1B4332",
};

const ActivityCard = ({ rating, posterUri, onPress }) => (
  <PressScale scale={0.94} onPress={onPress}>
    <View style={styles.activityCard}>
      {posterUri ? (
        <Image
          source={{ uri: posterUri }}
          style={styles.activityPoster}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.activityPoster, styles.posterPlaceholder]}>
          <Svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#40916C"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
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

const UserProfile = ({ navigation, route }) => {
  const { userId, displayName: initialName } = route.params;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [posters, setPosters] = useState({});
  const [counts, setCounts] = useState({
    showsCount: 0,
    reviewsCount: 0,
    followersCount: 0,
    followingCount: 0,
  });
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    const currentUid = auth.currentUser?.uid;
    try {
      const [
        userSnap,
        ratingsSnap,
        followersSnap,
        followingSnap,
        diarySnap,
        followStatusSnap,
      ] = await Promise.all([
        getDoc(doc(db, "users", userId)),
        getDocs(collection(db, "users", userId, "showRatings")),
        getDocs(collection(db, "users", userId, "followers")),
        getDocs(collection(db, "users", userId, "following")),
        getDocs(
          query(
            collection(db, "users", userId, "diary"),
            orderBy("watchedDate", "desc"),
            limit(4),
          ),
        ),
        // Check if the current user already follows this person
        currentUid
          ? getDoc(doc(db, "users", currentUid, "following", userId))
          : Promise.resolve({ exists: () => false }),
      ]);

      if (userSnap.exists()) {
        setUser({ uid: userId, ...userSnap.data() });
      }

      setCounts({
        showsCount: ratingsSnap.size,
        reviewsCount: 0,
        followersCount: followersSnap.size,
        followingCount: followingSnap.size,
      });

      setIsFollowing(followStatusSnap.exists());

      const activity = diarySnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRecentActivity(activity);

      const showIds = [
        ...new Set(activity.map((e) => e.showId).filter(Boolean)),
      ];
      const results = await Promise.allSettled(
        showIds.map((id) =>
          fetch(`${TVMAZE}/shows/${id}`)
            .then((r) => r.json())
            .then((data) => ({ id, uri: data?.image?.medium ?? null })),
        ),
      );
      const map = {};
      results.forEach((r) => {
        if (r.status === "fulfilled" && r.value.uri)
          map[r.value.id] = r.value.uri;
      });
      setPosters(map);
    } catch (err) {
      console.error("[UserProfile] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile]),
  );

  const handleToggleFollow = async () => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid || followLoading) return;

    // Optimistic update
    setFollowLoading(true);
    const willFollow = !isFollowing;
    setIsFollowing(willFollow);
    setCounts((prev) => ({
      ...prev,
      followersCount: prev.followersCount + (willFollow ? 1 : -1),
    }));

    try {
      const myFollowingRef = doc(db, "users", currentUid, "following", userId);
      const theirFollowersRef = doc(
        db,
        "users",
        userId,
        "followers",
        currentUid,
      );

      if (willFollow) {
        const ts = { followedAt: serverTimestamp() };
        await Promise.all([
          setDoc(myFollowingRef, ts),
          setDoc(theirFollowersRef, ts),
        ]);
      } else {
        await Promise.all([
          deleteDoc(myFollowingRef),
          deleteDoc(theirFollowersRef),
        ]);
      }
    } catch (err) {
      // Roll back on failure
      console.error("[UserProfile] follow error:", err);
      setIsFollowing(!willFollow);
      setCounts((prev) => ({
        ...prev,
        followersCount: prev.followersCount + (willFollow ? -1 : 1),
      }));
    } finally {
      setFollowLoading(false);
    }
  };

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

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={styles.loadingText}>
            Loading {initialName ? `${initialName}'s` : ""} profile…
          </Text>
        </View>
      ) : (
        <FadeInView>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
          >
            {/* Header */}
            <View style={styles.header}>
              <InitialsAvatar
                name={user?.displayName ?? initialName}
                photoURL={user?.photoURL}
                size={70}
                color={user?.avatarColor}
                style={{ borderWidth: 2, borderColor: "#52B788" }}
              />
              <View style={styles.headerInfo}>
                <Text style={styles.displayName}>
                  {user?.displayName ?? initialName}
                </Text>
                {user?.username ? (
                  <Text style={styles.username}>@{user.username}</Text>
                ) : null}
                {user?.bio ? (
                  <Text style={styles.bio}>{user.bio}</Text>
                ) : null}
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
                <Text style={styles.profileStatNum}>
                  {counts.followersCount}
                </Text>
                <Text style={styles.profileStatLabel}>Followers</Text>
              </View>
              <View style={styles.profileStatItem}>
                <Text style={styles.profileStatNum}>
                  {counts.followingCount}
                </Text>
                <Text style={styles.profileStatLabel}>Following</Text>
              </View>
            </View>

            {/* Follow button */}
            <TouchableOpacity
              style={[
                styles.followBtn,
                isFollowing && styles.followBtnActive,
              ]}
              onPress={handleToggleFollow}
              disabled={followLoading}
              activeOpacity={0.75}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color={isFollowing ? C.accent : C.bg} />
              ) : (
                <Text
                  style={[
                    styles.followBtnText,
                    isFollowing && styles.followBtnTextActive,
                  ]}
                >
                  {isFollowing ? "Following" : "Follow"}
                </Text>
              )}
            </TouchableOpacity>

            {/* Recent Activity */}
            {recentActivity.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.activityRow}
                >
                  {recentActivity.map((entry) => (
                    <ActivityCard
                      key={entry.id}
                      showId={entry.showId}
                      rating={entry.rating}
                      posterUri={posters[entry.showId]}
                      onPress={() =>
                        navigation.navigate("ShowCard", {
                          showId: entry.showId,
                        })
                      }
                    />
                  ))}
                </ScrollView>
              </View>
            )}
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

  backBtn: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    alignSelf: "flex-start",
  },

  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
  },
  loadingText: { color: C.subtext, fontSize: 14, fontWeight: "500" },

  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 0,
    flexDirection: "row",
    gap: 16,
    alignItems: "flex-start",
  },
  headerInfo: { flex: 1 },
  displayName: {
    fontSize: 22,
    fontFamily: "DMSerifDisplay_400Regular",
    color: C.text,
    marginBottom: 2,
  },
  username: {
    fontSize: 13,
    color: C.accent,
    marginBottom: 6,
  },
  bio: {
    fontSize: 13,
    color: "#95D5B2",
    lineHeight: 19,
  },

  profileStats: {
    flexDirection: "row",
    gap: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  profileStatItem: { alignItems: "center" },
  profileStatNum: { fontSize: 20, fontWeight: "700", color: C.text },
  profileStatLabel: { fontSize: 11, color: "#40916C", marginTop: 2 },

  followBtn: {
    marginHorizontal: 20,
    marginBottom: 4,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
  followBtnActive: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#40916C",
  },
  followBtnText: {
    color: C.bg,
    fontSize: 14,
    fontWeight: "600",
  },
  followBtnTextActive: {
    color: C.accent,
  },

  section: { paddingTop: 20, paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "DMSans_700Bold",
    color: C.subtext,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },

  activityRow: { flexDirection: "row" },
  activityCard: { marginRight: 10, alignItems: "center" },
  activityPoster: {
    width: 80,
    height: 116,
    borderRadius: 8,
    backgroundColor: C.surface,
  },
  posterPlaceholder: { justifyContent: "center", alignItems: "center" },
  activityRating: { marginTop: 5 },
});
