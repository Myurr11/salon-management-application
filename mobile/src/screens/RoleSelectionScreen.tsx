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
    setUser({ id: staff.id, name: staff.name, role: 'staff', branchId: staff.branchId });
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
    backgroundColor: '#F7F9FB',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#191C1E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#707A6F',
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#191C1E',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#166534',
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
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8EAEC',
  },
  secondaryButtonText: {
    color: '#191C1E',
    fontSize: 15,
    fontWeight: '500',
  },
});

