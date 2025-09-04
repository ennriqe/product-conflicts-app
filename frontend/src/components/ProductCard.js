import React, { useState } from 'react';
import { Package, AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import ConflictResolver from './ConflictResolver';
import { productsAPI } from '../services/api';

const ProductCard = ({ product, resolvedBy, onConflictResolved }) => {
  const [isResolving, setIsResolving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleConflictResolve = async (conflictId, selectedValue, comment, resolvedBy) => {
    setIsResolving(true);
    try {
      await productsAPI.resolveConflict(conflictId, selectedValue, comment, resolvedBy);
      // Update the local state instead of triggering a full refresh
      onConflictResolved();
    } catch (error) {
      console.error('Error resolving conflict:', error);
    } finally {
      setIsResolving(false);
    }
  };

  const handleDeleteConflict = async (conflictId) => {
    if (window.confirm('Are you sure you want to delete this conflict? This action cannot be undone.')) {
      setIsResolving(true);
      try {
        // For now, we'll mark it as resolved with a special "deleted" value
        await productsAPI.resolveConflict(conflictId, 'deleted', 'Conflict marked as non-conflict and deleted', resolvedBy);
        onConflictResolved();
      } catch (error) {
        console.error('Error deleting conflict:', error);
      } finally {
        setIsResolving(false);
      }
    }
  };

  // Filter out non-conflicts (missing data, empty values, etc.)
  const isRealConflict = (conflict) => {
    const qualityLine = conflict.quality_line_value?.toString().trim();
    const attribute = conflict.attribute_value?.toString().trim();
    
    // Skip if both are empty or missing
    if (!qualityLine && !attribute) return false;
    
    // Skip if attribute is missing/empty but quality line has data (this is just missing data, not a conflict)
    if (qualityLine && (!attribute || attribute === 'No value provided' || attribute === 'Missing' || attribute === '')) return false;
    
    // Skip if quality line is missing/empty but attribute has data (this is just missing data, not a conflict)
    if (attribute && (!qualityLine || qualityLine === 'No value provided' || qualityLine === 'Missing' || qualityLine === '')) return false;
    
    return true;
  };

  const realConflicts = product.conflicts.filter(isRealConflict);
  const unresolvedConflicts = realConflicts.filter(conflict => !conflict.resolved_value);
  const resolvedConflicts = realConflicts.filter(conflict => conflict.resolved_value);

  return (
    <div className="product-card">
      <div 
        className="product-header" 
        style={{ cursor: 'pointer' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <div className="product-number" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            <Package size={20} />
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

      {isExpanded && (
        <>
          {realConflicts.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '20px', 
              color: '#666',
              background: '#f8f9fa',
              borderRadius: '8px'
            }}>
              <CheckCircle size={32} style={{ marginBottom: '8px', color: '#28a745' }} />
              <div>No real conflicts found for this product</div>
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
                  onDelete={handleDeleteConflict}
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
                      onDelete={handleDeleteConflict}
                      resolvedBy={resolvedBy}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProductCard;
