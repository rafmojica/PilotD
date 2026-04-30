import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Stars from "../components/Stars";
import InitialsAvatar from "../components/InitialsAvatar";
import {doc, getDoc, runTransaction, collection, addDoc, setDoc, getDocs, query, where, limit, serverTimestamp, deleteDoc, updateDoc, increment } from "firebase/firestore";
import {db, auth } from "../config/firebase";

// ─── Constants ────────────────────────────────────────────────────────────────

const TVMAZE = "https://api.tvmaze.com";
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

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
  overlay: "rgba(8,28,21,0.85)",
};

// ─── Mock community data ──────────────────────────────────────────────────────

const MOCK_WHERE_TO_WATCH = [
  { name: "Netflix", type: "Stream" },
  { name: "AMC+", type: "Stream" },
  { name: "Apple TV", type: "Buy/Rent" },
  { name: "Amazon Prime", type: "Buy/Rent" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const stripHtml = (html) =>
  html ? html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'") : "";

const formatDate = (dateStr) => {
  if (!dateStr) return "Unknown";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
};

const submitShowRating = async (showId, newRating, prevRating) => {
  const user = auth.currentUser;
  if (!user) return;
  const showRef = doc(db, "shows", String(showId));
  const userRatingRef = doc(db, "users", user.uid, "showRatings", String(showId));
  const hadPrev = prevRating > 0;
  await runTransaction(db, async (transaction) => {
    const showDoc = await transaction.get(showRef);
    if (!showDoc.exists()) {
      transaction.set(showRef, { totalRatings: 1, ratingsSum: newRating, averageRating: newRating });
    } else {
      const { totalRatings, ratingsSum } = showDoc.data();
      const newTotal = hadPrev ? totalRatings : totalRatings + 1;
      const newSum = ratingsSum - (hadPrev ? prevRating : 0) + newRating;
      transaction.update(showRef, { totalRatings: newTotal, ratingsSum: newSum, averageRating: newSum / newTotal });
    }
    transaction.set(userRatingRef, { rating: newRating, updatedAt: new Date() });
  });
};

const writeDiaryEntry = async (showId, showName, rating, reviewText, likedValue = false) => {
  const user = auth.currentUser;
  if (!user) return;
  const existingQuery = await getDocs(
    query(collection(db, "users", user.uid, "diary"), where("showId", "==", showId), where("type", "==", "show"), limit(1))
  );
  const entryData = {
    showId,
    showName,
    type: "show",
    rating,
    review: reviewText ?? null,
    watchedDate: serverTimestamp(),
    rewatch: !existingQuery.empty,
    liked: likedValue,
    updatedAt: serverTimestamp(),
  };
  if (!existingQuery.empty) {
    await setDoc(doc(db, "users", user.uid, "diary", existingQuery.docs[0].id), entryData);
  } else {
    await addDoc(collection(db, "users", user.uid, "diary"), { ...entryData, createdAt: serverTimestamp() });
  }
};

// ─── Section wrapper ──────────────────────────────────────────────────────────

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

// ─── Rating distribution bar ──────────────────────────────────────────────────

// ─── Review card ──────────────────────────────────────────────────────────────

const ReviewCard = ({ review, compact = false, isLiked = false, onToggleLike, onComment, navigation, photoURL, commentCount = 0 }) => {
  const handlePressUser = () => {
    if (!navigation) return;
    if (review.uid === auth.currentUser?.uid) {
      navigation.navigate("ProfileTab");
    } else {
      navigation.navigate("UserProfile", { userId: review.uid, displayName: review.displayName });
    }
  };

  return (
    <TouchableOpacity style={styles.reviewCard} onPress={onComment} activeOpacity={0.75}>
      <View style={styles.reviewHeader}>
        <TouchableOpacity onPress={handlePressUser} activeOpacity={0.7}>
          <InitialsAvatar name={review.displayName ?? "?"} photoURL={photoURL} size={34} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <TouchableOpacity onPress={handlePressUser} activeOpacity={0.7}>
            <Text style={styles.reviewUser}>{review.displayName ?? "Anonymous"}</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Stars rating={review.rating ?? 0} size={11} />
            <Text style={styles.reviewDate}>
              {review.createdAt?.toDate?.().toLocaleDateString("en-US", {
                month: "short", year: "numeric"
              }) ?? ""}
            </Text>
          </View>
        </View>
      </View>
      <Text style={styles.reviewText} numberOfLines={compact ? 3 : undefined}>
        {review.text}
      </Text>
      <View style={styles.reviewActions}>
        <TouchableOpacity style={styles.reviewActionBtn} onPress={(e) => { e.stopPropagation?.(); onToggleLike(); }}>
          <Text style={[styles.reviewActionText, isLiked && { color: C.heart }]}>
            {isLiked ? "♥" : "♡"}  {review.likes ?? 0}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.reviewActionBtn} onPress={onComment}>
          <Text style={styles.reviewActionText}>
            💬  {commentCount > 0 ? `${commentCount} Comment${commentCount !== 1 ? "s" : ""}` : "Comment"}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// ─── Episode row ──────────────────────────────────────────────────────────────

const EpisodeRow = ({ episode, onPress }) => {
  const [myRating, setMyRating] = useState(0);
  return (
    <TouchableOpacity style={styles.episodeRow} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.episodeNum}>
        <Text style={styles.episodeNumText}>
          {String(episode.number).padStart(2, "0")}
        </Text>
      </View>
      <View style={styles.episodeInfo}>
        <Text style={styles.episodeName} numberOfLines={1}>
          {episode.name}
        </Text>
        <Text style={styles.episodeMeta}>
          {episode.runtime ? `${episode.runtime}m` : ""}
          {episode.airdate ? `  ·  ${episode.airdate}` : ""}
        </Text>
      </View>
      <Stars rating={myRating} size={12} interactive onRate={setMyRating} />
    </TouchableOpacity>
  );
};

// ─── Cast card ────────────────────────────────────────────────────────────────

const CastCard = ({ member }) => {
  const imgUri = member.person?.image?.medium;
  return (
    <View style={styles.castCard}>
      {imgUri ? (
        <Image source={{ uri: imgUri }} style={styles.castPhoto} resizeMode="cover" />
      ) : (
        <View style={[styles.castPhoto, styles.castPlaceholder]}>
          <Text style={{ fontSize: 24 }}>👤</Text>
        </View>
      )}
      <Text style={styles.castName} numberOfLines={2}>
        {member.person?.name}
      </Text>
      <Text style={styles.castChar} numberOfLines={1}>
        {member.character?.name}
      </Text>
    </View>
  );
};

// ─── Season picker modal ──────────────────────────────────────────────────────

const SeasonPicker = ({ seasons, selected, onSelect, visible, onClose }) => (
  <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
    <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} activeOpacity={1}>
      <View style={styles.pickerSheet}>
        <Text style={styles.pickerTitle}>Select Season</Text>
        {seasons.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={[styles.pickerRow, selected?.id === s.id && styles.pickerRowActive]}
            onPress={() => { onSelect(s); onClose(); }}
          >
            <Text style={[styles.pickerRowText, selected?.id === s.id && styles.pickerRowTextActive]}>
              Season {s.number}
              {s.name && s.name !== `Season ${s.number}` ? `  —  ${s.name}` : ""}
            </Text>
            <Text style={styles.pickerEpCount}>{s.episodeOrder ?? "?"} eps</Text>
          </TouchableOpacity>
        ))}
      </View>
    </TouchableOpacity>
  </Modal>
);

