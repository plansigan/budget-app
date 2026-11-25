import React, { useCallback, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { useGoals, useThemePrefs } from '../../context/BudgetContext';
import { getDockShadow, getWebGlassStyle } from '../../theme/tokens';
import { TabKey } from '../../utils/webHashRouter';
import {
  PillLayout,
  ScalePressable,
  SlidingIndicator,
} from '../AnimatedPrimitives';
import { AppIcon } from '../AppIcon';

interface BottomTabBarProps {
  activeTab: TabKey;
  bottomOffset: number;
  onSelectTab: (tab: TabKey) => void;
}

/**
 * Floating frosted-glass bottom dock with a spring-sliding active pill.
 */
export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  bottomOffset,
  onSelectTab,
}) => {
  const { shade } = useThemePrefs();
  const { treats } = useGoals();
  const [layouts, setLayouts] = useState<Partial<Record<TabKey, PillLayout>>>(
    {}
  );

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

  const handleTabLayout = useCallback(
    (key: TabKey) => (e: LayoutChangeEvent) => {
      const { x, width } = e.nativeEvent.layout;
      setLayouts((prev) => {
        const existing = prev[key];
        if (
          existing &&
          Math.abs(existing.x - x) < 0.5 &&
          Math.abs(existing.width - width) < 0.5
        ) {
          return prev;
        }
        return { ...prev, [key]: { x, width } };
      });
    },
    []
  );

  return (
    <View
      pointerEvents="box-none"
      style={[styles.dockWrapper, { bottom: bottomOffset }]}
    >
      <View
        accessibilityRole="tablist"
        style={[
          styles.dock,
          getDockShadow(shade),
          getWebGlassStyle(22),
          {
            backgroundColor: shade.glassBg,
            borderColor: shade.glassBorder,
          },
        ]}
      >
        <SlidingIndicator
          activeLayout={layouts[activeTab]}
          style={[
            styles.slidingPill,
            {
              backgroundColor: shade.dark
                ? 'rgba(255, 255, 255, 0.09)'
                : shade.surface,
            },
          ]}
        />
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          const color = active ? tab.activeColor : shade.muted;
          return (
            <View
              key={tab.key}
              onLayout={handleTabLayout(tab.key)}
              style={styles.tabSlot}
            >
              <ScalePressable
                onPress={() => onSelectTab(tab.key)}
                scaleTo={0.94}
                hoverScale={1.03}
                accessibilityRole="tab"
                accessibilityLabel={tab.a11yLabel}
                accessibilityState={{ selected: active }}
                style={styles.tabBtn}
              >
                <AppIcon name={tab.icon} size={17} color={color} />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.tabLabel,
                    { color, fontWeight: active ? '700' : '600' },
                  ]}
                >
                  {tab.label}
                </Text>
              </ScalePressable>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dockWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 30,
  },
  dock: {
    width: '100%',
    maxWidth: 460,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 24,
    borderWidth: 1,
    gap: 4,
    position: 'relative',
  },
  slidingPill: {
    top: 6,
    bottom: 6,
    borderRadius: 18,
  },
  tabSlot: {
    flex: 1,
  },
  tabBtn: {
    paddingVertical: 8,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 11,
  },
});
