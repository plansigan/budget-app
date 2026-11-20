import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  FadeSlideIn,
  PopValueText,
  ScalePressable,
} from '../components/AnimatedPrimitives';
import { AppIcon } from '../components/AppIcon';
import { BudgetStepperRow } from '../components/BudgetStepperRow';
import { ConfirmModal } from '../components/ConfirmModal';
import { FormModal } from '../components/FormModal';
import { MonthlyBillsBreakdownCard } from '../components/MonthlyBillsBreakdownCard';
import { PayBillModal } from '../components/PayBillModal';
import { SalaryScheduleCard } from '../components/SalaryScheduleCard';
import { SpendingEnvelopesCard } from '../components/SpendingEnvelopesCard';
import { useBudget } from '../context/BudgetContext';
import { BillItem, ThemeMode } from '../types/budget';
import {
  buildTransactionsCsv,
  shareOrDownloadText,
} from '../utils/backupExport';
import { triggerLightHaptic } from '../utils/haptics';

const THEME_OPTIONS: Array<{ mode: ThemeMode; label: string; icon: string }> = [
  { mode: 'system', label: 'System', icon: 'monitor' },
  { mode: 'light', label: 'Light', icon: 'sun' },
  { mode: 'dark', label: 'Dark', icon: 'moon' },
];

/**
 * Budget & Schedule setup screen (no theme/layout switchers—locked to Velvet Dusk Metal Card).
 */