// ─── Rate modal ───────────────────────────────────────────────────────────────

const RateModal = ({ visible, onClose, currentRating, onRate, showTitle }) => {
  const [tempRating, setTempRating] = useState(currentRating);
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.rateSheet}>
          <Text style={styles.rateTitle}>Rate</Text>
          <Text style={styles.rateShowName} numberOfLines={2}>{showTitle}</Text>
          <Stars rating={tempRating} size={36} interactive onRate={setTempRating} />
          <Text style={styles.rateValue}>
            {tempRating > 0 ? `${tempRating} star${tempRating !== 1 ? "s" : ""}` : "Tap to rate"}
          </Text>
          <View style={styles.rateActions}>
            <TouchableOpacity style={styles.rateCancelBtn} onPress={onClose}>
              <Text style={styles.rateCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rateConfirmBtn}
              onPress={() => { onRate(tempRating); onClose(); }}
            >
              <Text style={styles.rateConfirmText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main ShowCard screen ─────────────────────────────────────────────────────

const ShowCard = ({ route, navigation }) => {
  const showId = route?.params?.showId ?? 169;

  // ── Data state ──
  const [show, setShow] = useState(null);
  const [backgroundUri, setBackgroundUri] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [allEpisodes, setAllEpisodes] = useState([]);
  const [cast, setCast] = useState([]);
  const [crew, setCrew] = useState([]);
  const [loading, setLoading] = useState(true);
  const [communityRating, setCommunityRating] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [prevRating, setPrevRating] = useState(0);
  const [likedReviewIds, setLikedReviewIds] = useState(new Set());
  const [myExistingReview, setMyExistingReview] = useState(null);

  // ── UI state ──
  const [activeSeason, setActiveSeason] = useState(null);
  const [showSeasonPicker, setShowSeasonPicker] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [ratingSaved, setRatingSaved] = useState(false);
  const [hearted, setHearted] = useState(false);
  const [liked, setLiked] = useState(false); // liked (Hearted)
  const [reviewText, setReviewText] = useState("");
  const [expandDescription, setExpandDescription] = useState(false);
  const [commentCounts, setCommentCounts] = useState({});
  const [reviewerPhotos, setReviewerPhotos] = useState({});
  const scrollViewRef = useRef(null);

  // ── Load / refresh reviews + liked state ──
  const refreshReviews = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, "shows", String(showId), "reviews"));
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setReviews(docs);
      const user = auth.currentUser;
      if (user) {
        setMyExistingReview(docs.find((r) => r.uid === user.uid) ?? null);
        const likedSnap = await getDocs(collection(db, "users", user.uid, "reviewLikes"));
        setLikedReviewIds(new Set(likedSnap.docs.map((d) => d.id)));
      }

      // Comment counts per review
      const countResults = await Promise.allSettled(
        docs.map((d) => getDocs(collection(db, "shows", String(showId), "reviews", d.id, "comments")))
      );
      const counts = {};
      countResults.forEach((r, i) => {
        if (r.status === "fulfilled") counts[docs[i].id] = r.value.size;
      });
      setCommentCounts(counts);

      // Reviewer profile photos
      const uids = [...new Set(docs.map((d) => d.uid).filter(Boolean))];
      const userResults = await Promise.allSettled(uids.map((uid) => getDoc(doc(db, "users", uid))));
      const photos = {};
      userResults.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value.exists()) {
          const data = r.value.data();
          if (data.photoURL) photos[uids[i]] = data.photoURL;
        }
      });
      setReviewerPhotos(photos);
    } catch (err) {
      console.error("[ShowCard] refreshReviews error:", err);
    }
  }, [showId]);

  // ── Fetch all show data ──
  const fetchShowData = useCallback(async () => {
    try {
      const [showData, seasonsData, episodesData, castData, crewData, imagesData] =
        await Promise.all([
          fetch(`${TVMAZE}/shows/${showId}`).then((r) => r.json()),
          fetch(`${TVMAZE}/shows/${showId}/seasons`).then((r) => r.json()),
          fetch(`${TVMAZE}/shows/${showId}/episodes`).then((r) => r.json()),
          fetch(`${TVMAZE}/shows/${showId}/cast`).then((r) => r.json()),
          fetch(`${TVMAZE}/shows/${showId}/crew`).then((r) => r.json()),
          fetch(`${TVMAZE}/shows/${showId}/images`).then((r) => r.json()),
        ]);

      setShow(showData);
      setSeasons(seasonsData);
      setAllEpisodes(episodesData);
      setCast(castData.slice(0, 20));
      setCrew(crewData);
      setActiveSeason(seasonsData[0] ?? null);

      if (Array.isArray(imagesData)) {
        const landscape = imagesData.filter((img) => {
          const { width, height } = img.resolutions?.original ?? {};
          return width && height && width > height;
        });
        const bg =
          landscape.find((img) => img.type === "background") ??
          landscape.find((img) => img.type === "banner") ??
          landscape[0] ??
          null;
        if (bg?.resolutions?.original?.url) {
          setBackgroundUri(bg.resolutions.original.url);
        }
      }

      const [ratingResult, userRatingResult, diaryResult] = await Promise.allSettled([
        getDoc(doc(db, "shows", String(showId))),
        auth.currentUser
          ? getDoc(doc(db, "users", auth.currentUser.uid, "showRatings", String(showId)))
          : Promise.resolve(null),
        auth.currentUser
          ? getDocs(query(collection(db, "users", auth.currentUser.uid, "diary"), where("showId", "==", showId), where("type", "==", "show"), limit(1)))
          : Promise.resolve(null),
      ]);

      if (ratingResult.status === "fulfilled" && ratingResult.value.exists()) {
        setCommunityRating({
          average: ratingResult.value.data().averageRating ?? 0,
          total: ratingResult.value.data().totalRatings ?? 0,
        });
      }
      if (userRatingResult.status === "fulfilled" && userRatingResult.value?.exists()) {
        setMyRating(userRatingResult.value.data().rating);
      }
      if (diaryResult.status === "fulfilled" && diaryResult.value && !diaryResult.value.empty) {
        setLiked(diaryResult.value.docs[0].data().liked ?? false);
      }
    } catch (err) {
      console.error("[ShowCard] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [showId]);

  useEffect(() => {
    fetchShowData();
    refreshReviews();
  }, [fetchShowData, refreshReviews]);

  // ── Toggle like on a review ──
  const toggleReviewLike = async (reviewId) => {
    const user = auth.currentUser;
    if (!user) return;
    const isLiked = likedReviewIds.has(reviewId);
    const reviewRef = doc(db, "shows", String(showId), "reviews", reviewId);
    const likeRef = doc(db, "users", user.uid, "reviewLikes", reviewId);
    try {
      if (isLiked) {
        await deleteDoc(likeRef);
        await updateDoc(reviewRef, { likes: increment(-1) });
        setLikedReviewIds((prev) => { const n = new Set(prev); n.delete(reviewId); return n; });
        setReviews((prev) => prev.map((r) => r.id === reviewId ? { ...r, likes: Math.max(0, (r.likes ?? 0) - 1) } : r));
      } else {
        await setDoc(likeRef, { showId, likedAt: serverTimestamp() });
        await updateDoc(reviewRef, { likes: increment(1) });
        setLikedReviewIds((prev) => new Set([...prev, reviewId]));
        setReviews((prev) => prev.map((r) => r.id === reviewId ? { ...r, likes: (r.likes ?? 0) + 1 } : r));
      }
    } catch (err) {
      console.error("Toggle review like error:", err);
    }
  };

  // ── Toggle liked on the show ──
  const handleToggleLiked = useCallback(async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    try {
      await writeDiaryEntry(showId, show?.name ?? "", myRating, null, newLiked);
    } catch (err) {
      console.error("[ShowCard] toggle liked error:", err);
      setLiked(!newLiked);
    }
  }, [liked, showId, show?.name, myRating]);

  // ── Derived data ──
  const episodesForActiveSeason = allEpisodes.filter(
    (e) => e.season === activeSeason?.number
  );

  const genres = show?.genres ?? [];
  const network = show?.network?.name ?? show?.webChannel?.name ?? "Unknown";
  const status = show?.status ?? "Unknown";
  const premiered = formatDate(show?.premiered);
  const ended = show?.ended ? formatDate(show.ended) : null;
  const runtime = show?.averageRuntime ?? show?.runtime;
  const language = show?.language ?? "Unknown";
  const description = stripHtml(show?.summary);

  const directors = crew.filter((c) => c.type === "Director").slice(0, 3);
  const producers = crew.filter((c) => c.type.includes("Producer")).slice(0, 3);
  const writers = crew.filter((c) => c.type.includes("Writer")).slice(0, 3);

  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>Loading show…</Text>
      </SafeAreaView>
    );
  }

  if (!show) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <TouchableOpacity
          style={[styles.backBtn, { position: "relative", top: 0, left: 0, marginBottom: 16 }]}
          onPress={() => navigation?.goBack()}
        >
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.loadingText}>Show not found.</Text>
      </SafeAreaView>
    );
  }

  const hasMyReview = !!myExistingReview;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
        <Text style={styles.backBtnText}>‹ Back</Text>
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Hero ── */}
        <View style={styles.hero}>
          {(backgroundUri ?? show.image?.original) ? (
            <Image
              source={{ uri: backgroundUri ?? show.image.original }}
              style={styles.heroBg}
              resizeMode="cover"
            />
          ) : null}
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            {show.image?.medium && (
              <Image
                source={{ uri: show.image.medium }}
                style={styles.poster}
                resizeMode="cover"
              />
            )}
            <View style={styles.heroInfo}>
              <Text style={styles.showTitle}>{show.name}</Text>
              <Text style={styles.showMeta}>
                {show.premiered?.slice(0, 4)}
                {ended ? ` — ${show.ended?.slice(0, 4)}` : "  ·  Ongoing"}
              </Text>
              <Text style={styles.showMeta}>{network}  ·  {language}</Text>
              {runtime ? (
                <Text style={styles.showMeta}>{runtime} min / episode</Text>
              ) : null}
              <View style={styles.genreRow}>
                {genres.map((g) => (
                  <View key={g} style={styles.genreTag}>
                    <Text style={styles.genreTagText}>{g}</Text>
                  </View>
                ))}
              </View>
              {communityRating && (
                <View style={heroRatingStyles.row}>
                  <Text style={heroRatingStyles.star}>★</Text>
                  <Text style={heroRatingStyles.avg}>
                    {communityRating.average.toFixed(1)}
                  </Text>
                  <Text style={heroRatingStyles.sep}>·</Text>
                  <Text style={heroRatingStyles.count}>
                    {communityRating.total >= 1000
                      ? `${(communityRating.total / 1000).toFixed(1)}k`
                      : communityRating.total}{" "}
                    ratings
                  </Text>
                  {myRating > 0 && (
                    <>
                      <Text style={heroRatingStyles.sep}>·</Text>
                      <Text style={heroRatingStyles.mine}>You: {myRating}★</Text>
                    </>
                  )}
                </View>
              )}
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: status === "Ended" ? C.muted : C.accent + "30" },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: status === "Ended" ? C.subtext : C.accent },
                  ]}
                >
                  {status}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Action buttons ── */}
        <View style={styles.actionRow}>
          {/* Like / Heart */}
          <TouchableOpacity
            style={[styles.actionBtn, liked && { backgroundColor: C.heartSoft, borderColor: C.heart + "60" }]}
            onPress={handleToggleLiked}
          >
            <Text style={[styles.actionIcon, { color: liked ? C.heart : C.subtext }]}>
              {liked ? "♥" : "♡"}
            </Text>
            <Text style={[styles.actionLabel, liked && { color: C.heart }]}>Like</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={() => setShowRateModal(true)}
          >
            <Text style={styles.actionIcon}>★</Text>
            <Text style={[styles.actionLabel, { color: "#fff" }]}>
              {myRating > 0 ? `${myRating}★` : "Rate"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, liked && { backgroundColor: C.accentSoft, borderColor: C.accent + "60" }]}
            onPress={handleToggleLiked}
          >
            <Text style={[styles.actionIcon, { color: liked ? C.accent : C.subtext }]}>👍</Text>
            <Text style={[styles.actionLabel, liked && { color: C.accent }]}>Like</Text>
          </TouchableOpacity>
        </View>

        {/* ── Description ── */}
        <Section title="About">
          <Text style={styles.description} numberOfLines={expandDescription ? undefined : 4}>
            {description}
          </Text>
          {description.length > 200 && (
            <TouchableOpacity onPress={() => setExpandDescription((p) => !p)}>
              <Text style={styles.expandBtn}>
                {expandDescription ? "Show less ▲" : "Read more ▼"}
              </Text>
            </TouchableOpacity>
          )}
        </Section>

        {/* ── Rate it yourself ── */}
        <Section title="Your Rating">
          <View style={styles.yourRatingBlock}>
            <Stars
              rating={myRating}
              size={28}
              interactive
              onRate={(r) => { setMyRating(r); setRatingSaved(false); }}
            />
            {myRating > 0 ? (
              <>
                <Text style={styles.yourRatingLabel}>{myRating} / 5 stars</Text>
                <TouchableOpacity
                  style={[styles.ratingsSaveBtn, ratingSaved && styles.ratingsSaveBtnSaved]}
                  onPress={async () => {
                    const prev = prevRating;
                    setPrevRating(myRating);
                    await submitShowRating(showId, myRating, prev);
                    await writeDiaryEntry(showId, show.name, myRating, null);
                    setRatingSaved(true);
                  }}
                >
                  <Text style={styles.ratingsSaveBtnText}>
                    {ratingSaved ? "Saved ✓" : "Save Rating"}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.yourRatingLabel}>Tap a star to rate</Text>
            )}
          </View>
        </Section>

        {/* ── Seasons & Episodes ── */}
        <Section title="Episodes">
          <TouchableOpacity
            style={styles.seasonPickerBtn}
            onPress={() => setShowSeasonPicker(true)}
          >
            <Text style={styles.seasonPickerText}>
              {activeSeason ? `Season ${activeSeason.number}` : "Select Season"}
            </Text>
            <Text style={styles.seasonPickerChevron}>▾</Text>
          </TouchableOpacity>

          {activeSeason && (
            <View style={styles.seasonMeta}>
              {activeSeason.premiereDate && (
                <Text style={styles.seasonMetaText}>
                  Premiered: {formatDate(activeSeason.premiereDate)}
                </Text>
              )}
              {activeSeason.episodeOrder && (
                <Text style={styles.seasonMetaText}>
                  {activeSeason.episodeOrder} episodes
                </Text>
              )}
            </View>
          )}

          {episodesForActiveSeason.length > 0 ? (
            episodesForActiveSeason.map((ep) => (
              <EpisodeRow
                key={ep.id}
                episode={ep}
                onPress={() => {
                  navigation.navigate("EpisodeCard", {
                    episodeId: ep.id,
                    showId: showId,
                    showName: show.name,
                    seasonNumber: activeSeason?.number
                  });
                }}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>No episodes found for this season.</Text>
          )}
        </Section>

        {/* ── Cast ── */}
        <Section title="Cast">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 10, paddingBottom: 6 }}>
              {cast.map((member) => (
                <CastCard key={member.person?.id} member={member} />
              ))}
            </View>
          </ScrollView>
        </Section>

        {/* ── Crew ── */}
        {(directors.length > 0 || producers.length > 0 || writers.length > 0) && (
          <Section title="Crew">
            {directors.length > 0 && (
              <View style={styles.crewRow}>
                <Text style={styles.crewRole}>Director</Text>
                <Text style={styles.crewNames}>
                  {directors.map((c) => c.person.name).join(", ")}
                </Text>
              </View>
            )}
            {writers.length > 0 && (
              <View style={styles.crewRow}>
                <Text style={styles.crewRole}>Writer</Text>
                <Text style={styles.crewNames}>
                  {writers.map((c) => c.person.name).join(", ")}
                </Text>
              </View>
            )}
            {producers.length > 0 && (
              <View style={styles.crewRow}>
                <Text style={styles.crewRole}>Producer</Text>
                <Text style={styles.crewNames}>
                  {producers.map((c) => c.person.name).join(", ")}
                </Text>
              </View>
            )}
          </Section>
        )}

        {/* ── Details ── */}
        <Section title="Details">
          <View style={styles.detailsGrid}>
            {[
              ["Network", network],
              ["Status", status],
              ["Premiered", premiered],
              ...(ended ? [["Ended", ended]] : []),
              ["Language", language],
              ...(runtime ? [["Runtime", `${runtime} min`]] : []),
              ["Seasons", String(seasons.length)],
              ["Episodes", String(allEpisodes.length)],
              ...(show.officialSite ? [["Official Site", show.officialSite]] : []),
            ].map(([label, value]) => (
              <View key={label} style={styles.detailItem}>
                <Text style={styles.detailLabel}>{label}</Text>
                <Text style={styles.detailValue} numberOfLines={2}>{value}</Text>
              </View>
            ))}
          </View>
        </Section>

        {/* ── Where to Watch ── */}
        <Section title="Where to Watch">
          <View style={styles.watchRow}>
            {MOCK_WHERE_TO_WATCH.map((s) => (
              <View key={s.name} style={styles.watchBadge}>
                <Text style={styles.watchName}>{s.name}</Text>
                <Text style={styles.watchType}>{s.type}</Text>
              </View>
            ))}
          </View>
        </Section>

        {/* ── Reviews ── */}
        <Section
          title="Reviews"
          action={showAllReviews ? "Hide" : "See All"}
          onAction={() => setShowAllReviews((p) => !p)}
        >
          {reviews.length > 0 ? (
            (showAllReviews ? reviews : reviews.slice(0, 2)).map((r) => (
              <ReviewCard
                key={r.id}
                review={r}
                compact={!showAllReviews}
                isLiked={likedReviewIds.has(r.id)}
                onToggleLike={() => toggleReviewLike(r.id)}
                navigation={navigation}
                photoURL={reviewerPhotos[r.uid] ?? null}
                commentCount={commentCounts[r.id] ?? 0}
                onComment={() => navigation.navigate("ReviewDetail", {
                  review: {
                    ...r,
                    createdAt: r.createdAt?.toDate?.()?.toISOString() ?? null,
                    updatedAt: r.updatedAt?.toDate?.()?.toISOString() ?? null,
                  },
                  showId,
                  photoURL: reviewerPhotos[r.uid] ?? null,
                })}
              />
            ))
          ) : (
            <Text style={{ color: C.muted, fontSize: 13, fontStyle: "italic" }}>
              No reviews yet — be the first!
            </Text>
          )}
        </Section>

        {/* ── Leave / Edit a Review ── */}
        <Section title={hasMyReview ? "Edit Your Review" : "Leave a Review"}>
          <View style={styles.reviewInputBlock}>
            <View style={styles.reviewRatingRow}>
              <Text style={styles.reviewRatingLabel}>Your rating:</Text>
              <Stars rating={myRating} size={18} interactive onRate={setMyRating} />
            </View>
            <TextInput
              style={styles.reviewInput}
              placeholder="Write your review…"
              placeholderTextColor={C.muted}
              multiline
              value={reviewText}
              onChangeText={setReviewText}
              onFocus={() => setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150)}
            />
            <TouchableOpacity
              style={[styles.submitBtn, !reviewText.trim() && styles.submitBtnDisabled]}
              disabled={!reviewText.trim()}
              onPress={async () => {
                const user = auth.currentUser;
                if (!user || !reviewText.trim()) return;
                try {
                  if (myExistingReview) {
                    await updateDoc(
                      doc(db, "shows", String(showId), "reviews", myExistingReview.id),
                      { rating: myRating, text: reviewText.trim(), updatedAt: serverTimestamp() }
                    );
                  } else {
                    await addDoc(collection(db, "shows", String(showId), "reviews"), {
                      uid: user.uid,
                      displayName: user.displayName ?? "Anonymous",
                      rating: myRating,
                      text: reviewText.trim(),
                      createdAt: serverTimestamp(),
                      likes: 0,
                    });
                  }
                  if (myRating > 0) {
                    await submitShowRating(showId, myRating, prevRating);
                    setPrevRating(myRating);
                  }
                  await writeDiaryEntry(showId, show.name, myRating, reviewText.trim());
                  setReviewText("");
                  await refreshReviews();
                } catch (err) {
                  console.error("Review submit error:", err);
                }
              }}
            >
              <Text style={styles.submitBtnText}>
                {hasMyReview ? "Update Review" : "Post Review"}
              </Text>
            </TouchableOpacity>
          </View>
        </Section>

      </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Modals ── */}
      <SeasonPicker
        seasons={seasons}
        selected={activeSeason}
        onSelect={setActiveSeason}
        visible={showSeasonPicker}
        onClose={() => setShowSeasonPicker(false)}
      />

      <RateModal
        visible={showRateModal}
        onClose={() => setShowRateModal(false)}
        currentRating={myRating}
        onRate={async (newRating) => {
          setPrevRating(myRating);
          setMyRating(newRating);
          setShowRateModal(false);
          await submitShowRating(showId, newRating, myRating);
          await writeDiaryEntry(showId, show.name, newRating, null, liked);
        }}
        showTitle={show.name}
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
  hero: {
    height: 340,
    justifyContent: "flex-end",
  },
  heroBg: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: C.bg,
    opacity: 0.72,
  },
  heroContent: {
    flexDirection: "row",
    padding: 16,
    gap: 14,
    alignItems: "flex-end",
  },
  poster: {
    width: 100,
    height: 148,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: C.border2,
  },
  heroInfo: { flex: 1, gap: 4 },
  showTitle: {
    fontSize: 22,
    fontFamily: "DMSerifDisplay_400Regular",
    color: C.text,
    letterSpacing: -0.4,
  },
  showMeta: { fontSize: 12, color: C.subtext },
  genreRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  genreTag: {
    backgroundColor: C.card,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: C.border2,
  },
  genreTagText: { fontSize: 10, color: C.subtext, fontWeight: "600" },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  statusText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.6 },

  // Action row
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
  section: {
    paddingHorizontal: 16,
    paddingTop: 22,
  },
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
  sectionAction: {
    fontSize: 12,
    color: C.accent,
    fontWeight: "600",
  },

  // Description
  description: { fontSize: 14, color: C.text, lineHeight: 21 },
  expandBtn: {
    color: C.accent,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },


  // Your rating
  yourRatingBlock: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  yourRatingLabel: { fontSize: 13, color: C.subtext, fontWeight: "500" },
  ratingsSaveBtn: {
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingHorizontal: 28,
    paddingVertical: 9,
  },
  ratingsSaveBtnSaved: { backgroundColor: C.muted },
  ratingsSaveBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Season picker
  seasonPickerBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.border2,
    marginBottom: 10,
  },
  seasonPickerText: { fontSize: 15, color: C.text, fontWeight: "600" },
  seasonPickerChevron: { fontSize: 16, color: C.subtext },
  seasonMeta: { flexDirection: "row", gap: 14, marginBottom: 10 },
  seasonMetaText: { fontSize: 12, color: C.subtext },

  // Episodes
  episodeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 10,
  },
  episodeNum: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: C.card,
    justifyContent: "center",
    alignItems: "center",
  },
  episodeNumText: { fontSize: 12, color: C.subtext, fontWeight: "700" },
  episodeInfo: { flex: 1 },
  episodeName: { fontSize: 13, color: C.text, fontWeight: "600" },
  episodeMeta: { fontSize: 11, color: C.muted, marginTop: 2 },
  emptyText: { fontSize: 13, color: C.muted, fontStyle: "italic" },

  // Cast
  castCard: { width: 80, alignItems: "center", gap: 4 },
  castPhoto: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.surface,
  },
  castPlaceholder: { justifyContent: "center", alignItems: "center" },
  castName: {
    fontSize: 11,
    color: C.text,
    fontWeight: "600",
    textAlign: "center",
  },
  castChar: { fontSize: 10, color: C.subtext, textAlign: "center" },

  // Crew
  crewRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  crewRole: { fontSize: 12, color: C.muted, fontWeight: "600", width: 70 },
  crewNames: { fontSize: 13, color: C.text, flex: 1 },

  // Details
  detailsGrid: { gap: 0 },
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

  // Where to watch
  watchRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  watchBadge: {
    backgroundColor: C.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border2,
    minWidth: 90,
  },
  watchName: { fontSize: 13, color: C.text, fontWeight: "700" },
  watchType: { fontSize: 10, color: C.subtext, marginTop: 3 },

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
  reviewText: { fontSize: 13, color: C.subtext, lineHeight: 19 },
  reviewActions: { flexDirection: "row", gap: 16, marginTop: 2 },
  reviewActionBtn: { flexDirection: "row", alignItems: "center" },
  reviewActionText: { fontSize: 13, color: C.muted, fontWeight: "600" },

  // Leave a review
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

  // Season picker modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  pickerSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 4,
    maxHeight: "60%",
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: C.text,
    marginBottom: 10,
    textAlign: "center",
  },
  pickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  pickerRowActive: { backgroundColor: C.accentSoft },
  pickerRowText: { fontSize: 14, color: C.text, fontWeight: "500" },
  pickerRowTextActive: { color: C.accent, fontWeight: "700" },
  pickerEpCount: { fontSize: 13, color: C.muted },

  // Rate modal
  rateSheet: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 24,
    margin: 20,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: C.border2,
  },
  rateTitle: { fontSize: 13, color: C.subtext, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  rateShowName: {
    fontSize: 18,
    fontWeight: "800",
    color: C.text,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  rateValue: { fontSize: 14, color: C.subtext },
  rateActions: { flexDirection: "row", gap: 10, marginTop: 4, width: "100%" },
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

  // Comments modal
  commentsBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  commentsSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_H * 0.75,
    paddingBottom: 20,
  },
  commentsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingBottom: 12,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: C.text,
  },
  commentsClose: {
    fontSize: 16,
    color: C.subtext,
    fontWeight: "600",
    paddingHorizontal: 4,
  },
  commentsReviewPreview: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    alignItems: "flex-start",
  },
  commentsDivider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  commentsEmpty: {
    fontSize: 13,
    color: C.muted,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  commentsList: {
    maxHeight: SCREEN_H * 0.35,
    paddingHorizontal: 16,
  },
  commentItem: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    alignItems: "flex-start",
  },
  commentUser: { fontSize: 12, color: C.text, fontWeight: "700", marginBottom: 2 },
  commentText: { fontSize: 13, color: C.subtext, lineHeight: 18 },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  commentInput: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: C.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: C.border2,
    maxHeight: 80,
  },
  commentSubmitBtn: {
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  commentSubmitText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});

const heroRatingStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  star: { color: C.gold, fontSize: 14, lineHeight: 18 },
  avg: { color: C.gold, fontSize: 15, fontWeight: "800", letterSpacing: -0.3 },
  sep: { color: C.muted, fontSize: 13 },
  count: { color: C.subtext, fontSize: 12, fontWeight: "500" },
  mine: { color: C.accent, fontSize: 12, fontWeight: "600" },
});

export default ShowCard;
