require('dotenv').config();
const { query } = require('./config/db');
const axios = require('axios');

async function runTests() {
    console.log('Starting tests...');
    try {
        // 1. Get a restaurant and its admin to create a staff member
        console.log('Fetching a restaurant...');
        const result = await query('SELECT id FROM restaurants WHERE is_active = true LIMIT 1');
        if (result.rows.length === 0) {
            console.log('No restaurants found.');
            process.exit(0);
        }
        const restaurantId = result.rows[0].id;

        // Patch DB because 'reservation_id' might be missing from 'orders'
        console.log('Patching DB...');
        await query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS reservation_id UUID;');
        await query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;');
        await query('ALTER TABLE orders ALTER COLUMN delivery_lat DROP NOT NULL;');
        await query('ALTER TABLE orders ALTER COLUMN delivery_lng DROP NOT NULL;');

        // We can just create a staff member directly in the DB for testing, avoiding admin login overhead.
        const { v4: uuidv4 } = require('uuid');
        const bcrypt = require('bcryptjs');
        const RestaurantStaff = require('./models/PostgreSQL/RestaurantStaff');
        const Table = require('./models/PostgreSQL/Table');

        const staffEmail = `test_waiter_${Date.now()}@test.com`;
        const password = 'password123';

        console.log(`Creating staff member: ${staffEmail}`);
        const staff = await RestaurantStaff.create({
            restaurant_id: restaurantId,
            name: 'Test Waiter',
            email: staffEmail,
            password: password,
            phone: '1234567890',
            role: 'cashier' // Or any role
        });

        console.log(`Creating a table for restaurant ${restaurantId}...`);
        const tableInfo = await Table.create({
            restaurant_id: restaurantId,
            table_number: `T-${Date.now().toString().slice(-4)}`,
            capacity: 4,
            qr_code_url: 'http://example.com'
        });

        let serverProcess;
        console.log('Starting local server on a test port...');
        serverProcess = require('child_process').spawn('node', ['server.js'], {
            env: { ...process.env, PORT: 5060 }
        });
        serverProcess.stdout.on('data', d => console.log('SERVER OUT:', d.toString()));
        serverProcess.stderr.on('data', d => console.log('SERVER ERR:', d.toString()));

        await new Promise(resolve => setTimeout(resolve, 3000)); // wait for server to start

        const baseURL = 'http://localhost:5060/api';

        // 2. Test Staff Login
        console.log('Testing Staff Login...');
        const loginRes = await axios.post(`${baseURL}/staff/auth/login`, {
            email: staffEmail,
            password: password
        });
        console.log('Login successful:', loginRes.data.success);
        const token = loginRes.data.data.token;

        const headers = { Authorization: `Bearer ${token}` };

        // 3. Get Menu
        console.log('Testing GET /staff/menu...');
        const menuRes = await axios.get(`${baseURL}/staff/menu`, { headers });
        console.log('Menu fetched, categories count:', menuRes.data.data.length);

        let foodId = null;
        let price = 0;
        if (menuRes.data.data.length > 0 && menuRes.data.data[0].foods && menuRes.data.data[0].foods.length > 0) {
            foodId = menuRes.data.data[0].foods[0].id;
            price = menuRes.data.data[0].foods[0].price;
        } else {
            // Create food from DB if no categories
            const Food = require('./models/PostgreSQL/Food');
            const Category = require('./models/PostgreSQL/FoodCategory');
            const cat = await Category.create({ restaurant_id: restaurantId, name: 'TestCat' });
            const foodResult = await Food.create({
                restaurant_id: restaurantId,
                name: 'Test Food',
                price: 15.00,
                category_id: cat.id
            });
            foodId = foodResult.id;
            price = foodResult.price;
        }

        if (!foodId) {
            console.log('No foods available to create order, test will be limited.');
        }

        // 4. Create Order
        let activeOrder = null;
        if (foodId) {
            console.log('Testing Create Order for table', tableInfo.id);
            const orderRes = await axios.post(`${baseURL}/staff/orders`, {
                table_id: tableInfo.id,
                guest_count: 2,
                items: [{
                    food_id: foodId,
                    quantity: 1
                }]
            }, { headers });
            console.log('Order created:', orderRes.data.success, 'Total:', orderRes.data.data.total_amount);
            activeOrder = orderRes.data.data;

            // Add items
            console.log('Testing Add Items to Order', activeOrder.id);
            const addItemsRes = await axios.put(`${baseURL}/staff/orders/${activeOrder.id}/add-items`, {
                items: [{
                    food_id: foodId,
                    quantity: 2
                }]
            }, { headers });
            console.log('Items added:', addItemsRes.data.success, 'New Total:', addItemsRes.data.data.total_amount);
        }

        // 5. Get Tables
        console.log('Testing GET /staff/tables...');
        const tablesRes = await axios.get(`${baseURL}/staff/tables`, { headers });
        console.log('Tables fetched, count:', tablesRes.data.data.length);
        const myTable = tablesRes.data.data.find(t => t.id === tableInfo.id);
        if (myTable) {
            console.log('My Table status:', myTable.status);
            if (myTable.active_order) {
                console.log('Active Order ID on table:', myTable.active_order.id);
            }
        }

        // 6. Test Admin checkout (we can do it directly via controller helper or DB to avoid needing admin token)
        // Actually, creating an admin is easy in DB
        const adminEmail = `test_admin_${Date.now()}@test.com`;
        const Admin = require('./models/PostgreSQL/Admin');
        console.log(`Creating Admin: ${adminEmail}`);
        const admin = await Admin.create({
            restaurant_id: restaurantId,
            name: 'Test Admin',
            email: adminEmail,
            password: 'password123',
            role: 'restaurant_admin'
        });

        const adminLoginRes = await axios.post(`http://localhost:5060/api/admin/login`, {
            email: adminEmail,
            password: 'password123'
        });
        const adminToken = adminLoginRes.data.data.token;

        if (activeOrder) {
            console.log(`Admin checking out table ${tableInfo.id}...`);
            const checkoutRes = await axios.put(`${baseURL}/admin/tables/${tableInfo.id}/checkout`, {}, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            console.log('Table checked out:', checkoutRes.data.success);

            const finalTableQuery = await query('SELECT status FROM restaurant_tables WHERE id = $1', [tableInfo.id]);
            console.log('Final table status:', finalTableQuery.rows[0].status);
        }

        console.log('Tests finished successfully!');
        process.exit(0);
    } catch (error) {
        if (error.response) {
            console.error('Test Failed at API:', error.response.status, error.response.data);
        } else {
            console.error('Test Failed:', error);
        }
        process.exit(1);
    } finally {
        // Stop server regardless of success or failure
        if (serverProcess) {
            console.log('Stopping local server...');
            serverProcess.kill();
        }
    }
}

runTests();
