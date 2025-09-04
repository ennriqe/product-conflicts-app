import React, { useState, useEffect } from 'react';
import { productsAPI } from '../services/api';
import { User, Mail } from 'lucide-react';

const PersonSelector = ({ onPersonSelect }) => {
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPersons();
  }, []);

  const fetchPersons = async () => {
    try {
      const response = await productsAPI.getResponsiblePersons();
      setPersons(response.data);
    } catch (err) {
      setError('Failed to load responsible persons');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <p>Loading responsible persons...</p>
      </div>
    );
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="person-selector">
      <h2 style={{ textAlign: 'center', marginBottom: '30px', color: 'white' }}>
        👥 Select Your Name
      </h2>
      <p style={{ textAlign: 'center', marginBottom: '30px', color: 'white', opacity: 0.9 }}>
        Choose your name to view the products you're responsible for resolving conflicts
      </p>
      
      {persons.map((person, index) => (
        <div
          key={index}
          className="person-card"
          onClick={() => onPersonSelect(person)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              background: '#667eea', 
              borderRadius: '50%', 
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <User size={20} color="white" />
            </div>
            <div>
              <div className="person-name">{person.responsible_person_name}</div>
              <div className="person-email" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Mail size={14} />
                {person.responsible_person_email}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PersonSelector;
