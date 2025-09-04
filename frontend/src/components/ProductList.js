import React, { useState, useEffect } from 'react';
import { Package, RefreshCw, CheckCircle, AlertTriangle, AlertCircle, BarChart3, Target, Download } from 'lucide-react';
import ProductCard from './ProductCard';
import { productsAPI } from '../services/api';

const ProductList = ({ selectedPerson, onBack }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('with-conflicts');

  useEffect(() => {
    if (selectedPerson) {
      fetchProducts();
    }
  }, [selectedPerson]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getProductsByPerson(selectedPerson.responsible_person_email);
      setProducts(response.data);
    } catch (err) {
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };


  const handleConflictResolved = (conflictId) => {
    // Update local state instead of full refresh to maintain scroll position and expanded state
    setProducts(prevProducts => {
      return prevProducts.map(product => ({
        ...product,
        conflicts: product.conflicts.map(conflict => 
          conflict.id === conflictId 
            ? { ...conflict, resolved_value: 'resolved', resolved_at: new Date().toISOString() }
            : conflict
        )
      }));
    });
  };

  const handleConflictDeleted = (conflictId) => {
    // Remove the conflict from local state
    setProducts(prevProducts => {
      return prevProducts.map(product => ({
        ...product,
        conflicts: product.conflicts.filter(conflict => conflict.id !== conflictId)
      }))
    });
  };

  const handleExportExcel = async () => {
    try {
      const response = await productsAPI.exportExcel();
      
      // Create blob and download
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers or use default
      const contentDisposition = response.headers['content-disposition'];
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `product-conflicts-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error exporting Excel:', error);
      alert('Failed to export Excel file. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <RefreshCw size={32} className="animate-spin" />
        <p>Loading products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="error">{error}</div>
        <button className="btn" onClick={fetchProducts}>
          Try Again
        </button>
      </div>
    );
  }

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

  // Filter and sort products
  const productsWithConflicts = products
    .map(product => ({
      ...product,
      conflicts: product.conflicts.filter(isRealConflict)
    }))
    .filter(product => product.conflicts.length > 0)
    .sort((a, b) => {
      const aUnresolved = a.conflicts.filter(conflict => !conflict.resolved_value).length;
      const bUnresolved = b.conflicts.filter(conflict => !conflict.resolved_value).length;
      return bUnresolved - aUnresolved;
    });

  const productsWithoutConflicts = products
    .map(product => ({
      ...product,
      conflicts: product.conflicts.filter(isRealConflict)
    }))
    .filter(product => product.conflicts.length === 0)
    .sort((a, b) => a.item_number.localeCompare(b.item_number));

  const totalConflicts = productsWithConflicts.reduce((sum, product) => sum + product.conflicts.length, 0);
  const unresolvedConflicts = productsWithConflicts.reduce((sum, product) => 
    sum + product.conflicts.filter(conflict => !conflict.resolved_value).length, 0
  );
  const resolvedConflicts = totalConflicts - unresolvedConflicts;
  const productsResolved = productsWithConflicts.filter(product => 
    product.conflicts.every(conflict => conflict.resolved_value)
  ).length;

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '30px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h2 style={{ color: 'white', marginBottom: '8px' }}>
            <Package size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Products for {selectedPerson.responsible_person_name}
          </h2>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            className="btn" 
            onClick={handleExportExcel}
            style={{ 
              backgroundColor: '#27ae60', 
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Download size={16} />
            Export Excel
          </button>
          <button className="btn" onClick={onBack}>
            Back to Person Selection
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '20px', 
        marginBottom: '30px' 
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
          color: 'white',
          padding: '24px',
          borderRadius: '12px',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(231, 76, 60, 0.2)'
        }}>
          <AlertTriangle size={32} style={{ marginBottom: '12px' }} />
          <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '4px' }}>
            {productsWithConflicts.length}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>
            Items with Conflicts
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #f39c12, #e67e22)',
          color: 'white',
          padding: '24px',
          borderRadius: '12px',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(243, 156, 18, 0.2)'
        }}>
          <BarChart3 size={32} style={{ marginBottom: '12px' }} />
          <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '4px' }}>
            {unresolvedConflicts}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>
            Unresolved Conflicts
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #27ae60, #229954)',
          color: 'white',
          padding: '24px',
          borderRadius: '12px',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(39, 174, 96, 0.2)'
        }}>
          <CheckCircle size={32} style={{ marginBottom: '12px' }} />
          <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '4px' }}>
            {resolvedConflicts}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>
            Resolved Conflicts
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #3498db, #2980b9)',
          color: 'white',
          padding: '24px',
          borderRadius: '12px',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(52, 152, 219, 0.2)'
        }}>
          <Target size={32} style={{ marginBottom: '12px' }} />
          <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '4px' }}>
            {productsResolved}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>
            Products Resolved
          </div>
        </div>
      </div>


      {products.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <Package size={48} style={{ marginBottom: '16px', color: '#666' }} />
          <h3 style={{ marginBottom: '8px', color: '#333' }}>No Products Found</h3>
          <p style={{ color: '#666' }}>
            No products are assigned to {selectedPerson.responsible_person_name}
          </p>
        </div>
      ) : (
        <div>
          {/* Tabs */}
          <div style={{ 
            display: 'flex', 
            marginBottom: '20px', 
            borderBottom: '2px solid #e9ecef',
            background: 'white',
            borderRadius: '8px 8px 0 0',
            overflow: 'hidden'
          }}>
            <button
              onClick={() => setActiveTab('with-conflicts')}
              style={{
                flex: 1,
                padding: '16px 24px',
                border: 'none',
                background: activeTab === 'with-conflicts' ? '#007bff' : '#f8f9fa',
                color: activeTab === 'with-conflicts' ? 'white' : '#333',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              <AlertCircle size={20} />
              Products with Conflicts ({productsWithConflicts.length})
            </button>
            <button
              onClick={() => setActiveTab('without-conflicts')}
              style={{
                flex: 1,
                padding: '16px 24px',
                border: 'none',
                background: activeTab === 'without-conflicts' ? '#28a745' : '#f8f9fa',
                color: activeTab === 'without-conflicts' ? 'white' : '#333',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              <CheckCircle size={20} />
              Products without Conflicts ({productsWithoutConflicts.length})
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'with-conflicts' ? (
            <div>
              {productsWithConflicts.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                  <CheckCircle size={48} style={{ marginBottom: '16px', color: '#28a745' }} />
                  <h3 style={{ marginBottom: '8px', color: '#333' }}>No Conflicts Found</h3>
                  <p style={{ color: '#666' }}>
                    All products for {selectedPerson.responsible_person_name} have been resolved!
                  </p>
                </div>
              ) : (
                productsWithConflicts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    resolvedBy={selectedPerson.responsible_person_name}
                    onConflictResolved={handleConflictResolved}
                    onConflictDeleted={handleConflictDeleted}
                  />
                ))
              )}
            </div>
          ) : (
            <div>
              {productsWithoutConflicts.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                  <AlertCircle size={48} style={{ marginBottom: '16px', color: '#dc3545' }} />
                  <h3 style={{ marginBottom: '8px', color: '#333' }}>All Products Have Conflicts</h3>
                  <p style={{ color: '#666' }}>
                    Every product for {selectedPerson.responsible_person_name} has conflicts that need resolution.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                  {productsWithoutConflicts.map((product) => (
                    <div key={product.id} className="card" style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '16px',
                      background: '#f8f9fa',
                      border: '1px solid #e9ecef'
                    }}>
                      <CheckCircle size={24} style={{ marginRight: '12px', color: '#28a745' }} />
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '16px', color: '#333' }}>
                          Product #{product.item_number}
                        </div>
                        <div style={{ color: '#666', fontSize: '14px' }}>
                          {product.category}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductList;
