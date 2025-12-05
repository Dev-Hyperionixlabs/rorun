import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function TransactionsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Transactions</Text>
      <Text style={styles.subtitle}>Transaction list will appear here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});

