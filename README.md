# Product Conflicts Resolution App

A web application for resolving data conflicts between quality lines and attributes in product data.

## Features

- 🔐 Password-protected access (karsten2025)
- 👥 Person selection based on responsibility
- 📊 Product conflict visualization
- ✅ Conflict resolution with comments
- 📁 Excel file upload support
- 🎨 Clean, intuitive interface

## Architecture

- **Backend**: Node.js + Express + PostgreSQL
- **Frontend**: React + Axios
- **Database**: PostgreSQL (hosted on Render)
- **Deployment**: Render (both backend and frontend)

## Setup

### Backend Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Set environment variables:
```bash
cp env.example .env
# Edit .env with your database URL and JWT secret
```

3. Start the server:
```bash
npm start
# or for development:
npm run dev
```

### Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Set environment variables:
```bash
# Create .env file with:
REACT_APP_API_URL=http://localhost:5000/api
```

3. Start the development server:
```bash
npm start
```

## Database Schema

### Products Table
- `id`: Primary key
- `item_number`: Product identifier
- `category`: Product category
- `overall_reason`: Summary of conflicts
- `overall_equal`: Whether overall data is equal
- `responsible_person_name`: Person responsible for the product
- `responsible_person_email`: Email of responsible person

### Conflicts Table
- `id`: Primary key
- `product_id`: Foreign key to products
- `conflict_type`: Type of conflict (Size, Color, etc.)
- `quality_line_value`: Value from quality lines
- `attribute_value`: Value from attributes
- `reason`: Reason for conflict
- `is_equal`: Whether values are equal
- `resolved_value`: Selected correct value
- `resolution_comment`: Additional comments
- `resolved_by`: Person who resolved the conflict

### Resolutions Table
- `id`: Primary key
- `conflict_id`: Foreign key to conflicts
- `selected_value`: The selected correct value
- `comment`: Resolution comment
- `resolved_by`: Person who made the resolution

## API Endpoints

- `POST /api/login` - Authenticate with password
- `GET /api/responsible-persons` - Get list of responsible persons
- `GET /api/products/:email` - Get products for a person
- `POST /api/resolve-conflict` - Resolve a conflict
- `POST /api/upload-excel` - Upload Excel file
- `GET /api/health` - Health check

## Usage

1. Access the application
2. Enter password: `karsten2025`
3. Select your name from the list
4. View products assigned to you
5. Resolve conflicts by selecting the correct value
6. Add comments as needed
7. Track resolution progress

## Deployment

The app is designed to be deployed on Render:

1. Backend: Web Service with Node.js runtime
2. Frontend: Static Site
3. Database: PostgreSQL (Free tier)

Environment variables needed:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT tokens
- `NODE_ENV`: Set to 'production'
