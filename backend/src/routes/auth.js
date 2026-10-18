import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import pool from '../utils/db.js';

const router = Router();

/* =========================================================
   RESET PASSWORD TOKEN STORAGE
   เก็บ token ชั่วคราวไว้ใน Memory
========================================================= */

const resetTokens = new Map();

/* =========================================================
   PASSWORD POLICY
   อย่างน้อย 8 ตัว
   มี A-Z
   มี a-z
   มีตัวเลข
   มีอักขระพิเศษ
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

    if (!passwordPolicy.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          'Password ต้องมีอย่างน้อย 8 ตัวอักษร, A-Z, a-z, ตัวเลข และอักขระพิเศษ'
      });
    }

    const [exists] = await pool.query(
      `SELECT EmployeeID
       FROM Employee
       WHERE Email = ?
       LIMIT 1`,
      [email.trim()]
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
        email.trim(),
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
    console.error('REGISTER ERROR:', error);
    next(error);
  }
});

/* =========================================================
   LOGIN
   Admin    = Username + Password
   Employee = Email + Password

   POST /api/auth/login
========================================================= */

router.post('/login', async (req, res, next) => {
  try {
    const {
      username,
      password
    } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอก Username/Email และ Password'
      });
    }

    const loginValue = username.trim();

    /* =====================================================
       1. CHECK ADMIN
    ===================================================== */

    const [admins] = await pool.query(
      `SELECT
        AdminID,
        Username,
        Password,
        Role
       FROM Admin
       WHERE Username = ?
       LIMIT 1`,
      [loginValue]
    );

    if (admins.length > 0) {
      const admin = admins[0];

      console.log(
        'Admin login attempt:',
        admin.Username
      );

      const passwordCorrect = await bcrypt.compare(
        password,
        admin.Password
      );

      if (!passwordCorrect) {
        console.log(
          'Admin password incorrect'
        );

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

      console.log(
        'Admin login successful:',
        admin.Username
      );

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

    /* =====================================================
       2. CHECK EMPLOYEE
    ===================================================== */

    const [employees] = await pool.query(
      `SELECT
        EmployeeID,
        Name,
        Email,
        Password,
        DepartmentID
       FROM Employee
       WHERE Email = ?
       LIMIT 1`,
      [loginValue]
    );

    if (employees.length === 0) {
      return res.status(401).json({
        success: false,
        message:
          'Username/Email หรือ Password ไม่ถูกต้อง'
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
        message:
          'Username/Email หรือ Password ไม่ถูกต้อง'
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
    console.error(
      'LOGIN ERROR:',
      error
    );

    next(error);
  }
});

/* =========================================================
   FORGOT PASSWORD
   POST /api/auth/forgot-password
========================================================= */

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอก Email'
      });
    }

    const emailValue = email.trim();

    const [rows] = await pool.query(
      `SELECT
        EmployeeID,
        Name,
        Email
       FROM Employee
       WHERE Email = ?
       LIMIT 1`,
      [emailValue]
    );

    /*
      ไม่เปิดเผยว่า Email มีอยู่ในระบบหรือไม่
    */

    if (rows.length === 0) {
      return res.json({
        success: true,
        message:
          'หากอีเมลนี้อยู่ในระบบ จะได้รับลิงก์ reset password'
      });
    }

    /* =====================================================
       สร้าง Reset Token
    ===================================================== */

    const rawToken = crypto
      .randomBytes(32)
      .toString('hex');

    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    /* =====================================================
       เก็บ Token
       อายุ 15 นาที
    ===================================================== */

    resetTokens.set(tokenHash, {
      employeeId: rows[0].EmployeeID,
      expires: Date.now() + 15 * 60 * 1000
    });

    /* =====================================================
       EMAIL
    ===================================================== */

    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(
        process.env.MAIL_PORT || 587
      ),
      secure: false,

      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
      }
    });

    const link =
      `${process.env.FRONTEND_URL}/reset-password/${rawToken}`;

    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: emailValue,

      subject:
        'Reset Password - Company Asset System',

      text:
        `กดลิงก์เพื่อเปลี่ยนรหัสผ่าน: ${link}\n` +
        `ลิงก์หมดอายุภายใน 15 นาที`
    });

    return res.json({
      success: true,
      message:
        'หากอีเมลนี้อยู่ในระบบ จะได้รับลิงก์ reset password'
    });

  } catch (error) {
    console.error(
      'FORGOT PASSWORD ERROR:',
      error
    );

    next(error);
  }
});

/* =========================================================
   RESET PASSWORD
   POST /api/auth/reset-password
========================================================= */

router.post('/reset-password', async (req, res, next) => {
  try {
    const {
      token,
      password
    } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลไม่ครบ'
      });
    }

    if (!passwordPolicy.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          'Password ต้องมีอย่างน้อย 8 ตัวอักษร, A-Z, a-z, ตัวเลข และอักขระพิเศษ'
      });
    }

    /* =====================================================
       Hash Token ที่ได้รับ
    ===================================================== */

    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    /* =====================================================
       ค้นหา Token
    ===================================================== */

    const item = resetTokens.get(tokenHash);

    if (!item) {
      return res.status(400).json({
        success: false,
        message:
          'ลิงก์ reset password ไม่ถูกต้องหรือหมดอายุ'
      });
    }

    /* =====================================================
       ตรวจสอบวันหมดอายุ
    ===================================================== */

    if (item.expires < Date.now()) {

      resetTokens.delete(tokenHash);

      return res.status(400).json({
        success: false,
        message:
          'ลิงก์ reset password หมดอายุแล้ว'
      });
    }

    /* =====================================================
       Hash Password ใหม่
    ===================================================== */

    const passwordHash = await bcrypt.hash(
      password,
      10
    );

    /* =====================================================
       Update Employee Password
    ===================================================== */

    await pool.query(
      `UPDATE Employee
       SET Password = ?
       WHERE EmployeeID = ?`,
      [
        passwordHash,
        item.employeeId
      ]
    );

    /* =====================================================
       ลบ Token หลังใช้งาน
    ===================================================== */

    resetTokens.delete(tokenHash);

    return res.json({
      success: true,
      message: 'เปลี่ยน Password สำเร็จ'
    });

  } catch (error) {
    console.error(
      'RESET PASSWORD ERROR:',
      error
    );

    next(error);
  }
});

/* =========================================================
   EXPORT ROUTER
========================================================= */

export default router;