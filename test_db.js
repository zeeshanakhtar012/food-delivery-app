const { pool } = require('./config/db');
async function test() {
  const res = await pool.query("SELECT id, name FROM restaurants");
  console.log(res.rows);
  process.exit(0);
}
test();
