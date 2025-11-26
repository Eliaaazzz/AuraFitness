import React from 'react';
import { View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';

type SpinnerSize = 'small' | 'medium' | 'large';

const sizeToPixels: Record<SpinnerSize, number> = {
  small: 16,
  medium: 24,
  large: 32,
};

export interface LoadingSpinnerProps {
  size?: SpinnerSize;
  color?: string;
}

// Material replacement: wrap Paper ActivityIndicator to keep our API stable
export const LoadingSpinner = ({ size = 'medium', color }: LoadingSpinnerProps) => {
  const pixelSize = sizeToPixels[size];
  return (
    <View accessibilityRole="progressbar" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator animating size={pixelSize} color={color} />
    </View>
  );
};
