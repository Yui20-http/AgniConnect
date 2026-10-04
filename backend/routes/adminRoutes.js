const express = require('express');
const router = express.Router();
const { getStats, getUsers, toggleUserStatus, deleteUser, getCharts, reviewFarmerKyc, toggleFeaturedFarmer, getAuditLogs, exportOrdersCsv } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect, authorize('admin'));

router.get('/stats', getStats);
router.get('/charts', getCharts);
router.get('/audit-logs', getAuditLogs);
router.get('/orders/export.csv', exportOrdersCsv);
router.get('/users', getUsers);
router.put('/users/:id/kyc', reviewFarmerKyc);
router.put('/users/:id/featured', toggleFeaturedFarmer);
router.put('/users/:id/toggle', toggleUserStatus);
router.delete('/users/:id', deleteUser);

module.exports = router;
