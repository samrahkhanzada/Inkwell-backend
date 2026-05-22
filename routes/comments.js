import express from 'express';
import Comment from '../models/Comment.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/comments/post/:postId
router.get('/post/:postId', async (req, res) => {
  try {
    const comments = await Comment.find({
      post:   req.params.postId,
      parent: null,
    })
      .populate('author', 'name username avatar')
      .populate({
        path: 'replies',
        populate: { path: 'author', select: 'name username avatar' },
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, comments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/comments
router.post('/', protect, async (req, res) => {
  try {
    const { post, content, parent } = req.body;

    if (!post || !content) {
      return res.status(400).json({ success: false, message: 'Post and content are required' });
    }

    const comment = await Comment.create({
      post,
      content,
      parent: parent || null,
      author: req.user._id,
    });

    await comment.populate('author', 'name username avatar');

    res.status(201).json({ success: true, comment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/comments/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }
    if (!comment.author.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this comment' });
    }
    if (!req.body.content || req.body.content.trim() === '') {
      return res.status(400).json({ success: false, message: 'Content cannot be empty' });
    }

    comment.content  = req.body.content;
    comment.isEdited = true;
    await comment.save();

    res.json({ success: true, comment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   DELETE /api/comments/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }
    if (!comment.author.equals(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this comment' });
    }

    // Delete all replies to this comment
    await Comment.deleteMany({ parent: comment._id });
    await comment.deleteOne();

    res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/comments/:id/like
router.post('/:id/like', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const index = comment.likes.indexOf(req.user._id);
    if (index >= 0) {
      comment.likes.splice(index, 1);
    } else {
      comment.likes.push(req.user._id);
    }

    await comment.save();

    res.json({
      success:   true,
      liked:     index < 0,
      likeCount: comment.likes.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;