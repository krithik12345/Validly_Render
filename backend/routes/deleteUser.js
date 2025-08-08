const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Use environment variables for security!
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[deleteUser] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
}

const supabase = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_ROLE_KEY || '');

router.post('/', async (req, res) => {
  const { userId } = req.body;
  // TODO: Add authentication/authorization checks here!
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server is missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' });
  }

  try {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw error;
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('[deleteUser] Failed to delete user:', err);
    res.status(500).json({ error: err.message || 'Failed to delete user' });
  }
});

module.exports = router;