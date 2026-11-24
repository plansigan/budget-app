import React, { useMemo } from 'react';
import {
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useDailyBudget,
  useGoals,
  useThemePrefs,
} from '../context/BudgetContext';
import { useToastActions } from '../context/ToastContext';
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

const MonthlyWrapUpModalContent: React.FC<
  Omit<MonthlyWrapUpModalProps, 'visible'>
> = ({ onClose, archiveSnapshot = null }) => {
  const { shade, privacyMode } = useThemePrefs();
  const { showToast } = useToastActions();
  const { settings, entries } = useDailyBudget();
  const { monthlySaved, streakDays, disciplineScore } = useGoals();

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
            privacyMode,
          }),
    [
      archiveSnapshot,
      settings,
      monthlySaved,
      entries,
      streakDays,
      disciplineScore,
      privacyMode,
    ]
  );

  const mask = (amt: number) => formatPesoDisplay(amt, privacyMode);

  const handleShare = async () => {
    triggerSuccessHaptic();
    if (Platform.OS === 'web') {
      try {
        if (
          typeof navigator !== 'undefined' &&
          typeof navigator.share === 'function'
        ) {
          await navigator.share({
            title: report.monthTitle,
            text: report.shareText,
          });
          return;
        }
      } catch {
        // Fall back to clipboard
      }
      try {
        if (
          typeof navigator !== 'undefined' &&
          navigator.clipboard &&
          typeof navigator.clipboard.writeText === 'function'
        ) {
          await navigator.clipboard.writeText(report.shareText);
          showToast('Monthly summary copied to clipboard!', true);
          return;
        }
      } catch {
        showToast('Could not copy report on this browser.', false);
      }
      return;
    }

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
      visible
      onClose={onClose}
      avoidKeyboard={false}
      initialScale={0.9}
      springSpeed={24}
      springBounciness={8}
      cardStyle={[
        styles.card,
        { backgroundColor: shade.heroBg, borderColor: shade.heroBorder },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollBody}
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
            accessibilityRole="button"
            accessibilityLabel="Close monthly wrap-up"
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
              { backgroundColor: shade.positiveBtnBg },
            ]}
          >
            <Text style={styles.gradeText}>{report.grade}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
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
                style={[styles.statVal, { color: shade.heroPositive }]}
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
              <Text style={[styles.statVal, { color: shade.heroDopamine }]}>
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
                <AppIcon name="zap" size={15} color={shade.heroAmber} />
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
            onPress={() => {
              void handleShare();
            }}
            accessibilityRole="button"
            accessibilityLabel="Share monthly report"
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
            accessibilityRole="button"
            accessibilityLabel="Close monthly wrap-up"
            style={[styles.doneBtn, { backgroundColor: shade.heroSurface }]}
          >
            <Text style={[styles.doneBtnText, { color: shade.heroText }]}>
              Close
            </Text>
          </ScalePressable>
        </View>
      </ScrollView>
    </BaseModal>
  );
};

/**
 * Dark Obsidian Monthly Report Card summarizing savings, spending, streaks,
 * top category, and grade with Web clipboard fallback + Share.
 */
export const MonthlyWrapUpModal: React.FC<MonthlyWrapUpModalProps> = (
  props
) => {
  if (!props.visible) return null;
  return (
    <MonthlyWrapUpModalContent
      archiveSnapshot={props.archiveSnapshot}
      onClose={props.onClose}
    />
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    padding: 20,
    maxHeight: '88%',
  },
  scrollBody: {
    gap: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    flex: 1,
    minWidth: 0,
  },
  closeChip: {
    width: 30,
    height: 30,
    borderRadius: 15,
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
    flexWrap: 'wrap',
    gap: 8,
  },
  statBox: {
    flex: 1,
    minWidth: 120,
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
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
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
