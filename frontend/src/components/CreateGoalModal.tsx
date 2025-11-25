import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, View, Platform } from 'react-native';
import {
  Portal,
  Dialog,
  Button as PaperButton,
  TextInput,
  Chip,
  IconButton,
  Divider,
  SegmentedButtons,
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';

import { Button, Card, Text } from '@/components';
import { spacing, radii } from '@/utils';
import type { GoalType, GoalFrequency, CreateGoalPayload, CreateReminderPayload, ReminderFrequency } from '@/types';

interface CreateGoalModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: (payload: CreateGoalPayload) => void;
  isLoading?: boolean;
}

interface ReminderFormData {
  id: string;
  title: string;
  body: string;
  time: Date;
  frequency: ReminderFrequency;
}

const GOAL_TYPES: { type: GoalType; label: string; color: string; icon: string }[] = [
  { type: 'nutrition', label: 'Nutrition', color: '#FF6B6B', icon: 'food-apple' },
  { type: 'workout', label: 'Workout', color: '#4ECDC4', icon: 'dumbbell' },
  { type: 'hydration', label: 'Hydration', color: '#45B7D1', icon: 'water' },
  { type: 'sleep', label: 'Sleep', color: '#9B59B6', icon: 'sleep' },
  { type: 'weight', label: 'Weight', color: '#F39C12', icon: 'scale-bathroom' },
  { type: 'habit', label: 'Habit', color: '#1ABC9C', icon: 'check-circle' },
  { type: 'meal_prep', label: 'Meal Prep', color: '#E74C3C', icon: 'chef-hat' },
];

const COMMON_UNITS: Record<GoalType, string[]> = {
  nutrition: ['calories', 'protein (g)', 'carbs (g)', 'fat (g)', 'meals'],
  workout: ['sessions', 'minutes', 'hours', 'exercises'],
  hydration: ['glasses', 'liters', 'oz'],
  sleep: ['hours', 'sleep cycles'],
  weight: ['kg', 'lbs', 'body fat %'],
  habit: ['times', 'days', 'sessions'],
  meal_prep: ['meals', 'recipes', 'servings'],
};

