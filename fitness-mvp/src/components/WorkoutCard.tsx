import React, { useState } from 'react';
import { Image, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSnackbar } from '@/components';
import { getFriendlyErrorMessage } from '@/utils/errors';

import { Button, Card, Text } from '@/components';
import { spacing, radii } from '@/utils';
import type { WorkoutCard as Workout } from '@/types';

type Props = {
  item: Workout;
  onSave?: (id: string) => Promise<boolean> | boolean | void;
};

const openYouTube = async (youtubeId?: string) => {
  if (!youtubeId) return;
  const appUrl = Platform.select({ ios: `youtube://watch?v=${youtubeId}`, android: `vnd.youtube:${youtubeId}` });
  const webUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
  try {
    if (appUrl && (await Linking.canOpenURL(appUrl))) {
      await Linking.openURL(appUrl);
      return;
    }
  } catch {}
  Linking.openURL(webUrl);
};

export const WorkoutCard = ({ item, onSave }: Props) => {
  const [saving, setSaving] = useState(false);
  const { showSnackbar } = useSnackbar();
  const level = item.level?.toUpperCase?.() ?? '—';
  const duration = item.durationMinutes ? `${item.durationMinutes} min` : '—';
  const equipment = (item.equipment ?? []).join(', ');

  const handleSave = async () => {
    if (!onSave || saving) return;
    try {
      setSaving(true);
      const result = await Promise.resolve(onSave(item.id));
      const ok = result === undefined ? true : Boolean(result);
      if (ok) {
        showSnackbar('Saved to your workouts', { variant: 'success' });
      } else {
        showSnackbar('Failed to save', { variant: 'error', actionLabel: 'Retry', onAction: handleSave });
      }
    } catch (e: any) {
      showSnackbar(getFriendlyErrorMessage(e), { variant: 'error', actionLabel: 'Retry', onAction: handleSave });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={styles.card}>
      {item.thumbnailUrl ? (
        <Image source={{ uri: item.thumbnailUrl }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]} />
      )}

      <View style={{ gap: spacing.xs }}>
        <Text variant="body" weight="bold" numberOfLines={2}>{item.title}</Text>
        <Text variant="caption" style={{ opacity: 0.8 }}>{duration} • {level}</Text>
        {!!equipment && <Text variant="caption" style={{ opacity: 0.8 }}>Equipment: {equipment}</Text>}
      </View>

      <View style={styles.row}>
        <Button title="▶ Watch Video" onPress={() => openYouTube(item.youtubeId)} />
        <Pressable accessibilityRole="button" onPress={handleSave} disabled={saving}>
          <Feather name="bookmark" size={20} />
        </Pressable>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  image: { width: '100%', height: 180, borderRadius: radii.lg },
  imagePlaceholder: { backgroundColor: 'rgba(0,0,0,0.08)' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
