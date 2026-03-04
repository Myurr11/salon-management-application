import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { colors } from './src/theme/colors';
import { DataProvider } from './src/context/DataContext';
import { LoginScreen } from './src/screens/LoginScreen';
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
import { StaffReportScreen } from './src/screens/StaffReportScreen';
import { BranchDetailScreen } from './src/screens/BranchDetailScreen';
import { AdminAssignBranchScreen } from './src/screens/AdminAssignBranchScreen';
import { AdminAddStaffScreen } from './src/screens/AdminAddStaffScreen';
import { StaffAttendanceScreen } from './src/screens/StaffAttendanceScreen';
import { BookAppointmentScreen } from './src/screens/BookAppointmentScreen';
import { AppointmentsListScreen } from './src/screens/AppointmentsListScreen';

const RootStack = createNativeStackNavigator();
const StaffStack = createNativeStackNavigator();
const AdminStack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();

const AuthNavigator = () => (
  <AuthStack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: colors.background },
    }}
  >
    <AuthStack.Screen name="Login" component={LoginScreen} />
  </AuthStack.Navigator>
);

const StaffStackNavigator = () => (
  <StaffStack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.text,
      headerShadowVisible: false,
      contentStyle: { backgroundColor: colors.background },
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
    <StaffStack.Screen
      name="StaffAttendance"
      component={StaffAttendanceScreen}
      options={{ title: 'Mark Attendance' }}
    />
    <StaffStack.Screen
      name="BookAppointment"
      component={BookAppointmentScreen}
      options={{ title: 'Book Appointment' }}
    />
    <StaffStack.Screen
      name="AppointmentsList"
      component={AppointmentsListScreen}
      options={{ title: 'Appointments' }}
    />
  </StaffStack.Navigator>
);

const AdminStackNavigator = () => (
  <AdminStack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.text,
      headerShadowVisible: false,
      contentStyle: { backgroundColor: colors.background },
    }}
  >
    <AdminStack.Screen
      name="AdminDashboard"
      component={AdminDashboardScreen}
      options={{ title: 'Admin Dashboard' }}
    />
    <AdminStack.Screen
      name="BranchDetail"
      component={BranchDetailScreen}
      options={({ route }) => ({ title: (route.params as { branchName?: string })?.branchName ?? 'Branch' })}
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
      name="StaffReport"
      component={StaffReportScreen}
      options={{ title: 'Staff Report' }}
    />
    <AdminStack.Screen
      name="AdminAssignBranch"
      component={AdminAssignBranchScreen}
      options={{ title: 'Assign Branch' }}
    />
    <AdminStack.Screen
      name="AdminAddStaff"
      component={AdminAddStaffScreen}
      options={{ title: 'Add Staff' }}
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
    <AdminStack.Screen
      name="BookAppointment"
      component={BookAppointmentScreen}
      options={{ title: 'Book Appointment' }}
    />
    <AdminStack.Screen
      name="AppointmentsList"
      component={AppointmentsListScreen}
      options={{ title: 'Appointments' }}
    />
  </AdminStack.Navigator>
);

function AppContent() {
  const { user } = useAuth();
  const isAuthenticated = user != null;
  
  return (
    <NavigationContainer>
      <RootStack.Navigator
        screenOptions={{ headerShown: false }}
      >
        {!isAuthenticated ? (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        ) : user.role === 'admin' ? (
          <RootStack.Screen name="AdminStack" component={AdminStackNavigator} />
        ) : (
          <RootStack.Screen name="StaffStack" component={StaffStackNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaProvider>
      <AuthProvider>
        <DataProvider>
          <AppContent />
        </DataProvider>
      </AuthProvider>
    </SafeAreaProvider>
    </>
  );
}
