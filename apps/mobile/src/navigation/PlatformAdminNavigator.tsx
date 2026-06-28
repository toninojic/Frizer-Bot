import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LayoutDashboard, PlusCircle, Settings, Store } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ApiClient, AuthUser } from '../api/client';
import { PlatformCreateSalonScreen } from '../screens/PlatformCreateSalonScreen';
import { PlatformOverviewScreen } from '../screens/PlatformOverviewScreen';
import { PlatformSalonDetailsScreen } from '../screens/PlatformSalonDetailsScreen';
import { PlatformSalonsScreen } from '../screens/PlatformSalonsScreen';
import { PlatformSettingsScreen } from '../screens/PlatformSettingsScreen';
import { useI18n } from '../i18n';
import { theme } from '../theme/theme';

type PlatformAdminNavigatorProps = {
  api: ApiClient;
  user: AuthUser;
  onLogout: () => void;
};

type PlatformRootStackParamList = {
  PlatformTabs: undefined;
  PlatformSalonDetails: { salonId: string };
};

type PlatformTabParamList = {
  Overview: undefined;
  Salons: undefined;
  Create: undefined;
  Settings: undefined;
};

const RootStack = createNativeStackNavigator<PlatformRootStackParamList>();
const Tab = createBottomTabNavigator<PlatformTabParamList>();

export function PlatformAdminNavigator({
  api,
  user,
  onLogout,
}: PlatformAdminNavigatorProps) {
  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="PlatformTabs">
          {({ navigation }) => (
            <PlatformTabs
              api={api}
              onCreated={(salonId) =>
                navigation.navigate('PlatformSalonDetails', { salonId })
              }
              onLogout={onLogout}
              onOpenSalon={(salonId) =>
                navigation.navigate('PlatformSalonDetails', { salonId })
              }
              user={user}
            />
          )}
        </RootStack.Screen>
        <RootStack.Screen name="PlatformSalonDetails">
          {({ navigation, route }) => (
            <PlatformSalonDetailsScreen
              api={api}
              onBack={() => navigation.goBack()}
              salonId={route.params.salonId}
              user={user}
            />
          )}
        </RootStack.Screen>
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

function PlatformTabs({
  api,
  user,
  onLogout,
  onOpenSalon,
  onCreated,
}: PlatformAdminNavigatorProps & {
  onOpenSalon: (salonId: string) => void;
  onCreated: (salonId: string) => void;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="Overview"
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
        name="Overview"
        options={{
          tabBarLabel: t('nav.overview'),
          tabBarIcon: ({ color }) => (
            <LayoutDashboard color={color} size={22} strokeWidth={2.4} />
          ),
        }}
      >
        {() => (
          <PlatformOverviewScreen
            api={api}
            onOpenSalon={onOpenSalon}
            user={user}
          />
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Salons"
        options={{
          tabBarLabel: t('nav.salons'),
          tabBarIcon: ({ color }) => (
            <Store color={color} size={22} strokeWidth={2.4} />
          ),
        }}
      >
        {() => (
          <PlatformSalonsScreen
            api={api}
            onOpenSalon={onOpenSalon}
            user={user}
          />
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Create"
        options={{
          tabBarLabel: t('nav.create'),
          tabBarIcon: ({ color, focused }) => (
            <PlusCircle
              color={focused ? theme.colors.primary : color}
              size={30}
              strokeWidth={2.5}
            />
          ),
        }}
      >
        {() => (
          <PlatformCreateSalonScreen
            api={api}
            onCreated={onCreated}
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
        {() => (
          <PlatformSettingsScreen
            onLogout={onLogout}
            user={user}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