export const SetupAndStyleScreen: React.FC = () => {
  const {
    shade,
    privacyMode,
    themeMode,
    setThemeMode,
    todayKey,
    settings,
    billItems,
    envelopes,
    entries,
    baseDailyAllowance,
    updateBudgetConfig,
    updateSalarySchedule,
    updateBillAmount,
    updateBillDueDay,
    addBillItem,
    removeBillItem,
    addEnvelope,
    updateEnvelope,
    deleteEnvelope,
    refillEnvelope,
    simulateMidnightSplit,
    reopenOnboarding,
    openTutorial,
    resetToNewUser,
    resetDemoState,
    exportBackupJsonString,
    importBackupJsonString,
  } = useBudget();

  const [billToPay, setBillToPay] = useState<BillItem | null>(null);

  const [showRestoreBox, setShowRestoreBox] = useState(false);
  const [restoreText, setRestoreText] = useState('');
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [backupStatus, setBackupStatus] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    destructive?: boolean;
    icon?: string;
    onConfirm: () => void;
  } | null>(null);

  const handleExportCsv = async () => {
    triggerLightHaptic();
    const csv = buildTransactionsCsv(entries);
    const ok = await shareOrDownloadText(
      'velvet-budget-logs.csv',
      csv,
      'text/csv;charset=utf-8;',
      'Velvet Budget Logs (CSV)'
    );
    setBackupStatus({
      ok,
      text: ok
        ? `Exported ${entries.length} logs to CSV!`
        : 'Could not open share dialog.',
    });
  };

  const handleExportJson = async () => {
    triggerLightHaptic();
    const json = exportBackupJsonString();
    const ok = await shareOrDownloadText(
      'velvet-budget-backup.json',
      json,
      'application/json',
      'Velvet Budget Full Backup (JSON)'
    );
    setBackupStatus({
      ok,
      text: ok
        ? 'Full backup ready to save or share!'
        : 'Could not share backup.',
    });
  };

  const handleRestoreJson = () => {
    const res = importBackupJsonString(restoreText);
    setBackupStatus({ ok: res.ok, text: res.message });
    if (res.ok) {
      setRestoreError(null);
      setRestoreText('');
      setShowRestoreBox(false);
    } else {
      setRestoreError(res.message);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Section 1: Monthly Income, Salary Schedule, Bills & Savings */}
      <FadeSlideIn delay={0} style={styles.section}>
        <View style={styles.rowBetween}>
          <Text style={[styles.sectionTitle, { color: shade.muted }]}>
            1. YOUR MONTHLY BUDGET (₱)
          </Text>
          <PopValueText valueTrigger={baseDailyAllowance}>
            <Text style={[styles.previewBadge, { color: shade.positive }]}>
              Base: ₱
              {baseDailyAllowance.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
              /day
            </Text>
          </PopValueText>
        </View>

        <View style={styles.listGap}>
          <BudgetStepperRow
            label="Monthly Income"
            hint="How much you take home"
            value={settings.monthlyIncome}
            shade={shade}
            onChange={(val) =>
              updateBudgetConfig(
                val,
                settings.fixedBills,
                settings.monthlySavingsGoal
              )
            }
          />

          <SalaryScheduleCard
            frequency={settings.salaryFrequency}
            payday1={settings.payday1}
            payday2={settings.payday2}
            shade={shade}
            onChange={updateSalarySchedule}
          />

          <MonthlyBillsBreakdownCard
            bills={billItems}
            shade={shade}
            enableTracking
            currentMonthKey={todayKey.slice(0, 7)}
            privacyMode={privacyMode}
            onUpdateAmount={updateBillAmount}
            onUpdateDueDay={updateBillDueDay}
            onAddBill={addBillItem}
            onRemoveBill={removeBillItem}
            onRequestPayBill={(bill) => setBillToPay(bill)}
          />

          <SpendingEnvelopesCard
            envelopes={envelopes}
            salaryFrequency={settings.salaryFrequency}
            shade={shade}
            privacyMode={privacyMode}
            onAddEnvelope={addEnvelope}
            onUpdateEnvelope={updateEnvelope}
            onDeleteEnvelope={deleteEnvelope}
            onRefillEnvelope={refillEnvelope}
          />

          <BudgetStepperRow
            label="Monthly Savings Goal"
            hint="How much you want to save"
            value={settings.monthlySavingsGoal}
            shade={shade}
            onChange={(val) =>
              updateBudgetConfig(
                settings.monthlyIncome,
                settings.fixedBills,
                val
              )
            }
          />

          <View
            style={[
              styles.appearanceCard,
              { backgroundColor: shade.card, borderColor: shade.border },
            ]}
          >
            <View>
              <Text style={[styles.appearanceTitle, { color: shade.text }]}>
                Appearance
              </Text>
              <Text style={[styles.appearanceSub, { color: shade.muted }]}>
                Follow your device theme or force Light / Dark mode
              </Text>
            </View>
            <View
              style={[
                styles.themeSegRow,
                { backgroundColor: shade.surface },
              ]}
            >
              {THEME_OPTIONS.map((opt) => {
                const active = themeMode === opt.mode;
                return (
                  <ScalePressable
                    key={opt.mode}
                    onPress={() => setThemeMode(opt.mode)}
                    style={[
                      styles.themeSegBtn,
                      active && { backgroundColor: shade.accent },
                    ]}
                  >
                    <AppIcon
                      name={opt.icon}
                      size={13}
                      color={active ? shade.accentText : shade.muted}
                    />
                    <Text
                      style={[
                        styles.themeSegText,
                        { color: active ? shade.accentText : shade.text },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </ScalePressable>
                );
              })}
            </View>
          </View>
        </View>
      </FadeSlideIn>

      {/* Section 2: Onboarding, Tutorial & Reset */}
      <FadeSlideIn delay={70} style={styles.section}>
        <Text style={[styles.sectionTitle, { color: shade.muted }]}>
          2. GUIDE & RESET
        </Text>

        <ScalePressable
          onPress={openTutorial}
          style={[
            styles.replayBtn,
            { backgroundColor: shade.surface, borderColor: shade.dopamine },
          ]}
        >
          <View style={styles.btnIconRow}>
            <AppIcon name="help-circle" size={15} color={shade.dopamine} />
            <Text style={[styles.replayBtnText, { color: shade.dopamine }]}>
              Open App Guide
            </Text>
          </View>
        </ScalePressable>

        <ScalePressable
          onPress={reopenOnboarding}
          style={[
            styles.replayBtn,
            { backgroundColor: shade.surface, borderColor: shade.accent },
          ]}
        >
          <View style={styles.btnIconRow}>
            <AppIcon name="sliders" size={15} color={shade.text} />
            <Text style={[styles.replayBtnText, { color: shade.text }]}>
              Re-do Setup Questions
            </Text>
          </View>
        </ScalePressable>

        <ScalePressable
          onPress={() => {
            triggerLightHaptic();
            setPendingConfirm({
              title: 'Start Fresh?',
              message:
                'This will erase all your logged transactions, treats, installments, sinking funds, and reset savings to ₱0. Export a JSON backup first if you want to keep your data.',
              confirmLabel: 'Reset Everything',
              destructive: true,
              icon: 'rotate-ccw',
              onConfirm: resetToNewUser,
            });
          }}
          style={[
            styles.replayBtn,
            { backgroundColor: shade.card, borderColor: shade.border },
          ]}
        >
          <View style={styles.btnIconRow}>
            <AppIcon name="rotate-ccw" size={15} color={shade.text} />
            <Text style={[styles.replayBtnText, { color: shade.text }]}>
              Start Fresh (0 Treats, ₱0)
            </Text>
          </View>
        </ScalePressable>

        <View style={styles.demoRow}>
          <ScalePressable
            onPress={simulateMidnightSplit}
            style={[styles.demoBtnPrimary, { backgroundColor: shade.dopamine }]}
          >
            <View style={styles.btnIconRow}>
              <AppIcon name="moon" size={14} color="#FFFFFF" />
              <Text style={[styles.demoBtnPrimaryText, { color: '#FFFFFF' }]}>
                Test 50/50 Midnight Split
              </Text>
            </View>
          </ScalePressable>

          <ScalePressable
            onPress={() => {
              triggerLightHaptic();
              setPendingConfirm({
                title: 'Load Demo Data?',
                message:
                  'This will replace your current budget, accounts, and logs with sample demo data.',
                confirmLabel: 'Load Demo',
                destructive: true,
                icon: 'star',
                onConfirm: resetDemoState,
              });
            }}
            style={[
              styles.demoBtnSecondary,
              { backgroundColor: shade.surface, borderColor: shade.border },
            ]}
          >
            <View style={styles.btnIconRow}>
              <AppIcon name="star" size={14} color={shade.text} />
              <Text
                style={[styles.demoBtnSecondaryText, { color: shade.text }]}
              >
                Load Demo
              </Text>
            </View>
          </ScalePressable>
        </View>
      </FadeSlideIn>

      {/* Section 3: Backup & Export (CSV / JSON) */}
      <FadeSlideIn delay={130} style={styles.section}>
        <Text style={[styles.sectionTitle, { color: shade.muted }]}>
          3. BACKUP & EXPORT
        </Text>

        <ScalePressable
          onPress={handleExportCsv}
          style={[
            styles.replayBtn,
            { backgroundColor: shade.card, borderColor: shade.border },
          ]}
        >
          <View style={styles.btnIconRow}>
            <AppIcon name="file-text" size={15} color={shade.text} />
            <Text style={[styles.replayBtnText, { color: shade.text }]}>
              Export Logs (CSV)
            </Text>
          </View>
        </ScalePressable>

        <ScalePressable
          onPress={handleExportJson}
          style={[
            styles.replayBtn,
            { backgroundColor: shade.card, borderColor: shade.border },
          ]}
        >
          <View style={styles.btnIconRow}>
            <AppIcon name="download" size={15} color={shade.text} />
            <Text style={[styles.replayBtnText, { color: shade.text }]}>
              Export Full Backup (JSON)
            </Text>
          </View>
        </ScalePressable>

        <ScalePressable
          onPress={() => {
            triggerLightHaptic();
            setRestoreError(null);
            setShowRestoreBox(true);
            setBackupStatus(null);
          }}
          style={[
            styles.replayBtn,
            { backgroundColor: shade.surface, borderColor: shade.border },
          ]}
        >
          <View style={styles.btnIconRow}>
            <AppIcon name="upload" size={15} color={shade.text} />
            <Text style={[styles.replayBtnText, { color: shade.text }]}>
              Restore Backup (JSON)
            </Text>
          </View>
        </ScalePressable>

        {backupStatus && (
          <Text
            style={[
              styles.backupStatusText,
              { color: backupStatus.ok ? shade.positive : shade.warning },
            ]}
          >
            {backupStatus.text}
          </Text>
        )}
      </FadeSlideIn>

      <FormModal
        visible={showRestoreBox}
        title="Restore Backup"
        subtitle="Paste your exported JSON backup text below"
        icon="upload"
        onClose={() => {
          setRestoreError(null);
          setShowRestoreBox(false);
        }}
      >
        <TextInput
          value={restoreText}
          onChangeText={(t) => {
            setRestoreText(t);
            if (restoreError) setRestoreError(null);
          }}
          multiline
          placeholder='{"version":6,"data":{...}}'
          placeholderTextColor={shade.muted}
          style={[
            styles.restoreInput,
            {
              backgroundColor: shade.surface,
              color: shade.text,
              borderColor: restoreError ? shade.warning : shade.border,
            },
          ]}
        />
        {restoreError && (
          <Text style={[styles.restoreErrorText, { color: shade.warning }]}>
            {restoreError}
          </Text>
        )}
        <ScalePressable
          onPress={handleRestoreJson}
          style={[styles.restoreConfirm, { backgroundColor: shade.accent }]}
        >
          <Text
            style={[styles.restoreConfirmText, { color: shade.accentText }]}
          >
            Restore Data
          </Text>
        </ScalePressable>
      </FormModal>

      <PayBillModal bill={billToPay} onClose={() => setBillToPay(null)} />

      <ConfirmModal
        visible={pendingConfirm !== null}
        title={pendingConfirm?.title || ''}
        message={pendingConfirm?.message || ''}
        confirmLabel={pendingConfirm?.confirmLabel || 'Confirm'}
        destructive={pendingConfirm?.destructive}
        icon={pendingConfirm?.icon}
        onCancel={() => setPendingConfirm(null)}
        onConfirm={() => {
          pendingConfirm?.onConfirm();
          setPendingConfirm(null);
        }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 36,
    gap: 18,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  listGap: {
    gap: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  previewBadge: {
    fontSize: 12,
    fontWeight: '800',
  },
  replayBtn: {
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  replayBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  demoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  demoBtnPrimary: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  demoBtnPrimaryText: {
    fontSize: 12,
    fontWeight: '800',
  },
  demoBtnSecondary: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  demoBtnSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  restoreInput: {
    minHeight: 90,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    fontSize: 12,
    textAlignVertical: 'top',
  },
  restoreConfirm: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  restoreConfirmText: {
    fontSize: 13,
    fontWeight: '800',
  },
  backupStatusText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  restoreErrorText: {
    fontSize: 12,
    fontWeight: '700',
  },
  appearanceCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 13,
    gap: 10,
  },
  appearanceTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  appearanceSub: {
    fontSize: 11,
  },
  themeSegRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  themeSegBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 9,
  },
  themeSegText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
