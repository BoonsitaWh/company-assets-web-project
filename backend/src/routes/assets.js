
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

const uploadDir = path.resolve(__dirname, '../../uploads/assets');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
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

function parseQuantity(value) {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < 1) return null;
  return quantity;
}

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

async function getBorrowedQuantities(connection = pool) {
  const [rows] = await connection.query(`
    SELECT AssetID, COUNT(*) AS BorrowedQuantity
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
      SELECT a.*, c.CategoryName
      FROM Asset a
      LEFT JOIN Category c ON a.CategoryID = c.CategoryID
    `;

    const params = [];

    if (search) {
      sql += `
        WHERE a.AssetName LIKE ?
           OR a.SerialNumber LIKE ?
           OR c.CategoryName LIKE ?
      `;

      const q = `%${search}%`;
      params.push(q, q, q);
    }

    sql += ' ORDER BY a.AssetID DESC';

    const [rows] = await pool.query(sql, params);
    const borrowedMap = await getBorrowedQuantities();

    const result = rows.map((asset) => {
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

    res.json(result);
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
// CREATE CATEGORY
// ======================================================
router.post('/categories', auth, adminOnly, async (req, res, next) => {
  let connection;

  try {
    const categoryName = String(
      req.body.categoryName ?? req.body.CategoryName ?? '',
    ).trim();

    if (!categoryName) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกชื่อหมวดหมู่',
      });
    }

    if (categoryName.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'ชื่อหมวดหมู่ต้องไม่เกิน 100 ตัวอักษร',
      });
    }

    const [existing] = await pool.query(
      'SELECT CategoryID, CategoryName FROM Category WHERE CategoryName = ?',
      [categoryName],
    );

    if (existing.length) {
      return res.status(200).json({
        success: true,
        message: 'ใช้หมวดหมู่เดิม',
        data: existing[0],
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [result] = await connection.query(
      'INSERT INTO Category (CategoryName) VALUES (?)',
      [categoryName],
    );

    await connection.query(
      `INSERT INTO AuditLog (TableName, Action, UserID)
       VALUES ('Category', 'INSERT', ?)`,
      [req.user.id],
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'เพิ่มหมวดหมู่สำเร็จ',
      data: {
        CategoryID: result.insertId,
        CategoryName: categoryName,
      },
    });
  } catch (error) {
    if (connection) await connection.rollback();

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'ชื่อหมวดหมู่นี้มีอยู่แล้ว',
      });
    }

    console.error('POST /assets/categories error:', error);
    next(error);
  } finally {
    if (connection) connection.release();
  }
});

// ======================================================
// UPDATE CATEGORY
// ======================================================
router.put('/categories/:id', auth, adminOnly, async (req, res, next) => {
  let connection;

  try {
    const categoryId = Number(req.params.id);
    const categoryName = String(
      req.body.categoryName ?? req.body.CategoryName ?? '',
    ).trim();

    if (!Number.isInteger(categoryId) || categoryId < 1) {
      return res.status(400).json({
        success: false,
        message: 'Category ID ไม่ถูกต้อง',
      });
    }

    if (!categoryName || categoryName.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกชื่อหมวดหมู่ไม่เกิน 100 ตัวอักษร',
      });
    }

    const [duplicate] = await pool.query(
      `SELECT CategoryID FROM Category
       WHERE CategoryName = ? AND CategoryID <> ?`,
      [categoryName, categoryId],
    );

    if (duplicate.length) {
      return res.status(409).json({
        success: false,
        message: 'ชื่อหมวดหมู่นี้ถูกใช้งานแล้ว',
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [result] = await connection.query(
      'UPDATE Category SET CategoryName = ? WHERE CategoryID = ?',
      [categoryName, categoryId],
    );

    if (!result.affectedRows) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'ไม่พบหมวดหมู่ที่ต้องการแก้ไข',
      });
    }

    await connection.query(
      `INSERT INTO AuditLog (TableName, Action, UserID)
       VALUES ('Category', 'UPDATE', ?)`,
      [req.user.id],
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'แก้ไขหมวดหมู่สำเร็จ',
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('PUT /assets/categories/:id error:', error);
    next(error);
  } finally {
    if (connection) connection.release();
  }
});

