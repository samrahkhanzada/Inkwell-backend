import express from 'express';
import Post from '../models/Post.js';
import Like from '../models/Like.js';
import { protect, optionalAuth } from '../middleware/auth.js';
import { upload, cloudinary } from '../config/cloudinary.js';

const router = express.Router();

// @route   GET /api/posts
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, category, tag, search, author, featured } = req.query;
    const filter = { status: 'published' };

    if (category) filter.category = category;
    if (tag)      filter.tags     = tag;
    if (author)   filter.author   = author;
    if (featured) filter.isFeatured = true;
    if (search)   filter.$text    = { $search: search };

    const posts = await Post.find(filter)
      .populate('author',   'name username avatar')
      .populate('category', 'name slug color icon')
      .populate('tags',     'name slug')
      .populate('likeCount')
      .populate('commentCount')
      .sort(search ? { score: { $meta: 'textScore' } } : { publishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .select('-content');

    const total = await Post.countDocuments(filter);

    res.json({
      success: true,
      posts,
      total,
      pages: Math.ceil(total / limit),
      page:  Number(page),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/posts/dashboard/my
router.get('/dashboard/my', protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = { author: req.user._id };
    if (status) filter.status = status;

    const posts = await Post.find(filter)
      .populate('category', 'name slug')
      .populate('tags', 'name slug')
      .populate('likeCount')
      .populate('commentCount')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Post.countDocuments(filter);

    res.json({
      success: true,
      posts,
      total,
      pages: Math.ceil(total / limit),
      page:  Number(page),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/posts/:slug
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug, status: 'published' })
      .populate('author',   'name username avatar bio')
      .populate('category', 'name slug color icon')
      .populate('tags',     'name slug')
      .populate('likeCount')
      .populate('commentCount');

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Increment view count
    await Post.findByIdAndUpdate(post._id, { $inc: { views: 1 } });

    // Check if logged-in user liked this post
    let userLiked = false;
    if (req.user) {
      const like = await Like.findOne({ post: post._id, user: req.user._id });
      userLiked = !!like;
    }

    res.json({ success: true, post, userLiked });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/posts
router.post('/', protect, async (req, res) => {
  try {
    const postData = { ...req.body, author: req.user._id };

    // Remove empty strings for ObjectId fields
    if (!postData.category) delete postData.category;
    if (!postData.tags || postData.tags.length === 0) delete postData.tags;
    if (!postData.scheduledAt) delete postData.scheduledAt;

    const post = await Post.create(postData);
    res.status(201).json({ success: true, post });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @route   POST /api/posts/upload/featured-image
// router.post('/upload/featured-image', protect, upload.single('image'), async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ success: false, message: 'No file uploaded' });
//     }
//     res.json({
//       success:  true,
//       url:      req.file.path,
//       publicId: req.file.filename,
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

router.post('/upload/featured-image', protect, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('Featured image upload error:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    res.json({
      success:  true,
      url:      req.file.path,
      publicId: req.file.filename,
    });
  });
});

// @route   PUT /api/posts/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    if (!post.author.equals(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this post' });
    }

    if (
      req.body.featuredImagePublicId &&
      post.featuredImagePublicId &&
      req.body.featuredImagePublicId !== post.featuredImagePublicId
    ) {
      await cloudinary.uploader.destroy(post.featuredImagePublicId).catch(() => {});
    }

    const updateData = { ...req.body };

    // Remove empty strings for ObjectId fields
    if (!updateData.category) delete updateData.category;
    if (!updateData.scheduledAt) delete updateData.scheduledAt;

    Object.assign(post, updateData);
    await post.save();

    res.json({ success: true, post });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @route   DELETE /api/posts/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    if (!post.author.equals(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this post' });
    }

    // Delete featured image from Cloudinary
    if (post.featuredImagePublicId) {
      await cloudinary.uploader.destroy(post.featuredImagePublicId).catch(() => {});
    }

    await post.deleteOne();
    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;