import React, { useMemo, useState } from 'react';
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
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import type { InventoryItem, Service, VisitProductLine, VisitServiceLine } from '../types';

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

  const [selectedLines, setSelectedLines] = useState<VisitServiceLine[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<VisitProductLine[]>([]);

  const toggleService = (service: Service) => {
    const existing = selectedLines.find(l => l.serviceId === service.id);
    if (existing) {
      setSelectedLines(prev => prev.filter(l => l.serviceId !== service.id));
    } else {
      const line: VisitServiceLine = {
        id: `${service.id}-${Date.now()}`,
        serviceId: service.id,
        serviceName: service.name,
        basePrice: service.price,
        finalPrice: service.price,
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

  const total = useMemo(
    () =>
      selectedLines.reduce((sum, l) => sum + (Number.isFinite(l.finalPrice) ? l.finalPrice : 0), 0) +
      selectedProducts.reduce((sum, p) => sum + p.totalPrice, 0),
    [selectedLines, selectedProducts],
  );

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
        });
        customerId = created.id;
        name = created.name;
      }

      const today = new Date();
      const dateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

      const visitId = await recordVisit({
        staffId: user.id,
        staffName: user.name,
        customerId,
        customerName: name,
        date: dateOnly,
        services: selectedLines,
        products: selectedProducts,
        total,
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

  const renderService = ({ item }: { item: Service }) => {
    const selected = selectedLines.some(l => l.serviceId === item.id);
    return (
      <TouchableOpacity
        style={[styles.serviceChip, selected ? styles.serviceChipSelected : null]}
        onPress={() => toggleService(item)}
      >
        <Text style={[styles.serviceChipLabel, selected ? styles.serviceChipLabelSelected : null]}>
          {item.name} • ₹{item.price}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderLine = ({ item }: { item: VisitServiceLine }) => (
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
  );

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      <View style={styles.container}>
        <Text style={styles.title}>New Customer Visit</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Customer details</Text>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modePill, { marginRight: 4 }, customerMode === 'new' ? styles.modePillActive : null]}
              onPress={() => setCustomerMode('new')}
            >
              <Text style={[styles.modePillText, customerMode === 'new' ? styles.modePillTextActive : null]}>New</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modePill, { marginLeft: 4 }, customerMode === 'existing' ? styles.modePillActive : null]}
              onPress={() => setCustomerMode('existing')}
            >
              <Text
                style={[styles.modePillText, customerMode === 'existing' ? styles.modePillTextActive : null]}
              >
                Existing
              </Text>
            </TouchableOpacity>
          </View>

          {customerMode === 'existing' ? (
            <View style={{ marginTop: 12 }}>
              <FlatList
                data={customers}
                keyExtractor={item => item.id}
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.customerChip,
                      selectedCustomerId === item.id ? styles.customerChipSelected : null,
                    ]}
                    onPress={() => setSelectedCustomerId(item.id)}
                  >
                    <Text
                      style={[
                        styles.customerChipText,
                        selectedCustomerId === item.id ? styles.customerChipTextSelected : null,
                      ]}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={{ color: '#6b7280', fontSize: 13 }}>No customers yet. Add a new one.</Text>
                }
              />
            </View>
          ) : (
            <View style={{ marginTop: 12 }}>
              <TextInput
                placeholder="Customer name"
                placeholderTextColor="#6b7280"
                style={styles.input}
                value={customerName}
                onChangeText={setCustomerName}
              />
              <TextInput
                placeholder="DOB (optional, e.g. 1995-08-12)"
                placeholderTextColor="#6b7280"
                style={styles.input}
                value={customerDob}
                onChangeText={setCustomerDob}
              />
              <TextInput
                placeholder="Phone (optional)"
                placeholderTextColor="#6b7280"
                style={styles.input}
                keyboardType="phone-pad"
                value={customerPhone}
                onChangeText={setCustomerPhone}
              />
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Services taken</Text>
          <FlatList
            data={services}
            keyExtractor={item => item.id}
            renderItem={renderService}
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 4 }}
          />

          {selectedLines.length > 0 && (
            <FlatList
              style={{ marginTop: 12 }}
              data={selectedLines}
              keyExtractor={item => item.id}
              renderItem={renderLine}
            />
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Products</Text>
          <FlatList
            data={inventory.filter(item => item.quantity > 0)}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.productChip}
                onPress={() => addProduct(item)}
              >
                <Text style={styles.productChipText}>
                  {item.name} • ₹{item.price} • Qty: {item.quantity}
                </Text>
              </TouchableOpacity>
            )}
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 4 }}
          />

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

        <View style={styles.footer}>
          <View>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹ {total.toFixed(0)}</Text>
          </View>
          <TouchableOpacity style={styles.saveButton} onPress={handleSubmit}>
            <Text style={styles.saveButtonText}>Save Visit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#020617',
  },
  container: {
    flex: 1,
    paddingTop: 56,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#020617',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1f2937',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  modeRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  modePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  modePillActive: {
    backgroundColor: '#22c55e33',
    borderColor: '#22c55e',
  },
  modePillText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  modePillTextActive: {
    color: '#bbf7d0',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: 'white',
    fontSize: 14,
    marginTop: 10,
    backgroundColor: '#020617',
  },
  serviceChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1f2937',
    marginRight: 8,
  },
  serviceChipSelected: {
    backgroundColor: '#22c55e33',
    borderColor: '#22c55e',
  },
  serviceChipLabel: {
    fontSize: 13,
    color: '#e5e7eb',
  },
  serviceChipLabelSelected: {
    color: '#bbf7d0',
    fontWeight: '600',
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
  },
  lineTitle: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '500',
  },
  lineSubtitle: {
    color: '#6b7280',
    fontSize: 12,
  },
  linePriceContainer: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  linePriceLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 2,
  },
  linePriceInput: {
    minWidth: 80,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1f2937',
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: 'white',
    fontSize: 14,
    textAlign: 'right',
  },
  customerChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1f2937',
    marginRight: 8,
  },
  customerChipSelected: {
    backgroundColor: '#22c55e33',
    borderColor: '#22c55e',
  },
  customerChipText: {
    fontSize: 13,
    color: '#e5e7eb',
  },
  customerChipTextSelected: {
    color: '#bbf7d0',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#0f172a',
  },
  totalLabel: {
    fontSize: 13,
    color: '#9ca3af',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#22c55e',
  },
  saveButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  productChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1f2937',
    marginRight: 8,
    backgroundColor: '#111827',
  },
  productChipText: {
    fontSize: 13,
    color: '#e5e7eb',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
  },
  productRowTitle: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '500',
  },
  productRowSubtitle: {
    color: '#6b7280',
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
    borderColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
  quantityButtonText: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '600',
  },
  quantityText: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: 'center',
  },
  productTotal: {
    color: '#f97316',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 12,
    minWidth: 60,
    textAlign: 'right',
  },
})

