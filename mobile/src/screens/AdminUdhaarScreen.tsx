import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import type { UdhaarBalance } from '../types';

interface Props {
  navigation: any;
}

export const AdminUdhaarScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { branches, getUdhaarBalances, addUdhaarPayment } = useData();
  const [balances, setBalances] = useState<UdhaarBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [payingBalance, setPayingBalance] = useState<UdhaarBalance | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const loadBalances = async () => {
    setLoading(true);
    try {
      const list = await getUdhaarBalances(
        selectedBranchId ? { branchId: selectedBranchId } : undefined,
      );
      setBalances(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBalances();
  }, [selectedBranchId, getUdhaarBalances]);

  if (!user || user.role !== 'admin') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Admin access required.</Text>
      </View>
    );
  }

  const totalOutstanding = balances.reduce((sum, b) => sum + b.outstandingAmount, 0);

  const handlePay = (balance: UdhaarBalance) => {
    setPayingBalance(balance);
    setPaymentAmount('');
    setPaymentNotes('');
    setModalVisible(true);
  };

  const submitPayment = async () => {
    if (!payingBalance) return;
    const amount = Number(paymentAmount.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid payment amount.');
      return;
    }
    if (amount > payingBalance.outstandingAmount) {
      Alert.alert('Too high', 'Payment cannot exceed outstanding amount.');
      return;
    }
    try {
      await addUdhaarPayment(
        payingBalance.customerId,
        payingBalance.branchId,
        amount,
        paymentNotes.trim() || undefined,
      );
      setModalVisible(false);
      setPayingBalance(null);
      loadBalances();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to record payment.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Udhaar (Credit)</Text>
        <Text style={styles.totalOutstanding}>Total outstanding: ₹{totalOutstanding.toFixed(0)}</Text>
      </View>

      {branches.length > 1 && (
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, !selectedBranchId ? styles.filterChipActive : null]}
            onPress={() => setSelectedBranchId(null)}
          >
            <Text style={styles.filterChipText}>All</Text>
          </TouchableOpacity>
          {branches.map(b => (
            <TouchableOpacity
              key={b.id}
              style={[styles.filterChip, selectedBranchId === b.id ? styles.filterChipActive : null]}
              onPress={() => setSelectedBranchId(b.id)}
            >
              <Text style={styles.filterChipText}>{b.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : balances.length === 0 ? (
        <Text style={styles.emptyText}>No udhaar balances.</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {balances.map(b => (
            <View key={b.id} style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.customerName}>{b.customerName || b.customerId}</Text>
                <Text style={styles.amount}>₹{b.outstandingAmount.toFixed(0)}</Text>
              </View>
              {b.branchName && (
                <Text style={styles.branchName}>Branch: {b.branchName}</Text>
              )}
              {b.dueDate && (
                <Text style={styles.dueDate}>Due: {new Date(b.dueDate).toLocaleDateString('en-IN')}</Text>
              )}
              <TouchableOpacity style={styles.payButton} onPress={() => handlePay(b)}>
                <Text style={styles.payButtonText}>Record Payment</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Record payment</Text>
            {payingBalance && (
              <Text style={styles.modalCustomer}>{payingBalance.customerName}</Text>
            )}
            <TextInput
              placeholder="Amount (₹)"
              placeholderTextColor="#6b7280"
              style={styles.input}
              keyboardType="numeric"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
            />
            <TextInput
              placeholder="Notes (optional)"
              placeholderTextColor="#6b7280"
              style={styles.input}
              value={paymentNotes}
              onChangeText={setPaymentNotes}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setModalVisible(false);
                  setPayingBalance(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={submitPayment}>
                <Text style={styles.submitButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', paddingTop: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#ef4444', fontSize: 16 },
  header: { paddingHorizontal: 20, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: 'white', marginBottom: 4 },
  totalOutstanding: { fontSize: 14, color: '#f97316', fontWeight: '600' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 12, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  filterChipActive: { backgroundColor: '#22c55e33', borderColor: '#22c55e' },
  filterChipText: { color: '#e5e7eb', fontSize: 13 },
  loadingText: { color: '#9ca3af', textAlign: 'center', marginTop: 24 },
  emptyText: { color: '#6b7280', textAlign: 'center', marginTop: 24 },
  list: { paddingHorizontal: 20, paddingBottom: 32 },
  card: {
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  customerName: { fontSize: 16, fontWeight: '600', color: 'white' },
  amount: { fontSize: 18, fontWeight: '700', color: '#f97316' },
  branchName: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  dueDate: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  payButton: {
    marginTop: 12,
    backgroundColor: '#22c55e',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  payButtonText: { color: 'white', fontWeight: '600', fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: { backgroundColor: '#111827', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#1f2937' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: 'white', marginBottom: 4 },
  modalCustomer: { fontSize: 14, color: '#9ca3af', marginBottom: 16 },
  input: {
    backgroundColor: '#020617',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: 'white',
    fontSize: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', backgroundColor: '#1f2937' },
  cancelButtonText: { color: '#9ca3af', fontWeight: '600' },
  submitButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', backgroundColor: '#22c55e' },
  submitButtonText: { color: 'white', fontWeight: '600' },
});
