import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

// Telas
import RecentScreen from './screens/RecentScreen';
import SearchScreen from './screens/SearchScreen';
import AgendamentoScreen from './screens/AgendamentoScreen';
import NotFoundScreen from './screens/NotFoundScreen';
import StatusScreen from './screens/StatusScreen'; // Nova tela de status

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const Tab = createBottomTabNavigator();

const linking = {
  prefixes: [
    'exp://192.168.0.129:19000',
    'myapp://',
  ],
  config: {
    screens: {
      Recent: 'ultima-edicao',
      Search: 'buscar-nome',
      Agendamento: 'agendamento',
      Status: 'status', // Nova rota
      NotFound: '*',
    },
  },
};

export default function App() {
  return (
    <NavigationContainer
      linking={linking}
      fallback={<ActivityIndicator size="large" color="#2196F3" />}
    >
      <Tab.Navigator
        initialRouteName="Recent"
        screenOptions={{
          headerShown: false,
          tabBarLabelStyle: { fontSize: 12, paddingBottom: 2 },
          tabBarActiveTintColor: '#2196F3',
          tabBarInactiveTintColor: '#757575',
          tabBarStyle: {
            height: 60,
            paddingTop: 8,
            backgroundColor: '#FFFFFF',
          },
        }}
      >
        <Tab.Screen
          name="Recent"
          component={RecentScreen}
          options={{
            tabBarLabel: 'Última Edição',
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="file-document" size={24} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Search"
          component={SearchScreen}
          options={{
            tabBarLabel: 'Buscar Nome',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="search" size={24} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Agendamento"
          component={AgendamentoScreen}
          options={{
            tabBarLabel: 'Agendamento',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="access-time" size={24} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Status"
          component={StatusScreen}
          options={{
            tabBarLabel: 'Status',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="info-outline" size={24} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="NotFound"
          component={NotFoundScreen}
          options={{ tabBarButton: () => null }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
