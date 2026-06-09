const express = require('express');
const { getPool } = require('../config/db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    await pool.query('SELECT 1 AS ok');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      database: 'unavailable',
      message: err.message,
    });
  }
});

module.exports = router;
