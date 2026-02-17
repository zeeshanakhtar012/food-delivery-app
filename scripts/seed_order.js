require('dotenv').config();
const { pool } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

async function seed() {
    try {
        console.error('--- SEEDING ORDER ---');

        // 1. Get Restaurant
        const resRest = await pool.query('SELECT * FROM restaurants LIMIT 1');
        let restaurantId;
        if (resRest.rows.length === 0) {
            console.error('No restaurant found. Creating one...');
            const newRest = await pool.query(`
            INSERT INTO restaurants (name, email, phone, address, is_active)
            VALUES ('Demo Resto', 'demo@test.com', '123456', '123 St', true)
            RETURNING id
        `);
            restaurantId = newRest.rows[0].id;
        } else {
            restaurantId = resRest.rows[0].id;
        }
        console.error('Restaurant ID:', restaurantId);

        // 2. Get User
        const resUser = await pool.query('SELECT * FROM users WHERE restaurant_id = $1 LIMIT 1', [restaurantId]);
        let userId;
        if (resUser.rows.length === 0) {
            console.error('No user found. Creating one...');
            const newUser = await pool.query(`
            INSERT INTO users (name, email, password, phone, restaurant_id)
            VALUES ('Demo User', 'user@test.com', 'hash', '555555', $1)
            RETURNING id
        `, [restaurantId]);
            userId = newUser.rows[0].id;
        } else {
            userId = resUser.rows[0].id;
        }
        console.error('User ID:', userId);

        // 3. Get Food
        const resFood = await pool.query('SELECT * FROM foods WHERE restaurant_id = $1 LIMIT 1', [restaurantId]);
        let foodId, foodPrice;
        if (resFood.rows.length === 0) {
            console.error('No food found. Creating one...');
            const newFood = await pool.query(`
            INSERT INTO foods (restaurant_id, name, price, description, is_available)
            VALUES ($1, 'Burger', 10.99, 'Delicious', true)
            RETURNING id, price
        `, [restaurantId]);
            foodId = newFood.rows[0].id;
            foodPrice = newFood.rows[0].price;
        } else {
            foodId = resFood.rows[0].id;
            foodPrice = resFood.rows[0].price;
        }
        console.error('Food ID:', foodId);

        // 4. Create Order
        const orderId = uuidv4();
        const total = foodPrice * 2;
        await pool.query(`
        INSERT INTO orders (id, user_id, restaurant_id, total_amount, status, delivery_lat, delivery_lng, created_at)
        VALUES ($1, $2, $3, $4, 'accepted', 0, 0, NOW())
    `, [orderId, userId, restaurantId, total]);

        // 5. Create Order Items
        await pool.query(`
        INSERT INTO order_items (order_id, food_id, quantity, price)
        VALUES ($1, $2, 2, $3)
    `, [orderId, foodId, foodPrice]);

        console.error('✅ ORDER CREATED SUCCESSFULLY:', orderId);
        console.error('PLEASE REFRESH KITCHEN DISPLAY');

    } catch (err) {
        console.error('Seed Error:', err);
    } finally {
        console.error('--- END SEED ---');
        process.exit(0);
    }
}

seed();
