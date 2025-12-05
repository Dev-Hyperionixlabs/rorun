import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import api from '../services/api';
import { API_ENDPOINTS } from '../config/api';

export function DashboardScreen() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.businesses.list);
      setBusinesses(response.data);
    } catch (error) {
      console.error('Failed to load businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      {businesses.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No businesses yet</Text>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Add Business</Text>
          </TouchableOpacity>
        </View>
      ) : (
        businesses.map((business) => (
          <View key={business.id} style={styles.card}>
            <Text style={styles.businessName}>{business.name}</Text>
            <Text style={styles.businessType}>{business.legalForm}</Text>
          </View>
        ))
      )}
    </ScrollView>
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
    marginBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  businessType: {
    fontSize: 14,
    color: '#666',
  },
});

