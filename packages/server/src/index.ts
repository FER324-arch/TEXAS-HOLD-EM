import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import pino from 'pino';
import dotenv from 'dotenv';
import authRouter from './auth/routes';
import adminRouter from './admin/routes';
import sessionRouter from './sessions/routes';
import signaling from './sessions/signaling';
import { authenticate } from './auth/middleware';
import { prisma } from './services/prisma';
import walletRouter from './services/walletRoutes';
import historyRouter from './services/historyRoutes';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { path: '/signal', cors: { origin: '*' } });
const logger = pino({ transport: { target: 'pino-pretty' } });

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/auth', authRouter);
app.use('/wallet', authenticate, walletRouter);
app.use('/history', authenticate, historyRouter);
app.use('/session', authenticate, sessionRouter);
app.use('/admin', authenticate, adminRouter);

signaling(io);

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

server.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
