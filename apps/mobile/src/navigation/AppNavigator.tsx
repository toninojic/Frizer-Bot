import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  CalendarDays,
  CalendarRange,
  PlusCircle,
  Settings,
  Users,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthUser, ApiClient, SalonSettings } from '../api/client';
import { AddAppointmentScreen } from '../screens/AddAppointmentScreen';
import { AppointmentDetailsScreen } from '../screens/AppointmentDetailsScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { CustomerDetailsScreen } from '../screens/CustomerDetailsScreen';
import { ClientsScreen } from '../screens/ClientsScreen';
import { ServicesScreen } from '../screens/ServicesScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TimeBlocksScreen } from '../screens/TimeBlocksScreen';
import { TodayScreen } from '../screens/TodayScreen';
import { WorkersScreen } from '../screens/WorkersScreen';
import { WorkingHoursScreen } from '../screens/WorkingHoursScreen';
import { useI18n } from '../i18n';
import { theme } from '../theme/theme';

type AppNavigatorProps = {
  api: ApiClient;
  user: AuthUser;
  salon: SalonSettings;
  onLogout: () => void;
  onSalonUpdated: (salon: SalonSettings) => void;
};

export type RootStackParamList = {
  MainTabs: undefined;
  Workers: undefined;
  Services: undefined;
  WorkingHours: undefined;
  TimeBlocks: undefined;
  AppointmentDetails: { appointmentId: string };
  CustomerDetails: { customerId: string };
};

export type TabParamList = {
  Today: undefined;
  Calendar: undefined;
  Add: undefined;
  Clients: undefined;
  Settings: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

export function AppNavigator({
  api,
  user,
  salon,
  onLogout,
  onSalonUpdated,
}: AppNavigatorProps) {
  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="MainTabs">
          {() => (
            <TabNavigator
              api={api}
              onLogout={onLogout}
              onSalonUpdated={onSalonUpdated}
              salon={salon}
              user={user}
            />
          )}
        </RootStack.Screen>
        <RootStack.Screen name="Workers">
          {({ navigation }) => (
            <WorkersScreen api={api} onBack={() => navigation.goBack()} />
          )}
        </RootStack.Screen>
        <RootStack.Screen name="Services">
          {({ navigation }) => (
            <ServicesScreen api={api} onBack={() => navigation.goBack()} />
          )}
        </RootStack.Screen>
        <RootStack.Screen name="WorkingHours">
          {({ navigation }) => (
            <WorkingHoursScreen api={api} onBack={() => navigation.goBack()} />
          )}
        </RootStack.Screen>
        <RootStack.Screen name="TimeBlocks">
          {({ navigation }) => (
            <TimeBlocksScreen api={api} onBack={() => navigation.goBack()} />
          )}
        </RootStack.Screen>
        <RootStack.Screen name="AppointmentDetails">
          {({ navigation, route }) => (
            <AppointmentDetailsScreen
              api={api}
              appointmentId={route.params.appointmentId}
              onBack={() => navigation.goBack()}
            />
          )}
        </RootStack.Screen>
        <RootStack.Screen name="CustomerDetails">
          {({ navigation, route }) => (
            <CustomerDetailsScreen
              api={api}
              customerId={route.params.customerId}
              onBack={() => navigation.goBack()}
            />
          )}
        </RootStack.Screen>
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

function TabNavigator({
  api,
  user,
  salon,
  onLogout,
  onSalonUpdated,
}: AppNavigatorProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="Today"
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.mutedText,
        tabBarLabelStyle: {
          fontSize: theme.typography.tiny,
          fontWeight: '800',
        },
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          height: 64 + insets.bottom,
          paddingBottom: theme.spacing[2] + insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
          paddingTop: theme.spacing[2],
        },
      }}
    >
      <Tab.Screen
        name="Today"
        options={{
          tabBarLabel: t('nav.today'),
          tabBarIcon: ({ color }) => (
            <CalendarDays color={color} size={22} strokeWidth={2.4} />
          ),
        }}
      >
        {({ navigation }) => (
          <TodayScreen
            api={api}
            onOpenAdd={() => navigation.navigate('Add')}
            onOpenAppointment={(appointmentId) =>
              navigation.getParent()?.navigate('AppointmentDetails', {
                appointmentId,
              })
            }
            onOpenTimeBlocks={() =>
              navigation.getParent()?.navigate('TimeBlocks')
            }
            salon={salon}
            user={user}
          />
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Calendar"
        options={{
          tabBarLabel: t('nav.calendar'),
          tabBarIcon: ({ color }) => (
            <CalendarRange color={color} size={22} strokeWidth={2.4} />
          ),
        }}
      >
        {({ navigation }) => (
          <CalendarScreen
            api={api}
            onOpenAppointment={(appointmentId) =>
              navigation.getParent()?.navigate('AppointmentDetails', {
                appointmentId,
              })
            }
            salon={salon}
            user={user}
          />
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Add"
        options={{
          tabBarLabel: t('nav.add'),
          tabBarIcon: ({ color, focused }) => (
            <PlusCircle
              color={focused ? theme.colors.primary : color}
              size={30}
              strokeWidth={2.5}
            />
          ),
        }}
      >
        {() => <AddAppointmentScreen api={api} salon={salon} user={user} />}
      </Tab.Screen>
      <Tab.Screen
        name="Clients"
        options={{
          tabBarLabel: t('nav.clients'),
          tabBarIcon: ({ color }) => (
            <Users color={color} size={22} strokeWidth={2.4} />
          ),
        }}
      >
        {({ navigation }) => (
          <ClientsScreen
            api={api}
            onOpenCustomer={(customerId) =>
              navigation.getParent()?.navigate('CustomerDetails', {
                customerId,
              })
            }
            salon={salon}
            user={user}
          />
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Settings"
        options={{
          tabBarLabel: t('nav.settings'),
          tabBarIcon: ({ color }) => (
            <Settings color={color} size={22} strokeWidth={2.4} />
          ),
        }}
      >
        {({ navigation }) => (
          <SettingsScreen
            api={api}
            onLogout={onLogout}
            onOpenServices={() => navigation.getParent()?.navigate('Services')}
            onOpenTimeBlocks={() =>
              navigation.getParent()?.navigate('TimeBlocks')
            }
            onOpenWorkers={() => navigation.getParent()?.navigate('Workers')}
            onOpenWorkingHours={() =>
              navigation.getParent()?.navigate('WorkingHours')
            }
            onSalonUpdated={onSalonUpdated}
            salon={salon}
            user={user}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
