const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();

router.use(authenticateToken);

router.get(
  '/hr',
  requireRole('hr'),
  (req, res) => {
    res.json({
      role: 'hr',
      title: 'HR Personnel workspace',
      modules: [
        { id: 'recruitment', name: 'Recruitment & AI screening', description: 'Open positions, interview results, hiring decisions' },
        { id: 'monitoring', name: 'Employee performance monitoring', description: 'Dashboards, alerts, trend reports' },
        { id: 'lifecycle', name: 'HR decisions & lifecycle', description: 'Promotions, terminations, resignations, reposted roles' },
      ],
    });
  }
);

router.get(
  '/manager',
  requireRole('manager'),
  (req, res) => {
    res.json({
      role: 'manager',
      title: 'Department Manager workspace',
      modules: [
        { id: 'team-performance', name: 'Team performance', description: 'Real-time metrics for your direct reports' },
        { id: 'employees', name: 'Employee directory', description: 'View and manage your department staff' },
        { id: 'lifecycle', name: 'Lifecycle decisions', description: 'Submit promotion or termination recommendations to HR' },
      ],
    });
  }
);

router.get(
  '/employee',
  requireRole('employee'),
  (req, res) => {
    res.json({
      role: 'employee',
      title: 'Employee workspace',
      modules: [
        { id: 'my-performance', name: 'My performance', description: 'Personal indicators and history' },
        { id: 'notifications', name: 'HR notifications', description: 'Formal notices from HR' },
        { id: 'resignation', name: 'Resignation assistant', description: 'AI-assisted resignation submission' },
      ],
    });
  }
);

module.exports = router;
