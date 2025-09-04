import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import PersonSelector from './components/PersonSelector';
import ProductList from './components/ProductList';
import { LogOut, Shield } from 'lucide-react';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);

  useEffect(() => {
    // Check if user is already authenticated
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setSelectedPerson(null);
  };

  const handlePersonSelect = (person) => {
    setSelectedPerson(person);
  };

  const handleBackToPersonSelection = () => {
    setSelectedPerson(null);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="container">
      <div className="header">
        <h1>🔧 Product Conflicts Resolution</h1>
        <p>Resolve data conflicts between quality lines and attributes</p>
        
        <div style={{ 
          position: 'absolute', 
          top: '20px', 
          right: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '8px 16px',
            borderRadius: '20px',
            color: 'white'
          }}>
            <Shield size={16} />
            Authenticated
          </div>
          <button 
            className="btn btn-secondary" 
            onClick={handleLogout}
            style={{ padding: '8px 16px' }}
          >
            <LogOut size={16} style={{ marginRight: '8px' }} />
            Logout
          </button>
        </div>
      </div>

      {!selectedPerson ? (
        <PersonSelector onPersonSelect={handlePersonSelect} />
      ) : (
        <ProductList 
          selectedPerson={selectedPerson} 
          onBack={handleBackToPersonSelection}
        />
      )}
    </div>
  );
}

export default App;
