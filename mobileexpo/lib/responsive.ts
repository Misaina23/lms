import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

const BASE_WIDTH = 360;
const BASE_HEIGHT = 740;

export const SCREEN_WIDTH = width;
export const SCREEN_HEIGHT = height;

const widthPercent = (percentage: number) =>
  PixelRatio.roundToNearestPixel((width * percentage) / 100);

const heightPercent = (percentage: number) =>
  PixelRatio.roundToNearestPixel((height * percentage) / 100);

export const isSmallDevice = width < 360;
export const isMediumDevice = width >= 360 && width < 412;
export const isLargeDevice = width >= 412;
export const isTablet = width >= 768;

export const scale = (size: number) => {
  const newSize = size * (width / BASE_WIDTH);
  if (Platform.OS === 'ios') return Math.round(PixelRatio.roundToNearestPixel(newSize));
  return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
};

export const verticalScale = (size: number) => {
  const newSize = size * (height / BASE_HEIGHT);
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const moderateScale = (size: number, factor = 0.5) => {
  return Math.round(size + (scale(size) - size) * factor);
};

export const wp = (percentage: number) => widthPercent(percentage);
export const hp = (percentage: number) => heightPercent(percentage);

export const normalize = (size: number) => {
  if (isTablet) return Math.round(size * 1.3);
  if (isLargeDevice) return Math.round(size * 1.1);
  if (isSmallDevice) return Math.round(size * 0.9);
  return size;
};

export const iconSize = {
  xs: normalize(14),
  sm: normalize(18),
  md: normalize(22),
  lg: normalize(26),
  xl: normalize(32),
};

export const fontSize = {
  xs: normalize(11),
  sm: normalize(13),
  md: normalize(15),
  lg: normalize(17),
  xl: normalize(20),
  xxl: normalize(24),
  title: normalize(22),
  heading: normalize(18),
  display: normalize(28),
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
};
