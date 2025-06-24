import React, { useState, useEffect, useRef } from 'react';
import { Button, Text, TextInput, View, ActivityIndicator } from 'react-native';
import { Checkbox } from 'react-native-paper';
import * as Notifications from 'expo-notifications';
import styles from '../styles';
import { Linking } from 'react-native';

export default function AgendamentoScreen() {
  const [selectedTimes, setSelectedTimes] = useState({
    '08:05': false,
    '12:05': false,
    '16:05': false,
    '18:05': false,
  });
  const [name, setName] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Permissão para notificações é necessária para agendamentos.');
      }
    })();
  }, []);

  const performVerification = async (nameToVerify: string) => {
    try {
      const response = await fetch(`http://192.168.0.99:5000/dobusca?nome=${encodeURIComponent(nameToVerify)}`);
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
      const pdfUrl = response.notification.request.content.data.pdfUrl;
      if (pdfUrl) {
        Linking.openURL(pdfUrl);
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const handleTimeToggle = (time: string) => {
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
      // Cancelar todos os agendamentos anteriores
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      const now = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      for (const timeStr of Object.keys(selectedTimes)) {
        if (selectedTimes[timeStr]) {
          const [hours, minutes] = timeStr.split(':').map(Number);
          
          // Cria data para amanhã no horário específico
          const scheduledDate = new Date(tomorrow);
          scheduledDate.setHours(hours, minutes, 0, 0);

          // Agenda a notificação
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Verificação Automática',
              body: `Verificando ${name} no Diário Oficial...`,
              data: { 
                name: name.trim(),
                action: 'performVerification'
              },
            },
            trigger: {
              date: scheduledDate, // Data específica
              repeats: true, // Repete diariamente
            },
          });
        }
      }
      alert('Agendamentos ativados com sucesso!');
    } catch (error) {
      console.error('Erro ao agendar:', error);
      alert('Erro ao configurar agendamentos: ' + error.message);
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
      
      {isScheduling ? (
        <ActivityIndicator size="large" color="#2196F3" />
      ) : (
        <Button
          title="Agendar Verificações"
          onPress={handleSchedule}
          disabled={isScheduling}
          color="#2196F3"
        />
      )}
    </View>
  );
}
