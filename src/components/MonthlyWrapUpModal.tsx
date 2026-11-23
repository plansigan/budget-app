import React, { useMemo } from 'react';
import {
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useBudget } from '../context/BudgetContext';
import { MonthlyArchiveSnapshot } from '../types/budget';
import { triggerLightHaptic, triggerSuccessHaptic } from '../utils/haptics';
import {
  buildWrapUpFromArchive,
  computeMonthlyWrapUp,
} from '../utils/insightsEngine';
import { formatPesoDisplay } from '../utils/numberFormat';
import { ScalePressable } from './AnimatedPrimitives';
import { AppIcon } from './AppIcon';
import { BaseModal } from './BaseModal';

interface MonthlyWrapUpModalProps {
  visible: boolean;
  onClose: () => void;
  archiveSnapshot?: MonthlyArchiveSnapshot | null;
}

const MonthlyWrapUpModalContent: React.FC<MonthlyWrapUpModalProps> = ({
  visible,
  onClose,
  archiveSnapshot = null,
}) => {
  const {
    shade,
    settings,
    monthlySaved,
    entries,
    streakDays,
    disciplineScore,
    treats,
    sinkingFunds,
    privacyMode,
  } = useBudget();

  const report = useMemo(
    () =>
      archiveSnapshot
        ? buildWrapUpFromArchive(archiveSnapshot, privacyMode)
        : computeMonthlyWrapUp({
            settings,
            monthlySaved,
            entries,
            streakDays,
            disciplineScore,
            treats,
            sinkingFunds,
            privacyMode,
          }),
    [
      archiveSnapshot,
      settings,
      monthlySaved,
      entries,
      streakDays,
      disciplineScore,
      treats,
      sinkingFunds,
      privacyMode,
    ]
  );

  const mask = (amt: number) => formatPesoDisplay(amt, privacyMode);

  const handleShare = async () => {
    triggerSuccessHaptic();
    try {
      await Share.share({
        title: report.monthTitle,
        message: report.shareText,
      });
    } catch {
      // Ignore user cancel
    }
  };

  return (
    <BaseModal
      visible={visible}
      onClose={onClose}
      avoidKeyboard={false}
      initialScale={0.9}
      springSpeed={24}
      springBounciness={8}
      backdropStyle={styles.backdrop}
      cardStyle={[
        styles.card,
        { backgroundColor: shade.heroBg, borderColor: shade.heroBorder },
      ]}
    >
      <View style={styles.topRow}>
            <Text style={[styles.kicker, { color: shade.heroMuted }]}>
              {report.monthTitle}
            </Text>
            <ScalePressable
              onPress={() => {
                triggerLightHaptic();
                onClose();
              }}
              accessibilityLabel="Close modal"
              hitSlop={8}
              style={[
                styles.closeChip,
                { backgroundColor: shade.heroSurface },
              ]}
            >
              <AppIcon name="x" size={14} color={shade.heroText} />
            </ScalePressable>
          </View>

          <View style={styles.gradeRow}>
            <View
              style={[
                styles.gradeBadge,
                { backgroundColor: shade.positive },
              ]}
            >
              <Text style={styles.gradeText}>{report.grade}</Text>
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[styles.headline, { color: shade.heroText }]}>
                Monthly Report Card
              </Text>
              <Text style={[styles.subline, { color: shade.heroMuted }]}>
                {report.headline}
              </Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statsRow}>
              <View
                style={[styles.statBox, { backgroundColor: shade.heroSurface }]}
              >
                <Text style={[styles.statLabel, { color: shade.heroMuted }]}>
                  TOTAL SAVED
                </Text>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.78}
                  style={[styles.statVal, { color: '#4ADE80' }]}
                >
                  {mask(report.totalSaved)}
                </Text>
              </View>

              <View
                style={[styles.statBox, { backgroundColor: shade.heroSurface }]}
              >
                <Text style={[styles.statLabel, { color: shade.heroMuted }]}>
                  TOTAL SPENT
                </Text>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.78}
                  style={[styles.statVal, { color: shade.heroText }]}
                >
                  {mask(report.totalSpent)}
                </Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View
                style={[styles.statBox, { backgroundColor: shade.heroSurface }]}
              >
                <Text style={[styles.statLabel, { color: shade.heroMuted }]}>
                  SAVINGS RATE
                </Text>
                <Text style={[styles.statVal, { color: '#A5B4FC' }]}>
                  {report.savingsRatePct}%
                </Text>
              </View>

              <View
                style={[styles.statBox, { backgroundColor: shade.heroSurface }]}
              >
                <Text style={[styles.statLabel, { color: shade.heroMuted }]}>
                  STREAK & SCORE
                </Text>
                <View style={styles.inlineRow}>
                  <AppIcon name="zap" size={15} color="#FBBF24" />
                  <Text style={[styles.statVal, { color: shade.heroText }]}>
                    {report.streakDays}d • {report.disciplineScore}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.highlightBox,
              { backgroundColor: shade.heroSurface },
            ]}
          >
            <View style={styles.between}>
              <Text style={[styles.hlLabel, { color: shade.heroMuted }]}>
                Top Spend Category
              </Text>
              <Text style={[styles.hlVal, { color: shade.heroText }]}>
                {report.topCategoryLabel}
              </Text>
            </View>
            <View style={styles.between}>
              <Text style={[styles.hlLabel, { color: shade.heroMuted }]}>
                Most Used Wallet
              </Text>
              <Text style={[styles.hlVal, { color: shade.heroText }]}>
                {report.topSourceLabel}
              </Text>
            </View>
          </View>

          <View style={styles.footerRow}>
            <ScalePressable
              onPress={handleShare}
              style={[styles.shareBtn, { backgroundColor: '#FFFFFF' }]}
            >
              <Text style={[styles.shareBtnText, { color: '#141519' }]}>
                Share Report
              </Text>
            </ScalePressable>
            <ScalePressable
              onPress={() => {
                triggerLightHaptic();
                onClose();
              }}
              style={[
                styles.doneBtn,
                { backgroundColor: shade.heroSurface },
              ]}
            >
              <Text style={[styles.doneBtnText, { color: shade.heroText }]}>
                Close
              </Text>
            </ScalePressable>
          </View>
    </BaseModal>
  );
};

/**
 * Dark Obsidian Spotify-Wrapped-inspired Monthly Report Card summarizing savings,
 * spending, streaks, top category, and grade with 1-tap Share.
 */
export const MonthlyWrapUpModal: React.FC<MonthlyWrapUpModalProps> = (props) => {
  if (!props.visible) return null;
  return <MonthlyWrapUpModalContent {...props} />;
};

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(17, 24, 39, 0.55)',
  },
  card: {
    borderRadius: 26,
    padding: 20,
    gap: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  closeChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  gradeBadge: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  headline: {
    fontSize: 18,
    fontWeight: '800',
  },
  subline: {
    fontSize: 12,
    lineHeight: 17,
  },
  statsGrid: {
    gap: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statVal: {
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  highlightBox: {
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  between: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hlLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  hlVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  shareBtn: {
    flex: 1.3,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  doneBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
