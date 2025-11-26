import React from 'react';
import { Card, Text } from 'react-native-paper';
import { StyleSheet, View } from 'react-native';

interface NutritionTrackerCardProps {
  summary: any;
  isLoading: boolean;
}

const NutritionTrackerCard: React.FC<NutritionTrackerCardProps> = ({ summary, isLoading }) => {
  if (isLoading) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text>Loading nutrition data...</Text>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Card.Title title="Nutrition Summary" />
      <Card.Content>
        <Text>Nutrition tracking information will be displayed here.</Text>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 10,
  },
});

export default NutritionTrackerCard;
