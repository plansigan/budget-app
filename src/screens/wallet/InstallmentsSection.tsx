import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import {
  AnimatedProgressBar,
  ScalePressable,
} from '../../components/AnimatedPrimitives';
import { AppIcon, IconBadge } from '../../components/AppIcon';
import { FormModal } from '../../components/FormModal';
import {
  useBudgetActions,
  useThemePrefs,
  useWallet,
} from '../../context/BudgetContext';
import { InstallmentItem } from '../../types/budget';
import { triggerLightHaptic } from '../../utils/haptics';
import {
  computeInstallmentSummary,
  getInstallmentPayoffLabel,
} from '../../utils/insightsEngine';
import {
  formatPesoInput,
  formatPesoNumber,
  parsePesoInput,
} from '../../utils/numberFormat';
import { WalletConfirmRequest } from './AccountDetailView';

const PROVIDER_CHIPS = ['BDO 0%', 'BPI', 'SPayLater', 'Atome', 'Other'];

interface InstallmentsSectionProps {
  onOpenAddModal: () => void;
  onRequestConfirm: (req: WalletConfirmRequest) => void;
}

export const InstallmentsSection: React.FC<InstallmentsSectionProps> = ({
  onOpenAddModal,
  onRequestConfirm,
}) => {
  const { shade, formatVisiblePeso } = useThemePrefs();
  const { installments } = useWallet();
  const {
    markInstallmentMonthPaid,
    toggleInstallmentInBudget,
    updateInstallment,
    removeInstallment,
  } = useBudgetActions();

  const [editingInst, setEditingInst] = useState<InstallmentItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editProvider, setEditProvider] = useState('BDO 0%');
  const [editMonthlyText, setEditMonthlyText] = useState('');
  const [editTotalText, setEditTotalText] = useState('');
  const [editPaidText, setEditPaidText] = useState('');
  const [editInBudget, setEditInBudget] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);

  const openEditModal = (item: InstallmentItem) => {
    triggerLightHaptic();
    setEditingInst(item);
    setEditName(item.name);
    setEditProvider(item.provider);
    setEditMonthlyText(formatPesoNumber(item.monthlyAmount));
    setEditTotalText(String(item.totalMonths));
    setEditPaidText(String(item.paidMonths));
    setEditInBudget(item.includeInBudget);
    setEditError(null);
  };

  const handleSaveEdit = () => {
    if (!editingInst) return;
    const monthly = parsePesoInput(editMonthlyText);
    const totalM = parseInt(editTotalText.replace(/[^0-9]/g, ''), 10) || 0;
    const paidM = parseInt(editPaidText.replace(/[^0-9]/g, ''), 10) || 0;
    if (!editName.trim()) {
      setEditError('Please enter an item or loan name.');
      return;
    }
    if (monthly <= 0) {
      setEditError('Please enter a monthly payment greater than ₱0.');
      return;
    }
    if (totalM <= 0) {
      setEditError('Total months must be at least 1.');
      return;
    }
    updateInstallment(editingInst.id, {
      name: editName,
      provider: editProvider,
      monthlyAmount: monthly,
      totalMonths: totalM,
      paidMonths: paidM,
      includeInBudget: editInBudget,
    });
    setEditingInst(null);
    setEditError(null);
  };

  const installmentSummary = useMemo(
    () => computeInstallmentSummary(installments),
    [installments]
  );

  return (
    <View style={styles.section}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionTitle, { color: shade.muted }]}>
            INSTALLMENTS ({installmentSummary.activeCount} ACTIVE •{' '}
            {formatVisiblePeso(installmentSummary.totalMonthlyCommitted)}/MO)
          </Text>
          <Text style={[styles.debtFreeSub, { color: shade.positive }]}>
            Debt-Free Goal: {installmentSummary.debtFreeLabel}
            {installmentSummary.activeCount > 0
              ? ` • ${formatVisiblePeso(
                  installmentSummary.totalRemainingBalance
                )} left`
              : ''}
          </Text>
        </View>
        <ScalePressable
          onPress={() => {
            triggerLightHaptic();
            onOpenAddModal();
          }}
          style={[styles.addToggle, { backgroundColor: shade.surface }]}
        >
          <AppIcon name="plus" size={12} color={shade.accent} />
          <Text style={[styles.addToggleText, { color: shade.accent }]}>
            Add Plan
          </Text>
        </ScalePressable>
      </View>

      {installments.length === 0 ? (
        <View
          style={[
            styles.emptyBox,
            { backgroundColor: shade.card, borderColor: shade.border },
          ]}
        >
          <Text style={{ color: shade.muted, fontSize: 12 }}>
            0 installments tracked. Tap + Add Plan for monthly payments.
          </Text>
        </View>
      ) : (
        <View style={styles.listGap}>
          {installments.map((item) => {
            const isDone = item.paidMonths >= item.totalMonths;
            const pct = Math.min(
              100,
              Math.round(
                (item.paidMonths / Math.max(1, item.totalMonths)) * 100
              )
            );
            const payoffLabel = getInstallmentPayoffLabel(item);
            const remBalance =
              Math.max(0, item.totalMonths - item.paidMonths) *
              item.monthlyAmount;

            return (
              <View
                key={item.id}
                style={[
                  styles.cardBox,
                  {
                    backgroundColor: shade.card,
                    borderColor: isDone ? shade.positive : shade.border,
                  },
                ]}
              >
                <View style={styles.rowBetween}>
                  <View style={[styles.inlineRow, { flex: 1 }]}>
                    <IconBadge
                      name="calendar"
                      size={14}
                      color={isDone ? shade.positive : shade.accent}
                      bg={isDone ? shade.positiveSoft : shade.surface}
                      boxSize={32}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.accountName, { color: shade.text }]}>
                        {item.name}
                      </Text>
                      <Text style={[styles.accountSub, { color: shade.muted }]}>
                        {item.provider} • {item.paidMonths}/{item.totalMonths}{' '}
                        months
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.cutoffBadge,
                      {
                        backgroundColor: isDone
                          ? shade.positiveSoft
                          : shade.surface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.cutoffText,
                        { color: isDone ? shade.positive : shade.text },
                      ]}
                    >
                      {payoffLabel}
                    </Text>
                  </View>
                </View>

                <View style={[styles.rowBetween, { flexWrap: 'wrap', gap: 6 }]}>
                  <Text
                    style={[
                      styles.accountSub,
                      {
                        color: shade.text,
                        fontWeight: '700',
                        fontVariant: ['tabular-nums'],
                      },
                    ]}
                  >
                    {formatVisiblePeso(item.monthlyAmount)} / mo
                  </Text>
                  <Text
                    style={[
                      styles.accountSub,
                      { color: shade.muted, fontVariant: ['tabular-nums'] },
                    ]}
                  >
                    {formatVisiblePeso(remBalance)} left
                  </Text>
                </View>

                <AnimatedProgressBar
                  percentage={pct}
                  trackColor={shade.surface}
                  fillColor={isDone ? shade.positive : shade.accent}
                  height={7}
                />

                <View style={styles.instActionRow}>
                  {!isDone && (
                    <ScalePressable
                      onPress={() => markInstallmentMonthPaid(item.id)}
                      style={[
                        styles.instActionBtn,
                        { backgroundColor: shade.positiveSoft },
                      ]}
                    >
                      <AppIcon name="check" size={12} color={shade.positive} />
                      <Text
                        style={[
                          styles.instActionText,
                          { color: shade.positive },
                        ]}
                      >
                        Paid 1 Mo
                      </Text>
                    </ScalePressable>
                  )}

                  {!isDone && (
                    <ScalePressable
                      onPress={() => toggleInstallmentInBudget(item.id)}
                      style={[
                        styles.instActionBtn,
                        { backgroundColor: shade.surface },
                      ]}
                    >
                      <Text
                        style={[styles.instActionText, { color: shade.muted }]}
                      >
                        {item.includeInBudget
                          ? 'In Daily Budget'
                          : 'Track Only'}
                      </Text>
                    </ScalePressable>
                  )}

                  <ScalePressable
                    onPress={() => openEditModal(item)}
                    accessibilityLabel={`Edit ${item.name}`}
                    style={[
                      styles.instDeleteBtn,
                      { backgroundColor: shade.surface },
                    ]}
                  >
                    <AppIcon name="edit-2" size={12} color={shade.text} />
                    <Text
                      style={[styles.instActionText, { color: shade.text }]}
                    >
                      Edit
                    </Text>
                  </ScalePressable>

                  <ScalePressable
                    onPress={() => {
                      triggerLightHaptic();
                      onRequestConfirm({
                        title: 'Delete Installment Plan?',
                        message: `Remove "${item.name}" from your installments list?`,
                        confirmLabel: 'Delete',
                        onConfirm: () => removeInstallment(item.id),
                      });
                    }}
                    style={[
                      styles.instDeleteBtn,
                      { backgroundColor: shade.warningSoft },
                    ]}
                  >
                    <AppIcon name="trash-2" size={12} color={shade.warning} />
                    <Text
                      style={[styles.instActionText, { color: shade.warning }]}
                    >
                      Delete
                    </Text>
                  </ScalePressable>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <FormModal
        visible={editingInst !== null}
        title="Edit Installment Plan"
        subtitle="Update monthly amount, term, or paid months"
        icon="edit-2"
        onClose={() => {
          setEditingInst(null);
          setEditError(null);
        }}
      >
        <TextInput
          value={editName}
          onChangeText={(t) => {
            setEditName(t);
            if (editError) setEditError(null);
          }}
          placeholder="Item name (e.g., iPhone 16, Laptop)"
          placeholderTextColor={shade.muted}
          style={[
            styles.modalTextInput,
            {
              backgroundColor: shade.surface,
              color: shade.text,
              borderColor: shade.border,
            },
          ]}
        />

        <View style={styles.providerRow}>
          {PROVIDER_CHIPS.map((prov) => (
            <ScalePressable
              key={prov}
              onPress={() => {
                triggerLightHaptic();
                setEditProvider(prov);
              }}
              style={[
                styles.providerChip,
                {
                  backgroundColor:
                    editProvider === prov ? shade.accent : shade.surface,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: editProvider === prov ? shade.accentText : shade.text,
                }}
              >
                {prov}
              </Text>
            </ScalePressable>
          ))}
        </View>

        <TextInput
          value={editProvider}
          onChangeText={setEditProvider}
          placeholder="Provider (e.g., BDO 0%)"
          placeholderTextColor={shade.muted}
          style={[
            styles.modalTextInput,
            {
              backgroundColor: shade.surface,
              color: shade.text,
              borderColor: shade.border,
            },
          ]}
        />

        <View
          style={[
            styles.fullAmountBox,
            { backgroundColor: shade.surface, borderColor: shade.border },
          ]}
        >
          <Text style={[styles.pesoPrefix, { color: shade.accent }]}>₱</Text>
          <TextInput
            value={editMonthlyText}
            onChangeText={(t) => {
              setEditMonthlyText(formatPesoInput(t));
              if (editError) setEditError(null);
            }}
            keyboardType="decimal-pad"
            inputMode="decimal"
            placeholder="Monthly payment"
            placeholderTextColor={shade.muted}
            style={[styles.modalAmountInput, { color: shade.text }]}
          />
        </View>

        <View style={styles.twoCols}>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={[styles.accountSub, { color: shade.muted }]}>
              Total Months
            </Text>
            <TextInput
              value={editTotalText}
              onChangeText={(t) => {
                setEditTotalText(t.replace(/[^0-9]/g, ''));
                if (editError) setEditError(null);
              }}
              keyboardType="numeric"
              maxLength={3}
              placeholder="12"
              placeholderTextColor={shade.muted}
              style={[
                styles.modalTextInput,
                {
                  backgroundColor: shade.surface,
                  color: shade.text,
                  borderColor: shade.border,
                },
              ]}
            />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={[styles.accountSub, { color: shade.muted }]}>
              Paid So Far
            </Text>
            <TextInput
              value={editPaidText}
              onChangeText={(t) => setEditPaidText(t.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
              maxLength={3}
              placeholder="0"
              placeholderTextColor={shade.muted}
              style={[
                styles.modalTextInput,
                {
                  backgroundColor: shade.surface,
                  color: shade.text,
                  borderColor: shade.border,
                },
              ]}
            />
          </View>
        </View>

        <ScalePressable
          onPress={() => {
            triggerLightHaptic();
            setEditInBudget((v) => !v);
          }}
          style={[
            styles.budgetToggleRow,
            {
              backgroundColor: shade.surface,
              borderColor: shade.border,
            },
          ]}
        >
          <AppIcon
            name={editInBudget ? 'check' : 'circle'}
            size={14}
            color={editInBudget ? shade.positive : shade.muted}
          />
          <Text style={[styles.budgetToggleText, { color: shade.text }]}>
            {editInBudget
              ? 'Included in Daily Budget math'
              : 'Track only (does not lower daily allowance)'}
          </Text>
        </ScalePressable>

        {editError && (
          <Text style={[styles.formErrorText, { color: shade.warning }]}>
            {editError}
          </Text>
        )}

        <ScalePressable
          onPress={handleSaveEdit}
          style={[styles.saveModalBtn, { backgroundColor: shade.accent }]}
        >
          <Text style={[styles.saveModalText, { color: shade.accentText }]}>
            Save Changes
          </Text>
        </ScalePressable>
      </FormModal>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  debtFreeSub: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  addToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
  },
  addToggleText: {
    fontSize: 11,
    fontWeight: '800',
  },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  listGap: {
    gap: 11,
  },
  cardBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 11,
  },
  accountName: {
    fontSize: 15,
    fontWeight: '800',
  },
  accountSub: {
    fontSize: 12,
  },
  cutoffBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9,
  },
  cutoffText: {
    fontSize: 11,
    fontWeight: '800',
  },
  instActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 2,
  },
  instActionBtn: {
    flex: 1,
    minWidth: 96,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    borderRadius: 11,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  instDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  instActionText: {
    fontSize: 12,
    fontWeight: '800',
  },
  modalTextInput: {
    minWidth: 0,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  providerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  providerChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
  },
  fullAmountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  pesoPrefix: {
    fontSize: 14,
    fontWeight: '800',
    marginRight: 5,
  },
  modalAmountInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: '800',
    paddingVertical: 1,
  },
  twoCols: {
    flexDirection: 'row',
    gap: 8,
  },
  budgetToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  budgetToggleText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  formErrorText: {
    fontSize: 12,
    fontWeight: '700',
  },
  saveModalBtn: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveModalText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
