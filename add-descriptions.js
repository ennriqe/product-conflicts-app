const axios = require('axios');

const API_BASE_URL = 'https://product-conflicts-app.onrender.com/api';

// Sample descriptions for different product categories
const sampleDescriptions = {
  'PERSONAL CARE': [
    'Electric Toothbrush with Smart Timer',
    'Sonic Electric Toothbrush Pro',
    'Water Flosser with 3 Pressure Settings',
    'Electric Razor with Precision Trimmer',
    'Facial Cleansing Brush with 2 Speeds',
    'Hair Dryer with Ionic Technology',
    'Electric Nail File Kit',
    'Personal Massager with Heat Therapy',
    'Electric Shaver for Sensitive Skin',
    'Oral Irrigator with Multiple Tips'
  ],
  'HOME APPLIANCES': [
    'Smart Coffee Maker with App Control',
    'Air Purifier with HEPA Filter',
    'Robot Vacuum with Mapping Technology',
    'Smart Thermostat with Voice Control',
    'Bluetooth Speaker with Waterproof Design',
    'LED Desk Lamp with USB Charging',
    'Electric Kettle with Temperature Control',
    'Smart Doorbell with Video Recording',
    'Wireless Charging Pad for Multiple Devices',
    'Smart Light Bulb with Color Changing'
  ],
  'KITCHEN': [
    'Stainless Steel Blender with 6 Blades',
    'Digital Food Scale with Tare Function',
    'Electric Can Opener with Auto Shut-off',
    'Coffee Grinder with Burr Grinding',
    'Electric Mixer with 5 Speeds',
    'Food Processor with Multiple Attachments',
    'Electric Knife Sharpener with Diamond Wheels',
    'Immersion Blender with Whisk Attachment',
    'Electric Salt and Pepper Grinder Set',
    'Digital Kitchen Timer with Magnetic Back'
  ],
  'ELECTRONICS': [
    'Wireless Bluetooth Headphones with Noise Cancellation',
    'Portable Power Bank with Fast Charging',
    'USB-C Hub with Multiple Ports',
    'Wireless Mouse with Ergonomic Design',
    'Mechanical Keyboard with RGB Lighting',
    'Webcam with 4K Resolution',
    'Tablet Stand with Adjustable Angle',
    'Cable Management Organizer Set',
    'Phone Mount for Car Dashboard',
    'Laptop Cooling Pad with Dual Fans'
  ]
};

async function addDescriptions() {
  try {
    // Login first
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${API_BASE_URL}/login`, {
      password: 'karsten2025'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Logged in successfully');
    
    // Get all responsible persons
    const personsResponse = await axios.get(`${API_BASE_URL}/responsible-persons`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const persons = personsResponse.data;
    console.log(`👥 Found ${persons.length} responsible persons`);
    
    for (const person of persons) {
      console.log(`\n📦 Processing ${person.responsible_person_name}...`);
      
      // Get products for this person
      const productsResponse = await axios.get(`${API_BASE_URL}/products/${person.responsible_person_email}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const products = productsResponse.data;
      console.log(`   Found ${products.length} products`);
      
      // Add descriptions to products that don't have them
      for (const product of products) {
        if (!product.description) {
          const category = product.category || 'PERSONAL CARE';
          const descriptions = sampleDescriptions[category] || sampleDescriptions['PERSONAL CARE'];
          const randomDescription = descriptions[Math.floor(Math.random() * descriptions.length)];
          
          // Update the product with description
          try {
            await axios.put(`${API_BASE_URL}/products/${product.id}`, {
              description: randomDescription
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`   ✅ Added description to Product #${product.item_number}: "${randomDescription}"`);
          } catch (error) {
            console.log(`   ❌ Error updating Product #${product.item_number}:`, error.message);
          }
        }
      }
    }
    
    console.log('\n🎉 Descriptions added successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

addDescriptions();
