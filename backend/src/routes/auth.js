import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import pool from '../utils/db.js';

const router = Router();

/* =========================================================
   RESET PASSWORD TOKEN STORAGE
   เก็บโทเคนชั่วคราว อายุ 15 นาที
========================================================= */
const resetTokens = new Map();

/* =========================================================
   PASSWORD POLICY
========================================================= */
const passwordPolicy =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

/* =========================================================
   JWT
========================================================= */
function sign(user) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not configured in .env');
  }

  return jwt.sign(user, secret, {
    expiresIn: '2h'
  });
}

/* =========================================================
   REGISTER EMPLOYEE
   POST /api/auth/register
========================================================= */
router.post('/register', async (req, res, next) => {
  try {
    const {
      name,
      departmentId,
      email,
      phone,
      password
    } = req.body;

    if (!name || !departmentId || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'กรอกข้อมูลที่จำเป็นให้ครบ'
      });
    }

    if (
      typeof password !== 'string' ||
      !passwordPolicy.test(password)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Password ต้องมีอย่างน้อย 8 ตัวอักษร ประกอบด้วย A-Z, a-z, ตัวเลข และอักขระพิเศษ'
      });
    }

    const emailValue = String(email).trim();

    const [exists] = await pool.query(
      `SELECT EmployeeID
       FROM Employee
       WHERE Email = ?
       LIMIT 1`,
      [emailValue]
    );

    if (exists.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'อีเมลนี้สมัครสมาชิกแล้ว'
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO Employee
       (Name, DepartmentID, Email, Phone, Password)
       VALUES (?, ?, ?, ?, ?)`,
      [
        name,
        departmentId,
        emailValue,
        phone || null,
        hash
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'สมัครสมาชิกสำเร็จ',
      employeeId: result.insertId
    });
  } catch (error) {
    console.error('REGISTER ERROR:', error.message);
    next(error);
  }
});

/* =========================================================
   LOGIN
   Admin = Username + Password
   Employee = Email + Password

   POST /api/auth/login
========================================================= */
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (
      typeof username !== 'string' ||
      !username.trim() ||
      typeof password !== 'string' ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอก Username/Email และ Password'
      });
    }

    const loginValue = username.trim();

    // 1. ตรวจสอบ Admin
    const [admins] = await pool.query(
      `SELECT AdminID, Username, Password, Role
       FROM Admin
       WHERE Username = ?
       LIMIT 1`,
      [loginValue]
    );

    if (admins.length > 0) {
      const admin = admins[0];

      const passwordCorrect = await bcrypt.compare(
        password,
        admin.Password
      );

      if (!passwordCorrect) {
        return res.status(401).json({
          success: false,
          message: 'Username หรือ Password ไม่ถูกต้อง'
        });
      }

      const token = sign({
        id: admin.AdminID,
        username: admin.Username,
        role: admin.Role,
        type: 'admin'
      });

      return res.json({
        success: true,
        message: 'เข้าสู่ระบบ Admin สำเร็จ',
        token,
        user: {
          id: admin.AdminID,
          name: admin.Username,
          username: admin.Username,
          role: admin.Role,
          type: 'admin'
        }
      });
    }

    // 2. ตรวจสอบ Employee
    const [employees] = await pool.query(
      `SELECT EmployeeID, Name, Email, Password, DepartmentID
       FROM Employee
       WHERE Email = ?
       LIMIT 1`,
      [loginValue]
    );

    if (employees.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Username/Email หรือ Password ไม่ถูกต้อง'
      });
    }

    const employee = employees[0];

    const passwordCorrect = await bcrypt.compare(
      password,
      employee.Password
    );

    if (!passwordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Username/Email หรือ Password ไม่ถูกต้อง'
      });
    }

    const token = sign({
      id: employee.EmployeeID,
      name: employee.Name,
      email: employee.Email,
      role: 'Customer',
      type: 'employee'
    });

    return res.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      token,
      user: {
        id: employee.EmployeeID,
        name: employee.Name,
        email: employee.Email,
        role: 'Customer',
        type: 'employee'
      }
    });
  } catch (error) {
    console.error('LOGIN ERROR:', error.message);
    next(error);
  }
});

/* =========================================================
   GET CURRENT USER PROFILE
   GET /api/auth/me
   รองรับทั้ง Admin และ Employee
========================================================= */
router.get('/me', async (req, res, next) => {
  try {
    // 1. ตรวจสอบ Authorization Header
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.trim().split(/\s+/);

    if (
      scheme?.toLowerCase() !== 'bearer' ||
      !token
    ) {
      return res.status(401).json({
        success: false,
        message: 'กรุณาเข้าสู่ระบบใหม่'
      });
    }

    // 2. ตรวจสอบ JWT_SECRET
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return res.status(500).json({
        success: false,
        message: 'ระบบยังไม่ได้ตั้งค่า JWT_SECRET'
      });
    }

    // 3. ตรวจสอบ Token
    let decoded;

    try {
      decoded = jwt.verify(token, secret);
    } catch {
      return res.status(401).json({
        success: false,
        message:
          'เซสชันหมดอายุหรือ Token ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่'
      });
    }

    // 4. อนุญาตเฉพาะประเภทบัญชีที่ระบบรองรับ
    if (!['admin', 'employee'].includes(decoded.type)) {
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์เข้าถึงข้อมูล'
      });
    }

    // 5. ถ้าเป็น Admin ให้ค้นหาจากตาราง Admin
    if (decoded.type === 'admin') {
      const [admins] = await pool.query(
        `SELECT AdminID, Username, Role
         FROM Admin
         WHERE AdminID = ?
         LIMIT 1`,
        [decoded.id]
      );

      if (admins.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบบัญชี Admin'
        });
      }

      const admin = admins[0];

      return res.json({
        success: true,
        user: {
          id: admin.AdminID,
          name: admin.Username,
          username: admin.Username,
          role: admin.Role,
          type: 'admin'
        }
      });
    }

    // 6. ถ้าเป็น Employee ให้ค้นหาจากตาราง Employee
    const [employees] = await pool.query(
      `SELECT
         e.EmployeeID,
         e.Name,
         e.Email,
         e.Phone,
         e.DepartmentID,
         d.DepartmentName
       FROM Employee e
       LEFT JOIN Department d
         ON e.DepartmentID = d.DepartmentID
       WHERE e.EmployeeID = ?
       LIMIT 1`,
      [decoded.id]
    );

    if (employees.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบบัญชีพนักงาน'
      });
    }

    const employee = employees[0];

    return res.json({
      success: true,
      user: {
        id: employee.EmployeeID,
        name: employee.Name,
        email: employee.Email,
        phone: employee.Phone,
        departmentId: employee.DepartmentID,
        departmentName: employee.DepartmentName,
        role: 'Customer',
        type: 'employee'
      }
    });
  } catch (error) {
    console.error('GET PROFILE ERROR:', error.message);
    next(error);
  }
});

/* =========================================================
   FORGOT PASSWORD
   POST /api/auth/forgot-password
========================================================= */
router.post('/forgot-password', async (req, res) => {
  let tokenHash = null;

  try {
    const email = req.body?.email;

    if (
      typeof email !== 'string' ||
      !email.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกอีเมล'
      });
    }

    const emailValue = email.trim();

    const [employees] = await pool.query(
      `SELECT EmployeeID, Name, Email
       FROM Employee
       WHERE Email = ?
       LIMIT 1`,
      [emailValue]
    );

    const genericMessage =
      'หากอีเมลนี้ลงทะเบียนไว้ ระบบจะส่งลิงก์รีเซ็ตรหัสผ่านให้';

    if (employees.length === 0) {
      return res.json({
        success: true,
        message: genericMessage
      });
    }

    const {
      MAIL_HOST,
      MAIL_USER,
      MAIL_PASS,
      MAIL_FROM,
      FRONTEND_URL
    } = process.env;

    const mailPort = Number(
      process.env.MAIL_PORT || 587
    );

    if (
      !MAIL_HOST ||
      !MAIL_USER ||
      !MAIL_PASS ||
      !MAIL_FROM ||
      !FRONTEND_URL ||
      !Number.isInteger(mailPort) ||
      mailPort < 1 ||
      mailPort > 65535
    ) {
      console.error('Email configuration is incomplete');

      return res.status(500).json({
        success: false,
        message:
          'ระบบส่งอีเมลยังตั้งค่าไม่ครบ กรุณาติดต่อผู้ดูแลระบบ'
      });
    }

    let frontendUrl;

    try {
      frontendUrl = new URL(FRONTEND_URL);

      if (
        !['http:', 'https:'].includes(frontendUrl.protocol) ||
        frontendUrl.username ||
        frontendUrl.password
      ) {
        throw new Error('Invalid FRONTEND_URL');
      }
    } catch {
      return res.status(500).json({
        success: false,
        message:
          'การตั้งค่า URL สำหรับรีเซ็ตรหัสผ่านไม่ถูกต้อง'
      });
    }

    // สร้างโทเคนสุ่ม 256 บิต
    const rawToken = crypto.randomBytes(32).toString('hex');

    tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    // ล้างโทเคนหมดอายุ
    for (const [key, value] of resetTokens.entries()) {
      if (value.expires <= Date.now()) {
        resetTokens.delete(key);
      }
    }

    // โทเคนใหม่มีอายุ 15 นาที
    resetTokens.set(tokenHash, {
      employeeId: employees[0].EmployeeID,
      expires: Date.now() + 15 * 60 * 1000
    });

    const transporter = nodemailer.createTransport({
      host: MAIL_HOST,
      port: mailPort,
      secure: mailPort === 465,
      auth: {
        user: MAIL_USER,
        pass: MAIL_PASS
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000
    });

    frontendUrl.pathname =
      `${frontendUrl.pathname.replace(/\/+$/, '')}/reset-password/${rawToken}`;

    frontendUrl.search = '';
    frontendUrl.hash = '';

    const resetLink = frontendUrl.toString();

    await transporter.sendMail({
      from: MAIL_FROM,
      to: emailValue,
      subject: 'Reset Password - Company Asset System',
      text:
        `สวัสดี ${employees[0].Name || ''}\n\n` +
        `คลิกลิงก์ด้านล่างเพื่อตั้งรหัสผ่านใหม่:\n` +
        `${resetLink}\n\n` +
        `ลิงก์หมดอายุภายใน 15 นาทีและใช้ได้เพียงครั้งเดียว\n\n` +
        `หากคุณไม่ได้ร้องขอ กรุณาเพิกเฉยต่ออีเมลฉบับนี้`
    });

    return res.json({
      success: true,
      message: genericMessage
    });
  } catch (error) {
    if (tokenHash) {
      resetTokens.delete(tokenHash);
    }

    console.error('FORGOT PASSWORD ERROR:', error.message);

    return res.status(500).json({
      success: false,
      message:
        'ส่งอีเมลไม่สำเร็จ กรุณาตรวจสอบการตั้งค่าอีเมล'
    });
  }
});

/* =========================================================
   RESET PASSWORD
   POST /api/auth/reset-password
========================================================= */
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body || {};

    if (
      typeof token !== 'string' ||
      !/^[a-f0-9]{64}$/i.test(token) ||
      typeof password !== 'string' ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'ลิงก์หรือข้อมูลไม่ถูกต้อง'
      });
    }

    if (!passwordPolicy.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร ประกอบด้วยตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ ตัวเลข และอักขระพิเศษ'
      });
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const item = resetTokens.get(tokenHash);

    if (!item) {
      return res.status(400).json({
        success: false,
        message:
          'ลิงก์ไม่ถูกต้อง ถูกใช้ไปแล้ว หรือหมดอายุ กรุณาขอลิงก์ใหม่'
      });
    }

    if (item.expires <= Date.now()) {
      resetTokens.delete(tokenHash);

      return res.status(400).json({
        success: false,
        message: 'ลิงก์หมดอายุแล้ว กรุณาขอลิงก์ใหม่'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `UPDATE Employee
       SET Password = ?
       WHERE EmployeeID = ?`,
      [passwordHash, item.employeeId]
    );

    if (result.affectedRows !== 1) {
      resetTokens.delete(tokenHash);

      return res.status(400).json({
        success: false,
        message: 'ไม่พบบัญชีผู้ใช้ กรุณาขอลิงก์ใหม่'
      });
    }

    resetTokens.delete(tokenHash);

    return res.json({
      success: true,
      message:
        'เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่'
    });
  } catch (error) {
    console.error('RESET PASSWORD ERROR:', error.message);
    next(error);
  }
});

/* =========================================================
   EXPORT ROUTER
========================================================= */
export default router;