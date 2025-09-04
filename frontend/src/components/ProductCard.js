import React, { useState } from 'react';
import { Package, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import ConflictResolver from './ConflictResolver';
import { productsAPI } from '../services/api';

const ProductCard = ({ product, resolvedBy, onConflictResolved }) => {
  const [isResolving, setIsResolving] = useState(false);

  const handleConflictResolve = async (conflictId, selectedValue, comment, resolvedBy) => {
    setIsResolving(true);
    try {
      await productsAPI.resolveConflict(conflictId, selectedValue, comment, resolvedBy);
      onConflictResolved();
    } catch (error) {
      console.error('Error resolving conflict:', error);
    } finally {
      setIsResolving(false);
    }
  };

  const unresolvedConflicts = product.conflicts.filter(conflict => !conflict.resolved_value);
  const resolvedConflicts = product.conflicts.filter(conflict => conflict.resolved_value);

  return (
    <div className="product-card">
      <div className="product-header">
        <div>
          <div className="product-number">
            <Package size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Product #{product.item_number}
          </div>
          <div className="product-category">{product.category}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            marginBottom: '4px',
            color: unresolvedConflicts.length > 0 ? '#dc3545' : '#28a745'
          }}>
            {unresolvedConflicts.length > 0 ? (
              <AlertTriangle size={16} />
            ) : (
              <CheckCircle size={16} />
            )}
            {unresolvedConflicts.length} unresolved
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            {resolvedConflicts.length} resolved
          </div>
        </div>
      </div>

      {product.overall_reason && (
        <div className="product-reason">
          <strong>Overall Issue:</strong> {product.overall_reason}
        </div>
      )}

      {product.conflicts.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '20px', 
          color: '#666',
          background: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <CheckCircle size={32} style={{ marginBottom: '8px', color: '#28a745' }} />
          <div>No conflicts found for this product</div>
        </div>
      ) : (
        <div>
          <h4 style={{ marginBottom: '16px', color: '#333' }}>
            Conflicts to Resolve:
          </h4>
          
          {unresolvedConflicts.map((conflict) => (
            <ConflictResolver
              key={conflict.id}
              conflict={conflict}
              onResolve={handleConflictResolve}
              resolvedBy={resolvedBy}
            />
          ))}

          {resolvedConflicts.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h4 style={{ marginBottom: '16px', color: '#333' }}>
                Resolved Conflicts:
              </h4>
              {resolvedConflicts.map((conflict) => (
                <ConflictResolver
                  key={conflict.id}
                  conflict={conflict}
                  onResolve={handleConflictResolve}
                  resolvedBy={resolvedBy}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductCard;
