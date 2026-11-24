import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ThemeShade } from '../theme/palette';
import { BillItem } from '../types/budget';
import { formatPeso, formatPesoNumber, parsePesoInput } from '../utils/numberFormat';
import { ScalePressable } from './AnimatedPrimitives';
import { BILL_ICON_CHOICES } from './AppIcon';
import { FormModal } from './FormModal';
import { IconPickerGrid } from './form/IconPickerGrid';
import { PesoAmountInput } from './form/PesoAmountInput';
import { QuickPresetChips } from './form/QuickPresetChips';

export const QUICK_BILL_PRESETS = [
  { icon: 'droplet', name: 'Water', amount: 500 },
  { icon: 'smartphone', name: 'Load / Plan', amount: 999 },
  { icon: 'credit-card', name: 'Loan / CC', amount: 2000 },
  { icon: 'shield', name: 'Insurance', amount: 1500 },
];

function validateDueDayDraft(
  raw: string
): { valid: boolean; value: number | undefined; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: true, value: undefined };
  }
  const cleaned = trimmed.replace(/[^0-9]/g, '');
  const parsed = parseInt(cleaned, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 31) {
    return {
      valid: false,
      value: undefined,
      error: 'Due day must be between 1 and 31.',
    };
  }
  return { valid: true, value: parsed };
}

export interface AddEditBillModalProps {
  visible: boolean;
  editingBill: BillItem | null;
  shade: ThemeShade;
  collapsible?: boolean;
  enableTracking?: boolean;
  onAddBill: (
    name: string,
    icon: string,
    amount: number,
    dueDay?: number
  ) => void;
  onUpdateBillItem?: (
    billId: string,
    name: string,
    icon: string,
    amount: number,
    dueDay?: number
  ) => void;
  onClose: () => void;
}

const AddEditBillModalContent: React.FC<
  Omit<AddEditBillModalProps, 'visible'>
> = ({
  editingBill,
  shade,
  collapsible = false,
  enableTracking = false,
  onAddBill,
  onUpdateBillItem,
  onClose,
}) => {
  const [newIcon, setNewIcon] = useState(
    editingBill ? editingBill.icon || 'tag' : 'droplet'
  );
  const [newName, setNewName] = useState(editingBill ? editingBill.name : '');
  const [newAmountText, setNewAmountText] = useState(
    editingBill && editingBill.amount > 0
      ? formatPesoNumber(editingBill.amount)
      : ''
  );
  const [newDueDayText, setNewDueDayText] = useState(
    editingBill && typeof editingBill.dueDay === 'number'
      ? String(editingBill.dueDay)
      : ''
  );
  const [billFormError, setBillFormError] = useState<string | null>(null);

  const parsedCustomAmt = parsePesoInput(newAmountText);
  const dueCheck = validateDueDayDraft(newDueDayText);
  const isCustomBillValid =
    Boolean(newName.trim()) && parsedCustomAmt > 0 && dueCheck.valid;
  const isEditing = editingBill !== null;

  const presetItems = QUICK_BILL_PRESETS.map((p) => ({
    ...p,
    label: `${p.name} ${formatPeso(p.amount)}`,
  }));

  const handleSaveBillForm = () => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      setBillFormError('Please enter a bill name.');
      return;
    }
    if (parsedCustomAmt <= 0) {
      setBillFormError('Please enter a monthly amount greater than ₱0.');
      return;
    }
    if (!dueCheck.valid) {
      setBillFormError(dueCheck.error || 'Due day must be between 1 and 31.');
      return;
    }
    setBillFormError(null);
    if (editingBill && onUpdateBillItem) {
      onUpdateBillItem(
        editingBill.id,
        trimmedName,
        newIcon,
        parsedCustomAmt,
        dueCheck.value
      );
    } else {
      onAddBill(trimmedName, newIcon, parsedCustomAmt, dueCheck.value);
    }
    onClose();
  };

  return (
    <FormModal
      visible
      title={isEditing ? 'Edit Monthly Bill' : 'Add Monthly Bill'}
      subtitle={
        isEditing
          ? 'Update bill name, icon, amount, or due day'
          : 'Set aside monthly fixed costs first'
      }
      icon={newIcon}
      onClose={onClose}
    >
      {!isEditing && collapsible && (
        <QuickPresetChips
          label="Quick Starters (tap to fill)"
          presets={presetItems}
          shade={shade}
          accentColor={shade.dopamine}
          onSelect={(preset) => {
            setNewName(preset.name);
            setNewIcon(preset.icon);
            setNewAmountText(formatPesoNumber(preset.amount));
            setBillFormError(null);
          }}
        />
      )}

      <IconPickerGrid
        label="Pick an icon"
        icons={BILL_ICON_CHOICES}
        selected={newIcon}
        onSelect={setNewIcon}
        shade={shade}
        activeBg={shade.accent}
        activeFg={shade.accentText}
      />

      <TextInput
        value={newName}
        onChangeText={(t) => {
          setNewName(t);
          if (billFormError) setBillFormError(null);
        }}
        placeholder="Bill name (e.g., Meralco, Condo Dues)"
        placeholderTextColor={shade.muted}
        accessibilityLabel="Bill name"
        style={[
          styles.nameInput,
          {
            backgroundColor: shade.surface,
            color: shade.text,
            borderColor: shade.border,
          },
        ]}
      />

      <PesoAmountInput
        value={newAmountText}
        onChangeText={(formatted) => {
          setNewAmountText(formatted);
          if (billFormError) setBillFormError(null);
        }}
        shade={shade}
        accentColor={shade.accent}
        placeholder="Monthly amount"
        inputAccessibilityLabel="Monthly bill amount"
      />

      {enableTracking && (
        <View style={styles.dueFieldRow}>
          <Text style={[styles.modalLabel, { color: shade.muted }]}>
            Due Day (1–31, optional)
          </Text>
          <TextInput
            value={newDueDayText}
            onChangeText={(t) => {
              setNewDueDayText(t.replace(/[^0-9]/g, '').slice(0, 2));
              if (billFormError) setBillFormError(null);
            }}
            keyboardType="numeric"
            maxLength={2}
            placeholder="e.g., 15"
            placeholderTextColor={shade.muted}
            accessibilityLabel="Bill due day of month"
            style={[
              styles.dueDaySmallInput,
              {
                backgroundColor: shade.surface,
                color: shade.text,
                borderColor: !dueCheck.valid ? shade.warning : shade.border,
              },
            ]}
          />
        </View>
      )}

      {billFormError ? (
        <Text style={[styles.formErrorText, { color: shade.warning }]}>
          {billFormError}
        </Text>
      ) : null}

      <ScalePressable
        onPress={handleSaveBillForm}
        accessibilityRole="button"
        style={[
          styles.addBtn,
          {
            backgroundColor: isCustomBillValid ? shade.accent : shade.surface,
            opacity: isCustomBillValid ? 1 : 0.75,
          },
        ]}
      >
        <Text
          style={[
            styles.addBtnText,
            { color: isCustomBillValid ? shade.accentText : shade.muted },
          ]}
        >
          {isEditing ? 'Save Bill Changes' : 'Add to Monthly Bills'}
        </Text>
      </ScalePressable>
    </FormModal>
  );
};

