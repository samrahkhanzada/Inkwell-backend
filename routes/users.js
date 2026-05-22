import express from 'express';
import User from '../models/User.js';
import Post from '../models/Post.js';
import { protect } from '../middleware/auth.js';
import { upload, cloudinary } from '../config/cloudinary.js';

const router = express.Router();

// @route   GET /api/users/:username
router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const postCount = await Post.countDocuments({ author: user._id, status: 'published' });
    res.json({ success: true, user: { ...user.toObject(), postCount } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/users/profile/update
router.put('/profile/update', protect, async (req, res) => {
  try {
    const { name, bio, website, socialLinks } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, bio, website, socialLinks },
      { new: true, runValidators: true }
    ).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/users/avatar/upload
router.post('/avatar/upload', protect, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const user = await User.findById(req.user._id);
    // Delete old avatar from Cloudinary
    if (user.avatarPublicId) {
      await cloudinary.uploader.destroy(user.avatarPublicId);
    }
    user.avatar          = req.file.path;
    user.avatarPublicId  = req.file.filename;
    await user.save();
    res.json({ success: true, avatar: user.avatar });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/users/:username/posts
router.get('/:username/posts', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const page  = Number(req.query.page)  || 1;
    const limit = Number(req.query.limit) || 9;

    const posts = await Post.find({ author: user._id, status: 'published' })
      .populate('category', 'name slug color icon')
      .populate('tags', 'name slug')
      .populate('likeCount')
      .populate('commentCount')
      .sort({ publishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Post.countDocuments({ author: user._id, status: 'published' });

    res.json({
      success: true,
      posts,
      total,
      pages: Math.ceil(total / limit),
      page,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/users/:id/follow
router.post('/:id/follow', protect, async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (target._id.equals(req.user._id)) {
      return res.status(400).json({ success: false, message: 'You cannot follow yourself' });
    }

    const isFollowing = target.followers.includes(req.user._id);

    if (isFollowing) {
      target.followers.pull(req.user._id);
      await User.findByIdAndUpdate(req.user._id, { $pull: { following: target._id } });
    } else {
      target.followers.push(req.user._id);
      await User.findByIdAndUpdate(req.user._id, { $push: { following: target._id } });
    }

    await target.save();

    res.json({
      success: true,
      following:     !isFollowing,
      followerCount: target.followers.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;