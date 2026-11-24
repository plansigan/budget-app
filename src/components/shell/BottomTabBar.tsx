import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useGoals, useThemePrefs } from '../../context/BudgetContext';
import { TabKey } from '../../utils/webHashRouter';
import { ScalePressable } from '../AnimatedPrimitives';
import { AppIcon } from '../AppIcon';

interface BottomTabBarProps {
  activeTab: TabKey;
  paddingBottom: number;
  onSelectTab: (tab: TabKey) => void;
}

/**
 * Bottom 4-tab navigation bar isolated from AppShell so Goals updates don't re-render the shell.
 */
export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  paddingBottom,
  onSelectTab,
}) => {
  const { shade } = useThemePrefs();
  const { treats } = useGoals();

  const tabs: Array<{
    key: TabKey;
    label: string;
    icon: string;
    activeColor: string;
    a11yLabel: string;
  }> = [
    {
      key: 'today',
      label: 'Today',
      icon: 'home',
      activeColor: shade.accent,
      a11yLabel: 'Today tab',
    },
    {
      key: 'wallet',
      label: 'Wallet',
      icon: 'credit-card',
      activeColor: shade.positive,
      a11yLabel: 'Wallet tab',
    },
    {
      key: 'vault',
      label: 'Goals',
      icon: 'target',
      activeColor: shade.dopamine,
      a11yLabel: `Goals tab, ${treats.length} of 3 treats`,
    },
    {
      key: 'setup',
      label: 'Budget',
      icon: 'sliders',
      activeColor: shade.accent,
      a11yLabel: 'Budget setup tab',
    },
  ];

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.tabBar,
        {
          backgroundColor: shade.card,
          borderTopColor: shade.border,
          paddingBottom,
        },
      ]}
    >
      {tabs.map((tab) => {
        const active = activeTab === tab.key;
        const color = active ? tab.activeColor : shade.muted;
        return (
          <ScalePressable
            key={tab.key}
            onPress={() => onSelectTab(tab.key)}
            accessibilityRole="tab"
            accessibilityLabel={tab.a11yLabel}
            accessibilityState={{ selected: active }}
            style={[
              styles.tabBtn,
              active && { backgroundColor: shade.surface },
            ]}
          >
            <AppIcon name={tab.icon} size={16} color={color} />
            <Text numberOfLines={1} style={[styles.tabLabel, { color }]}>
              {tab.label}
            </Text>
          </ScalePressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
});
