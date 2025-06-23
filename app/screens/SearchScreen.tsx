import React, { useState } from 'react';
import { Button, Text, TextInput, View, ActivityIndicator, Linking } from 'react-native';
import styles from '../styles';

export default function SearchScreen() {
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
        `http://192.168.0.129:5000/dobusca?nome=${encodeURIComponent(search)}`
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
