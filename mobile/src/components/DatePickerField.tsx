import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, theme } from '../theme';

interface DatePickerFieldProps {
  value: string;
  onChange: (dateStr: string) => void;
  placeholder?: string;
  style?: object;
  maximumDate?: Date;
  minimumDate?: Date;
}

const toDate = (str: string): Date | null => {
  if (!str || str.trim() === '') return null;
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const toDateString = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatDisplay = (str: string): string => {
  const d = toDate(str);
  if (!d) return '';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const DatePickerField: React.FC<DatePickerFieldProps> = ({
  value,
  onChange,
  placeholder = 'Select date',
  style,
  maximumDate,
  minimumDate,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(toDate(value) || new Date());
  const dateValue = toDate(value) || new Date();

  const handleChange = (_e: unknown, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (selectedDate) {
        onChange(toDateString(selectedDate));
      }
    } else {
      // iOS: update temp date while spinning
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const handleConfirm = () => {
    onChange(toDateString(tempDate));
    setShowPicker(false);
  };

  const handleCancel = () => {
    setShowPicker(false);
    setTempDate(dateValue); // Reset temp date
  };

  const displayText = value ? formatDisplay(value) : placeholder;

  return (
    <>
      <TouchableOpacity
        style={[styles.touchable, style]}
        onPress={() => {
          setTempDate(dateValue);
          setShowPicker(true);
        }}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name="calendar-outline"
          size={20}
          color={colors.textMuted}
          style={styles.icon}
        />
        <Text style={[styles.text, !value && styles.placeholder]}>{displayText}</Text>
        <MaterialCommunityIcons
          name="chevron-down"
          size={20}
          color={colors.textMuted}
        />
      </TouchableOpacity>

      {Platform.OS === 'ios' && showPicker && (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={handleCancel}
        >
          <Pressable style={styles.modalOverlay} onPress={handleCancel}>
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={handleCancel}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>Select Date</Text>
                <TouchableOpacity onPress={handleConfirm}>
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleChange}
                maximumDate={maximumDate}
                minimumDate={minimumDate}
                textColor={colors.text}
                themeVariant="light"
              />
            </View>
          </Pressable>
        </Modal>
      )}

      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display="default"
          onChange={handleChange}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  touchable: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: {
    marginRight: 10,
  },
  text: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  placeholder: {
    color: colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingBottom: 34,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  cancelButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
    padding: 8,
  },
  doneButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
    padding: 8,
  },
});