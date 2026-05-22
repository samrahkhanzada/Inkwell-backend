import express from 'express';
import Like from '../models/Like.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/likes/toggle
router.post('/toggle', protect, async (req, res) => {
  try {
    const { postId, reaction = 'like' } = req.body;

    if (!postId) {
      return res.status(400).json({ success: false, message: 'Post ID is required' });
    }

    const existing = await Like.findOne({ post: postId, user: req.user._id });

    if (existing) {
      await existing.deleteOne();
      return res.json({ success: true, liked: false });
    }

    await Like.create({ post: postId, user: req.user._id, reaction });
    res.json({ success: true, liked: true, reaction });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/likes/post/:postId
router.get('/post/:postId', async (req, res) => {
  try {
    const likes = await Like.find({ post: req.params.postId })
      .populate('user', 'name username avatar');

    const breakdown = likes.reduce((acc, like) => {
      acc[like.reaction] = (acc[like.reaction] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      total:   likes.length,
      breakdown,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;