const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const { createReport, getReports, updateReport } = require('../controllers/reportController');

const router = express.Router();
router.use(protect);
router.post('/', createReport);
router.get('/', authorize('admin'), getReports);
router.patch('/:id', authorize('admin'), updateReport);
module.exports = router;
