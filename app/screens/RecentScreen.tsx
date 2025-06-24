import React, { useState } from 'react';
import { Button, Text, View, ActivityIndicator, Linking } from 'react-native';
import styles from '../styles';

export default function RecentScreen() {
  const [loading, setLoading] = useState(false);
  
  const handleDownload = async () => {
    setLoading(true);
    try {
      await Linking.openURL('http://192.168.0.99:5000/dorecente');
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
