import React, { useState } from 'react';
import { CheckCircle, AlertCircle, MessageSquare } from 'lucide-react';

const ConflictResolver = ({ conflict, onResolve, resolvedBy }) => {
  const [selectedValue, setSelectedValue] = useState('');
  const [comment, setComment] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const handleResolve = async () => {
    if (!selectedValue) return;
    
    setIsResolving(true);
    try {
      await onResolve(conflict.id, selectedValue, comment, resolvedBy);
      setSelectedValue('');
      setComment('');
    } catch (error) {
      console.error('Error resolving conflict:', error);
    } finally {
      setIsResolving(false);
    }
  };

  const isResolved = conflict.resolved_value;

  return (
    <div className={`conflict-item ${isResolved ? 'resolved' : ''}`}>
      <div className="conflict-header">
        <div className="conflict-type">
          {isResolved ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#28a745' }}>
              <CheckCircle size={20} />
              {conflict.conflict_type} (Resolved)
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc3545' }}>
              <AlertCircle size={20} />
              {conflict.conflict_type}
            </div>
          )}
        </div>
        {conflict.reason && (
          <div style={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
            {conflict.reason}
          </div>
        )}
      </div>

      {!isResolved ? (
        <>
          <div className="conflict-values">
            <div
              className={`value-option ${selectedValue === 'quality_line' ? 'selected' : ''}`}
              onClick={() => setSelectedValue('quality_line')}
            >
              <div className="value-label">Quality Line Value</div>
              <div className="value-content">
                {conflict.quality_line_value || 'No value provided'}
              </div>
            </div>
            
            <div
              className={`value-option ${selectedValue === 'attribute' ? 'selected' : ''}`}
              onClick={() => setSelectedValue('attribute')}
            >
              <div className="value-label">Attribute Value</div>
              <div className="value-content">
                {conflict.attribute_value || 'No value provided'}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              <MessageSquare size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Additional Comment (Optional)
            </label>
            <textarea
              className="form-textarea"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add any additional notes about this resolution..."
              rows={3}
            />
          </div>

          <button
            className="btn btn-success"
            onClick={handleResolve}
            disabled={!selectedValue || isResolving}
            style={{ width: '100%' }}
          >
            {isResolving ? 'Resolving...' : 'Resolve Conflict'}
          </button>
        </>
      ) : (
        <div style={{ 
          background: '#d4edda', 
          padding: '16px', 
          borderRadius: '8px',
          border: '1px solid #c3e6cb'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '8px', color: '#155724' }}>
            Resolution:
          </div>
          <div style={{ marginBottom: '8px' }}>
            <strong>Selected Value:</strong> {
              conflict.resolved_value === 'quality_line' 
                ? conflict.quality_line_value 
                : conflict.attribute_value
            }
          </div>
          {conflict.resolution_comment && (
            <div style={{ marginBottom: '8px' }}>
              <strong>Comment:</strong> {conflict.resolution_comment}
            </div>
          )}
          <div style={{ fontSize: '14px', color: '#666' }}>
            Resolved by: {conflict.resolved_by} on {new Date(conflict.resolved_at).toLocaleDateString()}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConflictResolver;
