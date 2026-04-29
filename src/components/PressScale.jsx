import React, { useRef } from "react";
import { Animated, Pressable } from "react-native";

const PressScale = ({ children, style, onPress, scale = 0.96, ...props }) => {
  const anim = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(anim, {
      toValue: scale,
      useNativeDriver: true,
      speed: 60,
      bounciness: 0,
    }).start();

  const pressOut = () =>
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 2,
    }).start();

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} {...props}>
      <Animated.View style={[style, { transform: [{ scale: anim }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default PressScale;
