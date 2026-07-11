const express = require('express');
const { entityOps } = require('../db');
const { requireAuth, requireOwner } = require('../auth');

const router = express.Router();

// Table name mapping
const TABLE_MAP = {
  MenuItem: 'menu_items',
  Order: 'orders',
  Coupon: 'coupons',
  CustomerSubscription: 'customer_subscriptions',
  SubscriptionPlan: 'subscription_plans',
};

// ─── Filter / List ────────────────────────────────────────────────────────────
router.get('/:entity', async (req, res) => {
  const table = TABLE_MAP[req.params.entity];
  if (!table) return res.status(404).json({ error: 'Unknown entity' });
  const { _sort, _limit, path, ...filters } = req.query;
  // Convert string booleans
  for (const k of Object.keys(filters)) {
    if (filters[k] === 'true') filters[k] = 1;
    else if (filters[k] === 'false') filters[k] = 0;
  }
  try {
    const rows = await entityOps.filter(table, filters, _sort || '-created_date', parseInt(_limit) || 200);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Query failed' });
  }
});

// ─── Get by ID ────────────────────────────────────────────────────────────────
router.get('/:entity/:id', async (req, res) => {
  const table = TABLE_MAP[req.params.entity];
  if (!table) return res.status(404).json({ error: 'Unknown entity' });
  try {
    const row = await entityOps.get(table, req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Query failed' });
  }
});

// ─── Create ───────────────────────────────────────────────────────────────────
router.post('/:entity', requireAuth, async (req, res) => {
  const table = TABLE_MAP[req.params.entity];
  if (!table) return res.status(404).json({ error: 'Unknown entity' });
  try {
    const row = await entityOps.create(table, req.body);
    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Create failed' });
  }
});

// ─── Update ───────────────────────────────────────────────────────────────────
router.patch('/:entity/:id', requireAuth, async (req, res) => {
  const table = TABLE_MAP[req.params.entity];
  if (!table) return res.status(404).json({ error: 'Unknown entity' });
  try {
    const row = await entityOps.update(table, req.params.id, req.body);
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Update failed' });
  }
});

// ─── Delete ───────────────────────────────────────────────────────────────────
router.delete('/:entity/:id', requireOwner, async (req, res) => {
  const table = TABLE_MAP[req.params.entity];
  if (!table) return res.status(404).json({ error: 'Unknown entity' });
  try {
    await entityOps.delete(table, req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
