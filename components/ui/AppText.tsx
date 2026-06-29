import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useTheme, useThemedStyles, type Theme } from '@/lib/design/theme';

type TypeVariant = keyof Theme['type'];

interface AppTextProps extends TextProps {
  variant?: TypeVariant;
  color?: string;
}

export function AppText({
  variant = 'body',
  color,
  style,
  ...rest
}: AppTextProps) {
  const styles = useThemedStyles(makeStyles);
  const tokens = useTheme();
  const resolvedColor = color ?? tokens.color.textPrimary;
  return (
    <Text
      style={[styles[variant], { color: resolvedColor }, style]}
      {...rest}
    />
  );
}

const makeStyles = (tokens: Theme) => StyleSheet.create({
  hero: tokens.type.hero,
  title: tokens.type.title,
  headline: tokens.type.headline,
  body: tokens.type.body,
  caption: tokens.type.caption,
  mono: tokens.type.mono,
});
