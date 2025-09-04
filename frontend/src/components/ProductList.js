import React, { useState, useEffect } from 'react';
import { Package, RefreshCw, Upload, FileSpreadsheet } from 'lucide-react';
import ProductCard from './ProductCard';
import { productsAPI } from '../services/api';

const ProductList = ({ selectedPerson, onBack }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

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

  const totalConflicts = products.reduce((sum, product) => sum + product.conflicts.length, 0);
  const unresolvedConflicts = products.reduce((sum, product) => 
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
            {products.length} products • {unresolvedConflicts} unresolved conflicts
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
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              resolvedBy={selectedPerson.responsible_person_name}
              onConflictResolved={handleConflictResolved}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductList;
