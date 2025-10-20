import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthTokenPayload {
  sub: string;
  role: 'user' | 'admin';
}

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

const secret = process.env.JWT_SECRET ?? 'dev-secret';

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing token' });
  }
  const [, token] = authHeader.split(' ');
  try {
    const decoded = jwt.verify(token, secret) as AuthTokenPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

export const issueToken = (payload: AuthTokenPayload) => jwt.sign(payload, secret, { expiresIn: '4h' });
