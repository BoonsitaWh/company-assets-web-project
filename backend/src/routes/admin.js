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
    const search = `%${req.query.q || ''}%`;

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
      [
        search,
        search,
        search
      ]
    );

    return res.json({
      success: true,
      data: rows
    });

  } catch (error) {
    next(error);
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
       LIMIT 100`
    );

    return res.json({
      success: true,
      data: rows
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

    /* จำนวนทรัพย์สินทั้งหมด */
    const [[assets]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM Asset`
    );

    /* ทรัพย์สินที่พร้อมให้ยืม */
    const [[available]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM Asset
       WHERE Status = 'Available'`
    );

    /* ทรัพย์สินที่กำลังถูกยืม */
    const [[borrowed]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM Asset
       WHERE Status = 'Borrowed'`
    );

    /* รายการรอ Admin อนุมัติ */
    const [[pending]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM BorrowTransaction
       WHERE Status = 'PendingApproval'`
    );

    /* รายการที่คืนแล้ว */
    const [[returned]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM BorrowTransaction
       WHERE Status = 'Returned'`
    );

    /* รายการที่ถูกปฏิเสธ */
    const [[rejected]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM BorrowTransaction
       WHERE Status = 'Rejected'`
    );

    /* จำนวน Employee */
    const [[employees]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM Employee`
    );

    return res.json({
      success: true,

      data: {
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

         ORDER BY b.Status`
      );

      return res.json({
        success: true,
        data: rows
      });

    } catch (error) {
      next(error);
    }
  }
);


export default router;