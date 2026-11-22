import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useBudget } from '../context/BudgetContext';
import { SpendCategoryKey, TransactionEntry } from '../types/budget';
import { triggerLightHaptic } from '../utils/haptics';
import { classifySpendCategory } from '../utils/insightsEngine';
import {
  formatPesoInput,
  formatPesoNumber,
  parsePesoInput,
} from '../utils/numberFormat';
import { formatEntryDateLocal } from '../utils/transactionDisplay';
import { ScalePressable } from './AnimatedPrimitives';
import { AppIcon, SPEND_CATEGORIES } from './AppIcon';
import { FormModal } from './FormModal';

interface EditTransactionModalProps {
  entry: TransactionEntry | null;
  onClose: () => void;
}

/**
 * Spacious modal to edit a logged transaction's amount, label/note, and category
 * while automatically reconciling linked Wallet, Envelope, Savings, or Treat balances.
 */
export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  entry,
  onClose,
}) => {
  const { shade, editEntry } = useBudget();

  const [amountText, setAmountText] = useState('');
  const [labelText, setLabelText] = useState('');
  const [category, setCategory] = useState<SpendCategoryKey>('other');
  const [icon, setIcon] = useState<string>('tag');

  useEffect(() => {
    if (!entry) return;
    setAmountText(formatPesoNumber(entry.amount));
    setLabelText(entry.label || '');
    const classified = classifySpendCategory(entry);
    const resolvedCat = (
      entry.category || classified.key
    ) as SpendCategoryKey;
    setCategory(resolvedCat);
    setIcon(entry.icon || classified.icon);
  }, [entry]);

  if (!entry) return null;

  const isSpendEntry =
    entry.type === 'spend' || entry.type === 'envelope_spend';
  const numericAmount = parsePesoInput(amountText);
  const canSave = numericAmount > 0 && labelText.trim().length > 0;
  const dateStr = formatEntryDateLocal(entry);
  const contextLine = entry.paymentSourceLabel
    ? `${dateStr} • ${entry.paymentSourceLabel} — Balances update automatically`
    : `${dateStr} — Balances update automatically`;

  const accentColor =
    entry.type === 'envelope_spend' || entry.type === 'treat_direct'
      ? shade.dopamine
      : entry.type === 'save_direct' || entry.type === 'wallet_deposit'
      ? shade.positive
      : shade.accent;

  const handleSave = () => {
    if (!canSave) return;
    editEntry(entry.id, {
      amount: numericAmount,
      label: labelText.trim(),
      ...(isSpendEntry ? { category, icon } : {}),
    });
    onClose();
  };

  return (
    <FormModal
      visible={entry !== null}
      title="Edit Transaction"
      subtitle={contextLine}
      icon={icon || entry.icon}
      accentColor={accentColor}
      onClose={onClose}
    >
      <View
        style={[
          styles.amountBox,
          { backgroundColor: shade.surface, borderColor: accentColor },
        ]}
      >
        <Text style={[styles.pesoPrefix, { color: accentColor }]}>₱</Text>
        <TextInput
          value={amountText}
          onChangeText={(t) => setAmountText(formatPesoInput(t))}
          keyboardType="decimal-pad"
          inputMode="decimal"
          placeholder="Enter exact amount"
          placeholderTextColor={shade.muted}
          autoFocus
          style={[styles.amountInput, { color: shade.text }]}
        />
      </View>

      {isSpendEntry && (
        <View style={{ gap: 7 }}>
          <Text style={[styles.sectionLabel, { color: shade.muted }]}>
            CATEGORY
          </Text>
          <View style={styles.tagRow}>
            {SPEND_CATEGORIES.map((cat) => {
              const active = category === cat.key;
              return (
                <ScalePressable
                  key={cat.key}
                  onPress={() => {
                    triggerLightHaptic();
                    setCategory(cat.key);
                    setIcon(cat.icon);
                  }}
                  style={[
                    styles.tagPill,
                    {
                      backgroundColor: active ? accentColor : shade.surface,
                    },
                  ]}
                >
                  <AppIcon
                    name={cat.icon}
                    size={13}
                    color={
                      active
                        ? entry.type === 'envelope_spend'
                          ? '#FFFFFF'
                          : shade.accentText
                        : shade.text
                    }
                  />
                  <Text
                    style={[
                      styles.tagText,
                      {
                        color: active
                          ? entry.type === 'envelope_spend'
                            ? '#FFFFFF'
                            : shade.accentText
                          : shade.text,
                      },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </ScalePressable>
              );
            })}
          </View>
        </View>
      )}

      <View style={{ gap: 6 }}>
        <Text style={[styles.sectionLabel, { color: shade.muted }]}>
          NOTE / LABEL
        </Text>
        <TextInput
          value={labelText}
          onChangeText={setLabelText}
          placeholder="Description or merchant name"
          placeholderTextColor={shade.muted}
          style={[
            styles.noteInput,
            {
              backgroundColor: shade.surface,
              color: shade.text,
              borderColor: shade.border,
            },
          ]}
        />
      </View>

      <ScalePressable
        disabled={!canSave}
        onPress={handleSave}
        style={[
          styles.saveBtn,
          {
            backgroundColor: canSave ? accentColor : shade.surface,
            opacity: canSave ? 1 : 0.65,
          },
        ]}
      >
        <Text
          style={[
            styles.saveText,
            {
              color: canSave
                ? accentColor === shade.accent
                  ? shade.accentText
                  : '#FFFFFF'
                : shade.muted,
            },
          ]}
        >
          Save Changes
        </Text>
      </ScalePressable>
    </FormModal>
  );
};

const styles = StyleSheet.create({
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  pesoPrefix: {
    fontSize: 22,
    fontWeight: '800',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 21,
    fontWeight: '800',
    paddingVertical: 2,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 11,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  noteInput: {
    width: '100%',
    minWidth: 0,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 2,
  },
  saveText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
