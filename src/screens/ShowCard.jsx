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
} from "react-native";
import Stars from "../components/Stars";
import {doc, getDoc, runTransaction, collection, addDoc, setDoc, getDocs, query, where, limit, serverTimestamp } from "firebase/firestore";
import {db, auth } from "../config/firebase";

// ─── Constants ────────────────────────────────────────────────────────────────

const TVMAZE = "https://api.tvmaze.com";
const { width: SCREEN_W } = Dimensions.get("window");

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
// Replace with real Firebase reads once your db is set up.

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

const writeDiaryEntry = async (showId, showName, rating, reviewText) => {
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
    liked: false,
    updatedAt: serverTimestamp(),
  };
  if (!existingQuery.empty) {
    await setDoc(doc(db, "users", user.uid, "diary", existingQuery.docs[0].id), entryData);
  } else {
    await addDoc(collection(db, "users", user.uid, "diary"), { ...entryData, createdAt: serverTimestamp() });
  }
};

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
    <Text style={{ color: "#fff", fontSize: size * 0.34, fontWeight: "800" }}>{initials}</Text>
  </View>
);

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

const CommunityRatings = ({ data }) => (
  <View style={styles.ratingsBlock}>
    <View style={styles.ratingsBig}>
      <Text style={styles.ratingsAvg}>{data.average.toFixed(1)}</Text>
      <Stars rating={data.average} size={16} />
      <Text style={styles.ratingsCount}>
        {data.total >= 1000
          ? `${(data.total / 1000).toFixed(1)}k`
          : data.total} ratings
      </Text>
    </View>
  </View>
);

// ─── Review card ──────────────────────────────────────────────────────────────

const ReviewCard = ({ review, compact = false }) => (
  <View style={styles.reviewCard}>
    <View style={styles.reviewHeader}>
      <AvatarCircle
        initials={(review.displayName ?? "?").slice(0, 2).toUpperCase()}
        color="#52B788"
        size={30}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.reviewUser}>{review.displayName ?? "Anonymous"}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Stars rating={review.rating ?? 0} size={11} />
          <Text style={styles.reviewDate}>
            {review.createdAt?.toDate?.().toLocaleDateString("en-US", {
              month: "short", year: "numeric"
            }) ?? ""}
          </Text>
        </View>
      </View>
      <Text style={styles.reviewLikes}>♥ {review.likes ?? 0}</Text>
    </View>
    <Text style={styles.reviewText} numberOfLines={compact ? 3 : undefined}>
      {review.text}
    </Text>
  </View>
);

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
      {/* Tap stars to rate this episode directly */}
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
// Usage: <ShowCard route={{ params: { showId: 169 } }} navigation={navigation} />
// The showId comes from navigation.navigate("ShowCard", { showId: 169 })

