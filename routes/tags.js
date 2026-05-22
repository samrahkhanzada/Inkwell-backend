import express from 'express';
import Tag from '../models/Tag.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/tags
router.get('/', async (_req, res) => {
  try {
    const tags = await Tag.find().sort({ name: 1 });
    res.json({ success: true, tags });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/tags
router.post('/', protect, async (req, res) => {
  try {
    const name = req.body.name?.toLowerCase().trim();
    if (!name) {
      return res.status(400).json({ success: false, message: 'Tag name is required' });
    }

    // Find existing tag or create new one
    let tag = await Tag.findOne({ name });
    if (!tag) {
      tag = new Tag({ name });
      tag.slug = name.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      await tag.save();
    }

    res.status(201).json({ success: true, tag });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @route   DELETE /api/tags/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const tag = await Tag.findByIdAndDelete(req.params.id);
    if (!tag) {
      return res.status(404).json({ success: false, message: 'Tag not found' });
    }
    res.json({ success: true, message: 'Tag deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;