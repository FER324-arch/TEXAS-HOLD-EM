import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../services/prisma';
import { issueToken } from './middleware';

const router = Router();

router.post('/register', async (req, res) => {
  const { email, password, nickname } = req.body;
  if (!email || !password || !nickname) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'User already exists' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      nickname,
      passwordHash,
      account: { create: { balance: 0 } }
    },
    include: { account: true }
  });
  const token = issueToken({ sub: user.id, role: user.role as 'user' | 'admin' });
  res.json({ token });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }
  const user = await prisma.user.findUnique({ where: { email }, include: { account: true } });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = issueToken({ sub: user.id, role: user.role as 'user' | 'admin' });
  res.json({ token });
});

router.get('/me', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ error: 'Missing token' });
  }
  const [, token] = auth.split(' ');
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { account: true }
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      balance: user.account?.balance ?? 0,
      role: user.role
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
