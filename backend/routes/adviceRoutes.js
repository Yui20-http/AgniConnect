const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { cropAdvice, cropPhotoUpload } = require('../controllers/adviceController');
router.post('/crop', protect, authorize('farmer'), cropPhotoUpload, cropAdvice);
module.exports = router;