const ShowCard = ({ route, navigation }) => {
  const showId = route?.params?.showId ?? 169; // default to Breaking Bad for dev testing

  // ── Data state ──
  const [show, setShow] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [allEpisodes, setAllEpisodes] = useState([]);
  const [cast, setCast] = useState([]);
  const [crew, setCrew] = useState([]);
  const [loading, setLoading] = useState(true);
  const [communityRating, setCommunityRating] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [prevRating, setPrevRating] = useState(0);

  // ── UI state ──
  const [activeSeason, setActiveSeason] = useState(null);
  const [showSeasonPicker, setShowSeasonPicker] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [hearted, setHearted] = useState(false);    // saved/watchlisted
  const [liked, setLiked] = useState(false);         // liked (thumbs up)
  const [reviewText, setReviewText] = useState("");
  const [expandDescription, setExpandDescription] = useState(false);

  // ── Fetch all show data ──
  const fetchShowData = useCallback(async () => {
    try {
      const [showData, seasonsData, episodesData, castData, crewData, ratingSnap, reviewsSnap, userRatingSnap] =
        await Promise.all([
          fetch(`${TVMAZE}/shows/${showId}`).then((r) => r.json()),
          fetch(`${TVMAZE}/shows/${showId}/seasons`).then((r) => r.json()),
          fetch(`${TVMAZE}/shows/${showId}/episodes`).then((r) => r.json()),
          fetch(`${TVMAZE}/shows/${showId}/cast`).then((r) => r.json()),
          fetch(`${TVMAZE}/shows/${showId}/crew`).then((r) => r.json()),
          getDoc(doc(db, "shows", String(showId))),
          getDocs(collection(db, "shows", String(showId), "reviews")),
          auth.currentUser
            ? getDoc(doc(db, "users", auth.currentUser.uid, "showRatings", String(showId)))
            : Promise.resolve(null),
        ]);

      setShow(showData);
      setSeasons(seasonsData);
      setAllEpisodes(episodesData);
      setCast(castData.slice(0, 20));
      setCrew(crewData);
      setActiveSeason(seasonsData[0] ?? null);

      if (ratingSnap.exists()) {
        setCommunityRating({
          average: ratingSnap.data().averageRating ?? 0,
          total: ratingSnap.data().totalRatings ?? 0,
        });
      }
      setReviews(reviewsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      if (userRatingSnap?.exists()) setMyRating(userRatingSnap.data().rating);

    } catch (err) {
      console.error("[ShowCard] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [showId]);

  useEffect(() => { fetchShowData(); }, [fetchShowData]);

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
        <Text style={styles.loadingText}>Show not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Back button overlaid on hero */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
        <Text style={styles.backBtnText}>‹ Back</Text>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Hero ── */}
        <View style={styles.hero}>
          {show.image?.original ? (
            <Image
              source={{ uri: show.image.original }}
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

              {/* Genre tags */}
              <View style={styles.genreRow}>
                {genres.map((g) => (
                  <View key={g} style={styles.genreTag}>
                    <Text style={styles.genreTagText}>{g}</Text>
                  </View>
                ))}
              </View>

              {/* Status badge */}
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
          {/* Heart / Save */}
          <TouchableOpacity
            style={[styles.actionBtn, hearted && { backgroundColor: C.heartSoft, borderColor: C.heart + "60" }]}
            onPress={() => setHearted((p) => !p)}
          >
            <Text style={[styles.actionIcon, { color: hearted ? C.heart : C.subtext }]}>
              {hearted ? "♥" : "♡"}
            </Text>
            <Text style={[styles.actionLabel, hearted && { color: C.heart }]}>Save</Text>
          </TouchableOpacity>

          {/* Rate */}
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={() => setShowRateModal(true)}
          >
            <Text style={styles.actionIcon}>★</Text>
            <Text style={[styles.actionLabel, { color: "#fff" }]}>
              {myRating > 0 ? `${myRating}★` : "Rate"}
            </Text>
          </TouchableOpacity>

          {/* Like */}
          <TouchableOpacity
            style={[styles.actionBtn, liked && { backgroundColor: C.accentSoft, borderColor: C.accent + "60" }]}
            onPress={() => setLiked((p) => !p)}
          >
            <Text style={[styles.actionIcon, { color: liked ? C.accent : C.subtext }]}>
              {liked ? "👍" : "👍"}
            </Text>
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

        {/* ── Community Ratings ── */}
        <Section title="Community Ratings">
          {communityRating ? (
            <CommunityRatings data={communityRating} />
          ) : (
            <Text style={{ color: C.muted, fontSize: 13, fontStyle: "italic" }}>
              No ratings yet
            </Text>
          )}
        </Section>

        {/* ── Rate it yourself ── */}
        <Section title="Your Rating">
          <View style={styles.yourRatingBlock}>
            <Stars rating={myRating} size={28} interactive onRate={setMyRating} />
            {myRating > 0 ? (
              <Text style={styles.yourRatingLabel}>{myRating} / 5 stars</Text>
            ) : (
              <Text style={styles.yourRatingLabel}>Tap a star to rate</Text>
            )}
          </View>
        </Section>

        {/* ── Seasons & Episodes ── */}
        <Section title="Episodes">
          {/* Season picker button */}
          <TouchableOpacity
            style={styles.seasonPickerBtn}
            onPress={() => setShowSeasonPicker(true)}
          >
            <Text style={styles.seasonPickerText}>
              {activeSeason ? `Season ${activeSeason.number}` : "Select Season"}
            </Text>
            <Text style={styles.seasonPickerChevron}>▾</Text>
          </TouchableOpacity>

          {/* Season info */}
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

          {/* Episode list */}
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
                  console.log("Navigate to episode:", ep.id);
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
          {/*
            TVMaze doesn't have streaming availability.
            TODO: swap this mock with Watchmode API (watchmode.com) or TMDB
            which both support streaming availability endpoints.
          */}
          <View style={styles.watchRow}>
            {MOCK_WHERE_TO_WATCH.map((s) => (
              <View key={s.name} style={styles.watchBadge}>
                <Text style={styles.watchName}>{s.name}</Text>
                <Text style={styles.watchType}>{s.type}</Text>
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
          {reviews.length > 0 ? (
            (showAllReviews ? reviews : reviews.slice(0, 2)).map((r) => (
              <ReviewCard key={r.id} review={r} compact={!showAllReviews} />
            ))
          ) : (
            <Text style={{ color: C.muted, fontSize: 13, fontStyle: "italic" }}>
              No reviews yet — be the first!
            </Text>
          )}
        </Section>

        {/* ── Leave a Review ── */}
        <Section title="Leave a Review">
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
            />
            <TouchableOpacity
              style={[styles.submitBtn, !reviewText.trim() && styles.submitBtnDisabled]}
              disabled={!reviewText.trim()}
              onPress={async () => {
                const user = auth.currentUser;
                if (!user || !reviewText.trim()) return;
                try {
                  await addDoc(collection(db, "shows", String(showId), "reviews"), {
                    uid: user.uid,
                    displayName: user.displayName ?? "Anonymous",
                    rating: myRating,
                    text: reviewText.trim(),
                    createdAt: serverTimestamp(),
                    likes: 0,
                  });
                  await writeDiaryEntry(showId, show.name, myRating, reviewText.trim());
                  setReviewText("");
                } catch (err) {
                  console.error("Review submit error:", err);
                }
              }}
            >
              <Text style={styles.submitBtnText}>Post Review</Text>
            </TouchableOpacity>
          </View>
        </Section>

      </ScrollView>

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
          await writeDiaryEntry(showId, show.name, newRating, null);
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

  // Community ratings
  ratingsBlock: {
    flexDirection: "row",
    gap: 16,
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  ratingsBig: { alignItems: "center", justifyContent: "center", gap: 4, minWidth: 80 },
  ratingsAvg: {
    fontSize: 36,
    fontWeight: "800",
    color: C.gold,
    lineHeight: 40,
  },
  ratingsCount: { fontSize: 11, color: C.subtext, marginTop: 2 },
  ratingsBars: { flex: 1, gap: 4, justifyContent: "center" },
  ratingBarRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  ratingBarLabel: { fontSize: 10, color: C.subtext, width: 24, textAlign: "right" },
  ratingBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: C.card,
    borderRadius: 4,
    overflow: "hidden",
  },
  ratingBarFill: { height: "100%", backgroundColor: C.gold, borderRadius: 4 },

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
  reviewLikes: { fontSize: 12, color: C.heart, marginLeft: "auto" },
  reviewText: { fontSize: 13, color: C.subtext, lineHeight: 19 },

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
});

export default ShowCard;