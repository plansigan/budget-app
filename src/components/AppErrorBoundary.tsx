import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { readRawPersistedState } from '../state/persistence';
import { VELVET_DARK_SHADE } from '../theme/palette';
import { shareOrDownloadText } from '../utils/backupExport';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  exporting: boolean;
  statusText: string | null;
}

/**
 * Top-level safety boundary catching unexpected render errors and offering
 * 1-tap raw local backup export + reload recovery without losing saved data.
 */
export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
    exporting: false,
    statusText: null,
  };

  static getDerivedStateFromError(error: Error): Partial<AppErrorBoundaryState> {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected rendering error',
    };
  }

  handleEmergencyExport = async () => {
    if (this.state.exporting) return;
    this.setState({ exporting: true, statusText: null });
    try {
      const raw = await readRawPersistedState();
      if (!raw) {
        this.setState({
          exporting: false,
          statusText: 'No local saved state was found on this device.',
        });
        return;
      }
      const ok = await shareOrDownloadText(
        'velvet-budget-emergency-backup.json',
        raw,
        'application/json',
        'Velvet Budget Emergency Backup (JSON)'
      );
      this.setState({
        exporting: false,
        statusText: ok
          ? 'Emergency backup exported! Your data is safe.'
          : 'Could not open share dialog.',
      });
    } catch {
      this.setState({
        exporting: false,
        statusText: 'Failed to export backup.',
      });
    }
  };

  handleReload = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.reload();
      return;
    }
    this.setState({ hasError: false, errorMessage: '', statusText: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <ScrollView
        style={{ backgroundColor: VELVET_DARK_SHADE.bg }}
        contentContainerStyle={styles.screen}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: VELVET_DARK_SHADE.card,
              borderColor: VELVET_DARK_SHADE.border,
            },
          ]}
        >
          <Text
            style={[styles.kicker, { color: VELVET_DARK_SHADE.heroPositive }]}
          >
            VELVET RECOVERY MODE
          </Text>
          <Text style={[styles.title, { color: VELVET_DARK_SHADE.text }]}>
            Something went wrong
          </Text>
          <Text style={[styles.body, { color: VELVET_DARK_SHADE.muted }]}>
            Don’t worry — your saved budget data stays stored on this device.
            Export an emergency backup first, then reload the app.
          </Text>

          {Boolean(this.state.errorMessage) && (
            <View
              style={[
                styles.errorBox,
                {
                  backgroundColor: VELVET_DARK_SHADE.bg,
                  borderColor: VELVET_DARK_SHADE.border,
                },
              ]}
            >
              <Text
                numberOfLines={3}
                style={[
                  styles.errorDetail,
                  { color: VELVET_DARK_SHADE.heroAmber },
                ]}
              >
                {this.state.errorMessage}
              </Text>
            </View>
          )}

          <Pressable
            onPress={() => {
              void this.handleEmergencyExport();
            }}
            accessibilityRole="button"
            accessibilityLabel="Export emergency backup as JSON"
            style={[
              styles.primaryBtn,
              { backgroundColor: VELVET_DARK_SHADE.positiveBtnBg },
            ]}
          >
            <Text style={styles.primaryBtnText}>
              {this.state.exporting
                ? 'Preparing Backup...'
                : 'Export Emergency Backup (JSON)'}
            </Text>
          </Pressable>

          <Pressable
            onPress={this.handleReload}
            accessibilityRole="button"
            accessibilityLabel="Reload Velvet Budget"
            style={[
              styles.secondaryBtn,
              {
                backgroundColor: VELVET_DARK_SHADE.surface,
                borderColor: VELVET_DARK_SHADE.border,
              },
            ]}
          >
            <Text
              style={[styles.secondaryBtnText, { color: VELVET_DARK_SHADE.text }]}
            >
              Reload App
            </Text>
          </Pressable>

          {this.state.statusText && (
            <Text
              style={[
                styles.statusText,
                { color: VELVET_DARK_SHADE.heroPositive },
              ]}
            >
              {this.state.statusText}
            </Text>
          )}
        </View>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderRadius: 24,
    padding: 22,
    gap: 12,
  },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  errorDetail: {
    fontSize: 11,
    fontWeight: '600',
  },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  secondaryBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
