import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Button, Text, TextInput, View, StyleSheet, ActivityIndicator, Linking, Platform } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Checkbox } from 'react-native-paper';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const Tab = createBottomTabNavigator();

function RecentScreen() {
  const [loading, setLoading] = useState(false);
  const handleDownload = async () => {
    setLoading(true);
    try {
      await Linking.openURL('http://192.168.0.109:5000/dorecente');
    } catch (error) {
      console.error('Erro ao baixar:', error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Diário Oficial Mais Recente</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#2196F3" />
      ) : (
        <Button
          title="Baixar Última Edição"
          onPress={handleDownload}
          color="#2196F3"
        />
      )}
    </View>
  );
}

function SearchScreen() {
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleSearch = async () => {
    if (!search.trim()) {
      setError('Digite um nome para buscar');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `http://192.168.0.109:5000/dobusca?nome=${encodeURIComponent(search)}`
      );
      const data = await response.json();
      if (response.ok) {
        setResult(data);
        setError('');
      } else {
        setError(data.error || 'Erro na busca');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Buscar no Diário Oficial</Text>
      <TextInput
        style={styles.input}
        placeholder="Digite o nome completo"
        placeholderTextColor="#999"
        value={search}
        onChangeText={setSearch}
        autoCorrect={false}
        autoCapitalize="words"
      />
      <Button
        title={loading ? 'Buscando...' : 'Buscar'}
        onPress={handleSearch}
        disabled={loading}
        color="#2196F3"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {result && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>
            Resultado para: {result.nome}
          </Text>
          <Text style={styles.resultText}>
            Status: {result.encontrado ? 'Encontrado ✅' : 'Não encontrado ❌'}
          </Text>
          {result.encontrado && (
            <>
              <Text style={styles.resultText}>
                Páginas: {result.paginas.join(', ')}
              </Text>
              <Button
                title="Abrir PDF Completo"
                onPress={() => Linking.openURL(result.pdf_url)}
                color="#4CAF50"
              />
            </>
          )}
        </View>
      )}
    </View>
  );
}

function AgendamentoScreen() {
  const [selectedTimes, setSelectedTimes] = useState({
    '08:05': false,
    '12:05': false,
    '16:05': false,
    '10:30': false,
  });
  const [name, setName] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Permissão para notificações é necessária para agendamentos.');
      }
    })();
  }, []);

  const performVerification = async (nameToVerify) => {
    try {
      const response = await fetch(`http://192.168.0.109:5000/dobusca?nome=${encodeURIComponent(nameToVerify)}`);
      const data = await response.json();
      const resultText = data.encontrado ? 'Encontrado ✅' : 'Não encontrado ❌';
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Resultado da Verificação',
          body: `Resultado para ${nameToVerify}: ${resultText}`,
          data: { name: nameToVerify },
        },
        trigger: null,
      });
      if (data.encontrado && data.pdf_url) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Abrir PDF',
            body: 'Clique para abrir o PDF com os resultados',
            data: { pdfUrl: data.pdf_url },
          },
          trigger: null,
        });
      }
    } catch (error) {
      console.error('Erro na verificação:', error);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Erro na Verificação',
          body: `Falha ao verificar o nome ${nameToVerify}`,
        },
        trigger: null,
      });
    }
  };

  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      if (notification.request.content.data.action === 'performVerification') {
        performVerification(notification.request.content.data.name);
      }
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const { pdfUrl } = response.notification.request.content.data;
      if (pdfUrl) {
        Linking.openURL(pdfUrl);
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  const handleTimeToggle = (time) => {
    setSelectedTimes(prev => ({ ...prev, [time]: !prev[time] }));
  };

  const handleSchedule = async () => {
    if (!name.trim()) {
      alert('Por favor, informe o nome para agendar.');
      return;
    }
    const selected = Object.values(selectedTimes).some(v => v);
    if (!selected) {
      alert('Selecione pelo menos um horário.');
      return;
    }
    setIsScheduling(true);
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      const now = new Date();

      for (const timeStr of Object.keys(selectedTimes)) {
        if (selectedTimes[timeStr]) {
          const [hours, minutes] = timeStr.split(':').map(Number);
          
          // Calcula o próximo horário disponível
          const scheduledTime = new Date(now);
          scheduledTime.setHours(hours, minutes, 0, 0);
          
          // Se o horário já passou hoje, agenda para amanhã
          if (scheduledTime < now) {
            scheduledTime.setDate(scheduledTime.getDate() + 1);
          }

          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Verificação Automática',
              body: `Verificando ${name} no Diário Oficial...`,
              data: { 
                name: name.trim(),
                action: 'performVerification'
              },
            },
            trigger: scheduledTime, // Gatilho único baseado em data
          });
        }
      }
      alert('Agendamentos ativados!');
    } catch (error) {
      console.error('Erro ao agendar:', error);
      alert('Erro ao configurar agendamentos.');
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Agendamento de Verificações</Text>
      {Object.keys(selectedTimes).map((time) => (
        <View key={time} style={styles.checkboxContainer}>
          <Checkbox
            status={selectedTimes[time] ? 'checked' : 'unchecked'}
            onPress={() => handleTimeToggle(time)}
            color="#2196F3"
          />
          <Text style={styles.checkboxLabel}>{time}</Text>
        </View>
      ))}
      <TextInput
        style={styles.input}
        placeholder="Digite o nome para verificar"
        placeholderTextColor="#999"
        value={name}
        onChangeText={setName}
        autoCorrect={false}
        autoCapitalize="words"
      />
      <Button
        title={isScheduling ? 'Agendando...' : 'Agendar Verificações'}
        onPress={handleSchedule}
        disabled={isScheduling}
        color="#2196F3"
      />
    </View>
  );
}

function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.error}>Página não encontrada!</Text>
      <Button
        title="Voltar para início"
        onPress={() => Linking.openURL(Platform.OS === 'ios' ? 'exp://127.0.0.1:19000' : 'exp://192.168.0.109:19000')}
        color="#2196F3"
      />
    </View>
  );
}

const linking = {
  prefixes: [
    'exp://192.168.0.109:19000',
    'myapp://',
  ],
  config: {
    screens: {
      Recent: 'ultima-edicao',
      Search: 'buscar-nome',
      Agendamento: 'agendamento',
      NotFound: '*',
    },
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-start',
    paddingTop: 40,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333333',
  },
  input: {
    height: 50,
    borderColor: '#CCCCCC',
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 15,
    borderRadius: 8,
    fontSize: 16,
    color: '#333333',
    backgroundColor: '#FAFAFA',
  },
  error: {
    color: '#D32F2F',
    marginTop: 15,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
    marginVertical: 10,
  },
  resultContainer: {
    marginTop: 25,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resultText: {
    fontSize: 16,
    marginVertical: 6,
    color: '#444444',
    lineHeight: 24,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  checkboxLabel: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333333',
  },
});

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
          tabBarLabelStyle: {
            fontSize: 12,
            paddingBottom: 2,
          },
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
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons 
                name="file-document" 
                size={24} 
                color={color}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Search"
          component={SearchScreen}
          options={{
            tabBarLabel: 'Buscar Nome',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons 
                name="search" 
                size={24} 
                color={color}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Agendamento"
          component={AgendamentoScreen}
          options={{
            tabBarLabel: 'Agendamento',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons 
                name="access-time" 
                size={24} 
                color={color}
              />
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
