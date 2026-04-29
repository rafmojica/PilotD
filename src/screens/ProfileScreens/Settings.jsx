import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from "react-native";
import { signOut } from "firebase/auth";
import { auth, db } from "../../config/firebase";
import { doc, getDoc } from "firebase/firestore";
import Svg, {
  Circle,
  Line,
  Path,
  Polygon,
  Polyline,
  Rect,
} from "react-native-svg";

const C = {
  bg: "#081C15",
  surface: "#0D2319",
  card: "#1B4332",
  accent: "#52B788",
  text: "#D8F3DC",
  subtext: "#74C69D",
  muted: "#2D6A4F",
  border: "rgba(45,106,79,0.12)",
  rose: "#C4788A",
  gold: "#F59E0B",
};

const SectionLabel = ({ label }) => (
  <Text style={styles.sectionLabel}>{label}</Text>
);

const SettingsRow = ({
  icon,
  iconBg,
  label,
  sub,
  onPress,
  right,
  disabled,
}) => (
  <TouchableOpacity
    style={styles.row}
    onPress={onPress}
    activeOpacity={disabled ? 1 : 0.7}
    disabled={disabled}
  >
    <View style={styles.rowLeft}>
      <View style={[styles.iconBg, { backgroundColor: iconBg }]}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
    </View>
    {right !== undefined ? right : <Text style={styles.chevron}>›</Text>}{" "}
  </TouchableOpacity>
);

const Settings = ({ navigation }) => {
  const user = auth.currentUser;
  const [signOutConfirm, setSignOutConfirm] = useState(false);
  const [totpEnabled, setTotpEnabled] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getDoc(doc(db, "users", uid)).then((snap) => {
      if (snap.exists()) setTotpEnabled(snap.data().totpEnabled ?? false);
    });
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch {
      Alert.alert("Error", "Failed to sign out. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Text style={styles.backChevron}>‹</Text>
          <Text style={styles.backLabel}>Profile</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <SectionLabel label="Account" />

        <SettingsRow
          icon={
            <Svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#52B788"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <Rect x="2" y="4" width="20" height="16" rx="2" />
              <Polyline points="22,6 12,13 2,6" />
            </Svg>
          }
          iconBg="rgba(82,183,136,0.12)"
          label="Email Address"
          sub={user?.email ?? "—"}
          right={null}
        />

        <SettingsRow
          icon={
            <Svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#F4A827"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <Rect x="5" y="11" width="14" height="10" rx="2" />
              <Path d="M8 11V7a4 4 0 0 1 8 0v4" />
              <Circle cx="12" cy="16" r="1" fill="#F4A827" />
            </Svg>
          }
          iconBg={
            totpEnabled ? "rgba(82,183,136,0.15)" : "rgba(244,168,39,0.12)"
          }
          label="Two-Factor Auth"
          sub={totpEnabled ? "Enabled" : "Manage login security"}
          onPress={() => !totpEnabled && navigation.navigate("TotpSetup")}
          disabled={totpEnabled}
          right={
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              {totpEnabled && (
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 10,
                    backgroundColor: "rgba(82,183,136,0.15)",
                    borderWidth: 1,
                    borderColor: "rgba(82,183,136,0.3)",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: "#52B788",
                    }}
                  >
                    ON
                  </Text>
                </View>
              )}
            </View>
          }
        />
        <SectionLabel label="Subscription" />

        <SettingsRow
          icon={
            <Svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#C4788A"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <Polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </Svg>
          }
          iconBg="rgba(196,120,138,0.12)"
          label="PilotD Pro"
          sub="Manage your plan"
          onPress={() => {}}
          right={
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>FREE</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          }
        />

        <SettingsRow
          icon={
            <Svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#52B788"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <Rect x="1" y="4" width="22" height="16" rx="2" />
              <Line x1="1" y1="10" x2="23" y2="10" />
            </Svg>
          }
          iconBg="rgba(82,183,136,0.08)"
          label="Billing & Payments"
          sub="Payment methods, history"
          onPress={() => {}}
        />

        <SectionLabel label="More" />

        <SettingsRow
          icon={
            <Svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#95D5B2"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <Circle cx="12" cy="12" r="10" />
              <Line x1="12" y1="8" x2="12" y2="12" />
              <Line x1="12" y1="16" x2="12.01" y2="16" />
            </Svg>
          }
          iconBg="rgba(82,183,136,0.08)"
          label="About PilotD"
          onPress={() => {}}
        />

        <View style={{ height: 24 }} />

        {!signOutConfirm ? (
          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={() => setSignOutConfirm(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.dangerBtnText}>Sign Out</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Sign out of PilotD?</Text>
            <Text style={styles.confirmSub}>
              You'll need to log back in to access your account.
            </Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity
                style={styles.confirmCancel}
                onPress={() => setSignOutConfirm(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmSignOut}
                onPress={handleSignOut}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmSignOutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Settings;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, width: 80 },
  backChevron: { fontSize: 22, color: C.accent, lineHeight: 22, includeFontPadding: false },
  backLabel: { fontSize: 14, color: C.accent, fontWeight: "500" },
  title: {
    fontFamily: "DMSerifDisplay_400Regular",
    fontSize: 18,
    color: C.text,
  },

  sectionLabel: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    fontSize: 11,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "600",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  iconBg: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowLabel: { fontSize: 15, color: C.text },
  rowSub: { fontSize: 12, color: C.muted, marginTop: 1 },
  chevron: { color: C.muted, fontSize: 20 },

  freeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: "rgba(244,168,39,0.15)",
    borderWidth: 1,
    borderColor: "rgba(244,168,39,0.2)",
  },
  freeBadgeText: { fontSize: 11, fontWeight: "600", color: C.gold },

  dangerBtn: {
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(196,120,138,0.3)",
    alignItems: "center",
  },
  dangerBtnText: { fontSize: 15, color: C.rose, fontWeight: "500" },

  confirmBox: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "rgba(196,120,138,0.08)",
    borderWidth: 1,
    borderColor: "rgba(196,120,138,0.25)",
    borderRadius: 12,
    padding: 16,
  },
  confirmTitle: {
    fontSize: 14,
    color: C.text,
    fontWeight: "500",
    marginBottom: 4,
  },
  confirmSub: {
    fontSize: 13,
    color: C.subtext,
    marginBottom: 14,
    lineHeight: 19,
  },
  confirmBtns: { flexDirection: "row", gap: 10 },
  confirmCancel: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: C.card,
    alignItems: "center",
  },
  confirmCancelText: { color: C.subtext, fontSize: 14, fontWeight: "500" },
  confirmSignOut: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: C.rose,
    alignItems: "center",
  },
  confirmSignOutText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
