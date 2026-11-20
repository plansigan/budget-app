import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ScalePressable } from '../../components/AnimatedPrimitives';
import { AppIcon } from '../../components/AppIcon';
import { FormModal } from '../../components/FormModal';
import { useBudget } from '../../context/BudgetContext';
import { triggerLightHaptic } from '../../utils/haptics';
import { formatPesoInput, parsePesoInput } from '../../utils/numberFormat';

const PROVIDER_CHIPS = ['BDO 0%', 'BPI', 'SPayLater', 'Atome', 'Other'];

interface WalletModalsProps {
  showAddBank: boolean;
  onCloseAddBank: () => void;
  showAddCard: boolean;
  onCloseAddCard: () => void;
  showAddInst: boolean;
  onCloseAddInst: () => void;
}

export const WalletModals: React.FC<WalletModalsProps> = ({
  showAddBank,
  onCloseAddBank,
  showAddCard,
  onCloseAddCard,
  showAddInst,
  onCloseAddInst,
}) => {
  const { shade, addBank, addCreditCard, addInstallment } = useBudget();

  const [bankName, setBankName] = useState('');
  const [bankBalanceText, setBankBalanceText] = useState('');
  const [bankFormError, setBankFormError] = useState<string | null>(null);

  const [cardName, setCardName] = useState('');
  const [cardLimitText, setCardLimitText] = useState('');
  const [cardUsedText, setCardUsedText] = useState('');
  const [cardCutoffText, setCardCutoffText] = useState('15');
  const [cardFormError, setCardFormError] = useState<string | null>(null);

  const [instName, setInstName] = useState('');
  const [instProvider, setInstProvider] = useState('BDO 0%');
  const [instMonthlyText, setInstMonthlyText] = useState('');
  const [instTotalText, setInstTotalText] = useState('12');
  const [instPaidText, setInstPaidText] = useState('0');
  const [instInBudget, setInstInBudget] = useState(true);
  const [instFormError, setInstFormError] = useState<string | null>(null);

  useEffect(() => {
    if (showAddBank) setBankFormError(null);
  }, [showAddBank]);

  useEffect(() => {
    if (showAddCard) setCardFormError(null);
  }, [showAddCard]);

  useEffect(() => {
    if (showAddInst) setInstFormError(null);
  }, [showAddInst]);

  const handleCreateBank = () => {
    const bal = parsePesoInput(bankBalanceText);
    if (!bankName.trim()) {
      setBankFormError('Please enter a bank or e-wallet name.');
      return;
    }
    setBankFormError(null);
    addBank(bankName, bal);
    setBankName('');
    setBankBalanceText('');
    onCloseAddBank();
  };

  const handleCreateCard = () => {
    const limit = parsePesoInput(cardLimitText);
    const used = parsePesoInput(cardUsedText);
    const cutoff = Math.max(
      1,
      Math.min(
        31,
        parseInt(cardCutoffText.replace(/[^0-9]/g, ''), 10) || 15
      )
    );
    if (!cardName.trim()) {
      setCardFormError('Please enter a credit card name.');
      return;
    }
    if (limit <= 0) {
      setCardFormError('Please enter a credit limit greater than ₱0.');
      return;
    }
    setCardFormError(null);
    addCreditCard(cardName, limit, used, cutoff);
    setCardName('');
    setCardLimitText('');
    setCardUsedText('');
    setCardCutoffText('15');
    onCloseAddCard();
  };

  const handleCreateInstallment = () => {
    const monthly = parsePesoInput(instMonthlyText);
    const totalM = parseInt(instTotalText.replace(/[^0-9]/g, ''), 10) || 0;
    const paidM = parseInt(instPaidText.replace(/[^0-9]/g, ''), 10) || 0;
    if (!instName.trim()) {
      setInstFormError('Please enter an item or loan name.');
      return;
    }
    if (monthly <= 0) {
      setInstFormError('Please enter a monthly payment greater than ₱0.');
      return;
    }
    if (totalM <= 0) {
      setInstFormError('Total months must be at least 1.');
      return;
    }

    setInstFormError(null);
    addInstallment({
      name: instName,
      provider: instProvider,
      monthlyAmount: monthly,
      totalMonths: totalM,
      paidMonths: paidM,
      includeInBudget: instInBudget,
    });
    setInstName('');
    setInstProvider('BDO 0%');
    setInstMonthlyText('');
    setInstTotalText('12');
    setInstPaidText('0');
    setInstInBudget(true);
    onCloseAddInst();
  };

  const isBankFormValid = Boolean(bankName.trim());
  const isCardFormValid =
    Boolean(cardName.trim()) && parsePesoInput(cardLimitText) > 0;
  const isInstFormValid =
    Boolean(instName.trim()) &&
    parsePesoInput(instMonthlyText) > 0 &&
    (parseInt(instTotalText.replace(/[^0-9]/g, ''), 10) || 0) > 0;

  return (
    <>
      <FormModal
        visible={showAddBank}
        title="Add Bank Account"
        subtitle="Track your bank or e-wallet balance"
        icon="briefcase"
        onClose={() => {
          setBankFormError(null);
          onCloseAddBank();
        }}
      >
        <TextInput
          value={bankName}
          onChangeText={(t) => {
            setBankName(t);
            if (bankFormError) setBankFormError(null);
          }}
          placeholder="Bank / E-Wallet name (e.g., BPI, Maya)"
          placeholderTextColor={shade.muted}
          style={[
            styles.textInput,
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
            value={bankBalanceText}
            onChangeText={(t) => setBankBalanceText(formatPesoInput(t))}
            keyboardType="numeric"
            placeholder="Current balance"
            placeholderTextColor={shade.muted}
            style={[styles.amountInput, { color: shade.text }]}
          />
        </View>
        {bankFormError && (
          <Text style={[styles.formErrorText, { color: shade.warning }]}>
            {bankFormError}
          </Text>
        )}
        <ScalePressable
          onPress={handleCreateBank}
          style={[
            styles.submitBtn,
            {
              backgroundColor: isBankFormValid ? shade.accent : shade.surface,
              opacity: isBankFormValid ? 1 : 0.75,
            },
          ]}
        >
          <Text
            style={[
              styles.submitText,
              { color: isBankFormValid ? shade.accentText : shade.muted },
            ]}
          >
            Save Bank Account
          </Text>
        </ScalePressable>
      </FormModal>

      <FormModal
        visible={showAddCard}
        title="Add Credit Card"
        subtitle="Track credit limit and cut-off date"
        icon="credit-card"
        accentColor={shade.dopamine}
        onClose={() => {
          setCardFormError(null);
          onCloseAddCard();
        }}
      >
        <TextInput
          value={cardName}
          onChangeText={(t) => {
            setCardName(t);
            if (cardFormError) setCardFormError(null);
          }}
          placeholder="Card name (e.g., BDO Visa, BPI Amore)"
          placeholderTextColor={shade.muted}
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
          <View
            style={[
              styles.fullAmountBox,
              {
                flex: 1,
                backgroundColor: shade.surface,
                borderColor: shade.border,
              },
            ]}
          >
            <Text style={[styles.pesoPrefix, { color: shade.dopamine }]}>
              ₱
            </Text>
            <TextInput
              value={cardLimitText}
              onChangeText={(t) => {
                setCardLimitText(formatPesoInput(t));
                if (cardFormError) setCardFormError(null);
              }}
              keyboardType="numeric"
              placeholder="Credit Limit"
              placeholderTextColor={shade.muted}
              style={[styles.amountInput, { color: shade.text }]}
            />
          </View>
          <View
            style={[
              styles.fullAmountBox,
              {
                flex: 1,
                backgroundColor: shade.surface,
                borderColor: shade.border,
              },
            ]}
          >
            <Text style={[styles.pesoPrefix, { color: shade.muted }]}>₱</Text>
            <TextInput
              value={cardUsedText}
              onChangeText={(t) => setCardUsedText(formatPesoInput(t))}
              keyboardType="numeric"
              placeholder="Used Balance"
              placeholderTextColor={shade.muted}
              style={[styles.amountInput, { color: shade.text }]}
            />
          </View>
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
              onChangeText={(t) =>
                setCardCutoffText(t.replace(/[^0-9]/g, ''))
              }
              keyboardType="numeric"
              maxLength={2}
              placeholder="15"
              placeholderTextColor={shade.muted}
              style={[
                styles.amountInput,
                { color: shade.dopamine, textAlign: 'center' },
              ]}
            />
          </View>
        </View>

        {cardFormError && (
          <Text style={[styles.formErrorText, { color: shade.warning }]}>
            {cardFormError}
          </Text>
        )}

        <ScalePressable
          onPress={handleCreateCard}
          style={[
            styles.submitBtn,
            {
              backgroundColor: isCardFormValid ? shade.dopamine : shade.surface,
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

      <FormModal
        visible={showAddInst}
        title="Add Installment Plan"
        subtitle="See monthly impact and debt-free month"
        icon="calendar"
        onClose={() => {
          setInstFormError(null);
          onCloseAddInst();
        }}
      >
        <TextInput
          value={instName}
          onChangeText={(t) => {
            setInstName(t);
            if (instFormError) setInstFormError(null);
          }}
          placeholder="Item name (e.g., iPhone 16, Laptop)"
          placeholderTextColor={shade.muted}
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
          {PROVIDER_CHIPS.map((prov) => (
            <ScalePressable
              key={prov}
              onPress={() => {
                triggerLightHaptic();
                setInstProvider(prov);
              }}
              style={[
                styles.providerChip,
                {
                  backgroundColor:
                    instProvider === prov ? shade.accent : shade.surface,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: instProvider === prov ? shade.accentText : shade.text,
                }}
              >
                {prov}
              </Text>
            </ScalePressable>
          ))}
        </View>

        <View
          style={[
            styles.fullAmountBox,
            { backgroundColor: shade.surface, borderColor: shade.border },
          ]}
        >
          <Text style={[styles.pesoPrefix, { color: shade.accent }]}>₱</Text>
          <TextInput
            value={instMonthlyText}
            onChangeText={(t) => {
              setInstMonthlyText(formatPesoInput(t));
              if (instFormError) setInstFormError(null);
            }}
            keyboardType="numeric"
            placeholder="Monthly payment"
            placeholderTextColor={shade.muted}
            style={[styles.amountInput, { color: shade.text }]}
          />
        </View>

        <View style={styles.twoCols}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.accountSub, { color: shade.muted }]}>
              Total Months
            </Text>
            <TextInput
              value={instTotalText}
              onChangeText={(t) => {
                setInstTotalText(t.replace(/[^0-9]/g, ''));
                if (instFormError) setInstFormError(null);
              }}
              keyboardType="numeric"
              maxLength={3}
              placeholder="12"
              placeholderTextColor={shade.muted}
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
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.accountSub, { color: shade.muted }]}>
              Paid So Far
            </Text>
            <TextInput
              value={instPaidText}
              onChangeText={(t) => setInstPaidText(t.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
              maxLength={3}
              placeholder="0"
              placeholderTextColor={shade.muted}
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
            setInstInBudget((v) => !v);
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
            name={instInBudget ? 'check' : 'circle'}
            size={14}
            color={instInBudget ? shade.positive : shade.muted}
          />
          <Text
            style={[styles.accountSub, { color: shade.text, fontWeight: '700' }]}
          >
            Set aside in daily budget
          </Text>
        </ScalePressable>

        {instFormError && (
          <Text style={[styles.formErrorText, { color: shade.warning }]}>
            {instFormError}
          </Text>
        )}

        <ScalePressable
          onPress={handleCreateInstallment}
          style={[
            styles.submitBtn,
            {
              backgroundColor: isInstFormValid ? shade.accent : shade.surface,
              opacity: isInstFormValid ? 1 : 0.75,
            },
          ]}
        >
          <Text
            style={[
              styles.submitText,
              { color: isInstFormValid ? shade.accentText : shade.muted },
            ]}
          >
            Add Installment Plan
          </Text>
        </ScalePressable>
      </FormModal>
    </>
  );
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
  amountInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: '800',
    paddingVertical: 1,
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
  budgetToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
