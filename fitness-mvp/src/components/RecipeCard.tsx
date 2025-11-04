import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSnackbar } from '@/components';
import { getFriendlyErrorMessage } from '@/utils/errors';

import { Button, Card, Text } from '@/components';
import { radii, spacing } from '@/utils';
import type { RecipeCard as Recipe } from '@/types';

type Props = {
  item: Recipe;
  onSave?: (id: string) => Promise<boolean> | boolean | void;
  onStart?: (id: string) => void;
};

export const RecipeCard = ({ item, onSave, onStart }: Props) => {
  const [saving, setSaving] = useState(false);
  const { showSnackbar } = useSnackbar();
  const time = item.timeMinutes ? `${item.timeMinutes} min` : '—';
  const difficulty = item.difficulty ? item.difficulty.toUpperCase() : '—';

  const handleSave = async () => {
    if (!onSave || saving) return;
    try {
      setSaving(true);
      const result = await Promise.resolve(onSave(item.id));
      const ok = result === undefined ? true : Boolean(result);
      if (ok) {
        showSnackbar('Saved to your recipes', { variant: 'success' });
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
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]} />
      )}

      <View style={{ gap: spacing.xs }}>
        <Text variant="body" weight="bold" numberOfLines={2}>{item.title}</Text>
        <Text variant="caption" style={{ opacity: 0.8 }}>{time} • {difficulty}</Text>
      </View>

      <View style={styles.row}>
        <Button title="Start Cooking" onPress={() => onStart?.(item.id)} />
        <Pressable accessibilityRole="button" onPress={handleSave} disabled={saving}>
          <Feather name="bookmark" size={20} />
        </Pressable>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  image: { width: '100%', height: 200, borderRadius: radii.lg },
  imagePlaceholder: { backgroundColor: 'rgba(0,0,0,0.08)' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
