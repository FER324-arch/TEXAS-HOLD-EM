import { Router } from 'express';
import { prisma } from '../services/prisma';
import { requireAdmin, AuthenticatedRequest } from '../auth/middleware';

const router = Router();
router.use(requireAdmin);

router.get('/accounts', async (_req, res) => {
  const accounts = await prisma.account.findMany({ include: { user: true } });
  res.json(accounts);
});

router.post('/mint', async (req: AuthenticatedRequest, res) => {
  const { accountId, amount } = req.body;
  if (!accountId || typeof amount !== 'number') {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const account = await prisma.account.update({
    where: { id: accountId },
    data: { balance: { increment: amount }, ledger: { create: { amount, type: 'MINT', meta: {} } } }
  });
  res.json(account);
});

router.post('/burn', async (req, res) => {
  const { accountId, amount } = req.body;
  const account = await prisma.account.update({
    where: { id: accountId },
    data: {
      balance: { decrement: amount },
      ledger: { create: { amount: -Math.abs(amount), type: 'BURN', meta: {} } }
    }
  });
  res.json(account);
});

router.post('/transfer', async (req, res) => {
  const { fromAccountId, toAccountId, amount } = req.body;
  if (!fromAccountId || !toAccountId || typeof amount !== 'number') {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const result = await prisma.$transaction([
    prisma.account.update({
      where: { id: fromAccountId },
      data: {
        balance: { decrement: amount },
        ledger: { create: { amount: -Math.abs(amount), type: 'TRANSFER', meta: { toAccountId } } }
      }
    }),
    prisma.account.update({
      where: { id: toAccountId },
      data: {
        balance: { increment: amount },
        ledger: { create: { amount: Math.abs(amount), type: 'TRANSFER', meta: { fromAccountId } } }
      }
    })
  ]);
  res.json(result);
});

router.get('/sessions', async (_req, res) => {
  const sessions = await prisma.gameSession.findMany({ include: { hands: true } });
  res.json(sessions);
});

router.post('/session/:roomId/close', async (req, res) => {
  const { roomId } = req.params;
  const session = await prisma.gameSession.update({ where: { roomId }, data: { status: 'closed' } });
  res.json(session);
});

router.post('/account/:id/lock', async (req, res) => {
  const account = await prisma.account.update({ where: { id: req.params.id }, data: { isLocked: true } });
  res.json(account);
});

router.get('/ledger', async (req, res) => {
  const { userId } = req.query;
  const ledger = await prisma.ledgerEntry.findMany({ where: userId ? { userId: String(userId) } : {} });
  res.json(ledger);
});

export default router;
