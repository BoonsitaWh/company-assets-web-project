
import { Router } from 'express';
import pool from '../utils/db.js';
import { auth, adminOnly } from '../middleware/auth.js';

import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// เก็บรูปไว้ที่ backend/uploads/assets
const uploadDir = path.resolve(__dirname, '../../uploads/assets');

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // ไม่เกิน 5 MB
  },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ];

    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('รองรับเฉพาะไฟล์ JPG, PNG, WEBP และ GIF'));
    }

    cb(null, true);
  },
});

// ช่วยแปลงจำนวนให้เป็นตัวเลขบวก
function parseQuantity(value) {
  const quantity = Number(value);

  if (!Number.isInteger(quantity) || quantity < 1) {
    return null;
  }

  return quantity;
}

// ลบไฟล์รูปเก่า ถ้ามี
function deleteUploadedImage(imagePath) {
  if (!imagePath) return;

  const filename = path.basename(imagePath);
  const fullPath = path.join(uploadDir, filename);

  fs.unlink(fullPath, (error) => {
    if (error && error.code !== 'ENOENT') {
      console.error('ลบรูปภาพไม่สำเร็จ:', error.message);
    }
  });
}

// คำนวณจำนวนที่กำลังถูกยืม
// ไม่นับ PendingApproval เพราะยังไม่ได้รับอนุมัติ
async function getBorrowedQuantities(connection = pool) {
  const [rows] = await connection.query(`
    SELECT
      AssetID,
      COUNT(*) AS BorrowedQuantity
    FROM BorrowTransaction
    WHERE Status IN ('Borrowed', 'ReturnRequested', 'Late')
    GROUP BY AssetID
  `);

  return new Map(
    rows.map((row) => [
      Number(row.AssetID),
      Number(row.BorrowedQuantity),
    ]),
  );
}

// ======================================================
// GET ASSETS
// GET /api/assets
// ======================================================
router.get('/', async (req, res, next) => {
  try {
    const search = String(req.query.q || '').trim();

    let sql = `
      SELECT
        a.*,
        c.CategoryName
      FROM Asset a
      LEFT JOIN Category c
        ON a.CategoryID = c.CategoryID
    `;

    const params = [];

    if (search) {
      sql += `
        WHERE
          a.AssetName LIKE ?
          OR a.SerialNumber LIKE ?
          OR c.CategoryName LIKE ?
      `;

      const q = `%${search}%`;
      params.push(q, q, q);
    }

    sql += ' ORDER BY a.AssetID DESC';

    const [rows] = await pool.query(sql, params);
    const borrowedMap = await getBorrowedQuantities();

    const assets = rows.map((asset) => {
      const total = Number(asset.TotalQuantity ?? 1);
      const borrowed = borrowedMap.get(Number(asset.AssetID)) || 0;

      return {
        ...asset,
        TotalQuantity: total,
        BorrowedQuantity: borrowed,
        AvailableQuantity: Math.max(0, total - borrowed),
        ImagePath: asset.ImagePath || null,
      };
    });

    res.json(assets);
  } catch (error) {
    console.error('GET /assets error:', error);
    next(error);
  }
});

// ======================================================
// GET CATEGORIES
// ======================================================
router.get('/categories', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM Category ORDER BY CategoryName',
    );

    res.json(rows);
  } catch (error) {
    console.error('GET /assets/categories error:', error);
    next(error);
  }
});

// ======================================================
// GET DEPARTMENTS
// ======================================================
router.get('/departments', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM Department ORDER BY DepartmentName',
    );

    res.json(rows);
  } catch (error) {
    console.error('GET /assets/departments error:', error);
    next(error);
  }
});

