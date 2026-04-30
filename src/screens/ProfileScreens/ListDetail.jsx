import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, ActivityIndicator, SafeAreaView,
} from "react-native";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../config/firebase";

const TVMAZE = "https://api.tvmaze.com";

const C = {
  bg: "#081C15", surface: "#0D2319", card: "#1B4332",
  accent: "#52B788", text: "#D8F3DC", subtext: "#74C69D",
  muted: "#2D6A4F", border: "#1B4332", border2: "#2D6A4F",
};

const ListDetail = ({ route, navigation }) => {
  const { listId, listTitle } = route?.params ?? {};
  const [list, setList] = useState(null);
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const snap = await getDoc(doc(db, "lists", listId));
      if (!snap.exists()) return;
      const data = { id: snap.id, ...snap.data() };
      setList(data);

      const results = await Promise.allSettled(
        (data.showIds ?? []).map((id) =>
          fetch(`${TVMAZE}/shows/${id}`).then((r) => r.json())
        )
      );
      setShows(results.filter((r) => r.status === "fulfilled").map((r) => r.value));
    } catch (err) {
      console.error("[ListDetail] error:", err);
    } finally {
      setLoading(false);
    }
  }, [listId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator size="large" color={C.accent} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>‹ Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{list?.title}</Text>
        {list?.description ? (
          <Text style={styles.desc}>{list.description}</Text>
        ) : null}
        <Text style={styles.count}>{shows.length} show{shows.length !== 1 ? "s" : ""}</Text>

        {shows.length === 0 && (
          <Text style={styles.empty}>No shows in this list yet.</Text>
        )}

        {shows.map((show) => (
          <TouchableOpacity
            key={show.id}
            style={styles.showRow}
            onPress={() => navigation.navigate("ShowCard", { showId: show.id })}
            activeOpacity={0.78}
          >
            {show.image?.medium ? (
              <Image source={{ uri: show.image.medium }} style={styles.poster} resizeMode="cover" />
            ) : (
              <View style={[styles.poster, styles.posterPlaceholder]}>
                <Text style={{ fontSize: 20 }}>📺</Text>
              </View>
            )}
            <View style={styles.showInfo}>
              <Text style={styles.showName}>{show.name}</Text>
              <Text style={styles.showMeta}>
                {show.premiered?.slice(0, 4)}
                {show.network?.name ? `  ·  ${show.network.name}` : ""}
              </Text>
              {show.genres?.length > 0 && (
                <Text style={styles.showMeta}>{show.genres.slice(0, 2).join(", ")}</Text>
              )}
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 48, paddingTop: 8 },
  backBtn: { paddingHorizontal: 16, paddingVertical: 12 },
  backText: { color: C.accent, fontSize: 15, fontWeight: "600" },
  title: { fontSize: 26, fontWeight: "800", color: C.text, paddingHorizontal: 16, marginBottom: 4 },
  desc: { fontSize: 13, color: C.subtext, paddingHorizontal: 16, marginBottom: 8, lineHeight: 19 },
  count: { fontSize: 11, color: C.muted, paddingHorizontal: 16, marginBottom: 16, textTransform: "uppercase", letterSpacing: 0.8 },
  empty: { fontSize: 14, color: C.muted, textAlign: "center", marginTop: 40, fontStyle: "italic" },
  showRow: {
    flexDirection: "row", alignItems: "center", marginHorizontal: 16,
    marginBottom: 10, backgroundColor: C.surface, borderRadius: 12,
    padding: 10, gap: 12, borderWidth: 1, borderColor: C.border,
  },
  poster: { width: 52, height: 76, borderRadius: 7, backgroundColor: C.card },
  posterPlaceholder: { justifyContent: "center", alignItems: "center" },
  showInfo: { flex: 1 },
  showName: { fontSize: 14, fontWeight: "700", color: C.text },
  showMeta: { fontSize: 12, color: C.subtext, marginTop: 2 },
  chevron: { fontSize: 20, color: C.muted },
});

export default ListDetail;