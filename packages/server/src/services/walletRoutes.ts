import { Router } from 'express';
import { prisma } from './prisma';
import { AuthenticatedRequest } from '../auth/middleware';

const router = Router();

router.post('/deposit', async (req: AuthenticatedRequest, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }
  const account = await prisma.account.update({
    where: { userId: req.user!.sub },
    data: {
      balance: { increment: amount },
      ledger: { create: { amount, type: 'DEPOSIT', meta: {} } }
    },
    include: { ledger: true }
  });
  res.json(account);
});

router.post('/withdraw-admin', async (req: AuthenticatedRequest, res) => {
  const { amount } = req.body;
  const account = await prisma.account.update({
    where: { userId: req.user!.sub },
    data: {
      balance: { decrement: amount },
      ledger: { create: { amount: -Math.abs(amount), type: 'WITHDRAW_TO_ADMIN', meta: {} } }
    }
  });
  res.json(account);
});

export default router;
