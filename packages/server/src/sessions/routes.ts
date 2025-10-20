import { Router } from 'express';
import { prisma } from '../services/prisma';
import { AuthenticatedRequest } from '../auth/middleware';
import crypto from 'crypto';

const router = Router();

router.post('/create', async (req: AuthenticatedRequest, res) => {
  const { smallBlind, bigBlind, buyInMin, buyInMax, seatsMax, rakePct, password } = req.body;
  if (!smallBlind || !bigBlind || !buyInMin || !buyInMax || !seatsMax) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const roomId = crypto.randomBytes(4).toString('hex');
  const session = await prisma.gameSession.create({
    data: {
      roomId,
      hostUserId: req.user!.sub,
      smallBlind,
      bigBlind,
      rakePct,
      passwordHash: password ? crypto.createHash('sha256').update(password).digest('hex') : null
    }
  });
  res.json({ roomId: session.roomId, hostToken: crypto.randomBytes(16).toString('hex') });
});

router.get('/:roomId', async (req, res) => {
  const session = await prisma.gameSession.findUnique({ where: { roomId: req.params.roomId } });
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(session);
});

export default router;
