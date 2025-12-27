import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function DashboardPage() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const adminKey = sessionStorage.getItem('adminKey');
    if (!adminKey) {
      window.location.href = '/';
      return;
    }

    axios
      .get(`${API_BASE_URL}/admin/businesses`, {
        headers: { 'x-admin-key': adminKey },
      })
      .then((response) => {
        setBusinesses(response.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load businesses:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Admin Dashboard</h1>
      <h2>Businesses ({businesses.length})</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Name</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Owner</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Legal Form</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Created</th>
          </tr>
        </thead>
        <tbody>
          {businesses.map((business) => (
            <tr key={business.id}>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{business.name}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                {business.owner?.name || business.owner?.phone}
              </td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{business.legalForm}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                {new Date(business.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

