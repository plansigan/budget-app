import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FadeSlideIn, ScalePressable } from '../../components/AnimatedPrimitives';
import { AppIcon, IconBadge } from '../../components/AppIcon';
import { useThemePrefs } from '../../context/BudgetContext';
import { WantToBuyItem } from '../../types/budget';
import { triggerLightHaptic } from '../../utils/haptics';

interface TodayReevaluateCardProps {
  readyItems: WantToBuyItem[];
  onReviewItem: (item: WantToBuyItem) => void;
  onSkipItem: (item: WantToBuyItem) => void;
}

/**
 * Calm dashboard prompt surfaced only when one or more 7-day cool-off items
 * are ready for re-evaluation.
 */
export const TodayReevaluateCard: React.FC<TodayReevaluateCardProps> = ({
  readyItems,
  onReviewItem,
  onSkipItem,
}) => {
  const { shade, formatVisiblePeso } = useThemePrefs();

  if (readyItems.length === 0) return null;

  const primary = readyItems[0];
  const extraCount = readyItems.length - 1;

  return (
    <FadeSlideIn delay={15} distance={10}>
      <View
        style={[
          styles.card,
          { backgroundColor: shade.card, borderColor: shade.dopamine },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <AppIcon name="clock" size={13} color={shade.dopamine} />
            <Text style={[styles.kicker, { color: shade.dopamine }]}>
              TIME TO RE-EVALUATE
            </Text>
          </View>
          {extraCount > 0 && (
            <View
              style={[styles.countPill, { backgroundColor: shade.dopamineSoft }]}
            >
              <Text style={[styles.countText, { color: shade.dopamine }]}>
                +{extraCount} more
              </Text>
            </View>
          )}
        </View>

        <View style={styles.itemRow}>
          <IconBadge
            name={primary.icon}
            size={17}
            color={shade.dopamine}
            bg={shade.dopamineSoft}
            boxSize={40}
          />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text
              numberOfLines={1}
              style={[styles.itemName, { color: shade.text }]}
            >
              {primary.name}
            </Text>
            <Text style={[styles.itemSub, { color: shade.muted }]}>
              {formatVisiblePeso(primary.price)} • 7-day wait finished
            </Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <ScalePressable
            onPress={() => {
              triggerLightHaptic();
              onReviewItem(primary);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Review ${primary.name}`}
            style={[
              styles.reviewBtn,
              { backgroundColor: shade.dopamineBtnBg },
            ]}
          >
            <Text style={[styles.btnText, { color: '#FFFFFF' }]}>Review</Text>
          </ScalePressable>

          <ScalePressable
            onPress={() => onSkipItem(primary)}
            accessibilityRole="button"
            accessibilityLabel={`Skip ${primary.name}`}
            style={[
              styles.skipBtn,
              { backgroundColor: shade.positiveSoft },
            ]}
          >
            <Text style={[styles.btnText, { color: shade.positive }]}>
              Skip & Keep ₱
            </Text>
          </ScalePressable>
        </View>
      </View>
    </FadeSlideIn>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  countPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  countText: {
    fontSize: 10,
    fontWeight: '800',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '800',
  },
  itemSub: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  reviewBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  skipBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  btnText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
