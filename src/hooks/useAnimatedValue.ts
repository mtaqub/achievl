import { useState } from 'react';
import { Animated } from 'react-native';

/**
 * One Animated.Value that lives as long as the component. React Native exports a hook
 * of the same name, but react-native-web does not, so the app crashed on the web.
 */
export function useAnimatedValue(initial: number): Animated.Value {
  const [value] = useState(() => new Animated.Value(initial));
  return value;
}
