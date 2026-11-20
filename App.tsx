import React, { useEffect, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AchievementModal } from './src/components/AchievementModal';
import {
  FadeSlideIn,
  ScalePressable,
} from './src/components/AnimatedPrimitives';
import { AppIcon } from './src/components/AppIcon';
import { InteractiveTutorialModal } from './src/components/InteractiveTutorialModal';
import { BudgetProvider, useBudget } from './src/context/BudgetContext';
import { ToastProvider, useToast } from './src/context/ToastContext';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { SetupAndStyleScreen } from './src/screens/SetupAndStyleScreen';
import { TodayScreen } from './src/screens/TodayScreen';
import { TreatVaultScreen } from './src/screens/TreatVaultScreen';
import { WalletScreen } from './src/screens/WalletScreen';
import { triggerLightHaptic } from './src/utils/haptics';

type TabKey = 'today' | 'wallet' | 'vault' | 'setup';

const ToastOverlay: React.FC = () => {
  const { shade } = useBudget();
  const { toast, dismissToast } = useToast();

  if (!toast) return null;

  return (
    <View pointerEvents="box-none" style={styles.toastFloatWrap}>
      <FadeSlideIn triggerKey={toast.id} direction="up" distance={14}>
        <ScalePressable
          onPress={dismissToast}
          scaleTo={0.97}
          accessibilityLabel={toast.text}
          style={[
            styles.toastBanner,
            {
              backgroundColor: toast.isDopamine ? shade.heroBg : shade.card,
              borderColor: toast.isDopamine ? shade.heroBorder : shade.border,
            },
          ]}
        >
          <Text
            style={[
              styles.toastText,
              {
                color: toast.isDopamine ? shade.heroText : shade.text,
              },
            ]}
          >
            {toast.text}
          </Text>
        </ScalePressable>
      </FadeSlideIn>
    </View>
  );
};

