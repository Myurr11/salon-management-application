import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { DataProvider } from './src/context/DataContext';
import { RoleSelectionScreen } from './src/screens/RoleSelectionScreen';
import { StaffDashboardScreen } from './src/screens/StaffDashboardScreen';
import { StaffBillingScreen } from './src/screens/StaffBillingScreen';
import { BillViewScreen } from './src/screens/BillViewScreen';
import { CustomerListScreen } from './src/screens/CustomerListScreen';
import { CustomerDetailScreen } from './src/screens/CustomerDetailScreen';
import { InventoryViewScreen } from './src/screens/InventoryViewScreen';
import { AdminDashboardScreen } from './src/screens/AdminDashboardScreen';
import { AdminInventoryScreen } from './src/screens/AdminInventoryScreen';
import { AdminProductSalesScreen } from './src/screens/AdminProductSalesScreen';
import { AdminAttendanceScreen } from './src/screens/AdminAttendanceScreen';
import { AdminUdhaarScreen } from './src/screens/AdminUdhaarScreen';
import { AdminStaffPerformanceScreen } from './src/screens/AdminStaffPerformanceScreen';

const RootStack = createNativeStackNavigator();
const StaffStack = createNativeStackNavigator();
const AdminStack = createNativeStackNavigator();

const StaffStackNavigator = () => (
  <StaffStack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: '#020617' },
      headerTintColor: '#e5e7eb',
    }}
  >
    <StaffStack.Screen
      name="StaffDashboard"
      component={StaffDashboardScreen}
      options={{ title: 'Staff Dashboard' }}
    />
    <StaffStack.Screen
      name="StaffBilling"
      component={StaffBillingScreen}
      options={{ title: 'New Visit' }}
    />
    <StaffStack.Screen
      name="BillView"
      component={BillViewScreen}
      options={{ title: 'Bill' }}
    />
    <StaffStack.Screen
      name="CustomerList"
      component={CustomerListScreen}
      options={{ title: 'Customers' }}
    />
    <StaffStack.Screen
      name="CustomerDetail"
      component={CustomerDetailScreen}
      options={{ title: 'Customer' }}
    />
    <StaffStack.Screen
      name="InventoryView"
      component={InventoryViewScreen}
      options={{ title: 'Inventory' }}
    />
  </StaffStack.Navigator>
);

const AdminStackNavigator = () => (
  <AdminStack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: '#020617' },
      headerTintColor: '#e5e7eb',
    }}
  >
    <AdminStack.Screen
      name="AdminDashboard"
      component={AdminDashboardScreen}
      options={{ title: 'Admin Dashboard' }}
    />
    <AdminStack.Screen
      name="AdminInventory"
      component={AdminInventoryScreen}
      options={{ title: 'Manage Inventory' }}
    />
    <AdminStack.Screen
      name="AdminProductSales"
      component={AdminProductSalesScreen}
      options={{ title: 'Product Sales' }}
    />
    <AdminStack.Screen
      name="AdminAttendance"
      component={AdminAttendanceScreen}
      options={{ title: 'Attendance' }}
    />
    <AdminStack.Screen
      name="AdminUdhaar"
      component={AdminUdhaarScreen}
      options={{ title: 'Udhaar (Credit)' }}
    />
    <AdminStack.Screen
      name="AdminStaffPerformance"
      component={AdminStaffPerformanceScreen}
      options={{ title: 'Staff Performance' }}
    />
    <AdminStack.Screen
      name="CustomerList"
      component={CustomerListScreen}
      options={{ title: 'Customers' }}
    />
    <AdminStack.Screen
      name="CustomerDetail"
      component={CustomerDetailScreen}
      options={{ title: 'Customer' }}
    />
  </AdminStack.Navigator>
);

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DataProvider>
          <NavigationContainer>
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
              <RootStack.Screen name="RoleSelection" component={RoleSelectionScreen} />
              <RootStack.Screen name="StaffStack" component={StaffStackNavigator} />
              <RootStack.Screen name="AdminStack" component={AdminStackNavigator} />
            </RootStack.Navigator>
          </NavigationContainer>
        </DataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