export const CreateGoalModal: React.FC<CreateGoalModalProps> = ({
  visible,
  onDismiss,
  onSave,
  isLoading,
}) => {
  // Form state
  const [goalType, setGoalType] = useState<GoalType>('nutrition');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [targetUnit, setTargetUnit] = useState('calories');
  const [frequency, setFrequency] = useState<GoalFrequency>('daily');
  const [selectedColor, setSelectedColor] = useState('#FF6B6B');
  const [reminders, setReminders] = useState<ReminderFormData[]>([]);

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState(new Date());

  // Time picker state
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activeReminderId, setActiveReminderId] = useState<string | null>(null);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Handle goal type change
  const handleGoalTypeChange = (type: GoalType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGoalType(type);
    const typeData = GOAL_TYPES.find((t) => t.type === type);
    if (typeData) {
      setSelectedColor(typeData.color);
    }
    // Set default unit
    const units = COMMON_UNITS[type];
    if (units.length > 0) {
      setTargetUnit(units[0]);
    }
  };

  // Add reminder
  const handleAddReminder = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newReminder: ReminderFormData = {
      id: `temp_${Date.now()}`,
      title: `${title || 'Goal'} reminder`,
      body: 'Time to work on your goal!',
      time: new Date(),
      frequency: 'daily',
    };
    setReminders([...reminders, newReminder]);
  };

  // Remove reminder
  const handleRemoveReminder = (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setReminders(reminders.filter((r) => r.id !== id));
  };

  // Update reminder time
  const handleTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');

    if (selectedDate && activeReminderId) {
      const updatedReminders = reminders.map((r) =>
        r.id === activeReminderId ? { ...r, time: selectedDate } : r
      );
      setReminders(updatedReminders);
    }
    setActiveReminderId(null);
  };

  // Open time picker for reminder
  const openTimePicker = (reminderId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveReminderId(reminderId);
    setShowTimePicker(true);
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (targetValue && isNaN(Number(targetValue))) {
      newErrors.targetValue = 'Must be a number';
    }

    if (targetValue && Number(targetValue) <= 0) {
      newErrors.targetValue = 'Must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = () => {
    if (!validateForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const payload: CreateGoalPayload = {
      type: goalType,
      title: title.trim(),
      description: description.trim() || undefined,
      targetValue: targetValue ? Number(targetValue) : undefined,
      targetUnit: targetValue ? targetUnit : undefined,
      frequency,
      startDate: startDate.toISOString(),
      color: selectedColor,
      icon: GOAL_TYPES.find((t) => t.type === goalType)?.icon,
      reminders: reminders.map((r) => ({
        title: r.title,
        body: r.body,
        time: `${r.time.getHours().toString().padStart(2, '0')}:${r.time.getMinutes().toString().padStart(2, '0')}`,
        frequency: r.frequency,
        isEnabled: true,
      })),
    };

    onSave(payload);
    handleReset();
  };

  // Reset form
  const handleReset = () => {
    setGoalType('nutrition');
    setTitle('');
    setDescription('');
    setTargetValue('');
    setTargetUnit('calories');
    setFrequency('daily');
    setSelectedColor('#FF6B6B');
    setReminders([]);
    setStartDate(new Date());
    setErrors({});
  };

  // Handle dismiss
  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleReset();
    onDismiss();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={handleDismiss} style={styles.dialog}>
        <Dialog.Title>Create New Goal</Dialog.Title>
        <Dialog.ScrollArea style={styles.scrollArea}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Goal Type Selector */}
            <View style={styles.section}>
              <Text variant="body" weight="bold" style={styles.sectionTitle}>
                Goal Type
              </Text>
              <View style={styles.chipContainer}>
                {GOAL_TYPES.map((type) => (
                  <Chip
                    key={type.type}
                    selected={goalType === type.type}
                    onPress={() => handleGoalTypeChange(type.type)}
                    style={[
                      styles.chip,
                      goalType === type.type && { backgroundColor: `${type.color}30` },
                    ]}
                    textStyle={goalType === type.type && { color: type.color }}
                    mode={goalType === type.type ? 'flat' : 'outlined'}
                  >
                    {type.label}
                  </Chip>
                ))}
              </View>
            </View>

            <Divider style={styles.divider} />

            {/* Title */}
            <View style={styles.section}>
              <TextInput
                label="Goal Title *"
                value={title}
                onChangeText={setTitle}
                mode="outlined"
                placeholder="e.g., Daily Calorie Goal"
                error={!!errors.title}
                style={styles.input}
              />
              {errors.title && (
                <Text variant="caption" style={styles.errorText}>
                  {errors.title}
                </Text>
              )}
            </View>

            {/* Description */}
            <View style={styles.section}>
              <TextInput
                label="Description (Optional)"
                value={description}
                onChangeText={setDescription}
                mode="outlined"
                multiline
                numberOfLines={3}
                placeholder="Add more details about your goal..."
                style={styles.input}
              />
            </View>

            <Divider style={styles.divider} />

            {/* Target Value */}
            <View style={styles.section}>
              <Text variant="body" weight="bold" style={styles.sectionTitle}>
                Target (Optional)
              </Text>
              <View style={styles.row}>
                <TextInput
                  label="Target Value"
                  value={targetValue}
                  onChangeText={setTargetValue}
                  mode="outlined"
                  keyboardType="numeric"
                  placeholder="e.g., 2000"
                  error={!!errors.targetValue}
                  style={[styles.input, styles.targetInput]}
                />
                <View style={styles.unitSelector}>
                  <SegmentedButtons
                    value={targetUnit}
                    onValueChange={setTargetUnit}
                    buttons={COMMON_UNITS[goalType].slice(0, 2).map((unit) => ({
                      value: unit,
                      label: unit,
                    }))}
                    density="small"
                  />
                </View>
              </View>
              {errors.targetValue && (
                <Text variant="caption" style={styles.errorText}>
                  {errors.targetValue}
                </Text>
              )}
            </View>

            {/* Frequency */}
            <View style={styles.section}>
              <Text variant="body" weight="bold" style={styles.sectionTitle}>
                Frequency
              </Text>
              <SegmentedButtons
                value={frequency}
                onValueChange={(value) => setFrequency(value as GoalFrequency)}
                buttons={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                ]}
                style={styles.segmented}
              />
            </View>

            <Divider style={styles.divider} />

            {/* Reminders */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text variant="body" weight="bold" style={styles.sectionTitle}>
                  Reminders
                </Text>
                <IconButton
                  icon="plus-circle"
                  size={24}
                  onPress={handleAddReminder}
                  iconColor={selectedColor}
                />
              </View>

              {reminders.map((reminder, index) => (
                <Card key={reminder.id} style={styles.reminderCard}>
                  <View style={styles.reminderHeader}>
                    <Text variant="body" weight="bold">
                      Reminder {index + 1}
                    </Text>
                    <IconButton
                      icon="delete"
                      size={20}
                      onPress={() => handleRemoveReminder(reminder.id)}
                      iconColor="#F44336"
                    />
                  </View>

                  <TextInput
                    label="Title"
                    value={reminder.title}
                    onChangeText={(text) => {
                      const updated = reminders.map((r) =>
                        r.id === reminder.id ? { ...r, title: text } : r
                      );
                      setReminders(updated);
                    }}
                    mode="outlined"
                    style={styles.reminderInput}
                  />

                  <View style={styles.reminderTimeRow}>
                    <PaperButton
                      mode="outlined"
                      onPress={() => openTimePicker(reminder.id)}
                      icon="clock-outline"
                      style={styles.timeButton}
                    >
                      {reminder.time.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </PaperButton>

                    <View style={styles.frequencySelector}>
                      <SegmentedButtons
                        value={reminder.frequency}
                        onValueChange={(value) => {
                          const updated = reminders.map((r) =>
                            r.id === reminder.id
                              ? { ...r, frequency: value as ReminderFrequency }
                              : r
                          );
                          setReminders(updated);
                        }}
                        buttons={[
                          { value: 'daily', label: 'Daily' },
                          { value: 'weekdays', label: 'Weekdays' },
                        ]}
                        density="small"
                      />
                    </View>
                  </View>
                </Card>
              ))}

              {reminders.length === 0 && (
                <Text variant="caption" style={styles.noRemindersText}>
                  No reminders yet. Tap + to add one.
                </Text>
              )}
            </View>

            {/* Color Picker */}
            <View style={styles.section}>
              <Text variant="body" weight="bold" style={styles.sectionTitle}>
                Color
              </Text>
              <View style={styles.colorPicker}>
                {GOAL_TYPES.map((type) => (
                  <IconButton
                    key={type.color}
                    icon={selectedColor === type.color ? 'check-circle' : 'circle'}
                    iconColor={type.color}
                    size={32}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedColor(type.color);
                    }}
                    style={[
                      styles.colorButton,
                      { backgroundColor: `${type.color}20` },
                      selectedColor === type.color && styles.colorButtonSelected,
                    ]}
                  />
                ))}
              </View>
            </View>
          </ScrollView>
        </Dialog.ScrollArea>

        <Dialog.Actions>
          <PaperButton onPress={handleDismiss} disabled={isLoading}>
            Cancel
          </PaperButton>
          <PaperButton
            onPress={handleSave}
            mode="contained"
            loading={isLoading}
            disabled={isLoading || !title.trim()}
          >
            Create Goal
          </PaperButton>
        </Dialog.Actions>
      </Dialog>

      {/* Time Picker */}
      {showTimePicker && activeReminderId && (
        <DateTimePicker
          value={reminders.find((r) => r.id === activeReminderId)?.time || new Date()}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    maxHeight: '90%',
  },
  scrollArea: {
    paddingHorizontal: 0,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  targetInput: {
    flex: 1,
  },
  unitSelector: {
    flex: 1,
  },
  segmented: {
    marginTop: spacing.xs,
  },
  divider: {
    marginVertical: spacing.md,
  },
  reminderCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderInput: {
    backgroundColor: 'transparent',
  },
  reminderTimeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  timeButton: {
    flex: 1,
  },
  frequencySelector: {
    flex: 1,
  },
  noRemindersText: {
    textAlign: 'center',
    opacity: 0.6,
    marginTop: spacing.sm,
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  colorButton: {
    margin: 0,
  },
  colorButtonSelected: {
    borderWidth: 2,
    borderColor: 'currentColor',
  },
  errorText: {
    color: '#F44336',
    marginTop: spacing.xs,
  },
});
