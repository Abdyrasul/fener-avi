import { Platform } from 'react-native';

export const C = {
  ink: '#17171a',
  blue: '#2a4bd0',
  lightBlue: '#a9bcf6',
  yellow: '#f7c625',
  red: '#e2382c',
  lavender: '#c9b5f3',
  pink: '#f6abbb',
  cream: '#fffaf0',
  night: '#0d1442',
  nightDeep: '#0a0f33',
  tray: '#151c4d',
  slot: '#222b66',
  silhouette: '#3b4588',
  glow: '#ffe58a',
};

export const font = Platform.select({
  web: 'ui-rounded, "SF Pro Rounded", system-ui, -apple-system, sans-serif',
  ios: 'System',
  default: undefined,
});
