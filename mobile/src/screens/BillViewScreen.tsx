import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import type { Visit } from '../types';
import { colors, theme, shadows } from '../theme';
import { Button } from '../components/ui/Button';

interface Props {
  navigation?: any;
  route?: { params?: { visitId?: string } };
}

export const BillViewScreen: React.FC<Props> = ({ navigation, route }) => {
  const { visits, branches } = useData();
  const visitId = route?.params?.visitId;
  const visit = visitId ? visits.find(v => v.id === visitId) : undefined;
  const branchName = visit?.branchId ? branches.find(b => b.id === visit.branchId)?.name : undefined;

  if (!visit) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Bill not found</Text>
      </View>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handlePrint = () => {
    Alert.alert('Print', 'Bill printing feature will be available soon.');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={[styles.billContainer, shadows.md]}>
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <MaterialCommunityIcons name="store" size={32} color={colors.primary} />
          </View>
          <Text style={theme.typography.h2}>SALON MANAGER</Text>
          <Text style={[theme.typography.caption, { color: colors.textMuted, marginTop: 4 }]}>
            123 Main Street, City
          </Text>
          <Text style={[theme.typography.caption, { color: colors.textMuted }]}>
            +91 98765 43210
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={[theme.typography.caption, { color: colors.textMuted }]}>Bill No</Text>
            <Text style={theme.typography.body}>{visit.billNumber || visit.id.slice(0, 8)}</Text>
          </View>
          {(branchName || visit.branchName) ? (
            <View style={styles.infoItem}>
              <Text style={[theme.typography.caption, { color: colors.textMuted }]}>Branch</Text>
              <Text style={theme.typography.body}>{branchName || visit.branchName}</Text>
            </View>
          ) : null}
          <View style={styles.infoItem}>
            <Text style={[theme.typography.caption, { color: colors.textMuted }]}>Date</Text>
            <Text style={theme.typography.body}>{formatDate(visit.date)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={[theme.typography.caption, { color: colors.textMuted }]}>Time</Text>
            <Text style={theme.typography.body}>{formatTime(visit.createdAt)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.customerSection}>
          <View style={styles.customerRow}>
            <MaterialCommunityIcons name="account" size={18} color={colors.primary} />
            <Text style={[theme.typography.body, { marginLeft: theme.spacing.sm }]}>{visit.customerName}</Text>
          </View>
          <View style={styles.customerRow}>
            <MaterialCommunityIcons name="account-tie" size={18} color={colors.accent} />
            <Text style={[theme.typography.body, { marginLeft: theme.spacing.sm }]}>{visit.staffName}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {visit.services.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Services</Text>
            {visit.services.map(service => (
              <View key={service.id} style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  <Text style={styles.itemName}>{service.serviceName}</Text>
                  {service.finalPrice !== service.basePrice && (
                    <Text style={styles.itemDiscount}>
                      Original: ₹{service.basePrice} (Discount applied)
                    </Text>
                  )}
                </View>
                <Text style={styles.itemPrice}>₹{service.finalPrice.toFixed(0)}</Text>
              </View>
            ))}
          </>
        )}

        {visit.products.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Products</Text>
            {visit.products.map(product => (
              <View key={product.id} style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  <Text style={styles.itemName}>
                    {product.productName} × {product.quantity}
                  </Text>
                  <Text style={styles.itemSubtext}>₹{product.unitPrice} per unit</Text>
                </View>
                <Text style={styles.itemPrice}>₹{product.totalPrice.toFixed(0)}</Text>
              </View>
            ))}
          </>
        )}

        <View style={styles.divider} />

        {(visit.discountAmount && visit.discountAmount > 0) || (visit.discountPercent && visit.discountPercent > 0) ? (
          <View style={styles.section}>
            <Text style={styles.label}>Discount:</Text>
            <Text style={styles.value}>
              {visit.discountPercent ? `${visit.discountPercent}%` : ''}
              {visit.discountPercent && visit.discountAmount ? ' + ' : ''}
              {visit.discountAmount ? `₹${visit.discountAmount}` : ''}
            </Text>
          </View>
        ) : null}
        {visit.overrideReason ? (
          <View style={styles.section}>
            <Text style={styles.label}>Override reason:</Text>
            <Text style={styles.value}>{visit.overrideReason}</Text>
          </View>
        ) : null}
        <View style={styles.section}>
          <Text style={styles.label}>Payment:</Text>
          <Text style={styles.value}>{(visit.paymentMode || 'cash').toUpperCase()}</Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={theme.typography.h3}>Total Amount</Text>
          <Text style={[theme.typography.h1, { color: colors.primary }]}>₹{visit.total.toFixed(0)}</Text>
        </View>

        <View style={styles.footer}>
          <MaterialCommunityIcons name="heart" size={16} color={colors.error} />
          <Text style={[theme.typography.caption, { color: colors.textMuted, marginLeft: theme.spacing.xs }]}>
            Thank you for your visit!
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          title="Print Bill"
          onPress={handlePrint}
          variant="primary"
          icon="printer"
          fullWidth
          style={{ marginBottom: theme.spacing.md }}
        />
        <Button
          title="Close"
          onPress={() => navigation.goBack()}
          variant="outline"
          fullWidth
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  billContainer: {
    backgroundColor: colors.surface,
    margin: theme.spacing.lg,
    padding: theme.spacing.xxl,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: theme.spacing.md,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoItem: {
    width: '50%',
    marginBottom: theme.spacing.md,
  },
  customerSection: {
    marginVertical: theme.spacing.sm,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  itemLeft: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  itemSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemDiscount: {
    fontSize: 11,
    color: colors.warning,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    borderTopWidth: 2,
    borderTopColor: colors.border,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
  },
  actions: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  value: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
});
