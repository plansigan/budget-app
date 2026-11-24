import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
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
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { AppIcon } from './src/components/AppIcon';
import { AppGuideFaqModal } from './src/components/AppGuideFaqModal';
import { InteractiveTutorialModal } from './src/components/InteractiveTutorialModal';
import { AppHeader } from './src/components/shell/AppHeader';
import { BottomTabBar } from './src/components/shell/BottomTabBar';
import { ToastOverlay } from './src/components/shell/ToastOverlay';
import {
  BudgetProvider,
  useBudgetActions,
  useSystemStatus,
  useThemePrefs,
} from './src/context/BudgetContext';
import { ToastProvider } from './src/context/ToastContext';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { SetupAndStyleScreen } from './src/screens/SetupAndStyleScreen';
import { TodayScreen } from './src/screens/TodayScreen';
import { TreatVaultScreen } from './src/screens/TreatVaultScreen';
import { WalletScreen } from './src/screens/WalletScreen';
import { triggerLightHaptic } from './src/utils/haptics';
import { usePwaUpdate } from './src/utils/usePwaUpdate';
import {
  HashRoute,
  TabKey,
  buildWebHash,
  parseWebHashRoute,
} from './src/utils/webHashRouter';

const AppShell: React.FC = () => {
  const { isHydrated, hasCompletedOnboarding, hasSeenTutorial } =
    useSystemStatus();
  const { shade } = useThemePrefs();
  const { openTutorial } = useBudgetActions();
  const { pwaUpdateReady, dismissUpdate, reloadForUpdate } = usePwaUpdate();

  const initialRoute = useMemo<HashRoute>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return parseWebHashRoute(window.location.hash);
    }
    return { tab: 'today', walletAccountId: null };
  }, []);

  const [activeTab, setActiveTab] = useState<TabKey>(initialRoute.tab);
  const [walletAccountId, setWalletAccountId] = useState<string | null>(
    initialRoute.walletAccountId
  );
  const [mountedTabs, setMountedTabs] = useState<Record<TabKey, boolean>>(() => ({
    today: true,
    wallet: initialRoute.tab === 'wallet',
    vault: initialRoute.tab === 'vault',
    setup: initialRoute.tab === 'setup',
  }));
  const [focusAllowancesKey, setFocusAllowancesKey] = useState(0);
  const [focusDebtsKey, setFocusDebtsKey] = useState(0);
  const [showFaq, setShowFaq] = useState(false);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wasIncompleteAfterHydrationRef = useRef(false);

  useEffect(() => {
    if (!isHydrated) return;
    if (!hasCompletedOnboarding) {
      wasIncompleteAfterHydrationRef.current = true;
      setActiveTab('today');
      setWalletAccountId(null);
      setMountedTabs({ today: true, wallet: false, vault: false, setup: false });
      return;
    }
    if (wasIncompleteAfterHydrationRef.current) {
      wasIncompleteAfterHydrationRef.current = false;
      setActiveTab('today');
      setWalletAccountId(null);
      setMountedTabs({ today: true, wallet: false, vault: false, setup: false });
      if (
        Platform.OS === 'web' &&
        typeof window !== 'undefined' &&
        window.location.hash !== '#today'
      ) {
        window.location.hash = '#today';
      }
    }
  }, [isHydrated, hasCompletedOnboarding]);

  useEffect(() => {
    if (
      Platform.OS !== 'web' ||
      typeof window === 'undefined' ||
      typeof window.addEventListener !== 'function'
    ) {
      return;
    }
    const handleHashChange = () => {
      const route = parseWebHashRoute(window.location.hash);
      setActiveTab(route.tab);
      setWalletAccountId(route.walletAccountId);
      setMountedTabs((prev) =>
        prev[route.tab] ? prev : { ...prev, [route.tab]: true }
      );
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    if (!document.getElementById('velvet-web-polish')) {
      const style = document.createElement('style');
      style.id = 'velvet-web-polish';
      style.textContent = [
        'input:focus:not(:focus-visible), textarea:focus:not(:focus-visible) { outline: none !important; box-shadow: none !important; }',
        '@supports (-webkit-touch-callout: none) { input, textarea, select { font-size: 16px !important; } }',
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

  const syncWebHash = useCallback(
    (tab: TabKey, accountId: string | null) => {
      if (
        Platform.OS !== 'web' ||
        typeof window === 'undefined' ||
        !isHydrated ||
        !hasCompletedOnboarding
      ) {
        return;
      }
      const nextHash = buildWebHash(tab, accountId);
      if (window.location.hash !== nextHash) {
        window.location.hash = nextHash;
      }
    },
    [isHydrated, hasCompletedOnboarding]
  );

  const switchTab = useCallback(
    (tab: TabKey, nextAccountId?: string | null) => {
      triggerLightHaptic();
      const resolvedAccountId =
        nextAccountId !== undefined ? nextAccountId : walletAccountId;
      if (nextAccountId !== undefined) {
        setWalletAccountId(nextAccountId);
      }
      setActiveTab(tab);
      setMountedTabs((prev) => (prev[tab] ? prev : { ...prev, [tab]: true }));
      syncWebHash(tab, tab === 'wallet' ? resolvedAccountId : null);
    },
    [syncWebHash, walletAccountId]
  );

  const handleSelectWalletAccount = useCallback(
    (accountId: string | null) => {
      setWalletAccountId(accountId);
      if (activeTab === 'wallet') {
        syncWebHash('wallet', accountId);
      }
    },
    [activeTab, syncWebHash]
  );

  useEffect(() => {
    if (
      !isHydrated ||
      !hasCompletedOnboarding ||
      typeof BackHandler?.addEventListener !== 'function'
    ) {
      return;
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showFaq) {
        setShowFaq(false);
        return true;
      }
      if (activeTab === 'wallet' && walletAccountId !== null) {
        handleSelectWalletAccount(null);
        return true;
      }
      if (activeTab !== 'today') {
        switchTab('today');
        return true;
      }
      return false;
    });
    return () => {
      subscription.remove();
    };
  }, [
    isHydrated,
    hasCompletedOnboarding,
    showFaq,
    activeTab,
    walletAccountId,
    handleSelectWalletAccount,
    switchTab,
  ]);

  const statusBarStyle = shade.dark ? 'light' : 'dark';

  const innerContent = !isHydrated ? (
    <View
      style={[
        styles.safeArea,
        styles.loadingShell,
        { backgroundColor: shade.bg },
      ]}
    >
      <StatusBar style={statusBarStyle} />
      <Text style={[styles.loadingBrand, { color: shade.text }]}>velvet</Text>
      <ActivityIndicator size="small" color={shade.muted} />
    </View>
  ) : !hasCompletedOnboarding ? (
    <View style={[styles.safeArea, { backgroundColor: shade.bg }]}>
      <StatusBar style={statusBarStyle} />
      <OnboardingScreen />
    </View>
  ) : (
    <View style={[styles.safeArea, { backgroundColor: shade.bg }]}>
      <StatusBar style={statusBarStyle} />

      <AppHeader paddingTop={headerTopPad} onOpenFaq={() => setShowFaq(true)} />

      {pwaUpdateReady && (
        <View
          style={[
            styles.updateBanner,
            {
              backgroundColor: shade.card,
              borderBottomColor: shade.border,
            },
          ]}
        >
          <View style={styles.updateLeft}>
            <AppIcon name="refresh-cw" size={13} color={shade.positive} />
            <Text style={[styles.updateText, { color: shade.text }]}>
              New Velvet update ready
            </Text>
          </View>
          <View style={styles.updateActions}>
            <ScalePressable
              onPress={() => {
                triggerLightHaptic();
                reloadForUpdate();
              }}
              accessibilityLabel="Refresh app for new update"
              style={[
                styles.updateRefreshBtn,
                { backgroundColor: shade.positiveBtnBg },
              ]}
            >
              <Text style={styles.updateRefreshText}>Refresh</Text>
            </ScalePressable>
            <ScalePressable
              onPress={() => {
                triggerLightHaptic();
                dismissUpdate();
              }}
              accessibilityLabel="Dismiss update notification"
              hitSlop={6}
              style={[
                styles.updateDismissBtn,
                { backgroundColor: shade.surface },
              ]}
            >
              <AppIcon name="x" size={13} color={shade.muted} />
            </ScalePressable>
          </View>
        </View>
      )}

      <View style={styles.contentWrap}>
        <ToastOverlay />

        <FadeSlideIn
          triggerKey={activeTab}
          direction="up"
          distance={10}
          style={styles.body}
        >
          {mountedTabs.today && (
            <View
              style={[
                styles.tabPane,
                activeTab !== 'today' && styles.tabPaneHidden,
              ]}
            >
              <TodayScreen
                onOpenVault={() => switchTab('vault')}
                onOpenBudgetSetup={() => switchTab('setup')}
                onOpenBills={() => switchTab('setup')}
                onOpenAllowances={() => {
                  setFocusAllowancesKey((k) => k + 1);
                  switchTab('setup');
                }}
                onOpenDebts={() => {
                  setFocusDebtsKey((k) => k + 1);
                  switchTab('wallet', null);
                }}
              />
            </View>
          )}
          {mountedTabs.wallet && (
            <View
              style={[
                styles.tabPane,
                activeTab !== 'wallet' && styles.tabPaneHidden,
              ]}
            >
              <WalletScreen
                focusDebtsKey={focusDebtsKey}
                selectedAccountId={walletAccountId}
                onSelectAccount={handleSelectWalletAccount}
              />
            </View>
          )}
          {mountedTabs.vault && (
            <View
              style={[
                styles.tabPane,
                activeTab !== 'vault' && styles.tabPaneHidden,
              ]}
            >
              <TreatVaultScreen />
            </View>
          )}
          {mountedTabs.setup && (
            <View
              style={[
                styles.tabPane,
                activeTab !== 'setup' && styles.tabPaneHidden,
              ]}
            >
              <SetupAndStyleScreen
                focusAllowancesKey={focusAllowancesKey}
                onOpenFaq={() => {
                  triggerLightHaptic();
                  setShowFaq(true);
                }}
              />
            </View>
          )}
        </FadeSlideIn>
      </View>

      <BottomTabBar
        activeTab={activeTab}
        paddingBottom={tabBottomPad}
        onSelectTab={switchTab}
      />

      {!hasSeenTutorial && <InteractiveTutorialModal />}
      <AppGuideFaqModal
        visible={showFaq}
        onClose={() => setShowFaq(false)}
        onReplayQuickGuide={() => {
          setShowFaq(false);
          openTutorial();
        }}
      />
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
      <AppErrorBoundary>
        <ToastProvider>
          <BudgetProvider>
            <AppShell />
          </BudgetProvider>
        </ToastProvider>
      </AppErrorBoundary>
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
  loadingShell: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingBrand: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  updateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderBottomWidth: 1,
    gap: 10,
  },
  updateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  updateText: {
    fontSize: 12,
    fontWeight: '800',
  },
  updateActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  updateRefreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9,
  },
  updateRefreshText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  updateDismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentWrap: {
    flex: 1,
    position: 'relative',
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  tabPane: {
    flex: 1,
  },
  tabPaneHidden: {
    display: 'none',
  },
});
