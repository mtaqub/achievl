import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { StyleProp, TextStyle } from 'react-native';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Icon names come from data files as plain strings; a test checks every one exists. */
export function Icon({ name, size = 20, color, style }: { name: string; size?: number; color: string; style?: StyleProp<TextStyle> }) {
  return <MaterialCommunityIcons name={name as IconName} size={size} color={color} style={style} />;
}
