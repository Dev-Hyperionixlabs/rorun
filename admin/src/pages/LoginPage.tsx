import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function LoginPage() {
  const [adminKey, setAdminKey] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Store admin key in sessionStorage
    sessionStorage.setItem('adminKey', adminKey);
    navigate('/dashboard');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
      <h1>Rorun Admin</h1>
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '1rem' }}>
          <label>
            Admin Key:
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
              required
            />
          </label>
        </div>
        <button type="submit" style={{ padding: '0.5rem 1rem' }}>
          Login
        </button>
      </form>
    </div>
  );
}

