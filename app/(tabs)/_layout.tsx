import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile, type AccountRole } from '@/lib/profiles';

const tabs = [
  { name: 'index', label: 'Home', icon: 'home', focusedIcon: 'home-sharp' },
  { name: 'scan', label: 'Scan', icon: 'qr-code-outline', focusedIcon: 'qr-code' },
  { name: 'history', label: 'History', icon: 'time-outline', focusedIcon: 'time' },
  { name: 'teacher', label: 'Teacher', icon: 'clipboard-outline', focusedIcon: 'clipboard' },
  { name: 'profile', label: 'Profile', icon: 'person-outline', focusedIcon: 'person' },
] as const;

export default function TabLayout() {
  const { user } = useAuth();
  const [role, setRole] = useState<AccountRole | null>(null);

  useEffect(() => {
    let active = true;
    if (!user) {
      setRole(null);
      return () => { active = false; };
    }
    getProfile(user.id)
      .then((profile) => { if (active) setRole(profile?.role ?? 'student'); })
      .catch(() => { if (active) setRole('student'); });
    return () => { active = false; };
  }, [user]);

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.background,
          borderBottomColor: COLORS.border,
          borderBottomWidth: 1,
        },
        headerShadowVisible: false,
        headerTintColor: COLORS.textPrimary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
        tabBarActiveTintColor: COLORS.primary,
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.label,
            href:
              (tab.name === 'scan' && (role === null || role === 'teacher' || role === 'admin')) ||
              ((tab.name === 'teacher' || tab.name === 'history') && role === 'admin')
                ? null
                : undefined,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? tab.focusedIcon : tab.icon}
                color={color}
                size={23}
              />
            ),
          }}
        />
      ))}
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          href: role === 'admin' ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'shield-checkmark' : 'shield-outline'} color={color} size={23} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.card,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 84 : 76,
    paddingBottom: Platform.OS === 'ios' ? 10 : 4,
    paddingTop: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});