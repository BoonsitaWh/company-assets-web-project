
import { Router } from 'express';
import pool from '../utils/db.js';
import { auth, adminOnly } from '../middleware/auth.js';

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// โฟลเดอร์เก็บหลักฐานการคืน:
// backend/uploads/returns
const uploadDir = path.resolve(__dirname, '../../uploads/returns');

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDir);
  },
  filename: (_req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName =
      `return-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

    callback(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (_req, file, callback) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      const error = new Error('รองรับเฉพาะรูป JPG, PNG และ WEBP');
      error.status = 400;
      return callback(error);
    }

    callback(null, true);
  }
});

// สถานะที่ยังใช้สต็อกอยู่
const ACTIVE_STATUSES = [
  'PendingApproval',
  'Borrowed',
  'ReturnRequested'
];

// ลบไฟล์ที่อัปโหลดแล้ว เมื่อคำขอไม่ผ่านการตรวจสอบ
async function deleteUploadedFile(file) {
  if (!file?.path) return;

  try {
    await fs.promises.unlink(file.path);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Delete uploaded file error:', error);
    }
  }
}

// คำนวณจำนวนทรัพย์สินที่ถูกจองหรือกำลังยืม
async function getStock(conn, assetId, totalQuantity) {
  const placeholders = ACTIVE_STATUSES.map(() => '?').join(', ');

  const [rows] = await conn.query(
    `SELECT COUNT(*) AS ActiveCount
     FROM BorrowTransaction
     WHERE AssetID = ?
       AND Status IN (${placeholders})`,
    [assetId, ...ACTIVE_STATUSES]
  );

  const total = Math.max(0, Number(totalQuantity ?? 1));
  const borrowed = Number(rows[0]?.ActiveCount ?? 0);

  return {
    total,
    borrowed,
    available: Math.max(0, total - borrowed)
  };
}

// อัปเดตสถานะรวมของทรัพย์สินตามจำนวนที่เหลือ
async function updateAssetStatus(conn, assetId, totalQuantity) {
  const stock = await getStock(conn, assetId, totalQuantity);
  const status = stock.available > 0 ? 'Available' : 'Borrowed';

  await conn.query(
    'UPDATE Asset SET Status = ? WHERE AssetID = ?',
    [status, assetId]
  );

  return stock;
}

/* =========================================================
   EMPLOYEE - REQUEST BORROW
   POST /api/borrow
========================================================= */

router.post('/', auth, async (req, res, next) => {
  let conn;

  try {
    if (req.user.type !== 'employee') {
      return res.status(403).json({
        success: false,
        message: 'เฉพาะสมาชิกเท่านั้นที่ขอยืมได้'
      });
    }

    const { assetId, dueDate } = req.body;

    if (!assetId || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุทรัพย์สินและวันที่ต้องการคืน'
      });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [assets] = await conn.query(
      `SELECT AssetID, AssetName, SerialNumber, TotalQuantity, Status
       FROM Asset
       WHERE AssetID = ?
       FOR UPDATE`,
      [assetId]
    );

    if (assets.length === 0) {
      await conn.rollback();

      return res.status(404).json({
        success: false,
        message: 'ไม่พบทรัพย์สิน'
      });
    }

    const asset = assets[0];

    if (asset.Status === 'Maintenance') {
      await conn.rollback();

      return res.status(400).json({
        success: false,
        message: 'ทรัพย์สินนี้อยู่ระหว่างซ่อมบำรุง'
      });
    }

    const stock = await getStock(
      conn,
      assetId,
      asset.TotalQuantity
    );

    if (stock.available <= 0) {
      await conn.rollback();

      return res.status(400).json({
        success: false,
        message: 'ทรัพย์สินนี้หมดสต็อกแล้ว ไม่สามารถขอยืมเพิ่มได้',
        totalQuantity: stock.total,
        borrowedQuantity: stock.borrowed,
        availableQuantity: stock.available
      });
    }

    const [result] = await conn.query(
      `INSERT INTO BorrowTransaction
       (EmployeeID, AssetID, BorrowDate, DueDate, Status)
       VALUES (?, ?, CURDATE(), ?, 'PendingApproval')`,
      [req.user.id, assetId, dueDate]
    );

    await updateAssetStatus(
      conn,
      assetId,
      asset.TotalQuantity
    );

    await conn.query(
      `INSERT INTO Notification (EmployeeID, Message)
       VALUES (?, ?)`,
      [
        req.user.id,
        `ส่งคำขอยืม ${asset.AssetName} แล้ว รอ Admin อนุมัติ`
      ]
    );

    await conn.commit();

    return res.status(201).json({
      success: true,
      message: 'ส่งคำขอยืมสำเร็จ',
      transactionId: result.insertId,
      totalQuantity: stock.total,
      borrowedQuantity: stock.borrowed + 1,
      availableQuantity: stock.available - 1
    });
  } catch (error) {
    if (conn) {
      try {
        await conn.rollback();
      } catch {}
    }

    next(error);
  } finally {
    if (conn) conn.release();
  }
});

/* =========================================================
   EMPLOYEE - MY BORROW TRANSACTIONS
   GET /api/borrow/my
========================================================= */

router.get('/my', auth, async (req, res, next) => {
  try {
    if (req.user.type !== 'employee') {
      return res.status(403).json({
        success: false,
        message: 'เฉพาะสมาชิกเท่านั้น'
      });
    }

    const [rows] = await pool.query(
      `SELECT
         b.TransactionID,
         b.EmployeeID,
         b.AssetID,
         b.BorrowDate,
         b.DueDate,
         b.ReturnDate,
         b.ReturnRequestedDate,
         b.ReturnProofPath,
         b.Status,
         b.AdminID,
         a.AssetName,
         a.SerialNumber,
         ad.Username AS AdminName
       FROM BorrowTransaction b
       JOIN Asset a ON a.AssetID = b.AssetID
       LEFT JOIN Admin ad ON ad.AdminID = b.AdminID
       WHERE b.EmployeeID = ?
       ORDER BY b.TransactionID DESC`,
      [req.user.id]
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
   EMPLOYEE - REQUEST RETURN WITH PHOTO
   PUT /api/borrow/:id/request-return
   FormData field: returnProof
========================================================= */

router.put(
  '/:id/request-return',
  auth,
  upload.single('returnProof'),
  async (req, res, next) => {
    let conn;

    try {
      if (req.user.type !== 'employee') {
        await deleteUploadedFile(req.file);

        return res.status(403).json({
          success: false,
          message: 'เฉพาะสมาชิกเท่านั้นที่สามารถขอคืนทรัพย์สินได้'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'กรุณาแนบรูปหลักฐานการคืนทรัพย์สิน'
        });
      }

      conn = await pool.getConnection();
      await conn.beginTransaction();

      const [rows] = await conn.query(
        `SELECT
           b.TransactionID,
           b.EmployeeID,
           b.AssetID,
           b.Status,
           a.AssetName,
           a.SerialNumber,
           a.TotalQuantity
         FROM BorrowTransaction b
         JOIN Asset a ON a.AssetID = b.AssetID
         WHERE b.TransactionID = ?
           AND b.EmployeeID = ?
         FOR UPDATE`,
        [req.params.id, req.user.id]
      );

      if (rows.length === 0) {
        await conn.rollback();
        await deleteUploadedFile(req.file);

        return res.status(404).json({
          success: false,
          message: 'ไม่พบรายการยืมของคุณ'
        });
      }

      const borrow = rows[0];

      if (borrow.Status !== 'Borrowed') {
        await conn.rollback();
        await deleteUploadedFile(req.file);

        return res.status(400).json({
          success: false,
          message: 'รายการนี้ไม่ได้อยู่ในสถานะกำลังยืม จึงไม่สามารถขอคืนได้'
        });
      }

      // บันทึก path แบบ URL เพื่อให้หน้าเว็บเรียกดูรูปได้
      const proofPath = `/uploads/returns/${req.file.filename}`;

      await conn.query(
        `UPDATE BorrowTransaction
         SET Status = 'ReturnRequested',
             ReturnProofPath = ?,
             ReturnRequestedDate = NOW()
         WHERE TransactionID = ?`,
        [proofPath, req.params.id]
      );

      await conn.query(
        `INSERT INTO Notification (EmployeeID, Message)
         VALUES (?, ?)`,
        [
          borrow.EmployeeID,
          `ส่งคำขอคืน ${borrow.AssetName} (${borrow.SerialNumber || '-'}) พร้อมหลักฐานแล้ว รอ Admin อนุมัติการคืน`
        ]
      );

      await conn.commit();

      return res.json({
        success: true,
        message: 'ส่งคำขอคืนทรัพย์สินพร้อมหลักฐานสำเร็จ',
        data: {
          TransactionID: borrow.TransactionID,
          Status: 'ReturnRequested',
          ReturnProofPath: proofPath
        }
      });
    } catch (error) {
      if (conn) {
        try {
          await conn.rollback();
        } catch {}
      }

      await deleteUploadedFile(req.file);
      next(error);
    } finally {
      if (conn) conn.release();
    }
  }
);

/* =========================================================
   ADMIN - GET ALL BORROW TRANSACTIONS
   GET /api/borrow
========================================================= */

router.get('/', auth, adminOnly, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         b.TransactionID,
         b.EmployeeID,
         b.AssetID,
         b.BorrowDate,
         b.DueDate,
         b.ReturnDate,
         b.ReturnRequestedDate,
         b.ReturnProofPath,
         b.Status,
         b.AdminID,
         e.Name AS EmployeeName,
         e.Email AS EmployeeEmail,
         e.Phone AS EmployeePhone,
         e.Phone AS Phone,
         d.DepartmentName AS DepartmentName,
         a.AssetName,
         a.SerialNumber,
         a.Status AS AssetStatus,
         ad.Username AS AdminName
       FROM BorrowTransaction b
       JOIN Employee e ON e.EmployeeID = b.EmployeeID
       LEFT JOIN Department d ON d.DepartmentID = e.DepartmentID
       JOIN Asset a ON a.AssetID = b.AssetID
       LEFT JOIN Admin ad ON ad.AdminID = b.AdminID
       ORDER BY b.TransactionID DESC`
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
   ADMIN - APPROVE BORROW
   PUT /api/borrow/:id/approve
========================================================= */

router.put('/:id/approve', auth, adminOnly, async (req, res, next) => {
  let conn;

  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT
         b.TransactionID,
         b.EmployeeID,
         b.AssetID,
         b.Status,
         a.AssetName,
         a.TotalQuantity,
         a.Status AS AssetStatus
       FROM BorrowTransaction b
       JOIN Asset a ON a.AssetID = b.AssetID
       WHERE b.TransactionID = ?
       FOR UPDATE`,
      [req.params.id]
    );

    if (rows.length === 0) {
      await conn.rollback();

      return res.status(404).json({
        success: false,
        message: 'ไม่พบรายการยืม'
      });
    }

    const borrow = rows[0];

    if (borrow.Status !== 'PendingApproval') {
      await conn.rollback();

      return res.status(400).json({
        success: false,
        message: 'รายการนี้ไม่ได้อยู่ระหว่างรออนุมัติ'
      });
    }

    const [assets] = await conn.query(
      `SELECT AssetID, TotalQuantity, Status
       FROM Asset
       WHERE AssetID = ?
       FOR UPDATE`,
      [borrow.AssetID]
    );

    if (assets.length === 0) {
      await conn.rollback();

      return res.status(404).json({
        success: false,
        message: 'ไม่พบทรัพย์สิน'
      });
    }

    if (assets[0].Status === 'Maintenance') {
      await conn.rollback();

      return res.status(400).json({
        success: false,
        message: 'ทรัพย์สินนี้อยู่ระหว่างซ่อมบำรุง ไม่สามารถอนุมัติการยืมได้'
      });
    }

    const stock = await getStock(
      conn,
      borrow.AssetID,
      assets[0].TotalQuantity
    );

    if (stock.borrowed > stock.total) {
      await conn.rollback();

      return res.status(400).json({
        success: false,
        message: 'จำนวนคำขอยืมเกินสต็อก กรุณาตรวจสอบรายการยืม'
      });
    }

    await conn.query(
      `UPDATE BorrowTransaction
       SET AdminID = ?, Status = 'Borrowed'
       WHERE TransactionID = ?`,
      [req.user.id, req.params.id]
    );

    await updateAssetStatus(
      conn,
      borrow.AssetID,
      assets[0].TotalQuantity
    );

    await conn.query(
      `INSERT INTO Notification (EmployeeID, Message)
       VALUES (?, ?)`,
      [
        borrow.EmployeeID,
        `คำขอยืม ${borrow.AssetName} ได้รับการอนุมัติแล้ว`
      ]
    );

    await conn.commit();

    return res.json({
      success: true,
      message: 'อนุมัติการยืมสำเร็จ'
    });
  } catch (error) {
    if (conn) {
      try {
        await conn.rollback();
      } catch {}
    }

    next(error);
  } finally {
    if (conn) conn.release();
  }
});

/* =========================================================
   ADMIN - APPROVE RETURN
   PUT /api/borrow/:id/approve-return
========================================================= */

router.put('/:id/approve-return', auth, adminOnly, async (req, res, next) => {
  let conn;

  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT
         b.TransactionID,
         b.EmployeeID,
         b.AssetID,
         b.Status,
         b.ReturnProofPath,
         a.AssetName,
         a.SerialNumber,
         a.TotalQuantity
       FROM BorrowTransaction b
       JOIN Asset a ON a.AssetID = b.AssetID
       WHERE b.TransactionID = ?
       FOR UPDATE`,
      [req.params.id]
    );

    if (rows.length === 0) {
      await conn.rollback();

      return res.status(404).json({
        success: false,
        message: 'ไม่พบรายการขอคืน'
      });
    }

    const borrow = rows[0];

    if (borrow.Status !== 'ReturnRequested') {
      await conn.rollback();

      return res.status(400).json({
        success: false,
        message: 'รายการนี้ไม่ได้อยู่ในสถานะรออนุมัติการคืน'
      });
    }

    if (!borrow.ReturnProofPath) {
      await conn.rollback();

      return res.status(400).json({
        success: false,
        message: 'ไม่พบหลักฐานการคืน จึงยังอนุมัติไม่ได้'
      });
    }

    const [assets] = await conn.query(
      `SELECT AssetID, TotalQuantity
       FROM Asset
       WHERE AssetID = ?
       FOR UPDATE`,
      [borrow.AssetID]
    );

    if (assets.length === 0) {
      await conn.rollback();

      return res.status(404).json({
        success: false,
        message: 'ไม่พบทรัพย์สิน'
      });
    }

    await conn.query(
      `UPDATE BorrowTransaction
       SET ReturnDate = CURDATE(),
           Status = 'Returned',
           AdminID = ?
       WHERE TransactionID = ?`,
      [req.user.id, req.params.id]
    );

    const stock = await updateAssetStatus(
      conn,
      borrow.AssetID,
      assets[0].TotalQuantity
    );

    await conn.query(
      `INSERT INTO Notification (EmployeeID, Message)
       VALUES (?, ?)`,
      [
        borrow.EmployeeID,
        `Admin อนุมัติการคืน ${borrow.AssetName} (${borrow.SerialNumber || '-'}) เรียบร้อยแล้ว`
      ]
    );

    await conn.commit();

    return res.json({
      success: true,
      message: 'อนุมัติการคืนทรัพย์สินสำเร็จ',
      totalQuantity: stock.total,
      borrowedQuantity: stock.borrowed,
      availableQuantity: stock.available
    });
  } catch (error) {
    if (conn) {
      try {
        await conn.rollback();
      } catch {}
    }

    next(error);
  } finally {
    if (conn) conn.release();
  }
});

