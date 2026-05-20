import { useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/auth';
import { useParentChildStore } from '../../store/parentChild';
import { getMe } from '../../lib/api/auth';
import { getMyChildren } from '../../lib/api/parent';
import { useRole } from '../../hooks/useRole';
import { Role } from '../../types/auth';

interface TabDef {
  name: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  roles: Role[];
}

const ALL_TABS: TabDef[] = [
  { name: 'dashboard/index', title: 'Home', icon: 'home-outline', roles: ['superadmin', 'admin', 'teacher', 'staff', 'student', 'parent'] },
  { name: 'attendance/index', title: 'Attendance', icon: 'checkmark-circle-outline', roles: ['admin', 'staff', 'student', 'parent'] },
  { name: 'my-classes/index', title: 'My Classes', icon: 'school-outline', roles: ['teacher'] },
  { name: 'homework/index', title: 'Homework', icon: 'book-outline', roles: ['teacher', 'student', 'parent'] },
  { name: 'notices/index', title: 'Notices', icon: 'notifications-outline', roles: ['superadmin', 'admin', 'teacher', 'staff', 'student', 'parent'] },
  { name: 'concerns/index', title: 'Concerns', icon: 'chatbubble-outline', roles: ['admin', 'teacher', 'parent'] },
  { name: 'leaves/index', title: 'Leaves', icon: 'calendar-outline', roles: ['admin', 'teacher', 'staff', 'student'] },
  { name: 'results/index', title: 'Results', icon: 'trophy-outline', roles: ['student', 'parent'] },
  { name: 'settings/index', title: 'Settings', icon: 'person-outline', roles: ['superadmin', 'admin', 'teacher', 'staff', 'student', 'parent'] },
];

function CustomTabBar({
  state,
  descriptors,
  navigation,
  visibleTabNames,
}: BottomTabBarProps & { visibleTabNames: string[] }) {
  const insets = useSafeAreaInsets();
  const visibleRoutes = state.routes.filter((r) => visibleTabNames.includes(r.name));
  const usesTwoRows = visibleRoutes.length > 5;
  const mid = Math.ceil(visibleRoutes.length / 2);
  const rows = usesTwoRows
    ? [visibleRoutes.slice(0, mid), visibleRoutes.slice(mid)]
    : [visibleRoutes];

  const renderTabItem = (route: (typeof state.routes)[0]) => {
    const { options } = descriptors[route.key];
    const isFocused = state.routes[state.index].key === route.key;
    const color = isFocused ? '#4f46e5' : '#9ca3af';

    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name, route.params as object);
      }
    };

    return (
      <TouchableOpacity
        key={route.key}
        onPress={onPress}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 }}
        activeOpacity={0.7}
      >
        {(options as any).tabBarIcon?.({ focused: isFocused, color, size: 22 })}
        <Text style={{ fontSize: 10, color, marginTop: 2, fontWeight: isFocused ? '600' : '400' }}>
          {options.title as string}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingBottom: insets.bottom || 8 }}>
      {rows.map((rowRoutes, rowIdx) => (
        <View
          key={rowIdx}
          style={{
            flexDirection: 'row',
            borderTopWidth: rowIdx > 0 ? 1 : 0,
            borderTopColor: '#f3f4f6',
          }}
        >
          {rowRoutes.map(renderTabItem)}
        </View>
      ))}
    </View>
  );
}

export default function AppLayout() {
  const { token, setSession, clearSession } = useAuthStore();
  const { role } = useRole();
  const { setChildren } = useParentChildStore();

  useEffect(() => {
    if (!token) { router.replace('/(auth)/login'); return; }
    getMe()
      .then((res) => {
        const d = res.data;
        setSession({
          token: token!,
          role: d.role,
          schoolId: d.school_id,
          userId: d.id,
          entityId: d.entity_id,
          expiresAt: d.expires_at,
        });
        if (d.role === 'parent') {
          getMyChildren(d.id)
            .then((r) => setChildren(r.data ?? []))
            .catch(() => {});
        }
      })
      .catch(() => { clearSession(); router.replace('/(auth)/login'); });
  }, []);

  const tabs = ALL_TABS.filter((t) => role && t.roles.includes(role));
  const visibleTabNames = tabs.map((t) => t.name);

  if (!role) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} visibleTabNames={visibleTabNames} />}
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#111827',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      {ALL_TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={tab.icon} size={size} color={color} />
            ),
            href: tabs.find((t) => t.name === tab.name) ? undefined : null,
          }}
        />
      ))}
    </Tabs>
  );
}
