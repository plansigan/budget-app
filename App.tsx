import React, {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import { AppHeader } from './src/components/shell/AppHeader';
import { BottomTabBar } from './src/components/shell/BottomTabBar';
import { ToastOverlay } from './src/components/shell/ToastOverlay';

const AppGuideFaqModal = lazy(() =>
  import('./src/components/AppGuideFaqModal').then((m) => ({
    default: m.AppGuideFaqModal,
  }))
);
const InteractiveTutorialModal = lazy(() =>
  import('./src/components/InteractiveTutorialModal').then((m) => ({
    default: m.InteractiveTutorialModal,
  }))
);
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
import { FONT_FAMILY } from './src/theme/tokens';
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
    if (!document.getElementById('velvet-web-font')) {
      const link = document.createElement('link');
      link.id = 'velvet-web-font';
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
      document.head.appendChild(link);
    }
    if (!document.getElementById('velvet-web-polish')) {
      const style = document.createElement('style');
      style.id = 'velvet-web-polish';
      style.textContent = [
        'input:focus:not(:focus-visible), textarea:focus:not(:focus-visible) { outline: none !important; box-shadow: none !important; }',
        '@supports (-webkit-touch-callout: none) { input, textarea, select { font-size: 16px !important; } }',
        'html, body { height: 100%; margin: 0; padding: 0; font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; -webkit-font-smoothing: antialiased; }',
        'body { padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); box-sizing: border-box; transition: background-color 220ms ease; }',
        '::-webkit-scrollbar { width: 6px; height: 6px; }',
        '::-webkit-scrollbar-track { background: transparent; }',
        '::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.22); border-radius: 999px; }',
        '::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,0.36); }',
      ].join('\n');
      document.head.appendChild(style);
    }
    document.body.style.backgroundColor = shade.bg;
  }, [shade.bg]);

  const isDesktopWeb = Platform.OS === 'web' && width > 560;
  const headerTopPad = isDesktopWeb ? 18 : Math.max(insets.top, 12);
  const tabBottomPad = isDesktopWeb ? 18 : Math.max(insets.bottom, 12);

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
              borderColor: shade.border,
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
        <ToastOverlay bottomOffset={tabBottomPad + 72} />

        <FadeSlideIn
          triggerKey={activeTab}
          direction="up"
          distance={8}
          withScale
          style={[
            styles.body,
            isDesktopWeb && styles.bodyDesktop,
          ]}
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
        bottomOffset={tabBottomPad}
        onSelectTab={switchTab}
      />

      {!hasSeenTutorial && (
        <Suspense fallback={null}>
          <InteractiveTutorialModal />
        </Suspense>
      )}
      {showFaq && (
        <Suspense fallback={null}>
          <AppGuideFaqModal
            visible={showFaq}
            onClose={() => setShowFaq(false)}
            onReplayQuickGuide={() => {
              setShowFaq(false);
              openTutorial();
            }}
          />
        </Suspense>
      )}
      <AchievementModal onNavigateTab={(tab) => switchTab(tab)} />
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.webCanvas, { backgroundColor: shade.bg }]}>
        <View style={styles.webColumn}>{innerContent}</View>
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
  webCanvas: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  webColumn: {
    flex: 1,
    width: '100%',
    maxWidth: 560,
    position: 'relative',
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
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
    fontFamily: FONT_FAMILY,
  },
  updateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
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
    fontWeight: '700',
  },
  updateActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  updateRefreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  updateRefreshText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  updateDismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
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
    paddingTop: 10,
  },
  bodyDesktop: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  tabPane: {
    flex: 1,
  },
  tabPaneHidden: {
    display: 'none',
  },
});
