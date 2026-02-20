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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { colors, theme, shadows } from '../theme';
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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="credit-card" size={28} color={colors.primary} />
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Udhaar</Text>
          <Text style={styles.totalOutstanding}>₹{totalOutstanding.toFixed(0)} outstanding</Text>
        </View>
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
        <View style={styles.center}>
          <MaterialCommunityIcons name="loading" size={32} color={colors.textMuted} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : balances.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="check-circle" size={64} color={colors.success} />
          <Text style={styles.emptyText}>No outstanding udhaar</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {balances.map(b => (
            <View key={b.id} style={[styles.card, shadows.sm]}>
              <View style={styles.cardHeader}>
                <View style={[styles.avatarCircle, { backgroundColor: colors.warningMuted }]}>
                  <Text style={styles.avatarText}>
                    {(b.customerName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </Text>
                </View>
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName} numberOfLines={1}>{b.customerName || b.customerId}</Text>
                  {b.branchName && (
                    <View style={styles.branchChip}>
                      <MaterialCommunityIcons name="office-building" size={12} color={colors.textMuted} />
                      <Text style={styles.branchText}>{b.branchName}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.amountContainer}>
                  <Text style={styles.amountLabel}>Due</Text>
                  <Text style={styles.amount}>₹{b.outstandingAmount.toFixed(0)}</Text>
                </View>
              </View>
              
              {b.dueDate && (
                <View style={styles.dueRow}>
                  <MaterialCommunityIcons name="calendar-clock" size={14} color={colors.warning} />
                  <Text style={styles.dueDate}>Due: {new Date(b.dueDate).toLocaleDateString('en-IN')}</Text>
                </View>
              )}
              
              <TouchableOpacity style={styles.payButton} onPress={() => handlePay(b)} activeOpacity={0.8}>
                <MaterialCommunityIcons name="cash-check" size={18} color={colors.textInverse} />
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
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              keyboardType="numeric"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
            />
            <TextInput
              placeholder="Notes (optional)"
              placeholderTextColor={colors.textMuted}
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
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  errorText: { color: colors.error, fontSize: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.lg,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  headerContent: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  totalOutstanding: { fontSize: 14, color: colors.warning, fontWeight: '600' },
  filterRow: { flexDirection: 'row', paddingHorizontal: theme.spacing.lg, marginVertical: theme.spacing.md, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipActive: { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
  filterChipText: { color: colors.text, fontSize: 13 },
  loadingText: { color: colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.md },
  emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: theme.spacing.md, fontSize: 14 },
  list: { padding: theme.spacing.lg, paddingBottom: 32 },
  card: {
    backgroundColor: colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: colors.warning },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  branchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
  },
  branchText: { fontSize: 11, color: colors.textMuted, marginLeft: 4 },
  amountContainer: { alignItems: 'flex-end' },
  amountLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 2 },
  amount: { fontSize: 18, fontWeight: '700', color: colors.warning },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    backgroundColor: colors.warningMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.md,
    alignSelf: 'flex-start',
  },
  dueDate: { fontSize: 12, color: colors.warning, marginLeft: 6, fontWeight: '600' },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: theme.radius.lg,
    gap: 8,
  },
  payButtonText: { color: colors.textInverse, fontWeight: '700', fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: { backgroundColor: colors.surface, borderRadius: theme.radius.xl, padding: 20, borderWidth: 1, borderColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },
  modalCustomer: { fontSize: 14, color: colors.textSecondary, marginBottom: 16 },
  input: {
    backgroundColor: colors.background,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelButton: { flex: 1, paddingVertical: 12, borderRadius: theme.radius.md, alignItems: 'center', backgroundColor: colors.backgroundSecondary },
  cancelButtonText: { color: colors.textSecondary, fontWeight: '600' },
  submitButton: { flex: 1, paddingVertical: 12, borderRadius: theme.radius.md, alignItems: 'center', backgroundColor: colors.primary },
  submitButtonText: { color: colors.textInverse, fontWeight: '600' },
});
