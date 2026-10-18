
import { Router } from 'express';
import pool from '../utils/db.js';
import { auth, adminOnly } from '../middleware/auth.js';

const router = Router();

/* =========================================================
   GET EMPLOYEES
   GET /api/admin/employees
========================================================= */

router.get('/employees', auth, adminOnly, async (req, res, next) => {
  try {
    const search = `%${String(req.query.q || '').trim()}%`;

    const [rows] = await pool.query(
      `SELECT
        e.EmployeeID,
        e.Name,
        e.Email,
        e.Phone,
        e.DepartmentID,
        d.DepartmentName
       FROM Employee e
       LEFT JOIN Department d
         ON d.DepartmentID = e.DepartmentID
       WHERE
         e.Name LIKE ?
         OR e.Email LIKE ?
         OR d.DepartmentName LIKE ?
       ORDER BY e.EmployeeID DESC`,
      [search, search, search],
    );

    return res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
});

/* =========================================================
   UPDATE EMPLOYEE
   PUT /api/admin/employees/:id
   Admin only
========================================================= */

router.put('/employees/:id', auth, adminOnly, async (req, res, next) => {
  let connection;

  try {
    const employeeId = Number(req.params.id);

    const name = String(
      req.body.Name ?? req.body.name ?? '',
    ).trim();

    const email = String(
      req.body.Email ?? req.body.email ?? '',
    ).trim();

    const phoneValue = req.body.Phone ?? req.body.phone ?? null;
    const phone = phoneValue === null
      ? null
      : String(phoneValue).trim() || null;

    const departmentId = Number(
      req.body.DepartmentID ?? req.body.departmentId,
    );

    // ตรวจสอบ Employee ID
    if (!Number.isInteger(employeeId) || employeeId < 1) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID ไม่ถูกต้อง',
      });
    }

    // ตรวจสอบชื่อ
    if (!name || name.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกชื่อพนักงานไม่เกิน 100 ตัวอักษร',
      });
    }

    // ตรวจสอบอีเมล
    if (
      !email ||
      email.length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกอีเมลให้ถูกต้อง',
      });
    }

    // ตรวจสอบเบอร์โทรศัพท์
    if (phone && phone.length > 20) {
      return res.status(400).json({
        success: false,
        message: 'เบอร์โทรศัพท์ต้องไม่เกิน 20 ตัวอักษร',
      });
    }

    // ตรวจสอบ Department ID
    if (!Number.isInteger(departmentId) || departmentId < 1) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาเลือกแผนกให้ถูกต้อง',
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // ล็อกข้อมูลพนักงานระหว่างแก้ไข
    const [employeeRows] = await connection.query(
      'SELECT EmployeeID FROM Employee WHERE EmployeeID = ? FOR UPDATE',
      [employeeId],
    );

    if (employeeRows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: 'ไม่พบพนักงานที่ต้องการแก้ไข',
      });
    }

    // ตรวจสอบว่าแผนกมีอยู่จริง
    const [departmentRows] = await connection.query(
      'SELECT DepartmentID FROM Department WHERE DepartmentID = ?',
      [departmentId],
    );

    if (departmentRows.length === 0) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: 'ไม่พบแผนกที่เลือก',
      });
    }

    // ตรวจสอบอีเมลซ้ำกับพนักงานคนอื่น
    const [duplicateRows] = await connection.query(
      `SELECT EmployeeID
       FROM Employee
       WHERE Email = ?
         AND EmployeeID <> ?`,
      [email, employeeId],
    );

    if (duplicateRows.length > 0) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: 'อีเมลนี้ถูกใช้งานโดยพนักงานคนอื่นแล้ว',
      });
    }

    // อัปเดตข้อมูลพนักงาน
    await connection.query(
      `UPDATE Employee
       SET
         Name = ?,
         Email = ?,
         Phone = ?,
         DepartmentID = ?
       WHERE EmployeeID = ?`,
      [name, email, phone, departmentId, employeeId],
    );

    // บันทึกประวัติการแก้ไข
    await connection.query(
      `INSERT INTO AuditLog (TableName, Action, UserID)
       VALUES ('Employee', 'UPDATE', ?)`,
      [req.user.id],
    );

    await connection.commit();

    return res.json({
      success: true,
      message: 'แก้ไขข้อมูลพนักงานสำเร็จ',
      data: {
        EmployeeID: employeeId,
        Name: name,
        Email: email,
        Phone: phone,
        DepartmentID: departmentId,
      },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'อีเมลนี้ถูกใช้งานโดยพนักงานคนอื่นแล้ว',
      });
    }

    next(error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

/* =========================================================
   GET AUDIT LOGS
   GET /api/admin/logs
========================================================= */

router.get('/logs', auth, adminOnly, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT *
       FROM AuditLog
       ORDER BY LogID DESC
       LIMIT 100`,
    );

    return res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
});


/* =========================================================
   GET DASHBOARD STATS
   GET /api/admin/stats
========================================================= */

router.get('/stats', auth, adminOnly, async (req, res, next) => {
  try {
    // จำนวนทรัพย์สินทั้งหมด (นับจำนวนรายการในตาราง Asset)
    const [[assets]] = await pool.query(`
      SELECT COUNT(*) AS total
      FROM Asset
    `);

    // จำนวนทรัพย์สินที่พร้อมใช้งาน
    const [[available]] = await pool.query(`
      SELECT COUNT(*) AS total
      FROM Asset
      WHERE Status = 'Available'
    `);

    // จำนวนรายการที่กำลังยืมอยู่
    // นับจาก BorrowTransaction เพื่อให้ตรงกับรายการยืมจริง
    const [[borrowed]] = await pool.query(`
      SELECT COUNT(*) AS total
      FROM BorrowTransaction
      WHERE Status IN ('Borrowed', 'Late', 'ReturnRequested')
    `);

    // จำนวนรายการที่รออนุมัติยืม
    const [[pending]] = await pool.query(`
      SELECT COUNT(*) AS total
      FROM BorrowTransaction
      WHERE Status = 'PendingApproval'
    `);

    // จำนวนรายการที่คืนแล้ว
    const [[returned]] = await pool.query(`
      SELECT COUNT(*) AS total
      FROM BorrowTransaction
      WHERE Status = 'Returned'
    `);

    // จำนวนรายการที่ถูกปฏิเสธ
    const [[rejected]] = await pool.query(`
      SELECT COUNT(*) AS total
      FROM BorrowTransaction
      WHERE Status = 'Rejected'
    `);

    // จำนวนพนักงาน
    const [[employees]] = await pool.query(`
      SELECT COUNT(*) AS total
      FROM Employee
    `);

    return res.json({
      success: true,
      data: {
        // ชื่อฟิลด์ที่หน้า Admin ใช้อยู่
        totalAssets: Number(assets.total),
        availableAssets: Number(available.total),
        borrowedAssets: Number(borrowed.total),
        pendingBorrow: Number(pending.total),

        // ชื่อฟิลด์เดิม เผื่อส่วนอื่นในระบบเรียกใช้
        assets: Number(assets.total),
        available: Number(available.total),
        borrowed: Number(borrowed.total),
        pending: Number(pending.total),
        returned: Number(returned.total),
        rejected: Number(rejected.total),
        employees: Number(employees.total)
      }
    });
  } catch (error) {
    next(error);
  }
});

/* =========================================================
   GET BORROW SUMMARY
   GET /api/admin/borrow-summary
========================================================= */

router.get(
  '/borrow-summary',
  auth,
  adminOnly,
  async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        `SELECT
          b.Status,
          COUNT(*) AS Total
         FROM BorrowTransaction b
         GROUP BY b.Status
         ORDER BY b.Status`,
      );

      return res.json({
        success: true,
        data: rows,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
