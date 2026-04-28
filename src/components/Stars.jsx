import React from "react";
import { View, TouchableOpacity, Text } from "react-native";

const C_GOLD = "#F59E0B";
const C_MUTED = "#2D6A4F";

const Stars = ({ rating, size = 14, interactive = false, onRate }) => {
  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((v) => {
        const full = rating >= v;
        const half = !full && rating >= v - 0.5;

        return (
          <View key={v} style={{ width: size, height: size }}>
            {/* Muted background star */}
            <Text style={{ color: C_MUTED, fontSize: size, position: "absolute" }}>
              ★
            </Text>

            {/* Gold foreground — full width or half width */}
            {(full || half) && (
              <View
                style={{
                  position: "absolute",
                  width: full ? size : size / 2,
                  height: size,
                  overflow: "hidden",
                }}
              >
                <Text style={{ color: C_GOLD, fontSize: size }}>★</Text>
              </View>
            )}

            {/* Invisible touch targets on each half */}
            {interactive && (
              <>
                <TouchableOpacity
                  style={{
                    position: "absolute",
                    left: 0,
                    width: size / 2,
                    height: size,
                  }}
                  onPress={() => onRate?.(v - 0.5)}
                  activeOpacity={0.7}
                />
                <TouchableOpacity
                  style={{
                    position: "absolute",
                    right: 0,
                    width: size / 2,
                    height: size,
                  }}
                  onPress={() => onRate?.(v)}
                  activeOpacity={0.7}
                />
              </>
            )}
          </View>
        );
      })}
    </View>
  );
};

export default Stars;