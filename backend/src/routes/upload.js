
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const prisma = require('../lib/prisma');
const auth = require('../lib/authMiddleware');

const router = express.Router();

// Configure storage
// Configure memory storage for Render compatibility (DB persistence)
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 4 * 1024 * 1024 }, // 4MB limit (fits in TEXT column with overhead)
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error("Error: File upload only supports images!"));
    }
});

// POST /api/upload/avatar - Upload profile picture
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Convert buffer to Base64 Data URI
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const avatarUrl = `data:${req.file.mimetype};base64,${b64}`;

        // Update user profile with persistent data
        await prisma.user.update({
            where: { id: req.user.userId },
            data: { avatarUrl }
        });

        res.json({ message: 'Avatar uploaded successfully', avatarUrl });
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: 'Failed to upload avatar' });
    }
});

module.exports = router;