/* =========================================================
   ADMIN - REJECT BORROW
   PUT /api/borrow/:id/reject
========================================================= */

router.put('/:id/reject', auth, adminOnly, async (req, res, next) => {
  let conn;

  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT
         b.TransactionID,
         b.EmployeeID,
         b.AssetID,
         b.Status,
         a.AssetName,
         a.TotalQuantity
       FROM BorrowTransaction b
       JOIN Asset a ON a.AssetID = b.AssetID
       WHERE b.TransactionID = ?
       FOR UPDATE`,
      [req.params.id]
    );

    if (rows.length === 0) {
      await conn.rollback();

      return res.status(404).json({
        success: false,
        message: 'ไม่พบรายการยืม'
      });
    }

    const borrow = rows[0];

    if (borrow.Status !== 'PendingApproval') {
      await conn.rollback();

      return res.status(400).json({
        success: false,
        message: 'รายการนี้ไม่สามารถปฏิเสธได้'
      });
    }

    await conn.query(
      `UPDATE BorrowTransaction
       SET AdminID = ?, Status = 'Rejected'
       WHERE TransactionID = ?`,
      [req.user.id, req.params.id]
    );

    await updateAssetStatus(
      conn,
      borrow.AssetID,
      borrow.TotalQuantity
    );

    await conn.query(
      `INSERT INTO Notification (EmployeeID, Message)
       VALUES (?, ?)`,
      [
        borrow.EmployeeID,
        `คำขอยืม ${borrow.AssetName} ถูกปฏิเสธ`
      ]
    );

    await conn.commit();

    return res.json({
      success: true,
      message: 'ปฏิเสธการยืมสำเร็จ'
    });
  } catch (error) {
    if (conn) {
      try {
        await conn.rollback();
      } catch {}
    }

    next(error);
  } finally {
    if (conn) conn.release();
  }
});

// จัดการข้อผิดพลาดจากการอัปโหลดรูป
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? 'รูปหลักฐานต้องมีขนาดไม่เกิน 5 MB'
        : 'ไม่สามารถอัปโหลดรูปหลักฐานได้';

    return res.status(400).json({
      success: false,
      message
    });
  }

  if (error.status === 400) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next(error);
});

export default router;
