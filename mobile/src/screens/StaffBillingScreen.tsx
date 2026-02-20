import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import type { InventoryItem, PaymentMode, Service, VisitProductLine, VisitServiceLine } from '../types';
import { colors, theme, shadows } from '../theme';
import { DatePickerField } from '../components/DatePickerField';

interface Props {
  navigation: any;
}

type CustomerMode = 'new' | 'existing';

export const StaffBillingScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { services, customers, inventory, addOrUpdateCustomer, recordVisit } = useData();

  const [customerMode, setCustomerMode] = useState<CustomerMode>('new');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerDob, setCustomerDob] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerGender, setCustomerGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [customerAddress, setCustomerAddress] = useState('');

  const [selectedLines, setSelectedLines] = useState<VisitServiceLine[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<VisitProductLine[]>([]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [discountPercent, setDiscountPercent] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<string>('');
  const [amountOverride, setAmountOverride] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState<string>('');

  const toggleService = (service: Service) => {
    const existing = selectedLines.find(l => l.serviceId === service.id);
    if (existing) {
      setSelectedLines(prev => prev.filter(l => l.serviceId !== service.id));
    } else {
      const price = Number(service.price);
      const safePrice = Number.isFinite(price) ? price : 0;
      const line: VisitServiceLine = {
        id: `${service.id}-${Date.now()}`,
        serviceId: service.id,
        serviceName: service.name,
        basePrice: safePrice,
        finalPrice: safePrice,
      };
      setSelectedLines(prev => [...prev, line]);
    }
  };

  const updateLinePrice = (lineId: string, value: string) => {
    const numeric = Number(value.replace(/[^0-9.]/g, ''));
    setSelectedLines(prev =>
      prev.map(l =>
        l.id === lineId
          ? {
              ...l,
              finalPrice: Number.isNaN(numeric) ? l.finalPrice : numeric,
            }
          : l,
      ),
    );
  };

  const addProduct = (product: InventoryItem) => {
    if (product.quantity <= 0) {
      Alert.alert('Out of Stock', `${product.name} is out of stock.`);
      return;
    }
    const existing = selectedProducts.find(p => p.productId === product.id);
    if (existing) {
      if (existing.quantity >= product.quantity) {
        Alert.alert('Limit Reached', `Only ${product.quantity} units available.`);
        return;
      }
      setSelectedProducts(prev =>
        prev.map(p =>
          p.productId === product.id
            ? {
                ...p,
                quantity: p.quantity + 1,
                totalPrice: (p.quantity + 1) * p.unitPrice,
              }
            : p,
        ),
      );
    } else {
      const line: VisitProductLine = {
        id: `prod-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.price,
        totalPrice: product.price,
      };
      setSelectedProducts(prev => [...prev, line]);
    }
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.productId !== productId));
  };

  const updateProductQuantity = (productId: string, quantity: number) => {
    const product = inventory.find(p => p.id === productId);
    if (!product) return;
    if (quantity > product.quantity) {
      Alert.alert('Limit Reached', `Only ${product.quantity} units available.`);
      return;
    }
    if (quantity <= 0) {
      removeProduct(productId);
      return;
    }
    setSelectedProducts(prev =>
      prev.map(p =>
        p.productId === productId
          ? {
              ...p,
              quantity,
              totalPrice: quantity * p.unitPrice,
            }
          : p,
      ),
    );
  };

  const subtotal = useMemo(
    () =>
      selectedLines.reduce((sum, l) => sum + (Number.isFinite(l.finalPrice) ? l.finalPrice : 0), 0) +
      selectedProducts.reduce((sum, p) => sum + p.totalPrice, 0),
    [selectedLines, selectedProducts],
  );

  const total = useMemo(() => {
    let t = subtotal;
    
    // Apply percentage discount
    const pct = parseFloat(discountPercent) || 0;
    if (pct > 0 && pct <= 100) {
      t = t * (1 - pct / 100);
    }
    
    // Apply fixed amount discount
    const amt = parseFloat(discountAmount) || 0;
    if (amt > 0) {
      t = Math.max(0, t - amt);
    }
    
    // Apply override if set
    const override = parseFloat(amountOverride);
    if (!isNaN(override) && override >= 0) {
      t = override;
    }
    
    return t;
  }, [subtotal, discountPercent, discountAmount, amountOverride]);

  const handleSubmit = async () => {
    if (!user || user.role !== 'staff') {
      Alert.alert('Error', 'No staff user selected.');
      return;
    }

    if (selectedLines.length === 0 && selectedProducts.length === 0) {
      Alert.alert('Missing data', 'Please select at least one service or product.');
      return;
    }

    try {
      let customerId: string;
      let name: string;

      if (customerMode === 'existing') {
        if (!selectedCustomerId) {
          Alert.alert('Missing data', 'Please select an existing customer.');
          return;
        }
        const customer = customers.find(c => c.id === selectedCustomerId);
        if (!customer) {
          Alert.alert('Error', 'Selected customer not found.');
          return;
        }
        customerId = customer.id;
        name = customer.name;
      } else {
        if (!customerName.trim()) {
          Alert.alert('Missing data', 'Please enter customer name.');
          return;
        }
        const created = await addOrUpdateCustomer({
          name: customerName.trim(),
          dob: customerDob.trim() || undefined,
          phone: customerPhone.trim() || undefined,
          email: customerEmail.trim() || undefined,
          gender: customerGender || undefined,
          address: customerAddress.trim() || undefined,
        });
        customerId = created.id;
        name = created.name;
      }

      const today = new Date();
      const dateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

      const discountPctNum = parseFloat(discountPercent) || 0;
      const discountAmtNum = parseFloat(discountAmount) || 0;
      const overrideNum = amountOverride.trim() ? parseFloat(amountOverride) : undefined;
      
      if (overrideNum !== undefined && !overrideReason.trim()) {
        Alert.alert('Reason required', 'Please enter a reason for overriding the amount.');
        return;
      }

      const visitId = await recordVisit({
        staffId: user.id,
        staffName: user.name,
        customerId,
        customerName: name,
        branchId: user.branchId || undefined,
        date: dateOnly,
        services: selectedLines,
        products: selectedProducts,
        total,
        paymentMode,
        discountPercent: discountPctNum,
        discountAmount: discountAmtNum,
        amountOverride: overrideNum,
        overrideReason: overrideReason.trim() || undefined,
      });

      Alert.alert('Saved', 'Visit saved successfully.', [
        {
          text: 'View Bill',
          onPress: () => {
            navigation.navigate('BillView', { visitId });
          },
        },
        {
          text: 'OK',
          style: 'cancel',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save visit. Please try again.');
    }
  };

  const renderService = useCallback(({ item }: { item: Service }) => {
    const selected = selectedLines.some(l => l.serviceId === item.id);
    return (
      <TouchableOpacity
        style={[styles.serviceChip, selected && styles.serviceChipSelected]}
        onPress={() => toggleService(item)}
      >
        <Text style={[styles.serviceChipLabel, selected && styles.serviceChipLabelSelected]}>
          {item.name} • ₹{item.price}
        </Text>
      </TouchableOpacity>
    );
  }, [selectedLines]);

  const renderLine = useCallback(({ item }: { item: VisitServiceLine }) => (
    <View style={styles.lineRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.lineTitle}>{item.serviceName}</Text>
        <Text style={styles.lineSubtitle}>Base: ₹{item.basePrice}</Text>
      </View>
      <View style={styles.linePriceContainer}>
        <Text style={styles.linePriceLabel}>Final</Text>
        <TextInput
          style={styles.linePriceInput}
          keyboardType="numeric"
          value={String(item.finalPrice)}
          onChangeText={value => updateLinePrice(item.id, value)}
        />
      </View>
    </View>
  ), []);

  const renderHeader = useCallback(() => (
    <View style={styles.headerContainer}>
      <Text style={styles.title}>New Customer Visit</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Customer details</Text>
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modePill, { marginRight: 4 }, customerMode === 'new' && styles.modePillActive]}
            onPress={() => setCustomerMode('new')}
          >
            <Text style={[styles.modePillText, customerMode === 'new' && styles.modePillTextActive]}>New</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modePill, { marginLeft: 4 }, customerMode === 'existing' && styles.modePillActive]}
            onPress={() => setCustomerMode('existing')}
          >
            <Text style={[styles.modePillText, customerMode === 'existing' && styles.modePillTextActive]}>
              Existing
            </Text>
          </TouchableOpacity>
        </View>

        {customerMode === 'existing' ? (
          <View style={{ marginTop: 12 }}>
            {customers.length === 0 ? (
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>No customers yet. Add a new one.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {customers.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.customerChip,
                      selectedCustomerId === item.id && styles.customerChipSelected,
                    ]}
                    onPress={() => setSelectedCustomerId(item.id)}
                  >
                    <Text
                      style={[
                        styles.customerChipText,
                        selectedCustomerId === item.id && styles.customerChipTextSelected,
                      ]}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        ) : (
          <View style={{ marginTop: 12 }}>
            <TextInput
              placeholder="Customer name"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={customerName}
              onChangeText={setCustomerName}
            />
            <DatePickerField
  value={customerDob}
  onChange={setCustomerDob}
  placeholder="DOB (optional)"
  style={[styles.input, { marginTop: 10 }]}
  maximumDate={new Date()}
/>
            <TextInput
              placeholder="Phone (optional)"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              keyboardType="phone-pad"
              value={customerPhone}
              onChangeText={setCustomerPhone}
            />
            <TextInput
              placeholder="Email (optional)"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              keyboardType="email-address"
              value={customerEmail}
              onChangeText={setCustomerEmail}
            />
            <View style={styles.modeRow}>
              {(['male', 'female', 'other'] as const).map(g => (
                <TouchableOpacity
                  key={g}
                  style={[styles.modePill, customerGender === g && styles.modePillActive]}
                  onPress={() => setCustomerGender(customerGender === g ? '' : g)}
                >
                  <Text style={[styles.modePillText, customerGender === g && styles.modePillTextActive]}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              placeholder="Address (optional)"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={customerAddress}
              onChangeText={setCustomerAddress}
            />
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Services taken</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
          {services.map(item => renderService({ item }))}
        </ScrollView>

        {selectedLines.length > 0 && (
          <View style={{ marginTop: 12 }}>
            {selectedLines.map(item => (
              <View key={item.id}>{renderLine({ item })}</View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Products</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
          {inventory.filter(item => item.quantity > 0).map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.productChip}
              onPress={() => addProduct(item)}
            >
              <Text style={styles.productChipText}>
                {item.name} • ₹{item.price} • Qty: {item.quantity}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {selectedProducts.length > 0 && (
          <View style={{ marginTop: 12 }}>
            {selectedProducts.map(product => (
              <View key={product.id} style={styles.productRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productRowTitle}>{product.productName}</Text>
                  <Text style={styles.productRowSubtitle}>₹{product.unitPrice} per unit</Text>
                </View>
                <View style={styles.productQuantityContainer}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => updateProductQuantity(product.productId, product.quantity - 1)}
                  >
                    <Text style={styles.quantityButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.quantityText}>{product.quantity}</Text>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => updateProductQuantity(product.productId, product.quantity + 1)}
                  >
                    <Text style={styles.quantityButtonText}>+</Text>
                  </TouchableOpacity>
                  <Text style={styles.productTotal}>₹{product.totalPrice.toFixed(0)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Payment</Text>
        <View style={styles.modeRow}>
          {(['cash', 'upi', 'card', 'udhaar'] as PaymentMode[]).map(mode => (
            <TouchableOpacity
              key={mode}
              style={[styles.modePill, paymentMode === mode && styles.modePillActive]}
              onPress={() => setPaymentMode(mode)}
            >
              <Text style={[styles.modePillText, paymentMode === mode && styles.modePillTextActive]}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
          <TextInput
            placeholder="Discount %"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { flex: 1 }]}
            keyboardType="numeric"
            value={discountPercent}
            onChangeText={setDiscountPercent}
          />
          <TextInput
            placeholder="Discount ₹"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { flex: 1 }]}
            keyboardType="numeric"
            value={discountAmount}
            onChangeText={setDiscountAmount}
          />
        </View>
        <TextInput
          placeholder="Override final amount (₹) - reason required"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { marginTop: 8 }]}
          keyboardType="numeric"
          value={amountOverride}
          onChangeText={setAmountOverride}
        />
        {amountOverride.trim() ? (
          <TextInput
            placeholder="Reason for override (required)"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { marginTop: 6 }]}
            value={overrideReason}
            onChangeText={setOverrideReason}
          />
        ) : null}
      </View>
    </View>
  ), [customerMode, selectedCustomerId, customers, customerName, customerDob, customerPhone, customerEmail, customerGender, customerAddress, services, selectedLines, selectedProducts, inventory, paymentMode, discountPercent, discountAmount, amountOverride, overrideReason, total]);

  const renderFooter = useCallback(() => (
    <View style={styles.footer}>
      <View>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>₹ {total.toFixed(0)}</Text>
      </View>
      <TouchableOpacity style={styles.saveButton} onPress={handleSubmit}>
        <Text style={styles.saveButtonText}>Save Visit</Text>
      </TouchableOpacity>
    </View>
  ), [total]);

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
      >
        {renderHeader()}
        {renderFooter()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 32,
    paddingHorizontal: theme.spacing.lg,
  },
  headerContainer: {
    paddingTop: 16,
  },
  container: {
    paddingTop: 16,
    paddingHorizontal: theme.spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.xl,
    ...shadows.sm,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  modeRow: {
    flexDirection: 'row',
    marginTop: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  modePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modePillActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  modePillText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  modePillTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.radius.full,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
    marginTop: 10,
    backgroundColor: colors.background,
  },
  serviceChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  serviceChipSelected: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  serviceChipLabel: {
    fontSize: 13,
    color: colors.text,
  },
  serviceChipLabelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  lineTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  lineSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  linePriceContainer: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  linePriceLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  linePriceInput: {
    minWidth: 80,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: colors.text,
    fontSize: 14,
    textAlign: 'right',
  },
  customerChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  customerChipSelected: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  customerChipText: {
    fontSize: 13,
    color: colors.text,
  },
  customerChipTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.success,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: theme.radius.full,
  },
  saveButtonText: {
    color: colors.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },
  productChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    backgroundColor: colors.background,
  },
  productChipText: {
    fontSize: 13,
    color: colors.text,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  productRowTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  productRowSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  productQuantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  quantityButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  quantityText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: 'center',
  },
  productTotal: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 12,
    minWidth: 60,
    textAlign: 'right',
  },
});