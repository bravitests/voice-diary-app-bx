const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function resetAndSetupAdmin() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Resetting database...');
    
    // Drop all tables in reverse order (to handle foreign key constraints)
    await client.query('DROP TABLE IF EXISTS api_usage CASCADE;');
    await client.query('DROP TABLE IF EXISTS chat_messages CASCADE;');
    await client.query('DROP TABLE IF EXISTS chat_sessions CASCADE;');
    await client.query('DROP TABLE IF EXISTS subscriptions CASCADE;');
    await client.query('DROP TABLE IF EXISTS recordings CASCADE;');
    await client.query('DROP TABLE IF EXISTS purposes CASCADE;');
    await client.query('DROP TABLE IF EXISTS users CASCADE;');
    
    // Drop the trigger function
    await client.query('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;');
    
    console.log('✅ Database tables dropped');
    
    // Recreate schema by reading and executing the SQL file
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(__dirname, '001_initial_schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schemaSQL);
    
    console.log('✅ Database schema recreated');
    
    // Insert admin user
    const adminWallet = '0xe1ea4DdeF80c390744a49Bb3D2C185e7151A6843';
    const adminName = 'Bravian Nyatoro';
    const adminEmail = 'nyatorobravian@gmail.com';
    
    const insertAdminQuery = `
      INSERT INTO users (wallet_address, name, email, subscription_tier, is_admin)
      VALUES ($1, $2, $3, 'pro', true)
      RETURNING id, wallet_address, name, email, is_admin;
    `;
    
    const result = await client.query(insertAdminQuery, [adminWallet, adminName, adminEmail]);
    const adminUser = result.rows[0];
    
    console.log('✅ Admin user created:');
    console.log(`   ID: ${adminUser.id}`);
    console.log(`   Wallet: ${adminUser.wallet_address}`);
    console.log(`   Name: ${adminUser.name}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Admin: ${adminUser.is_admin}`);
    
    // Create default purpose for admin
    const defaultPurposeQuery = `
      INSERT INTO purposes (user_id, name, description, color, is_default)
      VALUES ($1, 'General', 'General diary entries', '#cdb4db', true)
      RETURNING id, name;
    `;
    
    const purposeResult = await client.query(defaultPurposeQuery, [adminUser.id]);
    console.log(`✅ Default purpose created: ${purposeResult.rows[0].name}`);
    
    console.log('\n🎉 Database reset complete! Admin user is ready.');
    
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
resetAndSetupAdmin()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });