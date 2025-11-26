import React from 'react';
import { Modal, Portal, Card, Text } from 'react-native-paper';
import { StyleSheet } from 'react-native';

interface MealDetailModalProps {
  visible: boolean;
  meal: any;
  onDismiss: () => void;
}

const MealDetailModal: React.FC<MealDetailModalProps> = ({ visible, meal, onDismiss }) => {
  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
        <Card>
          <Card.Title title={meal?.name || 'Meal Details'} />
          <Card.Content>
            <Text>Meal details will be displayed here.</Text>
          </Card.Content>
        </Card>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 20,
  },
});

export default MealDetailModal;
