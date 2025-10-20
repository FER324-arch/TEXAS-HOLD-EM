import { Router } from 'express';
import { prisma } from './prisma';
import { AuthenticatedRequest } from '../auth/middleware';
import { computeMonthlyPnL } from '@neon/shared';

const router = Router();

router.get('/pnl', async (req: AuthenticatedRequest, res) => {
  const days = req.query.days ? Number(req.query.days) : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const entries = await prisma.ledgerEntry.findMany({
    where: { userId: req.user!.sub, createdAt: { gte: since } },
    orderBy: { createdAt: 'asc' }
  });
  const pnl = computeMonthlyPnL(
    entries.map((entry) => ({
      id: entry.id,
      accountId: entry.accountId,
      userId: entry.userId ?? undefined,
      type: entry.type as any,
      amount: entry.amount,
      createdAt: entry.createdAt.toISOString()
    }))
  );
  res.json(pnl);
});

router.get('/ledger', async (req: AuthenticatedRequest, res) => {
  const entries = await prisma.ledgerEntry.findMany({
    where: { userId: req.user!.sub },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  res.json(entries);
});

export default router;