// ======================================================
// CREATE ASSET
// POST /api/assets
// รับข้อมูลแบบ multipart/form-data
// ======================================================
router.post(
  '/',
  auth,
  adminOnly,
  upload.single('image'),
  async (req, res, next) => {
    let connection;

    try {
      const {
        assetName,
        AssetName,
        categoryId,
        CategoryID,
        status,
        Status,
        purchaseDate,
        PurchaseDate,
        price,
        Price,
        serialNumber,
        SerialNumber,
        location,
        Location,
      } = req.body;

      const name = String(assetName ?? AssetName ?? '').trim();
      const category = categoryId ?? CategoryID;
      const assetStatus = status ?? Status ?? 'Available';
      const date = purchaseDate ?? PurchaseDate ?? null;
      const assetPrice = price ?? Price ?? null;
      const serial = serialNumber ?? SerialNumber ?? null;
      const assetLocation = location ?? Location ?? null;

      const quantity = parseQuantity(
        req.body.totalQuantity ?? req.body.TotalQuantity ?? 1,
      );

      const imagePath = req.file
        ? `/uploads/assets/${req.file.filename}`
        : null;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'กรุณากรอกชื่อทรัพย์สิน',
        });
      }

      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'กรุณาเลือกหมวดหมู่',
        });
      }

      if (quantity === null) {
        return res.status(400).json({
          success: false,
          message: 'จำนวนทรัพย์สินต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป',
        });
      }

      const [categoryRows] = await pool.query(
        'SELECT CategoryID FROM Category WHERE CategoryID = ?',
        [category],
      );

      if (categoryRows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'ไม่พบหมวดหมู่ที่เลือก',
        });
      }

      if (serial) {
        const [serialRows] = await pool.query(
          'SELECT AssetID FROM Asset WHERE SerialNumber = ?',
          [serial],
        );

        if (serialRows.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Serial Number นี้มีอยู่ในระบบแล้ว',
          });
        }
      }

      connection = await pool.getConnection();
      await connection.beginTransaction();

      const [result] = await connection.query(
        `
          INSERT INTO Asset (
            AssetName,
            CategoryID,
            Status,
            PurchaseDate,
            Price,
            SerialNumber,
            Location,
            TotalQuantity,
            ImagePath
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          name,
          category,
          assetStatus,
          date || null,
          assetPrice === '' ? null : assetPrice,
          serial || null,
          assetLocation || null,
          quantity,
          imagePath,
        ],
      );

      await connection.query(
        `
          INSERT INTO AuditLog (TableName, Action, UserID)
          VALUES ('Asset', 'INSERT', ?)
        `,
        [req.user.id],
      );

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'เพิ่มทรัพย์สินสำเร็จ',
        AssetID: result.insertId,
        TotalQuantity: quantity,
        ImagePath: imagePath,
      });
    } catch (error) {
      if (connection) await connection.rollback();

      if (req.file) {
        deleteUploadedImage(`/uploads/assets/${req.file.filename}`);
      }

      console.error('POST /assets error:', error);
      next(error);
    } finally {
      if (connection) connection.release();
    }
  },
);

// ======================================================
// UPDATE ASSET
// PUT /api/assets/:id
// ======================================================
router.put(
  '/:id',
  auth,
  adminOnly,
  upload.single('image'),
  async (req, res, next) => {
    let connection;

    try {
      const assetId = req.params.id;

      const name = String(
        req.body.assetName ?? req.body.AssetName ?? '',
      ).trim();

      const category = req.body.categoryId ?? req.body.CategoryID;
      const status = req.body.status ?? req.body.Status ?? 'Available';
      const date = req.body.purchaseDate ?? req.body.PurchaseDate ?? null;
      const price = req.body.price ?? req.body.Price ?? null;
      const serial = req.body.serialNumber ?? req.body.SerialNumber ?? null;
      const location = req.body.location ?? req.body.Location ?? null;

      connection = await pool.getConnection();

      const [assetRows] = await connection.query(
        'SELECT * FROM Asset WHERE AssetID = ?',
        [assetId],
      );

      if (assetRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบทรัพย์สิน',
        });
      }

      const oldAsset = assetRows[0];

      const quantityInput =
        req.body.totalQuantity ?? req.body.TotalQuantity;

      const quantity = quantityInput === undefined
        ? Number(oldAsset.TotalQuantity ?? 1)
        : parseQuantity(quantityInput);

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'กรุณากรอกชื่อทรัพย์สิน',
        });
      }

      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'กรุณาเลือกหมวดหมู่',
        });
      }

      if (quantity === null || !Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({
          success: false,
          message: 'จำนวนทรัพย์สินต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป',
        });
      }

      const [categoryRows] = await connection.query(
        'SELECT CategoryID FROM Category WHERE CategoryID = ?',
        [category],
      );

      if (categoryRows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'ไม่พบหมวดหมู่ที่เลือก',
        });
      }

      if (serial) {
        const [serialRows] = await connection.query(
          `
            SELECT AssetID
            FROM Asset
            WHERE SerialNumber = ?
              AND AssetID <> ?
          `,
          [serial, assetId],
        );

        if (serialRows.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Serial Number นี้มีอยู่ในระบบแล้ว',
          });
        }
      }

      const borrowedMap = await getBorrowedQuantities(connection);
      const borrowed = borrowedMap.get(Number(assetId)) || 0;

      if (quantity < borrowed) {
        return res.status(400).json({
          success: false,
          message: `จำนวนทั้งหมดต้องไม่น้อยกว่าจำนวนที่กำลังถูกยืม (${borrowed} เครื่อง)`,
        });
      }

      const imagePath = req.file
        ? `/uploads/assets/${req.file.filename}`
        : oldAsset.ImagePath || null;

      await connection.beginTransaction();

      await connection.query(
        `
          UPDATE Asset
          SET
            AssetName = ?,
            CategoryID = ?,
            Status = ?,
            PurchaseDate = ?,
            Price = ?,
            SerialNumber = ?,
            Location = ?,
            TotalQuantity = ?,
            ImagePath = ?
          WHERE AssetID = ?
        `,
        [
          name,
          category,
          status,
          date || null,
          price === '' ? null : price,
          serial || null,
          location || null,
          quantity,
          imagePath,
          assetId,
        ],
      );

      await connection.query(
        `
          INSERT INTO AuditLog (TableName, Action, UserID)
          VALUES ('Asset', 'UPDATE', ?)
        `,
        [req.user.id],
      );

      await connection.commit();

      if (req.file && oldAsset.ImagePath) {
        deleteUploadedImage(oldAsset.ImagePath);
      }

      res.json({
        success: true,
        message: 'แก้ไขทรัพย์สินสำเร็จ',
        TotalQuantity: quantity,
        BorrowedQuantity: borrowed,
        AvailableQuantity: Math.max(0, quantity - borrowed),
        ImagePath: imagePath,
      });
    } catch (error) {
      if (connection) await connection.rollback();

      if (req.file) {
        deleteUploadedImage(`/uploads/assets/${req.file.filename}`);
      }

      console.error('PUT /assets/:id error:', error);
      next(error);
    } finally {
      if (connection) connection.release();
    }
  },
);

// ======================================================
// DELETE ASSET
// DELETE /api/assets/:id
// ======================================================
router.delete('/:id', auth, adminOnly, async (req, res, next) => {
  try {
    const assetId = req.params.id;

    const [borrowRows] = await pool.query(
      `
        SELECT TransactionID
        FROM BorrowTransaction
        WHERE AssetID = ?
          AND Status IN (
            'PendingApproval',
            'Borrowed',
            'ReturnRequested',
            'Late'
          )
        LIMIT 1
      `,
      [assetId],
    );

    if (borrowRows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'ไม่สามารถลบทรัพย์สินที่มีรายการยืมอยู่ได้',
      });
    }

    const [assetRows] = await pool.query(
      'SELECT ImagePath FROM Asset WHERE AssetID = ?',
      [assetId],
    );

    if (assetRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบทรัพย์สิน',
      });
    }

    await pool.query('DELETE FROM Asset WHERE AssetID = ?', [assetId]);

    await pool.query(
      `
        INSERT INTO AuditLog (TableName, Action, UserID)
        VALUES ('Asset', 'DELETE', ?)
      `,
      [req.user.id],
    );

    deleteUploadedImage(assetRows[0].ImagePath);

    res.json({
      success: true,
      message: 'ลบทรัพย์สินสำเร็จ',
    });
  } catch (error) {
    console.error('DELETE /assets/:id error:', error);
    next(error);
  }
});

// ======================================================
// MULTER ERROR HANDLER
// ======================================================
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5 MB'
      : error.message;

    return res.status(400).json({
      success: false,
      message,
    });
  }

  if (error.message?.startsWith('รองรับเฉพาะไฟล์')) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  next(error);
});

export default router;
