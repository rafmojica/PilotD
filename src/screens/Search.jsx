// src/screens/Search.jsx

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
} from "react-native";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const SHOWS = [
  { id: 1, title: "Severance", year: "2022", genre: "Thriller", rating: 4.8, votes: "2.1k", seasons: 2 },
  { id: 2, title: "The Bear", year: "2022", genre: "Drama", rating: 4.7, votes: "1.8k", seasons: 3 },
  { id: 3, title: "Succession", year: "2018", genre: "Drama", rating: 4.9, votes: "3.4k", seasons: 4 },
  { id: 4, title: "The Last of Us", year: "2023", genre: "Drama", rating: 4.6, votes: "2.9k", seasons: 2 },
  { id: 5, title: "Shōgun", year: "2024", genre: "Historical", rating: 4.8, votes: "1.5k", seasons: 1 },
  { id: 6, title: "White Lotus", year: "2021", genre: "Satire", rating: 4.5, votes: "2.2k", seasons: 3 },
  { id: 7, title: "Andor", year: "2022", genre: "Sci-Fi", rating: 4.7, votes: "1.1k", seasons: 2 },
  { id: 8, title: "Barry", year: "2018", genre: "Dark Comedy", rating: 4.6, votes: "1.3k", seasons: 4 },
];

const PEOPLE = [
  { id: "p1", username: "elena.watch", name: "Elena Russo", shows: 142, avatarUrl: "https://i.pravatar.cc/150?img=47" },
  { id: "p2", username: "tom_tv", name: "Tom Bianchi", shows: 89, avatarUrl: "https://i.pravatar.cc/150?img=12" },
  { id: "p3", username: "priya.s", name: "Priya Sharma", shows: 203, avatarUrl: "https://i.pravatar.cc/150?img=31" },
];

const TRENDING_SEARCHES = [
  "The Penguin",
  "Severance S2",
  "Dune: Prophecy",
  "Mr. & Mrs. Smith",
  "Landman",
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
  rose: "#C4788A",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const Stars = ({ rating }) => {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <View style={{ flexDirection: "row", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text
          key={i}
          style={{
            fontSize: 10,
            color: i <= full ? C.star : half && i === full + 1 ? C.star : C.muted,
            opacity: half && i === full + 1 ? 0.5 : 1,
          }}
        >
          ★
        </Text>
      ))}
    </View>
  );
};

const ShowResult = ({ show }) => (
  <TouchableOpacity style={styles.showRow} activeOpacity={0.8}>
    <View style={styles.showThumb}>
      <Text style={styles.thumbInitials}>
        {show.title
          .split(" ")
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()}
      </Text>
    </View>
    <View style={styles.showInfo}>
      <Text style={styles.showName}>{show.title}</Text>
      <Text style={styles.showSub}>
        {show.genre} · {show.year} · {show.seasons}S
      </Text>
      <View style={styles.ratingRow}>
        <Stars rating={show.rating} />
        <Text style={styles.ratingNum}>{show.rating}</Text>
        <Text style={styles.ratingVotes}>({show.votes})</Text>
      </View>
    </View>
    <Text style={styles.chevron}>›</Text>
  </TouchableOpacity>
);

const PersonResult = ({ person, followed, onToggle }) => (
  <View style={styles.personRow}>
    <Image source={{ uri: person.avatarUrl }} style={styles.personAvatar} />
    <View style={styles.personInfo}>
      <Text style={styles.personName}>{person.name}</Text>
      <Text style={styles.personSub}>
        @{person.username} · {person.shows} shows
      </Text>
    </View>
    <TouchableOpacity
      style={[styles.followBtn, followed && styles.followBtnActive]}
      onPress={onToggle}
    >
      <Text style={[styles.followBtnText, followed && styles.followBtnTextActive]}>
        {followed ? "Following" : "Follow"}
      </Text>
    </TouchableOpacity>
  </View>
);

// ─── Screen ───────────────────────────────────────────────────────────────────

const Search = () => {
  const [query, setQuery] = useState("");
  const [followed, setFollowed] = useState({});

  const q = query.toLowerCase();
  const filteredShows = SHOWS.filter(
    (s) => !query || s.title.toLowerCase().includes(q)
  );
  const filteredPeople = PEOPLE.filter(
    (p) =>
      !query ||
      p.name.toLowerCase().includes(q) ||
      p.username.toLowerCase().includes(q)
  );

  const toggleFollow = (id) =>
    setFollowed((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.input}
            placeholder="Shows, people, lists…"
            placeholderTextColor={C.muted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Shows results */}
        {filteredShows.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Shows</Text>
            {filteredShows.slice(0, 4).map((show) => (
              <ShowResult key={show.id} show={show} />
            ))}
          </>
        )}

        {/* People results */}
        {filteredPeople.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 8 }]}>People</Text>
            {filteredPeople.map((person) => (
              <PersonResult
                key={person.id}
                person={person}
                followed={!!followed[person.id]}
                onToggle={() => toggleFollow(person.id)}
              />
            ))}
          </>
        )}

        {/* Trending searches (empty state) */}
        {!query && (
          <View style={styles.trending}>
            <Text style={styles.sectionLabel}>Trending Searches</Text>
            {TRENDING_SEARCHES.map((t) => (
              <TouchableOpacity
                key={t}
                style={styles.trendingRow}
                onPress={() => setQuery(t)}
                activeOpacity={0.7}
              >
                <Text style={styles.trendingArrow}>↗</Text>
                <Text style={styles.trendingText}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  searchIcon: { fontSize: 16 },
  input: {
    flex: 1,
    color: C.text,
    fontSize: 15,
    fontFamily: undefined,
  },
  clearBtn: { color: C.muted, fontSize: 16, paddingLeft: 4 },

  sectionLabel: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    fontSize: 11,
    fontWeight: "700",
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  // Show row
  showRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.borderSubtle,
    gap: 12,
  },
  showThumb: {
    width: 44,
    height: 64,
    borderRadius: 7,
    backgroundColor: C.card,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  thumbInitials: {
    fontSize: 14,
    fontWeight: "700",
    color: C.accent,
    opacity: 0.8,
  },
  showInfo: { flex: 1, gap: 3 },
  showName: { fontSize: 14, fontWeight: "500", color: C.text },
  showSub: { fontSize: 12, color: C.textSec },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  ratingNum: { fontSize: 11, color: C.star, fontWeight: "600" },
  ratingVotes: { fontSize: 11, color: C.muted },
  chevron: { fontSize: 22, color: C.border, lineHeight: 26 },

  // Person row
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.borderSubtle,
    gap: 12,
  },
  personAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.card,
    flexShrink: 0,
  },
  personInfo: { flex: 1 },
  personName: { fontSize: 14, fontWeight: "600", color: C.text },
  personSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: C.accent,
  },
  followBtnActive: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: C.accent,
  },
  followBtnText: { color: "#081C15", fontSize: 12, fontWeight: "600" },
  followBtnTextActive: { color: C.accent },

  // Trending
  trending: { paddingTop: 8 },
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
});
