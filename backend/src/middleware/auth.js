import jwt from 'jsonwebtoken';

export function auth(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบ' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Token ไม่ถูกต้องหรือหมดอายุ' });
  }
}

export function adminOnly(req, res, next) {
  if (req.user?.type !== 'admin') {
    return res.status(403).json({ message: 'เฉพาะ Admin เท่านั้น' });
  }
  next();
}
