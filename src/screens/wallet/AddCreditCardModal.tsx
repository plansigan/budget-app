import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ScalePressable } from '../../components/AnimatedPrimitives';
import { FormModal } from '../../components/FormModal';
import { PesoAmountInput } from '../../components/form/PesoAmountInput';
import { useBudgetActions, useThemePrefs } from '../../context/BudgetContext';
import { parsePesoInput } from '../../utils/numberFormat';

interface AddCreditCardModalProps {
  visible: boolean;
  onClose: () => void;
}

const AddCreditCardModalContent: React.FC<{ onClose: () => void }> = ({
  onClose,
}) => {
  const { shade } = useThemePrefs();
  const { addCreditCard } = useBudgetActions();

  const [cardName, setCardName] = useState('');
  const [cardLimitText, setCardLimitText] = useState('');
  const [cardUsedText, setCardUsedText] = useState('');
  const [cardCutoffText, setCardCutoffText] = useState('15');
  const [formError, setFormError] = useState<string | null>(null);

  const parsedCutoff = parseInt(cardCutoffText.replace(/[^0-9]/g, ''), 10);
  const cutoffValid =
    Boolean(cardCutoffText.trim()) &&
    Number.isFinite(parsedCutoff) &&
    parsedCutoff >= 1 &&
    parsedCutoff <= 31;

  const isCardFormValid =
    Boolean(cardName.trim()) &&
    parsePesoInput(cardLimitText) > 0 &&
    cutoffValid;

  const handleCreateCard = () => {
    const limit = parsePesoInput(cardLimitText);
    const used = parsePesoInput(cardUsedText);
    if (!cardName.trim()) {
      setFormError('Please enter a credit card name.');
      return;
    }
    if (limit <= 0) {
      setFormError('Please enter a credit limit greater than ₱0.');
      return;
    }
    if (!cutoffValid) {
      setFormError('Statement cut-off day must be between 1 and 31.');
      return;
    }
    setFormError(null);
    addCreditCard(cardName, limit, used, parsedCutoff);
    onClose();
  };

  return (
    <FormModal
      visible
      title="Add Credit Card"
      subtitle="Track credit limit and cut-off date"
      icon="credit-card"
      accentColor={shade.dopamine}
      onClose={onClose}
    >
      <TextInput
        value={cardName}
        onChangeText={(t) => {
          setCardName(t);
          if (formError) setFormError(null);
        }}
        placeholder="Card name (e.g., BDO Visa, BPI Amore)"
        placeholderTextColor={shade.muted}
        autoFocus
        style={[
          styles.textInput,
          {
            backgroundColor: shade.surface,
            color: shade.text,
            borderColor: shade.border,
          },
        ]}
      />

      <View style={styles.twoCols}>
        <PesoAmountInput
          value={cardLimitText}
          onChangeText={(t) => {
            setCardLimitText(t);
            if (formError) setFormError(null);
          }}
          shade={shade}
          accentColor={shade.dopamine}
          placeholder="Credit Limit"
          inputAccessibilityLabel="Credit limit"
          containerStyle={{ flex: 1 }}
        />
        <PesoAmountInput
          value={cardUsedText}
          onChangeText={setCardUsedText}
          shade={shade}
          accentColor={shade.muted}
          placeholder="Used Balance"
          inputAccessibilityLabel="Current used balance"
          containerStyle={{ flex: 1 }}
        />
      </View>

      <View style={styles.rowBetween}>
        <Text style={[styles.accountSub, { color: shade.muted }]}>
          Statement Cut-off Day (1-31):
        </Text>
        <View
          style={[
            styles.cutoffInputWrap,
            { backgroundColor: shade.surface, borderColor: shade.border },
          ]}
        >
          <TextInput
            value={cardCutoffText}
            onChangeText={(t) => {
              setCardCutoffText(t.replace(/[^0-9]/g, ''));
              if (formError) setFormError(null);
            }}
            keyboardType="numeric"
            maxLength={2}
            placeholder="15"
            placeholderTextColor={shade.muted}
            accessibilityLabel="Statement cut-off day"
            style={[
              styles.cutoffInput,
              { color: shade.dopamine, textAlign: 'center' },
            ]}
          />
        </View>
      </View>

      {formError && (
        <Text style={[styles.formErrorText, { color: shade.warning }]}>
          {formError}
        </Text>
      )}

      <ScalePressable
        onPress={handleCreateCard}
        accessibilityState={{ disabled: !isCardFormValid }}
        style={[
          styles.submitBtn,
          {
            backgroundColor: isCardFormValid
              ? shade.dopamineBtnBg
              : shade.surface,
            opacity: isCardFormValid ? 1 : 0.75,
          },
        ]}
      >
        <Text
          style={[
            styles.submitText,
            { color: isCardFormValid ? '#FFFFFF' : shade.muted },
          ]}
        >
          Save Credit Card
        </Text>
      </ScalePressable>
    </FormModal>
  );
};

/**
 * Modal dialog for adding a new credit card account.
 */
export const AddCreditCardModal: React.FC<AddCreditCardModalProps> = ({
  visible,
  onClose,
}) => {
  if (!visible) return null;
  return <AddCreditCardModalContent onClose={onClose} />;
};

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  accountSub: {
    fontSize: 11,
  },
  textInput: {
    minWidth: 0,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  twoCols: {
    flexDirection: 'row',
    gap: 8,
  },
  cutoffInputWrap: {
    width: 58,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  cutoffInput: {
    fontSize: 15,
    fontWeight: '800',
    paddingVertical: 1,
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
  formErrorText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
