import { Router } from 'express';
import pool from '../utils/db.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.get('/my', auth, async (req, res, next) => {
  try {
    if (req.user.type !== 'employee') return res.json([]);
    const [rows] = await pool.query(
      `SELECT * FROM Notification WHERE EmployeeID=? ORDER BY NotificationID DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.put('/:id/read', auth, async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE Notification SET Status='Read' WHERE NotificationID=? AND EmployeeID=?`,
      [req.params.id, req.user.id]
    );
    res.json({ message: 'อ่านแล้ว' });
  } catch (e) { next(e); }
});

export default router;
