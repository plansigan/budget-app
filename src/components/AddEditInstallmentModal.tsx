import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useBudgetActions, useThemePrefs } from '../context/BudgetContext';
import { InstallmentItem } from '../types/budget';
import { triggerLightHaptic } from '../utils/haptics';
import { formatPesoNumber, parsePesoInput } from '../utils/numberFormat';
import { ScalePressable } from './AnimatedPrimitives';
import { AppIcon } from './AppIcon';
import { FormModal } from './FormModal';
import { PesoAmountInput } from './form/PesoAmountInput';

const PROVIDER_CHIPS = ['BDO 0%', 'BPI', 'SPayLater', 'Atome', 'Other'];

interface AddEditInstallmentModalProps {
  visible: boolean;
  initialItem?: InstallmentItem | null;
  onClose: () => void;
}

const AddEditInstallmentModalContent: React.FC<
  Omit<AddEditInstallmentModalProps, 'visible'>
> = ({ initialItem, onClose }) => {
  const { shade } = useThemePrefs();
  const { addInstallment, updateInstallment } = useBudgetActions();

  const isEdit = Boolean(initialItem);

  const [name, setName] = useState(initialItem ? initialItem.name : '');
  const [provider, setProvider] = useState(
    initialItem ? initialItem.provider : 'BDO 0%'
  );
  const [monthlyText, setMonthlyText] = useState(
    initialItem ? formatPesoNumber(initialItem.monthlyAmount) : ''
  );
  const [totalText, setTotalText] = useState(
    initialItem ? String(initialItem.totalMonths) : '12'
  );
  const [paidText, setPaidText] = useState(
    initialItem ? String(initialItem.paidMonths) : '0'
  );
  const [inBudget, setInBudget] = useState(
    initialItem ? initialItem.includeInBudget : true
  );
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setFormError(null);
    if (initialItem) {
      setName(initialItem.name);
      setProvider(initialItem.provider);
      setMonthlyText(formatPesoNumber(initialItem.monthlyAmount));
      setTotalText(String(initialItem.totalMonths));
      setPaidText(String(initialItem.paidMonths));
      setInBudget(initialItem.includeInBudget);
    } else {
      setName('');
      setProvider('BDO 0%');
      setMonthlyText('');
      setTotalText('12');
      setPaidText('0');
      setInBudget(true);
    }
  }, [initialItem]);

  const monthlyVal = parsePesoInput(monthlyText);
  const totalMonthsVal = parseInt(totalText.replace(/[^0-9]/g, ''), 10) || 0;
  const paidMonthsVal = parseInt(paidText.replace(/[^0-9]/g, ''), 10) || 0;
  const isFormValid =
    Boolean(name.trim()) &&
    monthlyVal > 0 &&
    totalMonthsVal >= 1 &&
    totalMonthsVal <= 360 &&
    paidMonthsVal <= totalMonthsVal;

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Please enter an item or loan name.');
      return;
    }
    if (monthlyVal <= 0) {
      setFormError('Please enter a monthly payment greater than ₱0.');
      return;
    }
    if (totalMonthsVal < 1 || totalMonthsVal > 360) {
      setFormError('Total months must be between 1 and 360.');
      return;
    }
    if (paidMonthsVal > totalMonthsVal) {
      setFormError('Paid months cannot exceed total months.');
      return;
    }

    setFormError(null);
    const trimmedProvider = provider.trim() || 'Other';

    if (initialItem) {
      updateInstallment(initialItem.id, {
        name: trimmedName,
        provider: trimmedProvider,
        monthlyAmount: monthlyVal,
        totalMonths: totalMonthsVal,
        paidMonths: paidMonthsVal,
        includeInBudget: inBudget,
      });
    } else {
      addInstallment({
        name: trimmedName,
        provider: trimmedProvider,
        monthlyAmount: monthlyVal,
        totalMonths: totalMonthsVal,
        paidMonths: paidMonthsVal,
        includeInBudget: inBudget,
      });
    }
    onClose();
  };

  return (
    <FormModal
      visible
      title={isEdit ? 'Edit Installment Plan' : 'Add Installment Plan'}
      subtitle={
        isEdit
          ? 'Update monthly amount, term, or paid months'
          : 'See monthly impact and debt-free month'
      }
      icon={isEdit ? 'edit-2' : 'calendar'}
      onClose={onClose}
    >
      <TextInput
        value={name}
        onChangeText={(t) => {
          setName(t);
          if (formError) setFormError(null);
        }}
        placeholder="Item name (e.g., iPhone 16, Laptop)"
        placeholderTextColor={shade.muted}
        accessibilityLabel="Installment item name"
        style={[
          styles.textInput,
          {
            backgroundColor: shade.surface,
            color: shade.text,
            borderColor: shade.border,
          },
        ]}
      />

      <View style={styles.providerRow}>
        {PROVIDER_CHIPS.map((prov) => {
          const active = provider === prov;
          return (
            <ScalePressable
              key={prov}
              onPress={() => {
                triggerLightHaptic();
                setProvider(prov);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Provider ${prov}`}
              accessibilityState={{ selected: active }}
              style={[
                styles.providerChip,
                {
                  backgroundColor: active ? shade.accent : shade.surface,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: active ? shade.accentText : shade.text,
                }}
              >
                {prov}
              </Text>
            </ScalePressable>
          );
        })}
      </View>

      <TextInput
        value={provider}
        onChangeText={setProvider}
        placeholder="Provider name (e.g., BDO 0%, Home Credit)"
        placeholderTextColor={shade.muted}
        accessibilityLabel="Installment provider name"
        style={[
          styles.textInput,
          {
            backgroundColor: shade.surface,
            color: shade.text,
            borderColor: shade.border,
          },
        ]}
      />

      <PesoAmountInput
        value={monthlyText}
        onChangeText={(formatted) => {
          setMonthlyText(formatted);
          if (formError) setFormError(null);
        }}
        shade={shade}
        placeholder="Monthly payment"
        inputAccessibilityLabel="Monthly payment amount"
      />

      <View style={styles.twoCols}>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text style={[styles.fieldLabel, { color: shade.muted }]}>
            Total Months (1–360)
          </Text>
          <TextInput
            value={totalText}
            onChangeText={(t) => {
              setTotalText(t.replace(/[^0-9]/g, ''));
              if (formError) setFormError(null);
            }}
            keyboardType="numeric"
            maxLength={3}
            placeholder="12"
            placeholderTextColor={shade.muted}
            accessibilityLabel="Total months"
            style={[
              styles.textInput,
              {
                backgroundColor: shade.surface,
                color: shade.text,
                borderColor: shade.border,
              },
            ]}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text style={[styles.fieldLabel, { color: shade.muted }]}>
            Paid So Far
          </Text>
          <TextInput
            value={paidText}
            onChangeText={(t) => {
              setPaidText(t.replace(/[^0-9]/g, ''));
              if (formError) setFormError(null);
            }}
            keyboardType="numeric"
            maxLength={3}
            placeholder="0"
            placeholderTextColor={shade.muted}
            accessibilityLabel="Paid months so far"
            style={[
              styles.textInput,
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
          setInBudget((v) => !v);
        }}
        accessibilityRole="checkbox"
        accessibilityLabel="Include installment in monthly budget"
        accessibilityState={{ checked: inBudget }}
        style={[
          styles.budgetToggleRow,
          { backgroundColor: shade.surface, borderColor: shade.border },
        ]}
      >
        <AppIcon
          name={inBudget ? 'check' : 'circle'}
          size={14}
          color={inBudget ? shade.positive : shade.muted}
        />
        <Text style={[styles.budgetToggleText, { color: shade.text }]}>
          {inBudget
            ? 'Included in Daily Budget math'
            : 'Track only (does not lower daily allowance)'}
        </Text>
      </ScalePressable>

      {formError ? (
        <Text style={[styles.formErrorText, { color: shade.warning }]}>
          {formError}
        </Text>
      ) : null}

      <ScalePressable
        onPress={handleSave}
        accessibilityRole="button"
        accessibilityLabel={
          isEdit ? 'Save installment changes' : 'Save installment plan'
        }
        style={[
          styles.submitBtn,
          {
            backgroundColor: isFormValid ? shade.accent : shade.surface,
            opacity: isFormValid ? 1 : 0.78,
          },
        ]}
      >
        <Text
          style={[
            styles.submitText,
            { color: isFormValid ? shade.accentText : shade.muted },
          ]}
        >
          {isEdit ? 'Save Changes' : 'Save Installment Plan'}
        </Text>
      </ScalePressable>
    </FormModal>
  );
};

/**
 * Unified modal for creating or editing a fixed-term installment plan.
 */
export const AddEditInstallmentModal: React.FC<
  AddEditInstallmentModalProps
> = ({ visible, initialItem, onClose }) => {
  if (!visible) return null;
  return (
    <AddEditInstallmentModalContent
      initialItem={initialItem}
      onClose={onClose}
    />
  );
};

const styles = StyleSheet.create({
  textInput: {
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
    paddingVertical: 7,
    borderRadius: 9,
  },
  twoCols: {
    flexDirection: 'row',
    gap: 8,
  },
  fieldLabel: {
    fontSize: 11,
  },
  budgetToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  budgetToggleText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  formErrorText: {
    fontSize: 12,
    fontWeight: '700',
  },
  submitBtn: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
