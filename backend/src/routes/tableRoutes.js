const express = require('express');
const tableController = require('../controllers/tableController');
const { protect } = require('../middleware/authMiddleware'); // All table routes should be protected

const router = express.Router();

// Apply protect middleware to all routes in this file
router.use(protect);

router.route('/config')
  .get(tableController.getTableConfig) // Get config
  .post(tableController.createOrUpdateTableConfig); // Create or update config

router.post('/config/dynamic-column', tableController.addDynamicColumn); // Add a dynamic column

router.get('/data', tableController.getTableData); // Get current table data (from cache/polling)


module.exports = router;