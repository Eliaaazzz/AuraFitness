import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Button, Card, Container, SafeAreaWrapper, Text } from '@/components';
import { spacing } from '@/utils';
import { useSavedWorkouts } from '@/services';
import useCurrentUser from '@/hooks/useCurrentUser';

type TabParamList = {
  Capture: undefined;
  Workouts: undefined;
  Recipes: undefined;
  DesignSystem?: undefined;
};

export const WorkoutsScreen = () => {
  const currentUser = useCurrentUser();
  const userId = currentUser.data?.userId;
  const saved = useSavedWorkouts(userId);
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();

  if (currentUser.isLoading) {
    return (
      <SafeAreaWrapper>
        <Container>
          <Card>
            <Text variant="body">Loading your profile…</Text>
          </Card>
        </Container>
      </SafeAreaWrapper>
    );
  }

  if (currentUser.isError) {
    return (
      <SafeAreaWrapper>
        <Container>
          <Card style={styles.emptyState}>
            <Text variant="heading2" weight="bold" style={styles.emptyTitle}>Unable to load user</Text>
            <Text variant="body" style={styles.emptyBody}>Check your API key or network connection, then try again.</Text>
            <Button title="Retry" onPress={() => currentUser.refetch()} />
          </Card>
        </Container>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <Container style={styles.container}>
        <Text variant="heading1" weight="bold">
          Saved Workouts
        </Text>
        {saved.isLoading && (
          <Card>
            <Text variant="body">Loading your saved workouts…</Text>
          </Card>
        )}
        {saved.isError && (
          <Card>
            <Text variant="body">Failed to load saved workouts.</Text>
            <Button title="Retry" onPress={() => saved.refetch()} />
          </Card>
        )}
        {!saved.isLoading && !saved.isError && saved.data && saved.data.length > 0 ? (
          saved.data.map((workout) => (
            <Card key={workout.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text variant="heading2" weight="bold">
                  {workout.title}
                </Text>
                <MaterialCommunityIcons name="dumbbell" size={24} color="#4ECDC4" />
              </View>
              <Text variant="caption">Duration: {workout.durationMinutes} min</Text>
              <Text variant="caption">Level: {workout.level.toUpperCase()}</Text>
              <Text variant="caption">Equipment: {workout.equipment.join(', ') || 'Bodyweight'}</Text>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyState}>
            <View style={styles.iconWrapper}>
              <MaterialCommunityIcons name="arm-flex" size={48} color="#4ECDC4" />
            </View>
            <Text variant="heading2" weight="bold" style={styles.emptyTitle}>
              Your saved workouts will appear here
            </Text>
            <Text variant="body" style={styles.emptyBody}>
              Capture your equipment to get workout recommendations tailored to your space and gear.
            </Text>
            <Button title="Capture Equipment" onPress={() => navigation.navigate('Capture')} />
          </Card>
        )}
      </Container>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  card: {
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrapper: {
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
    padding: spacing.xl,
    borderRadius: spacing['2xl'],
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyBody: {
    textAlign: 'center',
    color: 'rgba(148, 163, 184, 0.9)',
  },
});