// ======================================================
// DELETE CATEGORY
// ======================================================
router.delete('/categories/:id', auth, adminOnly, async (req, res, next) => {
  let connection;

  try {
    const categoryId = Number(req.params.id);

    if (!Number.isInteger(categoryId) || categoryId < 1) {
      return res.status(400).json({
        success: false,
        message: 'Category ID ไม่ถูกต้อง',
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [categoryRows] = await connection.query(
      'SELECT CategoryID FROM Category WHERE CategoryID = ? FOR UPDATE',
      [categoryId],
    );

    if (!categoryRows.length) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'ไม่พบหมวดหมู่',
      });
    }

    const [assetRows] = await connection.query(
      'SELECT AssetID FROM Asset WHERE CategoryID = ? LIMIT 1',
      [categoryId],
    );

    if (assetRows.length) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: 'ไม่สามารถลบหมวดหมู่ได้ เพราะยังมีทรัพย์สินใช้งานอยู่',
      });
    }

    await connection.query(
      'DELETE FROM Category WHERE CategoryID = ?',
      [categoryId],
    );

    await connection.query(
      `INSERT INTO AuditLog (TableName, Action, UserID)
       VALUES ('Category', 'DELETE', ?)`,
      [req.user.id],
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'ลบหมวดหมู่สำเร็จ',
    });
  } catch (error) {
    if (connection) await connection.rollback();

    if (
      error.code === 'ER_ROW_IS_REFERENCED_2' ||
      error.code === 'ER_ROW_IS_REFERENCED'
    ) {
      return res.status(409).json({
        success: false,
        message: 'หมวดหมู่นี้มีข้อมูลอื่นอ้างอิงอยู่',
      });
    }

    console.error('DELETE /assets/categories/:id error:', error);
    next(error);
  } finally {
    if (connection) connection.release();
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
// ======================================================
router.post(
  '/',
  auth,
  adminOnly,
  upload.single('image'),
  async (req, res, next) => {
    let connection;

    try {
      const name = String(
        req.body.AssetName ?? req.body.assetName ?? '',
      ).trim();

      const categoryId = Number(
        req.body.CategoryID ?? req.body.categoryId,
      );

      const status = req.body.Status ?? req.body.status ?? 'Available';

      const quantity = parseQuantity(
        req.body.TotalQuantity ?? req.body.totalQuantity ?? 1,
      );

      const serial = String(
        req.body.SerialNumber ?? req.body.serialNumber ?? '',
      ).trim();

      const details = String(
        req.body.Details ?? req.body.details ?? '',
      ).trim();

      const purchaseDate =
        req.body.PurchaseDate || req.body.purchaseDate || null;

      const priceValue = req.body.Price ?? req.body.price ?? null;
      const price = priceValue === '' ? null : priceValue;

      const location = String(
        req.body.Location ?? req.body.location ?? '',
      ).trim();

      const imagePath = req.file
        ? `/uploads/assets/${req.file.filename}`
        : null;

      if (!name || name.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'กรุณากรอกชื่อทรัพย์สินไม่เกิน 100 ตัวอักษร',
        });
      }

      if (!Number.isInteger(categoryId) || categoryId < 1) {
        return res.status(400).json({
          success: false,
          message: 'กรุณาเลือกหมวดหมู่',
        });
      }

      if (quantity === null) {
        return res.status(400).json({
          success: false,
          message: 'จำนวนต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป',
        });
      }

      if (!['Available', 'Borrowed', 'Broken'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'สถานะทรัพย์สินไม่ถูกต้อง',
        });
      }

      if (serial.length > 50 || details.length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Serial Number หรือรายละเอียดมีความยาวเกินกำหนด',
        });
      }

      const [categoryRows] = await pool.query(
        'SELECT CategoryID FROM Category WHERE CategoryID = ?',
        [categoryId],
      );

      if (!categoryRows.length) {
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

        if (serialRows.length) {
          return res.status(409).json({
            success: false,
            message: 'Serial Number นี้มีอยู่แล้ว',
          });
        }
      }

      connection = await pool.getConnection();
      await connection.beginTransaction();

      const [result] = await connection.query(
        `INSERT INTO Asset (
          AssetName, CategoryID, Status, PurchaseDate, Price,
          SerialNumber, Location, TotalQuantity, ImagePath, Details
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          categoryId,
          status,
          purchaseDate,
          price,
          serial || null,
          location || null,
          quantity,
          imagePath,
          details || null,
        ],
      );

      await connection.query(
        `INSERT INTO AuditLog (TableName, Action, UserID)
         VALUES ('Asset', 'INSERT', ?)`,
        [req.user.id],
      );

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'เพิ่มทรัพย์สินสำเร็จ',
        AssetID: result.insertId,
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
// ======================================================
router.put(
  '/:id',
  auth,
  adminOnly,
  upload.single('image'),
  async (req, res, next) => {
    let connection;

    try {
      const assetId = Number(req.params.id);

      if (!Number.isInteger(assetId) || assetId < 1) {
        return res.status(400).json({
          success: false,
          message: 'Asset ID ไม่ถูกต้อง',
        });
      }

      const name = String(
        req.body.AssetName ?? req.body.assetName ?? '',
      ).trim();

      const categoryId = Number(
        req.body.CategoryID ?? req.body.categoryId,
      );

      const status = req.body.Status ?? req.body.status ?? 'Available';

      const serial = String(
        req.body.SerialNumber ?? req.body.serialNumber ?? '',
      ).trim();

      const details = String(
        req.body.Details ?? req.body.details ?? '',
      ).trim();

      const purchaseDate =
        req.body.PurchaseDate || req.body.purchaseDate || null;

      const priceValue = req.body.Price ?? req.body.price ?? null;
      const price = priceValue === '' ? null : priceValue;

      const location = String(
        req.body.Location ?? req.body.location ?? '',
      ).trim();

      connection = await pool.getConnection();

      const [assetRows] = await connection.query(
        'SELECT * FROM Asset WHERE AssetID = ?',
        [assetId],
      );

      if (!assetRows.length) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบทรัพย์สิน',
        });
      }

      const oldAsset = assetRows[0];

      const quantityInput =
        req.body.TotalQuantity ?? req.body.totalQuantity;

      const quantity = quantityInput === undefined
        ? Number(oldAsset.TotalQuantity ?? 1)
        : parseQuantity(quantityInput);

      if (!name || name.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'กรุณากรอกชื่อทรัพย์สินไม่เกิน 100 ตัวอักษร',
        });
      }

      if (!Number.isInteger(categoryId) || categoryId < 1) {
        return res.status(400).json({
          success: false,
          message: 'กรุณาเลือกหมวดหมู่',
        });
      }

      if (quantity === null) {
        return res.status(400).json({
          success: false,
          message: 'จำนวนต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป',
        });
      }

      if (!['Available', 'Borrowed', 'Broken'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'สถานะทรัพย์สินไม่ถูกต้อง',
        });
      }

      if (serial.length > 50 || details.length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Serial Number หรือรายละเอียดมีความยาวเกินกำหนด',
        });
      }

      const [categoryRows] = await connection.query(
        'SELECT CategoryID FROM Category WHERE CategoryID = ?',
        [categoryId],
      );

      if (!categoryRows.length) {
        return res.status(400).json({
          success: false,
          message: 'ไม่พบหมวดหมู่ที่เลือก',
        });
      }

      if (serial) {
        const [duplicateRows] = await connection.query(
          `SELECT AssetID FROM Asset
           WHERE SerialNumber = ? AND AssetID <> ?`,
          [serial, assetId],
        );

        if (duplicateRows.length) {
          return res.status(409).json({
            success: false,
            message: 'Serial Number นี้มีอยู่แล้ว',
          });
        }
      }

      const borrowedMap = await getBorrowedQuantities(connection);
      const borrowed = borrowedMap.get(assetId) || 0;

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
        `UPDATE Asset SET
          AssetName = ?,
          CategoryID = ?,
          Status = ?,
          PurchaseDate = ?,
          Price = ?,
          SerialNumber = ?,
          Location = ?,
          TotalQuantity = ?,
          ImagePath = ?,
          Details = ?
         WHERE AssetID = ?`,
        [
          name,
          categoryId,
          status,
          purchaseDate,
          price,
          serial || null,
          location || null,
          quantity,
          imagePath,
          details || null,
          assetId,
        ],
      );

      await connection.query(
        `INSERT INTO AuditLog (TableName, Action, UserID)
         VALUES ('Asset', 'UPDATE', ?)`,
        [req.user.id],
      );

      await connection.commit();

      if (req.file && oldAsset.ImagePath) {
        deleteUploadedImage(oldAsset.ImagePath);
      }

      res.json({
        success: true,
        message: 'แก้ไขทรัพย์สินสำเร็จ',
        ImagePath: imagePath,
        TotalQuantity: quantity,
        BorrowedQuantity: borrowed,
        AvailableQuantity: Math.max(0, quantity - borrowed),
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
//
// ลบทรัพย์สินที่ไม่มีรายการยืมที่กำลังดำเนินการ
// รายการที่ถูกปฏิเสธจะไม่ถูกนับว่าเป็นการยืมที่กำลังใช้งาน
// ======================================================
router.delete('/:id', auth, adminOnly, async (req, res, next) => {
  let connection;
  let imagePath = null;

  try {
    const assetId = Number(req.params.id);

    if (!Number.isInteger(assetId) || assetId < 1) {
      return res.status(400).json({
        success: false,
        message: 'Asset ID ไม่ถูกต้อง',
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [assetRows] = await connection.query(
      'SELECT AssetID, ImagePath FROM Asset WHERE AssetID = ? FOR UPDATE',
      [assetId],
    );

    if (!assetRows.length) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: 'ไม่พบทรัพย์สินที่ต้องการลบ',
      });
    }

    // ไม่อนุญาตให้ลบ ถ้ามีคำขอยืมที่รออนุมัติ
    // หรือมีผู้ยืมอยู่ / กำลังรออนุมัติคืน / เกินกำหนด
    const [activeRows] = await connection.query(
      `SELECT TransactionID, Status
       FROM BorrowTransaction
       WHERE AssetID = ?
         AND Status IN (
           'PendingApproval',
           'Borrowed',
           'ReturnRequested',
           'Late'
         )
       LIMIT 1`,
      [assetId],
    );

    if (activeRows.length) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message:
          'ยังลบไม่ได้ เพราะมีรายการยืมหรือคืนที่กำลังดำเนินการอยู่',
      });
    }

    /*
      ลบเฉพาะรายการคำขอที่ถูกปฏิเสธแล้วก่อนลบทรัพย์สิน
      เพื่อไม่ให้ Foreign Key ของ BorrowTransaction ขวางการลบ

      หมายเหตุ: รายการคำขอที่ถูกปฏิเสธเหล่านี้จะถูกลบไปด้วย
      ไม่ใช่การเก็บประวัติคำขอปฏิเสธไว้
    */
    await connection.query(
      `DELETE FROM BorrowTransaction
       WHERE AssetID = ?
         AND LOWER(Status) IN ('rejected', 'denied', 'declined')`,
      [assetId],
    );

    imagePath = assetRows[0].ImagePath || null;

    await connection.query(
      'DELETE FROM Asset WHERE AssetID = ?',
      [assetId],
    );

    await connection.query(
      `INSERT INTO AuditLog (TableName, Action, UserID)
       VALUES ('Asset', 'DELETE', ?)`,
      [req.user.id],
    );

    await connection.commit();

    deleteUploadedImage(imagePath);

    return res.json({
      success: true,
      message: 'ลบทรัพย์สินสำเร็จ',
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Rollback error:', rollbackError);
      }
    }

    if (
      error.code === 'ER_ROW_IS_REFERENCED_2' ||
      error.code === 'ER_ROW_IS_REFERENCED'
    ) {
      return res.status(409).json({
        success: false,
        message:
          'ยังลบไม่ได้ เพราะมีข้อมูลอื่นอ้างอิงทรัพย์สินนี้อยู่ กรุณาตรวจสอบ Foreign Key และประวัติการยืมคืน',
      });
    }

    console.error('DELETE /assets/:id error:', error);
    return next(error);
  } finally {
    if (connection) connection.release();
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
