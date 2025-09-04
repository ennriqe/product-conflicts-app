# 🚀 Database Setup Instructions

## Step 1: Get Database Password

1. Go to your [Render Dashboard](https://dashboard.render.com)
2. Click on your database: `product-conflicts-db`
3. Go to the "Info" tab
4. Copy the **Internal Database URL** (it looks like: `postgresql://product_conflicts_db_user:XXXXX@dpg-d2ssre95pdvs738vdm0g-a.oregon-postgres.render.com:5432/product_conflicts_db`)

## Step 2: Update Database Connection

1. Open `setup-database.js` in your editor
2. Replace `YOUR_DATABASE_PASSWORD` with the actual password from the connection string
3. Or set the environment variable:
   ```bash
   export DATABASE_URL="postgresql://product_conflicts_db_user:YOUR_ACTUAL_PASSWORD@dpg-d2ssre95pdvs738vdm0g-a.oregon-postgres.render.com:5432/product_conflicts_db?sslmode=require"
   ```

## Step 3: Populate Database

Run the setup script:

```bash
npm run setup-db
```

This will:
- ✅ Create all necessary database tables
- 📊 Import all 94 products from your Excel file
- 🔍 Process all conflicts between quality lines and attributes
- 👥 Set up responsible persons

## Step 4: Test Your App

1. **Frontend**: https://product-conflicts-frontend.onrender.com
2. **Password**: `karsten2025`
3. Select a person and start resolving conflicts!

## Troubleshooting

If you get connection errors:
- Make sure you're using the correct password from Render
- Ensure your database is running (status should be "Available")
- Check that the connection string includes `?sslmode=require`

## What's Next?

Once the database is populated, your app will be fully functional:
- Users can log in with the password
- Select their name from the list
- View products assigned to them
- Resolve conflicts by selecting correct values
- Add comments for additional context
- Track progress as conflicts get resolved

🎉 **Your Product Conflicts Resolution App is ready to use!**
