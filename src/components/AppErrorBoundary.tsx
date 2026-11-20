import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { readRawPersistedState } from '../state/persistence';
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
      <View style={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.kicker}>VELVET RECOVERY MODE</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            Don’t worry — your saved budget data stays stored on this device. Export an emergency backup first, then reload the app.
          </Text>

          {Boolean(this.state.errorMessage) && (
            <View style={styles.errorBox}>
              <Text numberOfLines={3} style={styles.errorDetail}>
                {this.state.errorMessage}
              </Text>
            </View>
          )}

          <Pressable
            onPress={() => {
              void this.handleEmergencyExport();
            }}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>
              {this.state.exporting
                ? 'Preparing Backup...'
                : 'Export Emergency Backup (JSON)'}
            </Text>
          </Pressable>

          <Pressable onPress={this.handleReload} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>Reload App</Text>
          </Pressable>

          {this.state.statusText && (
            <Text style={styles.statusText}>{this.state.statusText}</Text>
          )}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0B0C10',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#15171F',
    borderColor: '#262A36',
    borderWidth: 1,
    borderRadius: 24,
    padding: 22,
    gap: 12,
  },
  kicker: {
    color: '#22C55E',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  title: {
    color: '#F5F7FA',
    fontSize: 20,
    fontWeight: '800',
  },
  body: {
    color: '#A1A7B5',
    fontSize: 13,
    lineHeight: 19,
  },
  errorBox: {
    backgroundColor: '#0E1016',
    borderColor: '#262A36',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  errorDetail: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: '#22C55E',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    color: '#07140D',
    fontSize: 13,
    fontWeight: '800',
  },
  secondaryBtn: {
    backgroundColor: '#1E212B',
    borderColor: '#2E3342',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#F5F7FA',
    fontSize: 13,
    fontWeight: '700',
  },
  statusText: {
    color: '#4ADE80',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
