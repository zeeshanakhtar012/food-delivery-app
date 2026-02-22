const axios = require('axios');
const io = require('socket.io-client');
const { query } = require('./config/db');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

let serverProcess;
const port = 5065;
const baseURL = `http://localhost:${port}/api`;

async function addTestAdminAndRestaurant() {
    const adminEmail = `admin_sec_${Date.now()}@test.com`;
    const staffEmail = `staff_sec_${Date.now()}@test.com`;
    // Create restaurant
    const resResult = await query(
        `INSERT INTO restaurants (name, email, phone, address) VALUES ($1, $2, $3, $4) RETURNING id`,
        [`Test Res Sec`, `res_sec_${Date.now()}@test.com`, '123456789', '123 Test St']
    );
    const restaurantId = resResult.rows[0].id;

    // Create Admin
    const hashedPassword = await bcrypt.hash('password123', 10);
    const adminResult = await query(
        `INSERT INTO admins (name, email, password, restaurant_id, role) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        ['Test Admin Sec', adminEmail, hashedPassword, restaurantId, 'restaurant_admin']
    );

    return { adminEmail, staffEmail, restaurantId };
}

async function runSecurityTests() {
    try {
        console.log('Starting local server...');
        serverProcess = require('child_process').spawn('node', ['server.js'], {
            env: { ...process.env, PORT: port }
        });

        await new Promise(resolve => setTimeout(resolve, 3000));

        const { adminEmail, staffEmail, restaurantId } = await addTestAdminAndRestaurant();

        // 1. Admin Login
        const adminLoginRes = await axios.post(`${baseURL}/admin/login`, {
            email: adminEmail,
            password: 'password123'
        });
        const adminToken = adminLoginRes.data.data.token;
        console.log('Admin logged in:', !!adminToken);

        // 2. Admin creates Staff
        const createStaffRes = await axios.post(`${baseURL}/admin/staff`, {
            name: 'Pausable Staff',
            email: staffEmail,
            password: 'password123',
            phone: '123123123',
            role: 'cashier'
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        const staffId = createStaffRes.data.data.id;
        console.log('Staff created via API. ID:', staffId);

        // 3. Staff Logs In Successfully First Time
        const staffLoginRes1 = await axios.post(`${baseURL}/staff/auth/login`, {
            email: staffEmail,
            password: 'password123'
        });
        const staffToken = staffLoginRes1.data.data.token;
        console.log('Staff logged in successfully:', !!staffToken);

        // 4. Staff connects to socket
        console.log('Connecting socket...');
        const socket = io(`http://localhost:${port}`, {
            auth: { token: staffToken },
            transports: ['websocket']
        });

        let receivedPauseEvent = false;
        socket.on('staffStatusUpdate', (data) => {
            console.log('Received socket event mapping to staffStatusUpdate:', data);
            if (data.is_active === false) {
                receivedPauseEvent = true;
            }
        });

        await new Promise(resolve => setTimeout(resolve, 1000));

        // 5. Admin Pauses Staff
        console.log('Admin pausing staff...');
        await axios.put(`${baseURL}/admin/staff/${staffId}`, {
            is_active: false
        }, { headers: { Authorization: `Bearer ${adminToken}` } });

        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('Socket Pause Event Received:', receivedPauseEvent);

        if (!receivedPauseEvent) {
            throw new Error('Did not receive staffStatusUpdate event!');
        }

        // 6. Staff Tries to Login Again
        try {
            await axios.post(`${baseURL}/staff/auth/login`, {
                email: staffEmail,
                password: 'password123'
            });
            throw new Error('Should not have logged in!');
        } catch (error) {
            console.log('Staff blocked from logging in with 403:', error.response.status === 403);
            if (error.response.status !== 403) throw error;
        }

        // 7. Test /profile is blocked
        try {
            await axios.get(`${baseURL}/staff/profile`, {
                headers: { Authorization: `Bearer ${staffToken}` }
            });
            throw new Error('Profile should have been blocked!');
        } catch (error) {
            console.log('Profile blocked with 403:', error.response.status === 403);
            if (error.response.status !== 403) throw error;
        }

        // 8. Test /status returns false
        const statusRes = await axios.get(`${baseURL}/staff/status`, {
            headers: { Authorization: `Bearer ${staffToken}` }
        });
        console.log('Status endpoint reflects inactive:', statusRes.data.data.is_active === false);

        console.log('ALL SECURITY TESTS PASSED!');
        process.exit(0);

    } catch (e) {
        if (e.response) {
            console.error('Test Failed:', e.response.status, e.response.data);
        } else {
            console.error('Test Failed:', e);
        }
        process.exit(1);
    } finally {
        if (serverProcess) serverProcess.kill();
        process.exit(0);
    }
}

runSecurityTests();
