import type { TextStyle } from 'react-native';

export const Theme = {
  colors: {
    background: '#F6F7F9',
    surface: '#FFFFFF',
    primary: '#208AEF',
    primaryDark: '#1668B4',
    text: '#14181F',
    muted: '#667085',
    border: '#E4E7EC',
    danger: '#D92D20',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: 12,
  font: {
    title: { fontSize: 24, fontWeight: '700' } satisfies TextStyle,
    subtitle: { fontSize: 17, fontWeight: '600' } satisfies TextStyle,
    body: { fontSize: 15, fontWeight: '400' } satisfies TextStyle,
    small: { fontSize: 13, fontWeight: '400' } satisfies TextStyle,
  },
};
