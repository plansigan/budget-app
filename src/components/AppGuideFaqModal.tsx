import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useThemePrefs } from '../context/BudgetContext';
import {
  FAQ_CATEGORIES,
  FAQ_ITEMS,
  FaqCategoryKey,
  FaqItem,
  filterFaqItems,
} from '../data/faqData';
import { triggerLightHaptic } from '../utils/haptics';
import { ScalePressable } from './AnimatedPrimitives';
import { AppIcon, IconBadge } from './AppIcon';
import { BaseModal } from './BaseModal';

interface AppGuideFaqModalProps {
  visible: boolean;
  onClose: () => void;
  onReplayQuickGuide: () => void;
}

const CATEGORY_LABEL_MAP: Record<FaqItem['category'], string> = {
  today: 'Today',
  wallet: 'Wallet & Cards',
  debts: 'Debts',
  goals: 'Goals & Savings',
  backup: 'Backup & Data',
};

const AppGuideFaqModalContent: React.FC<AppGuideFaqModalProps> = ({
  visible,
  onClose,
  onReplayQuickGuide,
}) => {
  const { shade } = useThemePrefs();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<FaqCategoryKey>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setCategory('all');
    setExpandedIds(new Set());
  }, [visible]);

  const filteredItems = useMemo(
    () => filterFaqItems(FAQ_ITEMS, category, query),
    [category, query]
  );

  const toggleItem = (id: string) => {
    triggerLightHaptic();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <BaseModal
      visible={visible}
      onClose={onClose}
      dismissLabel="Dismiss App Guide and FAQ"
      minKeyboardCardHeight={260}
      backdropStyle={styles.backdrop}
      cardStyle={[
        styles.card,
        { backgroundColor: shade.card, borderColor: shade.border },
      ]}
    >
      {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              <IconBadge
                name="book-open"
                size={16}
                color={shade.dopamine}
                bg={shade.dopamineSoft}
                boxSize={36}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.title, { color: shade.text }]}>
                  App Guide & FAQ
                </Text>
                <Text style={[styles.subtitle, { color: shade.muted }]}>
                  How Velvet works & common questions
                </Text>
              </View>
            </View>

            <ScalePressable
              onPress={() => {
                triggerLightHaptic();
                onClose();
              }}
              accessibilityLabel="Close guide"
              hitSlop={8}
              style={[styles.closeBtn, { backgroundColor: shade.surface }]}
            >
              <AppIcon name="x" size={16} color={shade.muted} />
            </ScalePressable>
          </View>

          {/* Search Input */}
          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: shade.surface,
                borderColor: shade.border,
              },
            ]}
          >
            <AppIcon name="search" size={15} color={shade.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search features or questions..."
              placeholderTextColor={shade.muted}
              returnKeyType="search"
              autoCorrect={false}
              style={[styles.searchInput, { color: shade.text }]}
            />
            {query.length > 0 && (
              <ScalePressable
                onPress={() => {
                  triggerLightHaptic();
                  setQuery('');
                }}
                accessibilityLabel="Clear search"
                hitSlop={6}
                style={[styles.clearBtn, { backgroundColor: shade.card }]}
              >
                <AppIcon name="x" size={12} color={shade.muted} />
              </ScalePressable>
            )}
          </View>

          {/* Category Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chipsRow}
          >
            {FAQ_CATEGORIES.map((cat) => {
              const active = category === cat.key;
              return (
                <ScalePressable
                  key={cat.key}
                  onPress={() => {
                    triggerLightHaptic();
                    setCategory(cat.key);
                  }}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: active ? shade.dopamine : shade.surface,
                      borderColor: active ? shade.dopamine : shade.border,
                    },
                  ]}
                >
                  <AppIcon
                    name={cat.icon}
                    size={12}
                    color={active ? '#FFFFFF' : shade.muted}
                  />
                  <Text
                    style={[
                      styles.catChipText,
                      { color: active ? '#FFFFFF' : shade.text },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </ScalePressable>
              );
            })}
          </ScrollView>

          {/* Accordion List + Footer */}
          <ScrollView
            style={styles.listScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
          >
            {filteredItems.length === 0 ? (
              <View
                style={[
                  styles.emptyBox,
                  {
                    backgroundColor: shade.surface,
                    borderColor: shade.border,
                  },
                ]}
              >
                <AppIcon name="search" size={20} color={shade.muted} />
                <Text style={[styles.emptyTitle, { color: shade.text }]}>
                  No matching answers found
                </Text>
                <Text style={[styles.emptySub, { color: shade.muted }]}>
                  Try another keyword or switch category to All.
                </Text>
                <ScalePressable
                  onPress={() => {
                    triggerLightHaptic();
                    setQuery('');
                    setCategory('all');
                  }}
                  style={[
                    styles.resetSearchBtn,
                    { backgroundColor: shade.dopamineSoft },
                  ]}
                >
                  <Text
                    style={[styles.resetSearchText, { color: shade.dopamine }]}
                  >
                    Clear search
                  </Text>
                </ScalePressable>
              </View>
            ) : (
              filteredItems.map((item) => {
                const isExpanded = expandedIds.has(item.id);
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.faqCard,
                      {
                        backgroundColor: shade.surface,
                        borderColor: isExpanded ? shade.dopamine : shade.border,
                      },
                    ]}
                  >
                    <ScalePressable
                      onPress={() => toggleItem(item.id)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isExpanded }}
                      style={styles.faqHeaderBtn}
                    >
                      <View style={styles.faqHeaderLeft}>
                        <Text
                          style={[
                            styles.faqCategoryKicker,
                            {
                              color: isExpanded ? shade.dopamine : shade.muted,
                            },
                          ]}
                        >
                          {CATEGORY_LABEL_MAP[item.category].toUpperCase()}
                        </Text>
                        <Text
                          style={[styles.faqQuestion, { color: shade.text }]}
                        >
                          {item.question}
                        </Text>
                      </View>
                      <AppIcon
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={isExpanded ? shade.dopamine : shade.muted}
                      />
                    </ScalePressable>

                    {isExpanded && (
                      <View
                        style={[
                          styles.faqBody,
                          { borderTopColor: shade.border },
                        ]}
                      >
                        <View
                          style={[
                            styles.summaryBox,
                            { backgroundColor: shade.dopamineSoft },
                          ]}
                        >
                          <Text
                            style={[
                              styles.summaryKicker,
                              { color: shade.dopamine },
                            ]}
                          >
                            WHAT IT DOES
                          </Text>
                          <Text
                            style={[styles.summaryText, { color: shade.text }]}
                          >
                            {item.summary}
                          </Text>
                        </View>
                        <Text
                          style={[styles.answerText, { color: shade.muted }]}
                        >
                          {item.answer}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}

            {/* Subtle Footer Link to Replay One-Time Quick Guide */}
            <View
              style={[styles.footerBox, { borderTopColor: shade.border }]}
            >
              <Text style={[styles.footerHint, { color: shade.muted }]}>
                Want the quick visual walkthrough?
              </Text>
              <ScalePressable
                onPress={() => {
                  triggerLightHaptic();
                  onReplayQuickGuide();
                }}
                hitSlop={6}
                style={styles.replayLinkBtn}
              >
                <AppIcon name="compass" size={13} color={shade.dopamine} />
                <Text
                  style={[styles.replayLinkText, { color: shade.dopamine }]}
                >
                  Replay 4-step Quick Guide
                </Text>
              </ScalePressable>
            </View>
          </ScrollView>
    </BaseModal>
  );
};

/**
 * Searchable, categorized FAQ & App Guide modal explaining every feature in Velvet
 * and answering common user questions.
 */
export const AppGuideFaqModal: React.FC<AppGuideFaqModalProps> = (props) => {
  if (!props.visible) return null;
  return <AppGuideFaqModalContent {...props} />;
};

const styles = StyleSheet.create({
  backdrop: {
    paddingHorizontal: 16,
  },
  card: {
    maxWidth: 460,
    gap: 12,
    maxHeight: '88%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    minHeight: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 8,
  },
  clearBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsScroll: {
    flexGrow: 0,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 4,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  listScroll: {
    flexShrink: 1,
  },
  listContent: {
    gap: 9,
    paddingBottom: 6,
  },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    gap: 7,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  resetSearchBtn: {
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  resetSearchText: {
    fontSize: 12,
    fontWeight: '800',
  },
  faqCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  faqHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  faqHeaderLeft: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  faqCategoryKicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
  },
  faqBody: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 14,
    gap: 9,
  },
  summaryBox: {
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 9,
    gap: 3,
  },
  summaryKicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  answerText: {
    fontSize: 13,
    lineHeight: 19,
  },
  footerBox: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  footerHint: {
    fontSize: 11,
    fontWeight: '600',
  },
  replayLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  replayLinkText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
