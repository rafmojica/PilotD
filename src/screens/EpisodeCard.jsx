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
} from "react-native";
import { doc, getDoc, runTransaction } from "firebase/firestore";
import { db, auth } from "../config/firebase";
import Stars from "../components/Stars";

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
  overlay: "rgba(8,28,21,0.88)",
};

// ─── Firebase helpers ─────────────────────────────────────────────────────────
//
// Firestore structure for episode ratings:
//   shows/{showId}/episodes/{episodeId}/
//     averageRating: 4.3
//     totalRatings: 203
//     ratingsSum: 871
//
//   users/{uid}/episodeRatings/{episodeId}/
//     rating: 4
//     updatedAt: timestamp
//
//   shows/{showId}/episodes/{episodeId}/reviews/{reviewId}/
//     uid, displayName, rating, text, likes, createdAt

const fetchEpisodeRatingData = async (showId, episodeId) => {
  const user = auth.currentUser;

  const [epDoc, userRatingDoc] = await Promise.all([
    getDoc(doc(db, "shows", String(showId), "episodes", String(episodeId))),
    user
      ? getDoc(
          doc(db, "users", user.uid, "episodeRatings", String(episodeId))
        )
      : Promise.resolve(null),
  ]);

  return {
    community: epDoc.exists()
      ? {
          average: epDoc.data().averageRating ?? 0,
          total: epDoc.data().totalRatings ?? 0,
        }
      : null,
    myRating: userRatingDoc?.exists() ? userRatingDoc.data().rating : 0,
  };
};

const submitEpisodeRating = async (showId, episodeId, newRating, prevRating) => {
  const user = auth.currentUser;
  if (!user) return;

  const epRef = doc(db, "shows", String(showId), "episodes", String(episodeId));
  const userRatingRef = doc(
    db,
    "users",
    user.uid,
    "episodeRatings",
    String(episodeId)
  );
  const hadPrev = prevRating > 0;

  await runTransaction(db, async (transaction) => {
    const epDoc = await transaction.get(epRef);

    if (!epDoc.exists()) {
      transaction.set(epRef, {
        totalRatings: 1,
        ratingsSum: newRating,
        averageRating: newRating,
      });
    } else {
      const { totalRatings, ratingsSum } = epDoc.data();
      const newTotal = hadPrev ? totalRatings : totalRatings + 1;
      const newSum = ratingsSum - (hadPrev ? prevRating : 0) + newRating;
      transaction.update(epRef, {
        totalRatings: newTotal,
        ratingsSum: newSum,
        averageRating: newSum / newTotal,
      });
    }

    transaction.set(userRatingRef, {
      rating: newRating,
      updatedAt: new Date(),
    });
  });
};

// ─── Mock reviews ─────────────────────────────────────────────────────────────
// Replace with real Firestore reads once reviews are wired up