const AppShell: React.FC = () => {
  const {
    isHydrated,
    hasCompletedOnboarding,
    hasSeenTutorial,
    privacyMode,
    togglePrivacyMode,
    shade,
    streakDays,
    bufferShields,
    treats,
    openTutorial,
  } = useBudget();
  const [activeTab, setActiveTab] = useState<TabKey>('today');
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (hasCompletedOnboarding) {
      setActiveTab('today');
    }
  }, [hasCompletedOnboarding]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    if (!document.getElementById('velvet-web-polish')) {
      const style = document.createElement('style');
      style.id = 'velvet-web-polish';
      style.textContent = [
        'input:focus, textarea:focus { outline: none !important; box-shadow: none !important; }',
        'html, body { height: 100%; margin: 0; padding: 0; }',
        'body { padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); box-sizing: border-box; }',
      ].join('\n');
      document.head.appendChild(style);
    }
    document.body.style.backgroundColor = shade.dark ? '#06070A' : shade.bg;
  }, [shade.bg, shade.dark]);

  const isDesktopWeb = Platform.OS === 'web' && width > 500;
  const headerTopPad = isDesktopWeb ? 12 : Math.max(insets.top, 12);
  const tabBottomPad = isDesktopWeb ? 10 : Math.max(insets.bottom, 10);

  const switchTab = (tab: TabKey) => {
    triggerLightHaptic();
    setActiveTab(tab);
  };

  const statusBarStyle = shade.dark ? 'light' : 'dark';

  const innerContent = !isHydrated ? (
    <View style={[styles.safeArea, { backgroundColor: shade.bg }]}>
      <StatusBar style={statusBarStyle} />
    </View>
  ) : !hasCompletedOnboarding ? (
    <View style={[styles.safeArea, { backgroundColor: shade.bg }]}>
      <StatusBar style={statusBarStyle} />
      <OnboardingScreen />
    </View>
  ) : (
    <View style={[styles.safeArea, { backgroundColor: shade.bg }]}>
      <StatusBar style={statusBarStyle} />

      {/* Top Minimalist Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: shade.card,
            borderBottomColor: shade.border,
            paddingTop: headerTopPad,
          },
        ]}
      >
        <View>
          <Text style={[styles.brandTitle, { color: shade.text }]}>
            velvet
          </Text>
          <Text style={[styles.brandSub, { color: shade.muted }]}>
            Simple Budget • PHP (₱)
          </Text>
        </View>

        <View style={styles.headerPills}>
          <ScalePressable
            onPress={togglePrivacyMode}
            accessibilityLabel={privacyMode ? 'Show amounts' : 'Hide amounts'}
            hitSlop={6}
            style={[
              styles.statusPill,
              { backgroundColor: shade.surface, borderColor: shade.border },
            ]}
          >
            <AppIcon
              name={privacyMode ? 'eye-off' : 'eye'}
              size={14}
              color={shade.text}
            />
          </ScalePressable>
          <ScalePressable
            onPress={() => {
              setActiveTab('today');
              openTutorial();
            }}
            accessibilityLabel="Open App Guide"
            hitSlop={4}
            style={[
              styles.statusPill,
              { backgroundColor: shade.surface, borderColor: shade.border },
            ]}
          >
            <AppIcon name="help-circle" size={13} color={shade.dopamine} />
            <Text style={[styles.statusText, { color: shade.dopamine }]}>
              Guide
            </Text>
          </ScalePressable>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: shade.surface, borderColor: shade.border },
            ]}
          >
            <AppIcon name="zap" size={13} color={shade.text} />
            <Text style={[styles.statusText, { color: shade.text }]}>
              {streakDays}d
            </Text>
          </View>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: shade.surface, borderColor: shade.border },
            ]}
          >
            <AppIcon name="shield" size={13} color={shade.positive} />
            <Text style={[styles.statusText, { color: shade.positive }]}>
              {bufferShields}
            </Text>
          </View>
        </View>
      </View>

      {/* Main Content + Floating Toast Overlay (zero layout shift) */}
      <View style={styles.contentWrap}>
        <ToastOverlay />

        <FadeSlideIn
          triggerKey={activeTab}
          direction="up"
          distance={10}
          style={styles.body}
        >
          {activeTab === 'today' && (
            <TodayScreen
              onOpenVault={() => switchTab('vault')}
              onOpenBudgetSetup={() => switchTab('setup')}
            />
          )}
          {activeTab === 'wallet' && <WalletScreen />}
          {activeTab === 'vault' && <TreatVaultScreen />}
          {activeTab === 'setup' && <SetupAndStyleScreen />}
        </FadeSlideIn>
      </View>

      {/* Bottom 4-Tab Thumb Pill Navigation */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: shade.card,
            borderTopColor: shade.border,
            paddingBottom: tabBottomPad,
          },
        ]}
      >
        <ScalePressable
          onPress={() => switchTab('today')}
          accessibilityRole="tab"
          accessibilityLabel="Today tab"
          accessibilityState={{ selected: activeTab === 'today' }}
          style={[
            styles.tabBtn,
            activeTab === 'today' && { backgroundColor: shade.surface },
          ]}
        >
          <AppIcon
            name="home"
            size={16}
            color={activeTab === 'today' ? shade.accent : shade.muted}
          />
          <Text
            numberOfLines={1}
            style={[
              styles.tabLabel,
              { color: activeTab === 'today' ? shade.accent : shade.muted },
            ]}
          >
            Today
          </Text>
        </ScalePressable>

        <ScalePressable
          onPress={() => switchTab('wallet')}
          accessibilityRole="tab"
          accessibilityLabel="Wallet tab"
          accessibilityState={{ selected: activeTab === 'wallet' }}
          style={[
            styles.tabBtn,
            activeTab === 'wallet' && { backgroundColor: shade.surface },
          ]}
        >
          <AppIcon
            name="credit-card"
            size={16}
            color={activeTab === 'wallet' ? shade.positive : shade.muted}
          />
          <Text
            numberOfLines={1}
            style={[
              styles.tabLabel,
              { color: activeTab === 'wallet' ? shade.positive : shade.muted },
            ]}
          >
            Wallet
          </Text>
        </ScalePressable>

        <ScalePressable
          onPress={() => switchTab('vault')}
          accessibilityRole="tab"
          accessibilityLabel={`Goals tab, ${treats.length} of 3 treats`}
          accessibilityState={{ selected: activeTab === 'vault' }}
          style={[
            styles.tabBtn,
            activeTab === 'vault' && { backgroundColor: shade.surface },
          ]}
        >
          <AppIcon
            name="target"
            size={16}
            color={activeTab === 'vault' ? shade.dopamine : shade.muted}
          />
          <Text
            numberOfLines={1}
            style={[
              styles.tabLabel,
              { color: activeTab === 'vault' ? shade.dopamine : shade.muted },
            ]}
          >
            Goals ({treats.length}/3)
          </Text>
        </ScalePressable>

        <ScalePressable
          onPress={() => switchTab('setup')}
          accessibilityRole="tab"
          accessibilityLabel="Budget setup tab"
          accessibilityState={{ selected: activeTab === 'setup' }}
          style={[
            styles.tabBtn,
            activeTab === 'setup' && { backgroundColor: shade.surface },
          ]}
        >
          <AppIcon
            name="sliders"
            size={16}
            color={activeTab === 'setup' ? shade.accent : shade.muted}
          />
          <Text
            numberOfLines={1}
            style={[
              styles.tabLabel,
              { color: activeTab === 'setup' ? shade.accent : shade.muted },
            ]}
          >
            Budget
          </Text>
        </ScalePressable>
      </View>

      {!hasSeenTutorial && <InteractiveTutorialModal />}
      <AchievementModal onNavigateTab={(tab) => switchTab(tab)} />
    </View>
  );

  if (isDesktopWeb) {
    return (
      <View
        style={[
          styles.webBackdrop,
          { backgroundColor: shade.dark ? '#06070A' : '#EDEFF2' },
        ]}
      >
        <View
          style={[
            styles.webPhoneShell,
            { backgroundColor: shade.bg, borderColor: shade.border },
          ]}
        >
          {innerContent}
        </View>
      </View>
    );
  }

  return innerContent;
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <BudgetProvider>
          <AppShell />
        </BudgetProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  webBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  webPhoneShell: {
    width: '100%',
    maxWidth: 420,
    height: '100%',
    maxHeight: 840,
    borderRadius: 36,
    borderWidth: 2,
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  brandSub: {
    fontSize: 11,
    fontWeight: '600',
  },
  headerPills: {
    flexDirection: 'row',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  contentWrap: {
    flex: 1,
    position: 'relative',
  },
  toastFloatWrap: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    zIndex: 40,
  },
  toastBanner: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#111318',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  toastText: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
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
