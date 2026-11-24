import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ThemeShade } from '../theme/palette';
import { triggerLightHaptic } from '../utils/haptics';
import { ScalePressable } from './AnimatedPrimitives';

interface SalaryScheduleCardProps {
  frequency: 1 | 2;
  payday1: number;
  payday2: number;
  shade: ThemeShade;
  onChange: (frequency: 1 | 2, payday1: number, payday2: number) => void;
}

/**
 * Shared Salary Schedule selector supporting 1x or 2x monthly paydays (Day 1-31).
 */
export const SalaryScheduleCard: React.FC<SalaryScheduleCardProps> = ({
  frequency,
  payday1,
  payday2,
  shade,
  onChange,
}) => {
  const [day1Text, setDay1Text] = useState(String(payday1));
  const [day2Text, setDay2Text] = useState(String(payday2));
  const [focusedField, setFocusedField] = useState<1 | 2 | null>(null);

  useEffect(() => {
    if (focusedField !== 1) {
      setDay1Text(String(payday1));
    }
  }, [payday1, focusedField]);

  useEffect(() => {
    if (focusedField !== 2) {
      setDay2Text(String(payday2));
    }
  }, [payday2, focusedField]);

  const handleDay1Change = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 2);
    setDay1Text(cleaned);
    const parsed = parseInt(cleaned, 10);
    if (!Number.isNaN(parsed) && parsed >= 1) {
      const clamped = Math.min(31, parsed);
      onChange(frequency, clamped, payday2);
    }
  };

  const handleDay2Change = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 2);
    setDay2Text(cleaned);
    const parsed = parseInt(cleaned, 10);
    if (!Number.isNaN(parsed) && parsed >= 1) {
      const clamped = Math.min(31, parsed);
      onChange(frequency, payday1, clamped);
    }
  };

  const handleDay1Blur = () => {
    setFocusedField(null);
    const parsed = parseInt(day1Text, 10);
    const valid = Number.isNaN(parsed) ? 15 : Math.max(1, Math.min(31, parsed));
    setDay1Text(String(valid));
    onChange(frequency, valid, payday2);
  };

  const handleDay2Blur = () => {
    setFocusedField(null);
    const parsed = parseInt(day2Text, 10);
    const valid = Number.isNaN(parsed) ? 30 : Math.max(1, Math.min(31, parsed));
    setDay2Text(String(valid));
    onChange(frequency, payday1, valid);
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: shade.card, borderColor: shade.border },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: shade.text }]}>
            How often do you get paid?
          </Text>
          <Text style={[styles.subtitle, { color: shade.muted }]}>
            We'll show a payday countdown on your card
          </Text>
        </View>
      </View>

      <View style={styles.freqRow}>
        <ScalePressable
          onPress={() => {
            triggerLightHaptic();
            onChange(1, payday1, payday2);
          }}
          accessibilityRole="tab"
          accessibilityLabel="Paid once per month"
          accessibilityState={{ selected: frequency === 1 }}
          style={[
            styles.freqBtn,
            {
              backgroundColor: frequency === 1 ? shade.accent : shade.surface,
            },
          ]}
        >
          <Text
            style={[
              styles.freqText,
              { color: frequency === 1 ? shade.accentText : shade.text },
            ]}
          >
            1x / Month
          </Text>
        </ScalePressable>

        <ScalePressable
          onPress={() => {
            triggerLightHaptic();
            onChange(2, payday1, payday2);
          }}
          accessibilityRole="tab"
          accessibilityLabel="Paid twice per month"
          accessibilityState={{ selected: frequency === 2 }}
          style={[
            styles.freqBtn,
            {
              backgroundColor: frequency === 2 ? shade.accent : shade.surface,
            },
          ]}
        >
          <Text
            style={[
              styles.freqText,
              { color: frequency === 2 ? shade.accentText : shade.text },
            ]}
          >
            2x / Month (Bi-Monthly)
          </Text>
        </ScalePressable>
      </View>

      <View style={styles.daysRow}>
        <View style={styles.dayFieldWrap}>
          <Text style={[styles.dayLabel, { color: shade.muted }]}>
            {frequency === 2 ? '1st Payday (Day 1–31)' : 'Payday (Day 1–31)'}
          </Text>
          <TextInput
            value={day1Text}
            onChangeText={handleDay1Change}
            onFocus={() => setFocusedField(1)}
            onBlur={handleDay1Blur}
            keyboardType="numeric"
            maxLength={2}
            placeholder="15"
            placeholderTextColor={shade.muted}
            accessibilityLabel={
              frequency === 2 ? 'First payday day of month' : 'Payday day of month'
            }
            selectTextOnFocus
            style={[
              styles.dayInput,
              {
                backgroundColor: shade.bg,
                color: shade.text,
                borderColor: shade.border,
              },
            ]}
          />
        </View>

        {frequency === 2 && (
          <View style={styles.dayFieldWrap}>
            <Text style={[styles.dayLabel, { color: shade.muted }]}>
              2nd Payday (Day 1–31)
            </Text>
            <TextInput
              value={day2Text}
              onChangeText={handleDay2Change}
              onFocus={() => setFocusedField(2)}
              onBlur={handleDay2Blur}
              keyboardType="numeric"
              maxLength={2}
              placeholder="30"
              placeholderTextColor={shade.muted}
              accessibilityLabel="Second payday day of month"
              selectTextOnFocus
              style={[
                styles.dayInput,
                {
                  backgroundColor: shade.bg,
                  color: shade.text,
                  borderColor: shade.border,
                },
              ]}
            />
          </View>
        )}
      </View>

      {frequency === 2 && payday1 === payday2 && (
        <Text style={[styles.sameDayWarn, { color: shade.warning }]}>
          1st and 2nd payday are set to the same day ({payday1}). Use distinct days or switch to 1x / Month.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 10,
  },
  freqRow: {
    flexDirection: 'row',
    gap: 8,
  },
  freqBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freqText: {
    fontSize: 12,
    fontWeight: '800',
  },
  daysRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dayFieldWrap: {
    flex: 1,
    gap: 4,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  dayInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  sameDayWarn: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },
});
