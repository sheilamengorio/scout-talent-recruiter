const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/logos');

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'logo-' + uniqueSuffix + ext);
  }
});

// File filter - only allow images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|svg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (JPEG, PNG, GIF, SVG)'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 // 5MB default
  },
  fileFilter: fileFilter
});

/**
 * POST /api/upload/logo
 * Upload company logo
 */
router.post('/upload/logo', upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Generate public URL for the logo
    const logoUrl = `/api/uploads/${req.file.filename}`;

    res.json({
      message: 'Logo uploaded successfully',
      logo_url: logoUrl,
      filename: req.file.filename
    });

  } catch (error) {
    console.error('Logo upload error:', error);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

/**
 * GET /api/uploads/:filename
 * Serve uploaded files
 */
router.get('/uploads/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '../uploads/logos', filename);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Serve the file
  res.sendFile(filePath);
});

module.exports = router;
