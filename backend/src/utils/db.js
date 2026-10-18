import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  charset: 'utf8mb4'
});

// ตรวจสอบการเชื่อมต่อ MySQL
export async function checkDatabaseConnection() {
  let connection;

  try {
    connection = await pool.getConnection();

    // ทดสอบ Query จริง
    await connection.query('SELECT 1');

    console.log('✓ MySQL Connected');
    console.log(`✓ Database: ${process.env.DB_NAME}`);

    return true;
  } catch (error) {
    console.error('✗ MySQL Connection Failed');
    console.error(`  Error: ${error.message}`);

    return false;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export default pool;