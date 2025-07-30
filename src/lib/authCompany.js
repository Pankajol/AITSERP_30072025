// lib/authCompany.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export function verifyCompanyToken(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1];

  if (!token) throw new Error('Unauthorized');

  const decoded = jwt.verify(token, JWT_SECRET);
  if (decoded.type !== 'company') throw new Error('Unauthorized');

  return decoded; // { id, email, type, companyName }
}
