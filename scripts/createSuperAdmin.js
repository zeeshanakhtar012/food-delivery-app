/**
 * Script to create the first super admin
 * Usage: node scripts/createSuperAdmin.js
 */

require('dotenv').config();
const { query } = require('../config/db');
const Admin = require('../models/PostgreSQL/Admin');
const { v4: uuidv4 } = require('uuid');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createSuperAdmin() {
  try {
    console.log('🔧 Creating Super Admin Account\n');

    const name = await question('Enter admin name: ');
    const email = await question('Enter admin email: ');
    const password = await question('Enter admin password: ');

    if (!name || !email || !password) {
      console.error('❌ All fields are required');
      process.exit(1);
    }

    // Check if email exists
    const existingAdmin = await Admin.findByEmail(email);
    if (existingAdmin) {
      console.error('❌ Admin with this email already exists');
      process.exit(1);
    }

    // Create super admin
    const admin = await Admin.create({
      name,
      email,
      password,
      restaurant_id: null,
      role: 'super_admin'
    });

    console.log('\n✅ Super Admin created successfully!');
    console.log('\nAdmin Details:');
    console.log(`  ID: ${admin.id}`);
    console.log(`  Name: ${admin.name}`);
    console.log(`  Email: ${admin.email}`);
    console.log(`  Role: ${admin.role}`);
    console.log('\nYou can now login at: POST /api/superadmin/login');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating super admin:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
createSuperAdmin();

