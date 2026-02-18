import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';

interface Props {
  navigation: any;
}

export const RoleSelectionScreen: React.FC<Props> = ({ navigation }) => {
  const { setUser, staffMembers, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading...</Text>
      </View>
    );
  }

  const handleSelectAdmin = () => {
    setUser({ id: 'admin-1', name: 'Owner', role: 'admin' });
    navigation.replace('AdminStack');
  };

  const handleSelectStaff = (staffId: string) => {
    const staff = staffMembers.find(s => s.id === staffId);
    if (!staff) return;
    setUser({ id: staff.id, name: staff.name, role: 'staff' });
    navigation.replace('StaffStack');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Salon Manager</Text>
      <Text style={styles.subtitle}>Choose how you want to continue</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Admin</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={handleSelectAdmin}>
          <Text style={styles.primaryButtonText}>Continue as Admin</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Staff</Text>
        {staffMembers.map(staff => (
          <TouchableOpacity
            key={staff.id}
            style={styles.secondaryButton}
            onPress={() => handleSelectStaff(staff.id)}
          >
            <Text style={styles.secondaryButtonText}>{staff.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    backgroundColor: '#0f172a',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#111827',
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  secondaryButtonText: {
    color: '#e5e7eb',
    fontSize: 15,
    fontWeight: '500',
  },
});

