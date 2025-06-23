import React from 'react';
import { Button, Text, View, Linking, Platform } from 'react-native';
import styles from '../styles';

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.error}>Página não encontrada!</Text>
      <Button
        title="Voltar para início"
        onPress={() => Linking.openURL(Platform.OS === 'ios' ? 'exp://127.0.0.1:19000' : 'exp://192.168.0.129:19000')}
        color="#2196F3"
      />
    </View>
  );
}
