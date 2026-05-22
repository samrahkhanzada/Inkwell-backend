import express from 'express';
import { upload, cloudinary } from '../config/cloudinary.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route POST /api/upload/image
router.post('/image', protect, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err);
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

export default router;