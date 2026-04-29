import React, { useEffect, useState } from "react";
import { View, Text, Image } from "react-native";

const PALETTE = [
  "#52B788",
  "#40916C",
  "#F59E0B",
  "#8B5CF6",
  "#0EA5E9",
  "#C4788A",
  "#EF4444",
];

function getInitials(name) {
  if (!name) return "?";
  const words = name.trim().split(/\s+/);
  return words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : words[0][0].toUpperCase();
}

function colorFromName(name) {
  if (!name) return PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

const InitialsAvatar = ({ name, size = 38, color, photoURL, style }) => {
  const bgColor = color || colorFromName(name);
  const fontSize = Math.round(size * 0.38);
  const circleStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const [imgError, setImgError] = useState(false);

  // reset error state when photoURL changes.
  useEffect(() => {
    setImgError(false);
  }, [photoURL]);

  if (photoURL && !imgError) {
    return (
      <Image
        source={{
          uri: photoURL,
          headers: {
            Referer: "https://myapp.com",
          },
        }}
        style={[circleStyle, { backgroundColor: bgColor }, style]}
        resizeMode="cover"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <View
      style={[
        circleStyle,
        {
          backgroundColor: bgColor,
          justifyContent: "center",
          alignItems: "center",
        },
        style,
      ]}
    >
      <Text style={{ color: "#D8F3DC", fontSize, fontWeight: "700" }}>
        {getInitials(name)}
      </Text>
    </View>
  );
};

export default InitialsAvatar;