export const AddEditBillModal: React.FC<AddEditBillModalProps> = ({
  visible,
  editingBill,
  ...rest
}) => {
  if (!visible) return null;
  return (
    <AddEditBillModalContent
      key={editingBill?.id ?? 'new'}
      editingBill={editingBill}
      {...rest}
    />
  );
};

export interface BillDueDayModalProps {
  bill: BillItem | null;
  shade: ThemeShade;
  onUpdateDueDay?: (billId: string, dueDay?: number) => void;
  onClose: () => void;
}

const BillDueDayModalContent: React.FC<
  Omit<BillDueDayModalProps, 'bill'> & { bill: BillItem }
> = ({ bill, shade, onUpdateDueDay, onClose }) => {
  const [dueDayDraft, setDueDayDraft] = useState(
    typeof bill.dueDay === 'number' ? String(bill.dueDay) : ''
  );
  const [dueError, setDueError] = useState<string | null>(null);

  const handleSaveDueDay = () => {
    const check = validateDueDayDraft(dueDayDraft);
    if (!check.valid) {
      setDueError(check.error || 'Due day must be between 1 and 31.');
      return;
    }
    setDueError(null);
    if (onUpdateDueDay) {
      onUpdateDueDay(bill.id, check.value);
    }
    onClose();
  };

  return (
    <FormModal
      visible
      title={`${bill.name} Due Day`}
      subtitle="Set day of month (1–31) for payment reminders"
      icon="calendar"
      onClose={onClose}
    >
      <TextInput
        value={dueDayDraft}
        onChangeText={(t) => {
          setDueDayDraft(t.replace(/[^0-9]/g, '').slice(0, 2));
          if (dueError) setDueError(null);
        }}
        keyboardType="numeric"
        maxLength={2}
        placeholder="Day of month (1-31, leave blank to clear)"
        placeholderTextColor={shade.muted}
        accessibilityLabel="Due day of month"
        autoFocus
        style={[
          styles.nameInput,
          {
            backgroundColor: shade.surface,
            color: shade.text,
            borderColor: dueError ? shade.warning : shade.border,
          },
        ]}
      />
      {dueError ? (
        <Text style={[styles.formErrorText, { color: shade.warning }]}>
          {dueError}
        </Text>
      ) : null}
      <View style={styles.dueModalBtnRow}>
        <ScalePressable
          onPress={() => {
            if (onUpdateDueDay) {
              onUpdateDueDay(bill.id, undefined);
            }
            onClose();
          }}
          accessibilityRole="button"
          style={[
            styles.dueClearBtn,
            { backgroundColor: shade.surface, borderColor: shade.border },
          ]}
        >
          <Text style={[styles.dueClearBtnText, { color: shade.muted }]}>
            Clear
          </Text>
        </ScalePressable>
        <ScalePressable
          onPress={handleSaveDueDay}
          accessibilityRole="button"
          style={[styles.dueSaveBtn, { backgroundColor: shade.accent }]}
        >
          <Text style={[styles.addBtnText, { color: shade.accentText }]}>
            Save Due Day
          </Text>
        </ScalePressable>
      </View>
    </FormModal>
  );
};

export const BillDueDayModal: React.FC<BillDueDayModalProps> = ({
  bill,
  ...rest
}) => {
  if (!bill) return null;
  return <BillDueDayModalContent key={bill.id} bill={bill} {...rest} />;
};

const styles = StyleSheet.create({
  modalLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  nameInput: {
    minWidth: 0,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  dueFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dueDaySmallInput: {
    width: 86,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  dueModalBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dueClearBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dueClearBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  dueSaveBtn: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addBtn: {
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 2,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  formErrorText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
