import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useData } from '../context/DataContext';
import type { Visit } from '../types';

interface Props {
  navigation: any;
  route: { params: { visitId: string } };
}

export const BillViewScreen: React.FC<Props> = ({ navigation, route }) => {
  const { visits } = useData();
  const visit = visits.find(v => v.id === route.params.visitId);

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
    <ScrollView style={styles.container}>
      <View style={styles.billContainer}>
        <View style={styles.header}>
          <Text style={styles.salonName}>SALON MANAGER</Text>
          <Text style={styles.address}>123 Main Street, City</Text>
          <Text style={styles.phone}>Phone: +91 98765 43210</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.label}>Bill No:</Text>
          <Text style={styles.value}>{visit.id}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>{formatDate(visit.date)}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Time:</Text>
          <Text style={styles.value}>{formatTime(visit.createdAt)}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.label}>Customer:</Text>
          <Text style={styles.value}>{visit.customerName}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Staff:</Text>
          <Text style={styles.value}>{visit.staffName}</Text>
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

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Amount:</Text>
          <Text style={styles.totalAmount}>₹{visit.total.toFixed(0)}</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Thank you for your visit!</Text>
          <Text style={styles.footerText}>Visit us again</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.printButton} onPress={handlePrint}>
          <Text style={styles.printButtonText}>Print Bill</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  billContainer: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  salonName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#020617',
    marginBottom: 4,
  },
  address: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  phone: {
    fontSize: 12,
    color: '#6b7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#020617',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#020617',
    marginTop: 8,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  itemLeft: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    color: '#020617',
    fontWeight: '500',
  },
  itemSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  itemDiscount: {
    fontSize: 11,
    color: '#f97316',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    color: '#020617',
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#020617',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#020617',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#020617',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  printButton: {
    flex: 1,
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  printButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    flex: 1,
    backgroundColor: '#1f2937',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
});
