import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors, theme, shadows } from '../theme';

interface Props {
  navigation: any;
  route: {
    params: {
      staffId: string;
      staffName: string;
    };
  };
}

export const StaffPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  const { staffId, staffName } = route.params;
  const { verifyStaffPassword, staffMembers } = useAuth();
  
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const staff = staffMembers.find(s => s.id === staffId);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleVerify = async () => {
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      const success = await verifyStaffPassword(staffId, password);
      if (success) {
        // Password verified - staff will be set as selected in AuthContext
        // Navigation happens automatically via AppContent
      } else {
        setError('Invalid password. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Staff Info */}
          <View style={styles.staffInfo}>
            <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{getInitials(staffName)}</Text>
            </View>
            <Text style={styles.staffName}>{staffName}</Text>
            {staff?.branchName && (
              <View style={styles.branchChip}>
                <MaterialCommunityIcons name="office-building" size={12} color={colors.textMuted} />
                <Text style={styles.branchText}>{staff.branchName}</Text>
              </View>
            )}
          </View>

          {/* Password Card */}
          <View style={[styles.card, shadows.md]}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="lock" size={24} color={colors.primary} />
              <Text style={styles.cardTitle}>Enter Your Password</Text>
            </View>
            
            <Text style={styles.cardSubtitle}>
              Please enter your individual password to access your dashboard
            </Text>

            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="lock-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!submitting}
                autoFocus
              />
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle" size={16} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.verifyButton, submitting && styles.verifyButtonDisabled]}
              onPress={handleVerify}
              disabled={submitting}
              activeOpacity={0.9}
            >
              {submitting ? (
                <ActivityIndicator color={colors.textInverse} size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons name="login" size={20} color={colors.textInverse} style={{ marginRight: 8 }} />
                  <Text style={styles.verifyButtonText}>Access Dashboard</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Hint */}
          <View style={styles.hintBox}>
            <MaterialCommunityIcons name="information" size={16} color={colors.textMuted} />
            <Text style={styles.hintText}>
              If you don't have a password, please contact your admin
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  staffInfo: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textInverse,
  },
  staffName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: theme.spacing.xs,
  },
  branchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  branchText: {
    fontSize: 13,
    color: colors.textMuted,
    marginLeft: 6,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginLeft: theme.spacing.sm,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  inputIcon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: colors.errorMuted,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md,
    minHeight: 52,
  },
  verifyButtonDisabled: {
    opacity: 0.7,
  },
  verifyButtonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  hintText: {
    fontSize: 13,
    color: colors.textMuted,
    marginLeft: 8,
    textAlign: 'center',
  },
});
