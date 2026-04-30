import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { auth, db } from "../config/firebase";
import {
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import Stars from "../components/Stars";
import InitialsAvatar from "../components/InitialsAvatar";
import Svg, { Path } from "react-native-svg";

const C = {
  bg: "#081C15",
  surface: "#0D2319",
  card: "#1B4332",
  accent: "#52B788",
  text: "#D8F3DC",
  subtext: "#74C69D",
  muted: "#2D6A4F",
  border: "#1B4332",
  border2: "#2D6A4F",
};

const ReviewDetail = ({ navigation, route }) => {
  const { review, showId, photoURL } = route.params;
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    try {
      const snap = await getDocs(
        query(
          collection(db, "shows", String(showId), "reviews", review.id, "comments"),
          orderBy("createdAt", "asc")
        )
      );
      setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("[ReviewDetail] fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async () => {
    const user = auth.currentUser;
    if (!user || !commentText.trim() || posting) return;
    setPosting(true);
    try {
      const ref = await addDoc(
        collection(db, "shows", String(showId), "reviews", review.id, "comments"),
        {
          uid: user.uid,
          displayName: user.displayName ?? "Anonymous",
          text: commentText.trim(),
          createdAt: serverTimestamp(),
        }
      );
      setComments((prev) => [
        ...prev,
        {
          id: ref.id,
          uid: user.uid,
          displayName: user.displayName ?? "Anonymous",
          text: commentText.trim(),
          createdAt: null,
        },
      ]);
      setCommentText("");
    } catch (err) {
      console.error("[ReviewDetail] comment error:", err);
    } finally {
      setPosting(false);
    }
  };

  const handlePressReviewer = () => {
    if (review.uid === auth.currentUser?.uid) {
      navigation.navigate("ProfileTab");
    } else {
      navigation.navigate("UserProfile", {
        userId: review.uid,
        displayName: review.displayName,
      });
    }
  };

  const reviewDate = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "";

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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Review card */}
          <View style={styles.reviewCard}>
            <TouchableOpacity
              style={styles.reviewHeader}
              activeOpacity={0.7}
              onPress={handlePressReviewer}
            >
              <InitialsAvatar name={review.displayName ?? "?"} photoURL={photoURL} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.reviewUser}>{review.displayName ?? "Anonymous"}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Stars rating={review.rating ?? 0} size={12} />
                  {reviewDate ? <Text style={styles.reviewDate}>{reviewDate}</Text> : null}
                </View>
              </View>
            </TouchableOpacity>
            <Text style={styles.reviewText}>{review.text}</Text>
          </View>

          {/* Comments section */}
          <Text style={styles.commentsTitle}>
            {loading
              ? "Comments"
              : `${comments.length} Comment${comments.length !== 1 ? "s" : ""}`}
          </Text>

          {loading ? (
            <ActivityIndicator color={C.accent} style={{ marginVertical: 24 }} />
          ) : comments.length === 0 ? (
            <Text style={styles.emptyText}>No comments yet — start the conversation!</Text>
          ) : (
            comments.map((c) => (
              <View key={c.id} style={styles.commentItem}>
                <InitialsAvatar name={c.displayName ?? "?"} size={32} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.commentUser}>{c.displayName}</Text>
                  <Text style={styles.commentText}>{c.text}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Comment input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Add a comment…"
            placeholderTextColor={C.muted}
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <TouchableOpacity
            style={[styles.postBtn, (!commentText.trim() || posting) && { opacity: 0.4 }]}
            onPress={submitComment}
            disabled={!commentText.trim() || posting}
          >
            <Text style={styles.postBtnText}>{posting ? "…" : "Post"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingBottom: 24 },
  backBtn: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    alignSelf: "flex-start",
  },

  reviewCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
    marginBottom: 24,
  },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  reviewUser: { fontSize: 15, color: C.text, fontWeight: "700", marginBottom: 3 },
  reviewDate: { fontSize: 11, color: C.muted },
  reviewText: { fontSize: 14, color: C.subtext, lineHeight: 22 },

  commentsTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.subtext,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 13,
    color: C.muted,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 24,
  },
  commentItem: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    alignItems: "flex-start",
  },
  commentUser: { fontSize: 12, color: C.text, fontWeight: "700", marginBottom: 2 },
  commentText: { fontSize: 13, color: C.subtext, lineHeight: 18 },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.bg,
  },
  input: {
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
  postBtn: {
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  postBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});

export default ReviewDetail;
