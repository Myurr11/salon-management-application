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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import type { InventoryItem, PaymentMode, Service, VisitProductLine, VisitServiceLine, VisitStaff } from '../types';
import { colors, theme, shadows } from '../theme';
import { DatePickerField } from '../components/DatePickerField';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

interface Props {
  navigation: any;
}

type CustomerMode = 'new' | 'existing';

export const StaffBillingScreen: React.FC<Props> = ({ navigation }) => {
  const { user, staffMembers } = useAuth();
  const { services, customers, inventory, addOrUpdateCustomer, recordVisit } = useData();
  
  // Attending staff selection - can be multiple staff members
  const [attendingStaffIds, setAttendingStaffIds] = useState<string[]>([]);

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
    // Use attending staff if selected, otherwise show error
    if (attendingStaffIds.length === 0) {
      Alert.alert('Error', 'Please select at least one staff member who attended the customer.');
      return;
    }
    
    // Get the first staff as primary (for backward compatibility)
    const primaryStaffId = attendingStaffIds[0];
    const primaryStaff = staffMembers.find(s => s.id === primaryStaffId);
    const staffName = primaryStaff?.name || user?.name || 'Staff';
    
    // Calculate revenue share for each staff member
    const attendingStaff: VisitStaff[] = attendingStaffIds.map(staffId => {
      const staff = staffMembers.find(s => s.id === staffId);
      return {
        staffId,
        staffName: staff?.name || 'Unknown',
        revenueShare: total / attendingStaffIds.length, // Equal split
      };
    });

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
        staffId: primaryStaffId,
        staffName,
        customerId,
        customerName: name,
        branchId: primaryStaff?.branchId || user?.branchId || undefined,
        date: dateOnly,
        services: selectedLines,
        products: selectedProducts,
        total,
        paymentMode,
        discountPercent: discountPctNum,
        discountAmount: discountAmtNum,
        amountOverride: overrideNum,
        overrideReason: overrideReason.trim() || undefined,
        attendingStaff, // Multiple staff with revenue share
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

  const getServiceIcon = (serviceName: string): keyof typeof MaterialCommunityIcons.glyphMap => {
    const name = serviceName.toLowerCase();
    if (name.includes('hair')) return 'hair-dryer';
    if (name.includes('cut')) return 'content-cut';
    if (name.includes('color') || name.includes('colour')) return 'palette';
    if (name.includes('wash') || name.includes('shampoo')) return 'shower';
    if (name.includes('style') || name.includes('blow')) return 'weather-windy';
    if (name.includes('spa') || name.includes('treatment')) return 'spa';
    if (name.includes('facial') || name.includes('face')) return 'face-woman';
    if (name.includes('massage')) return 'hand-heart';
    if (name.includes('nail') || name.includes('manicure') || name.includes('pedicure')) return 'hand-back-right';
    if (name.includes('wax')) return 'fire';
    if (name.includes('thread')) return 'needle';
    if (name.includes('beard') || name.includes('shave')) return 'mustache';
    return 'star-circle';
  };

  const renderService = useCallback(({ item }: { item: Service }) => {
    const selected = selectedLines.some(l => l.serviceId === item.id);
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.serviceWidget, selected && styles.serviceWidgetSelected]}
        onPress={() => toggleService(item)}
        activeOpacity={0.8}
      >
        <View style={[styles.serviceIconContainer, selected && styles.serviceIconContainerSelected]}>
          <MaterialCommunityIcons 
            name={getServiceIcon(item.name)} 
            size={24} 
            color={selected ? colors.primary : colors.textSecondary} 
          />
        </View>
        <Text style={[styles.serviceWidgetName, selected && styles.serviceWidgetNameSelected]} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={[styles.serviceWidgetPrice, selected && styles.serviceWidgetPriceSelected]}>
          ₹{item.price}
        </Text>
        {selected && (
          <View style={styles.selectedBadge}>
            <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
          </View>
        )}
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

  const toggleAttendingStaff = (staffId: string) => {
    setAttendingStaffIds(prev => 
      prev.includes(staffId) 
        ? prev.filter(id => id !== staffId)
        : [...prev, staffId]
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderHeader = useCallback(() => (
    <View style={styles.headerContainer}>
      {/* Staff Selector - Select who attended the customer */}
      <View style={[styles.staffSelectorCard, shadows.sm]}>
        <View style={styles.staffSelectorHeader}>
          <MaterialCommunityIcons name="account-group" size={20} color={colors.primary} />
          <Text style={styles.staffSelectorTitle}>Staff Who Attended Customer</Text>
        </View>
        <Text style={styles.staffSelectorSubtitle}>
          Select one or more staff members. Revenue will be split equally.
        </Text>
        <View style={styles.staffGrid}>
          {staffMembers.map(staff => {
            const isSelected = attendingStaffIds.includes(staff.id);
            return (
              <TouchableOpacity
                key={staff.id}
                style={[styles.staffChip, isSelected && styles.staffChipSelected]}
                onPress={() => toggleAttendingStaff(staff.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.staffChipAvatar, { backgroundColor: isSelected ? colors.primary : colors.textMuted }]}>
                  <Text style={styles.staffChipAvatarText}>{getInitials(staff.name)}</Text>
                </View>
                <Text style={[styles.staffChipName, isSelected && styles.staffChipNameSelected]} numberOfLines={1}>
                  {staff.name}
                </Text>
                {isSelected && (
                  <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} style={styles.staffChipCheck} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        {attendingStaffIds.length > 0 && (
          <View style={styles.revenueShareInfo}>
            <MaterialCommunityIcons name="cash-multiple" size={16} color={colors.success} />
            <Text style={styles.revenueShareText}>
              Each staff will receive ₹{(total / attendingStaffIds.length).toFixed(0)} (equal split)
            </Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="account-details" size={20} color={colors.primary} />
          <Text style={[theme.typography.h4, { marginLeft: theme.spacing.sm }]}>Customer Details</Text>
        </View>
        
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modePill, customerMode === 'new' && styles.modePillActive]}
            onPress={() => setCustomerMode('new')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons 
              name="account-plus" 
              size={16} 
              color={customerMode === 'new' ? colors.primary : colors.textSecondary} 
              style={{ marginRight: 4 }}
            />
            <Text style={[theme.typography.bodySmall, customerMode === 'new' && styles.modePillTextActive]}>
              New
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modePill, customerMode === 'existing' && styles.modePillActive]}
            onPress={() => setCustomerMode('existing')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons 
              name="account-search" 
              size={16} 
              color={customerMode === 'existing' ? colors.primary : colors.textSecondary}
              style={{ marginRight: 4 }}
            />
            <Text style={[theme.typography.bodySmall, customerMode === 'existing' && styles.modePillTextActive]}>
              Existing
            </Text>
          </TouchableOpacity>
        </View>

        {customerMode === 'existing' ? (
          <View style={{ marginTop: theme.spacing.md }}>
            {customers.length === 0 ? (
              <View style={styles.emptyCustomers}>
                <MaterialCommunityIcons name="account-off" size={32} color={colors.border} />
                <Text style={[theme.typography.bodySmall, { color: colors.textMuted, marginTop: theme.spacing.sm }]}>
                  No customers yet. Add a new one.
                </Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.customersScroll}>
                {customers.map(item => {
                  const isSelected = selectedCustomerId === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.customerWidget, isSelected && styles.customerWidgetSelected]}
                      onPress={() => setSelectedCustomerId(item.id)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.customerAvatar, isSelected && styles.customerAvatarSelected]}>
                        <Text style={styles.customerAvatarText}>
                          {item.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </Text>
                      </View>
                      <Text style={[styles.customerWidgetName, isSelected && styles.customerWidgetNameSelected]} numberOfLines={2}>
                        {item.name}
                      </Text>
                      {item.phone && (
                        <Text style={styles.customerWidgetPhone} numberOfLines={1}>
                          {item.phone}
                        </Text>
                      )}
                      {isSelected && (
                        <View style={styles.selectedBadge}>
                          <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
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
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="spa" size={20} color={colors.primary} />
          <Text style={[theme.typography.h4, { marginLeft: theme.spacing.sm }]}>Services</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.servicesScroll}>
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
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="package-variant" size={20} color={colors.accent} />
          <Text style={[theme.typography.h4, { marginLeft: theme.spacing.sm }]}>Products</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productsScroll}>
          {inventory.filter(item => item.quantity > 0).map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.productWidget}
              onPress={() => addProduct(item)}
              activeOpacity={0.8}
            >
              <View style={styles.productIconContainer}>
                <MaterialCommunityIcons name="spray" size={24} color={colors.accent} />
              </View>
              <Text style={styles.productWidgetName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.productWidgetPrice}>₹{item.price}</Text>
              <View style={styles.stockBadge}>
                <Text style={styles.stockText}>{item.quantity} in stock</Text>
              </View>
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
  ), [customerMode, selectedCustomerId, customers, customerName, customerDob, customerPhone, customerEmail, customerGender, customerAddress, services, selectedLines, selectedProducts, inventory, paymentMode, discountPercent, discountAmount, amountOverride, overrideReason, total, attendingStaffIds, staffMembers]);

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
    paddingBottom: theme.spacing.xxxl,
    paddingHorizontal: theme.spacing.lg,
  },
  headerContainer: {
    paddingTop: theme.spacing.lg,
  },
  container: {
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.md,
    ...shadows.sm,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: theme.spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  modeRow: {
    flexDirection: 'row',
    marginTop: theme.spacing.md,
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  modePillActive: {
    backgroundColor: colors.primaryContainer,
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: theme.spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    color: colors.text,
    fontSize: 14,
    marginTop: theme.spacing.md,
    backgroundColor: colors.background,
  },
  servicesScroll: {
    paddingVertical: theme.spacing.sm,
  },
  serviceWidget: {
    width: 100,
    backgroundColor: colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: theme.spacing.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  serviceWidgetSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer,
  },
  serviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.lg,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  serviceIconContainerSelected: {
    backgroundColor: colors.surface,
  },
  serviceWidgetName: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
    height: 32,
  },
  serviceWidgetNameSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  serviceWidgetPrice: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  serviceWidgetPriceSelected: {
    color: colors.primary,
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
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
  emptyCustomers: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  customersScroll: {
    paddingVertical: theme.spacing.sm,
  },
  customerWidget: {
    width: 100,
    backgroundColor: colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: theme.spacing.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  customerWidgetSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  customerAvatarSelected: {
    backgroundColor: colors.primary,
  },
  customerAvatarText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  customerWidgetName: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 2,
    height: 32,
  },
  customerWidgetNameSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  customerWidgetPhone: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
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
  productsScroll: {
    paddingVertical: theme.spacing.sm,
  },
  productWidget: {
    width: 100,
    backgroundColor: colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: theme.spacing.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  productIconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.lg,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  productWidgetName: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
    height: 32,
  },
  productWidgetPrice: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '600',
    marginBottom: 4,
  },
  stockBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  stockText: {
    fontSize: 10,
    color: colors.success,
    fontWeight: '500',
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
  // Staff Selector Styles
  staffSelectorCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  staffSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  staffSelectorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: theme.spacing.sm,
  },
  staffSelectorSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  staffGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  staffChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  staffChipSelected: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  staffChipAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffChipAvatarText: {
    color: colors.textInverse,
    fontSize: 12,
    fontWeight: '700',
  },
  staffChipName: {
    fontSize: 13,
    color: colors.textSecondary,
    maxWidth: 100,
  },
  staffChipNameSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  staffChipCheck: {
    marginLeft: 2,
  },
  revenueShareInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: theme.spacing.sm,
  },
  revenueShareText: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '500',
  },
  staffSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  staffInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  staffAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  staffAvatarText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
  staffDetails: {
    flex: 1,
  },
  staffLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 2,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  switchStaffButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    gap: 4,
  },
  switchStaffText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
});