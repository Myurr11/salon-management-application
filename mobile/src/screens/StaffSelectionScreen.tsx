import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors, theme, shadows } from '../theme';

interface Props {
  navigation: any;
}

export const StaffSelectionScreen: React.FC<Props> = ({ navigation }) => {
  const { staffMembers, setSelectedStaff, logout } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (index: number) => {
    const colors = ['#1e3a5f', '#0d9488', '#059669', '#2563eb', '#7c3aed', '#d97706'];
    return colors[index % colors.length];
  };

  const handleStaffSelect = (staffId: string) => {
    const staff = staffMembers.find(s => s.id === staffId);
    if (staff) {
      // Navigate to password verification screen
      navigation.navigate('StaffPassword', {
        staffId: staff.id,
        staffName: staff.name,
      });
    }
  };

  const handleLockDevice = () => {
    logout();
    // Navigation back to login will happen via AuthContext
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons name="account-group" size={32} color={colors.primary} />
          </View>
          <Text style={styles.headerTitle}>Select Staff Member</Text>
          <Text style={styles.headerSubtitle}>Who is using the tablet?</Text>
        </View>

        {/* Staff Grid */}
        <ScrollView contentContainerStyle={styles.gridContainer}>
          <View style={styles.grid}>
            {staffMembers.map((staff, index) => (
              <TouchableOpacity
                key={staff.id}
                style={[styles.staffCard, shadows.sm]}
                onPress={() => handleStaffSelect(staff.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.avatarCircle, { backgroundColor: getAvatarColor(index) }]}>
                  <Text style={styles.avatarText}>{getInitials(staff.name)}</Text>
                </View>
                <Text style={styles.staffName} numberOfLines={2}>
                  {staff.name}
                </Text>
                {staff.branchName && (
                  <View style={styles.branchChip}>
                    <MaterialCommunityIcons name="office-building" size={10} color={colors.textMuted} />
                    <Text style={styles.branchText} numberOfLines={1}>
                      {staff.branchName}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Lock Device Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.lockButton}
            onPress={handleLockDevice}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="lock" size={20} color={colors.textInverse} />
            <Text style={styles.lockButtonText}>Lock Device</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  header: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  gridContainer: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  staffCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textInverse,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  branchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
  },
  branchText: {
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: 4,
  },
  footer: {
    padding: theme.spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  lockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    paddingVertical: 14,
    borderRadius: theme.radius.lg,
    gap: 8,
  },
  lockButtonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
});