const MOCK_REVIEWS = [
  {
    id: "r1",
    user: "tv_dad",
    initials: "JR",
    avatarColor: "#D97706",
    rating: 5,
    text: "One of the greatest single episodes of television ever produced. The direction is flawless.",
    likes: 312,
    date: "Mar 2024",
  },
  {
    id: "r2",
    user: "sara_m",
    initials: "SM",
    avatarColor: "#8B5CF6",
    rating: 5,
    text: "I was not ready for this. Had to sit in silence for 10 minutes after.",
    likes: 209,
    date: "Feb 2024",
  },
  {
    id: "r3",
    user: "xeno_watch",
    initials: "AT",
    avatarColor: "#10B981",
    rating: 4,
    text: "Brutal and brilliant. Not easy to watch but impossible to look away.",
    likes: 88,
    date: "Jan 2024",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const stripHtml = (html) =>
  html
    ? html
        .replace(/<[^>]*>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&#39;/g, "'")
    : "";

// ─── Sub-components ───────────────────────────────────────────────────────────

const AvatarCircle = ({ initials, color, size = 32 }) => (
  <View
    style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: color,
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <Text style={{ color: "#fff", fontSize: size * 0.34, fontWeight: "800" }}>
      {initials}
    </Text>
  </View>
);

// ─── Dual Rating Display ──────────────────────────────────────────────────────
// Same pattern as ShowCard — community avg on left, personal on right

const DualRatingDisplay = ({ communityRating, myRating, onRatePress }) => (
  <View style={styles.dualRating}>
    <View style={styles.ratingBox}>
      <Text style={styles.ratingBoxLabel}>Community</Text>
      <Text style={styles.ratingBoxNum}>
        {communityRating ? communityRating.average.toFixed(1) : "—"}
      </Text>
      {communityRating ? (
        <>
          <Stars rating={communityRating.average} size={12} />
          <Text style={styles.ratingBoxCount}>
            {communityRating.total >= 1000
              ? `${(communityRating.total / 1000).toFixed(1)}k`
              : communityRating.total}{" "}
            ratings
          </Text>
        </>
      ) : (
        <Text style={styles.ratingBoxSub}>No ratings yet</Text>
      )}
    </View>

    <View style={styles.ratingDivider} />

    <TouchableOpacity style={styles.ratingBox} onPress={onRatePress}>
      <Text style={styles.ratingBoxLabel}>Your Rating</Text>
      <Text
        style={[
          styles.ratingBoxNum,
          { color: myRating > 0 ? C.gold : C.muted },
        ]}
      >
        {myRating > 0 ? myRating.toFixed(1) : "—"}
      </Text>
      {myRating > 0 ? (
        <>
          <Stars rating={myRating} size={12} />
          <Text style={[styles.ratingBoxCount, { color: C.accent }]}>
            Edit ›
          </Text>
        </>
      ) : (
        <Text style={styles.ratingBoxSub}>Tap to rate</Text>
      )}
    </TouchableOpacity>
  </View>
);

// ─── Rate Modal ───────────────────────────────────────────────────────────────

const RateModal = ({ visible, onClose, currentRating, onRate, episodeName, saving }) => {
  const [tempRating, setTempRating] = useState(currentRating);

  useEffect(() => {
    if (visible) setTempRating(currentRating);
  }, [visible, currentRating]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.rateSheet}>
          <Text style={styles.rateLabel}>Rate this episode</Text>
          <Text style={styles.rateEpisodeName} numberOfLines={2}>
            {episodeName}
          </Text>
          <Stars
            rating={tempRating}
            size={38}
            interactive
            onRate={setTempRating}
          />
          <Text style={styles.rateValue}>
            {tempRating > 0
              ? `${tempRating} star${tempRating !== 1 ? "s" : ""}`
              : "Tap a star"}
          </Text>
          <View style={styles.rateActions}>
            <TouchableOpacity style={styles.rateCancelBtn} onPress={onClose}>
              <Text style={styles.rateCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.rateConfirmBtn,
                (saving || tempRating === 0) && { opacity: 0.5 },
              ]}
              disabled={saving || tempRating === 0}
              onPress={() => onRate(tempRating)}
            >
              <Text style={styles.rateConfirmText}>
                {saving ? "Saving…" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Review Card ──────────────────────────────────────────────────────────────

const ReviewCard = ({ review, compact }) => (
  <View style={styles.reviewCard}>
    <View style={styles.reviewHeader}>
      <AvatarCircle
        initials={review.initials}
        color={review.avatarColor}
        size={30}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.reviewUser}>{review.user}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Stars rating={review.rating} size={11} />
          <Text style={styles.reviewDate}>{review.date}</Text>
        </View>
      </View>
      <Text style={styles.reviewLikes}>♥ {review.likes}</Text>
    </View>
    <Text
      style={styles.reviewText}
      numberOfLines={compact ? 3 : undefined}
    >
      {review.text}
    </Text>
  </View>
);

// ─── Section ──────────────────────────────────────────────────────────────────

const Section = ({ title, children, action, onAction }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
    {children}
  </View>
);

// ─── Main EpisodeCard Screen ──────────────────────────────────────────────────
// Navigate here from ShowCard with:
// navigation.navigate("EpisodeCard", {
//   episodeId: ep.id,
//   showId: 169,
//   showName: "Breaking Bad",
//   seasonNumber: 5,
// })

const EpisodeCard = ({ route, navigation }) => {
  const {
    episodeId,
    showId,
    showName = "Unknown Show",
    seasonNumber,
  } = route?.params ?? {};

  // TVMaze episode data
  const [episode, setEpisode] = useState(null);
  const [showImage, setShowImage] = useState(null);
  const [loading, setLoading] = useState(true);

  // Firebase rating data
  const [communityRating, setCommunityRating] = useState(null);
  const [myRating, setMyRating] = useState(0);
  const [savingRating, setSavingRating] = useState(false);

  // UI state
  const [showRateModal, setShowRateModal] = useState(false);
  const [hearted, setHearted] = useState(false);
  const [liked, setLiked] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [expandDesc, setExpandDesc] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  // ── Fetch episode data from TVMaze + ratings from Firebase ──
  const fetchAll = useCallback(async () => {
    console.log("EpisodeCard params:", { episodeId, showId, showName, seasonNumber });
    try {
      const [epData, ratingData] = await Promise.all([
        fetch(`${TVMAZE}/episodes/${episodeId}`).then((r) => r.json()),
        fetchEpisodeRatingData(showId, episodeId),
      ]);

      setEpisode(epData);
      setCommunityRating(ratingData.community);
      setMyRating(ratingData.myRating);

      // Also grab the show poster for the hero background
      const showData = await fetch(`${TVMAZE}/shows/${showId}`).then((r) =>
        r.json()
      );
      setShowImage(showData?.image?.original ?? null);
    } catch (err) {
      console.error("[EpisodeCard] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [episodeId, showId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Submit episode rating to Firebase ──
  const handleRateEpisode = useCallback(
    async (newRating) => {
      setSavingRating(true);
      try {
        await submitEpisodeRating(showId, episodeId, newRating, myRating);
        // Refresh from Firestore after save
        const updated = await fetchEpisodeRatingData(showId, episodeId);
        setCommunityRating(updated.community);
        setMyRating(updated.myRating);
        setShowRateModal(false);
      } catch (err) {
        console.error("[EpisodeCard] rating error:", err);
      } finally {
        setSavingRating(false);
      }
    },
    [showId, episodeId, myRating]
  );

  // ── Derived ──
  const description = stripHtml(episode?.summary);
  const episodeLabel = `S${String(seasonNumber ?? episode?.season ?? "?").padStart(2, "0")} E${String(episode?.number ?? "?").padStart(2, "0")}`;
  const episodeName = episode?.name ?? "Episode";
  const fullTitle = `${episodeLabel} — ${episodeName}`;
  const airDate = episode?.airdate
    ? new Date(episode.airdate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>Loading episode…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Back button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation?.goBack()}
      >
        <Text style={styles.backBtnText}>‹ Back</Text>
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── Hero ── */}
        <View style={styles.hero}>
          {/* Use episode image if available, else fall back to show image */}
          {(episode?.image?.original ?? showImage) && (
            <Image
              source={{ uri: episode?.image?.original ?? showImage }}
              style={styles.heroBg}
              resizeMode="cover"
            />
          )}
          <View style={styles.heroOverlay} />

          <View style={styles.heroContent}>
            {/* Episode still / thumbnail */}
            {episode?.image?.medium ? (
              <Image
                source={{ uri: episode.image.medium }}
                style={styles.still}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.still, styles.stillPlaceholder]}>
                <Text style={{ fontSize: 32 }}>📺</Text>
              </View>
            )}

            <View style={styles.heroInfo}>
              {/* Show name breadcrumb */}
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("ShowCard", { showId })
                }
              >
                <Text style={styles.showBreadcrumb}>
                  {showName}  ›
                </Text>
              </TouchableOpacity>

              {/* Episode code badge */}
              <View style={styles.epCodeBadge}>
                <Text style={styles.epCodeText}>{episodeLabel}</Text>
              </View>

              <Text style={styles.episodeTitle}>{episodeName}</Text>

              {airDate && (
                <Text style={styles.airDate}>Aired {airDate}</Text>
              )}
              {episode?.runtime && (
                <Text style={styles.runtime}>{episode.runtime} min</Text>
              )}
            </View>
          </View>
        </View>

        {/* ── Action buttons ── */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              hearted && {
                backgroundColor: C.heartSoft,
                borderColor: C.heart + "60",
              },
            ]}
            onPress={() => setHearted((p) => !p)}
          >
            <Text
              style={[
                styles.actionIcon,
                { color: hearted ? C.heart : C.subtext },
              ]}
            >
              {hearted ? "♥" : "♡"}
            </Text>
            <Text
              style={[styles.actionLabel, hearted && { color: C.heart }]}
            >
              Save
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={() => setShowRateModal(true)}
          >
            <Text style={[styles.actionIcon, { color: "#fff" }]}>★</Text>
            <Text style={[styles.actionLabel, { color: "#fff" }]}>
              {myRating > 0 ? `${myRating}★` : "Rate Episode"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              liked && {
                backgroundColor: C.accentSoft,
                borderColor: C.accent + "60",
              },
            ]}
            onPress={() => setLiked((p) => !p)}
          >
            <Text
              style={[
                styles.actionIcon,
                { color: liked ? C.accent : C.subtext },
              ]}
            >
              👍
            </Text>
            <Text
              style={[styles.actionLabel, liked && { color: C.accent }]}
            >
              Like
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Ratings ── */}
        <Section title="Ratings">
          <DualRatingDisplay
            communityRating={communityRating}
            myRating={myRating}
            onRatePress={() => setShowRateModal(true)}
          />
        </Section>

        {/* ── Description ── */}
        {description ? (
          <Section title="Synopsis">
            <Text
              style={styles.description}
              numberOfLines={expandDesc ? undefined : 4}
            >
              {description}
            </Text>
            {description.length > 200 && (
              <TouchableOpacity onPress={() => setExpandDesc((p) => !p)}>
                <Text style={styles.expandBtn}>
                  {expandDesc ? "Show less ▲" : "Read more ▼"}
                </Text>
              </TouchableOpacity>
            )}
          </Section>
        ) : null}

        {/* ── Details ── */}
        <Section title="Details">
          <View style={styles.detailsGrid}>
            {[
              ["Show", showName],
              ["Season", String(seasonNumber ?? episode?.season ?? "—")],
              ["Episode", String(episode?.number ?? "—")],
              ...(airDate ? [["Air Date", airDate]] : []),
              ...(episode?.runtime
                ? [["Runtime", `${episode.runtime} min`]]
                : []),
              ...(episode?.type ? [["Type", episode.type]] : []),
            ].map(([label, value]) => (
              <View key={label} style={styles.detailItem}>
                <Text style={styles.detailLabel}>{label}</Text>
                <Text style={styles.detailValue} numberOfLines={2}>
                  {value}
                </Text>
              </View>
            ))}
          </View>
        </Section>

        {/* ── Popular Reviews ── */}
        <Section
          title="Reviews"
          action={showAllReviews ? "Hide" : "See All"}
          onAction={() => setShowAllReviews((p) => !p)}
        >
          {(showAllReviews ? MOCK_REVIEWS : MOCK_REVIEWS.slice(0, 2)).map(
            (r) => (
              <ReviewCard key={r.id} review={r} compact={!showAllReviews} />
            )
          )}
        </Section>

        {/* ── Leave a Review ── */}
        <Section title="Leave a Review">
          <View style={styles.reviewInputBlock}>
            <View style={styles.reviewRatingRow}>
              <Text style={styles.reviewRatingLabel}>Rating:</Text>
              <Stars
                rating={myRating}
                size={18}
                interactive
                onRate={(r) => {
                  setMyRating(r);
                  setShowRateModal(true);
                }}
              />
            </View>
            <TextInput
              style={styles.reviewInput}
              placeholder="Write your thoughts on this episode…"
              placeholderTextColor={C.muted}
              multiline
              value={reviewText}
              onChangeText={setReviewText}
            />
            <TouchableOpacity
              style={[
                styles.submitBtn,
                !reviewText.trim() && styles.submitBtnDisabled,
              ]}
              disabled={!reviewText.trim()}
              onPress={() => {
                // TODO: save review to Firebase
                // await addDoc(
                //   collection(db, "shows", String(showId), "episodes", String(episodeId), "reviews"),
                //   {
                //     uid: auth.currentUser.uid,
                //     rating: myRating,
                //     text: reviewText.trim(),
                //     createdAt: serverTimestamp(),
                //     likes: 0,
                //   }
                // );
                console.log("Submit episode review:", {
                  myRating,
                  reviewText,
                });
                setReviewText("");
              }}
            >
              <Text style={styles.submitBtnText}>Post Review</Text>
            </TouchableOpacity>
          </View>
        </Section>

        {/* ── Navigate back to full show ── */}
        <View style={styles.showLinkSection}>
          <TouchableOpacity
            style={styles.showLinkBtn}
            onPress={() => navigation.navigate("ShowCard", { showId })}
          >
            <Text style={styles.showLinkText}>
              View all episodes of {showName}  →
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Rate Modal ── */}
      <RateModal
        visible={showRateModal}
        onClose={() => setShowRateModal(false)}
        currentRating={myRating}
        onRate={handleRateEpisode}
        episodeName={fullTitle}
        saving={savingRating}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 60 },
  loadingScreen: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
  },
  loadingText: { color: C.subtext, fontSize: 14, fontWeight: "500" },

  backBtn: {
    position: "absolute",
    top: 52,
    left: 16,
    zIndex: 10,
    backgroundColor: C.overlay,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  backBtnText: { color: C.text, fontSize: 14, fontWeight: "600" },

  // Hero
  hero: { height: 300, justifyContent: "flex-end" },
  heroBg: { position: "absolute", width: "100%", height: "100%" },
  heroOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: C.bg,
    opacity: 0.78,
  },
  heroContent: {
    flexDirection: "row",
    padding: 16,
    gap: 14,
    alignItems: "flex-end",
  },
  still: {
    width: 120,
    height: 68,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: C.border2,
    backgroundColor: C.surface,
  },
  stillPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  heroInfo: { flex: 1, gap: 5 },
  showBreadcrumb: {
    fontSize: 12,
    color: C.accent,
    fontWeight: "600",
  },
  epCodeBadge: {
    alignSelf: "flex-start",
    backgroundColor: C.card,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: C.border2,
  },
  epCodeText: {
    fontSize: 11,
    color: C.subtext,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  episodeTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  airDate: { fontSize: 12, color: C.subtext },
  runtime: { fontSize: 12, color: C.muted },

  // Actions
  actionRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border2,
    backgroundColor: C.surface,
    gap: 4,
  },
  actionBtnPrimary: {
    backgroundColor: C.accent,
    borderColor: C.accent,
    flex: 1.4,
  },
  actionIcon: { fontSize: 18, color: C.subtext },
  actionLabel: { fontSize: 11, color: C.subtext, fontWeight: "600" },

  // Section
  section: { paddingHorizontal: 16, paddingTop: 22 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.subtext,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  sectionAction: { fontSize: 12, color: C.accent, fontWeight: "600" },

  // Dual rating
  dualRating: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  ratingBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    gap: 4,
  },
  ratingDivider: { width: 1, backgroundColor: C.border },
  ratingBoxLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  ratingBoxNum: {
    fontSize: 32,
    fontWeight: "800",
    color: C.gold,
    lineHeight: 36,
  },
  ratingBoxSub: { fontSize: 11, color: C.muted },
  ratingBoxCount: { fontSize: 11, color: C.subtext, marginTop: 2 },

  // Description
  description: { fontSize: 14, color: C.text, lineHeight: 21 },
  expandBtn: {
    color: C.accent,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },

  // Details
  detailItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 12,
  },
  detailLabel: { fontSize: 13, color: C.muted, fontWeight: "600", flex: 1 },
  detailValue: { fontSize: 13, color: C.text, flex: 2, textAlign: "right" },

  // Reviews
  reviewCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  reviewUser: { fontSize: 13, color: C.text, fontWeight: "700" },
  reviewDate: { fontSize: 11, color: C.muted },
  reviewLikes: { fontSize: 12, color: C.heart, marginLeft: "auto" },
  reviewText: { fontSize: 13, color: C.subtext, lineHeight: 19 },

  // Review input
  reviewInputBlock: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  reviewRatingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  reviewRatingLabel: { fontSize: 13, color: C.subtext, fontWeight: "500" },
  reviewInput: {
    backgroundColor: C.card,
    borderRadius: 10,
    padding: 12,
    color: C.text,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: C.border2,
  },
  submitBtn: {
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Show link
  showLinkSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  showLinkBtn: {
    backgroundColor: C.surface,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border2,
  },
  showLinkText: {
    fontSize: 13,
    color: C.accent,
    fontWeight: "600",
  },

  // Rate modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  rateSheet: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 24,
    margin: 20,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: C.border2,
    width: "85%",
  },
  rateLabel: {
    fontSize: 12,
    color: C.subtext,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  rateEpisodeName: {
    fontSize: 16,
    fontWeight: "800",
    color: C.text,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  rateValue: { fontSize: 14, color: C.subtext },
  rateActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    width: "100%",
  },
  rateCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border2,
    alignItems: "center",
  },
  rateCancelText: { color: C.subtext, fontWeight: "600" },
  rateConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: C.accent,
    alignItems: "center",
  },
  rateConfirmText: { color: "#fff", fontWeight: "700" },
});

export default EpisodeCard;