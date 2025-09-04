import React, { useState, useEffect } from 'react';
import { Package, RefreshCw, Upload, FileSpreadsheet, Filter, CheckCircle } from 'lucide-react';
import ProductCard from './ProductCard';
import { productsAPI } from '../services/api';

const ProductList = ({ selectedPerson, onBack }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
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

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    try {
      await productsAPI.uploadExcel(uploadFile);
      setShowUpload(false);
      setUploadFile(null);
      fetchProducts(); // Refresh the product list
    } catch (err) {
      setError('Failed to upload Excel file');
    } finally {
      setUploading(false);
    }
  };

  const handleConflictResolved = () => {
    // Small delay to allow the UI to update smoothly
    setTimeout(() => {
      fetchProducts(); // Refresh the product list
    }, 100);
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
    .sort((a, b) => b.conflicts.length - a.conflicts.length);

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
          <p style={{ color: 'white', opacity: 0.9 }}>
            {productsWithConflicts.length} products with conflicts • {productsWithoutConflicts.length} products without conflicts • {unresolvedConflicts} unresolved conflicts
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => setShowUpload(!showUpload)}
          >
            <Upload size={16} style={{ marginRight: '8px' }} />
            Upload Excel
          </button>
          <button className="btn" onClick={onBack}>
            Back to Person Selection
          </button>
        </div>
      </div>

      {showUpload && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center' }}>
            <FileSpreadsheet size={20} style={{ marginRight: '8px' }} />
            Upload Excel File
          </h3>
          <form onSubmit={handleFileUpload}>
            <div className="form-group">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setUploadFile(e.target.files[0])}
                className="form-input"
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                type="submit" 
                className="btn btn-success"
                disabled={!uploadFile || uploading}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setShowUpload(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {products.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <Package size={48} style={{ marginBottom: '16px', color: '#666' }} />
          <h3 style={{ marginBottom: '8px', color: '#333' }}>No Products Found</h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            No products are assigned to {selectedPerson.responsible_person_name}
          </p>
          <button className="btn" onClick={() => setShowUpload(true)}>
            Upload Excel File
          </button>
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
