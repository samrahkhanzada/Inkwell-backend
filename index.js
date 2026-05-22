import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import postRoutes from './routes/posts.js';
import commentRoutes from './routes/comments.js';
import categoryRoutes from './routes/categories.js';
import tagRoutes from './routes/tags.js';
import likeRoutes from './routes/likes.js';
import uploadRoutes from './routes/upload.js';
import { publishScheduledPosts } from './utils/scheduler.js';

dotenv.config();
connectDB();

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/auth',       authRoutes);
app.use('/api/users',      userRoutes);
app.use('/api/posts',      postRoutes);
app.use('/api/comments',   commentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/tags',       tagRoutes);
app.use('/api/likes',      likeRoutes);
app.use('/api/upload',     uploadRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Run every minute to publish scheduled posts
cron.schedule('* * * * *', publishScheduledPosts);

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Server Error',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


dotenv.config();

// Add this to catch unhandled errors
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});