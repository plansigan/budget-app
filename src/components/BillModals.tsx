import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ThemeShade } from '../theme/palette';
import { BillItem } from '../types/budget';
import { triggerLightHaptic } from '../utils/haptics';
import {
  formatPeso,
  formatPesoInput,
  formatPesoNumber,
  parsePesoInput,
} from '../utils/numberFormat';
import { ScalePressable } from './AnimatedPrimitives';
import { AppIcon, BILL_ICON_CHOICES } from './AppIcon';
import { FormModal } from './FormModal';

export const QUICK_BILL_PRESETS = [
  { icon: 'droplet', name: 'Water', amount: 500 },
  { icon: 'smartphone', name: 'Load / Plan', amount: 999 },
  { icon: 'credit-card', name: 'Loan / CC', amount: 2000 },
  { icon: 'shield', name: 'Insurance', amount: 1500 },
];

export function parseDueDayDraft(raw: string): number | undefined {
  const cleaned = raw.replace(/[^0-9]/g, '');
  if (!cleaned) return undefined;
  const parsed = parseInt(cleaned, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return undefined;
  return Math.min(31, parsed);
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
  const isCustomBillValid = Boolean(newName.trim()) && parsedCustomAmt > 0;
  const isEditing = editingBill !== null;

  const handleSaveBillForm = () => {
    if (!newName.trim()) {
      setBillFormError('Please enter a bill name.');
      return;
    }
    if (parsedCustomAmt <= 0) {
      setBillFormError('Please enter a monthly amount greater than ₱0.');
      return;
    }
    setBillFormError(null);
    const parsedDue = parseDueDayDraft(newDueDayText);
    if (editingBill && onUpdateBillItem) {
      onUpdateBillItem(editingBill.id, newName, newIcon, parsedCustomAmt, parsedDue);
    } else {
      onAddBill(newName, newIcon, parsedCustomAmt, parsedDue);
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
        <View style={{ gap: 6 }}>
          <Text style={[styles.modalLabel, { color: shade.muted }]}>
            Quick Starters (tap to fill)
          </Text>
          <View style={styles.presetChips}>
            {QUICK_BILL_PRESETS.map((preset) => (
              <ScalePressable
                key={preset.name}
                onPress={() => {
                  triggerLightHaptic();
                  setNewName(preset.name);
                  setNewIcon(preset.icon);
                  setNewAmountText(formatPesoNumber(preset.amount));
                  setBillFormError(null);
                }}
                style={[styles.presetChip, { backgroundColor: shade.surface }]}
              >
                <AppIcon name={preset.icon} size={12} color={shade.dopamine} />
                <Text style={[styles.presetChipText, { color: shade.text }]}>
                  {preset.name} {formatPeso(preset.amount)}
                </Text>
              </ScalePressable>
            ))}
          </View>
        </View>
      )}
      <Text style={[styles.modalLabel, { color: shade.muted }]}>
        Pick an icon
      </Text>
      <View style={styles.iconRow}>
        {BILL_ICON_CHOICES.map((iconName) => {
          const active = newIcon === iconName;
          return (
            <ScalePressable
              key={iconName}
              onPress={() => {
                triggerLightHaptic();
                setNewIcon(iconName);
              }}
              style={[
                styles.iconPill,
                {
                  backgroundColor: active ? shade.accent : shade.surface,
                },
              ]}
            >
              <AppIcon
                name={iconName}
                size={16}
                color={active ? shade.accentText : shade.text}
              />
            </ScalePressable>
          );
        })}
      </View>

      <TextInput
        value={newName}
        onChangeText={(t) => {
          setNewName(t);
          if (billFormError) setBillFormError(null);
        }}
        placeholder="Bill name (e.g., Meralco, Condo Dues)"
        placeholderTextColor={shade.muted}
        style={[
          styles.nameInput,
          {
            backgroundColor: shade.surface,
            color: shade.text,
            borderColor: shade.border,
          },
        ]}
      />

      <View
        style={[
          styles.newAmountWrap,
          { backgroundColor: shade.surface, borderColor: shade.border },
        ]}
      >
        <Text style={[styles.pesoSign, { color: shade.accent }]}>₱</Text>
        <TextInput
          value={newAmountText}
          onChangeText={(t) => {
            setNewAmountText(formatPesoInput(t));
            if (billFormError) setBillFormError(null);
          }}
          keyboardType="decimal-pad"
          inputMode="decimal"
          placeholder="Monthly amount"
          placeholderTextColor={shade.muted}
          style={[styles.newAmountInput, { color: shade.text }]}
        />
      </View>

      {enableTracking && (
        <View style={styles.dueFieldRow}>
          <Text style={[styles.modalLabel, { color: shade.muted }]}>
            Due Day (1–31, optional)
          </Text>
          <TextInput
            value={newDueDayText}
            onChangeText={(t) =>
              setNewDueDayText(t.replace(/[^0-9]/g, '').slice(0, 2))
            }
            keyboardType="numeric"
            maxLength={2}
            placeholder="e.g., 15"
            placeholderTextColor={shade.muted}
            style={[
              styles.dueDaySmallInput,
              {
                backgroundColor: shade.surface,
                color: shade.text,
                borderColor: shade.border,
              },
            ]}
          />
        </View>
      )}

      {billFormError && (
        <Text style={[styles.formErrorText, { color: shade.warning }]}>
          {billFormError}
        </Text>
      )}

      <ScalePressable
        onPress={handleSaveBillForm}
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
            {
              color: isCustomBillValid ? shade.accentText : shade.muted,
            },
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

  const handleSaveDueDay = () => {
    if (onUpdateDueDay) {
      onUpdateDueDay(bill.id, parseDueDayDraft(dueDayDraft));
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
        onChangeText={(t) =>
          setDueDayDraft(t.replace(/[^0-9]/g, '').slice(0, 2))
        }
        keyboardType="numeric"
        maxLength={2}
        placeholder="Day of month (1-31, leave blank to clear)"
        placeholderTextColor={shade.muted}
        autoFocus
        style={[
          styles.nameInput,
          {
            backgroundColor: shade.surface,
            color: shade.text,
            borderColor: shade.border,
          },
        ]}
      />
      <View style={styles.dueModalBtnRow}>
        <ScalePressable
          onPress={() => {
            if (onUpdateDueDay) {
              onUpdateDueDay(bill.id, undefined);
            }
            onClose();
          }}
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
  pesoSign: {
    fontSize: 12,
    fontWeight: '800',
    marginRight: 3,
  },
  presetChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  iconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  iconPill: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameInput: {
    minWidth: 0,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  newAmountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  newAmountInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: '800',
    paddingVertical: 0,
  },
  addBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  formErrorText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dueFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dueDaySmallInput: {
    width: 84,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  dueModalBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dueClearBtn: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  dueClearBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  dueSaveBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
});
