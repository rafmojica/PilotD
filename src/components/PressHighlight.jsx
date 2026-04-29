import React, { useRef } from "react";
import { Animated, Pressable } from "react-native";

const PressHighlight = ({
  children,
  style,
  onPress,
  color = "rgba(82,183,136,0.05)",
  ...props
}) => {
  const anim = useRef(new Animated.Value(0)).current;

  const pressIn = () =>
    Animated.timing(anim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: false,
    }).start();

  const pressOut = () =>
    Animated.timing(anim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start();

  const backgroundColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(0,0,0,0)", color],
  });

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} {...props}>
      <Animated.View style={[style, { backgroundColor }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default PressHighlight;
