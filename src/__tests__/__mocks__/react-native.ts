export const Platform = {
  OS: 'ios',
  select: <T>(options: { ios?: T; android?: T; web?: T; default?: T }): T | undefined =>
    options.ios ?? options.default,
};

export const Share = {
  share: async (_content: { message: string; title?: string }) => ({
    action: 'sharedAction',
  }),
};

export const StyleSheet = {
  create: <T extends Record<string, unknown>>(styles: T): T => styles,
  hairlineWidth: 1,
};

export const AppState = {
  currentState: 'active',
  addEventListener: () => ({ remove: () => {} }),
};

export const useColorScheme = (): 'light' | 'dark' | null => 'light';

export default {
  Platform,
  Share,
  StyleSheet,
  AppState,
  useColorScheme,
};
