import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Home, Heart, Play, Bell, User } from 'lucide-react-native';
import { Platform } from 'react-native';

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#E53E3E',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 85 : 65,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('home'),
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t('favorites'),
          tabBarIcon: ({ color, size }) => <Heart color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="swipe"
        options={{
          title: t('browse'),
          tabBarIcon: ({ color, size }) => <Play color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t('notifications'),
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t('myAccount'),
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
