import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ActivityIndicator, 
  ScrollView,
  TouchableOpacity
} from 'react-native';
import styles from '../styles';
import { MaterialIcons } from '@expo/vector-icons';

interface StatusData {
  do_mais_recente: string;
  url_mais_recente: string;
  ultima_atualizacao: string;
  proxima_atualizacao: string;
}

// Função para formatar datas
const formatDateTime = (dateString: string) => {
  if (!dateString || dateString === "Nunca" || dateString === "Não agendada") {
    return dateString;
  }
  
  try {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
};

export default function StatusScreen() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = async () => {
    try {
      const response = await fetch('http://192.168.0.129:5000/status');
      const data: StatusData = await response.json();
      setStatus(data);
      setError('');
    } catch (err) {
      setError('Erro ao carregar status do serviço');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStatus();
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <ScrollView 
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Status do Serviço</Text>
        
        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : status ? (
          <View style={styles.resultContainer}>
            <Text style={styles.resultText}>
              <Text style={{ fontWeight: 'bold' }}>Diário Oficial mais recente:</Text>
              {'\n'}{status.do_mais_recente || 'Nenhum disponível'}
            </Text>
            
            <Text style={styles.resultText}>
              <Text style={{ fontWeight: 'bold' }}>Última atualização:</Text>
              {'\n'}{formatDateTime(status.ultima_atualizacao) || 'Não disponível'}
            </Text>
            
            <Text style={styles.resultText}>
              <Text style={{ fontWeight: 'bold' }}>Próxima atualização prevista:</Text>
              {'\n'}{formatDateTime(status.proxima_atualizacao) || 'Não agendada'}
            </Text>
          </View>
        ) : (
          <Text style={styles.error}>Nenhum dado de status disponível</Text>
        )}
        
        <TouchableOpacity
          style={[styles.input, { 
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 20,
            backgroundColor: '#2196F3',
          }]}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <MaterialIcons name="refresh" size={24} color="#FFFFFF" />
              <Text style={{
                color: '#FFFFFF',
                fontWeight: 'bold',
                fontSize: 16,
                marginLeft: 10,
              }}>
                Atualizar Status
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
