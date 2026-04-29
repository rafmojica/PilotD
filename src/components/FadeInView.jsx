import React, { useRef, useCallback } from "react";
import { Animated } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

const FadeInView = ({ children, style }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(6)).current;

  useFocusEffect(
    useCallback(() => {
      opacity.setValue(0);
      translateY.setValue(6);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }, [])
  );

  return (
    <Animated.View style={[{ flex: 1 }, style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
};

export default FadeInView;
