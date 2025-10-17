
import { supabase } from '../../../lib/supabaseClient';
import bcrypt from 'bcryptjs';

const PIN_ATTEMPTS = new Map(); // In-memory rate limiting
const MAX_ATTEMPTS = 3;
const ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { cardId, pin } = req.body;

    // Validation
    if (!cardId || !pin) {
      return res.status(400).json({ error: 'Card ID and PIN are required' });
    }

    // Validate PIN format (4-6 digits)
    if (!/^\d{4,6}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be 4-6 digits' });
    }

    // Rate limiting
    const attemptKey = `${user.id}-${cardId}`;
    const attempts = PIN_ATTEMPTS.get(attemptKey) || { count: 0, timestamp: Date.now() };
    
    if (Date.now() - attempts.timestamp > ATTEMPT_WINDOW) {
      attempts.count = 0;
      attempts.timestamp = Date.now();
    }

    if (attempts.count >= MAX_ATTEMPTS) {
      return res.status(429).json({ 
        error: 'Too many attempts. Please try again later.',
        retryAfter: Math.ceil((attempts.timestamp + ATTEMPT_WINDOW - Date.now()) / 1000)
      });
    }

    attempts.count++;
    PIN_ATTEMPTS.set(attemptKey, attempts);

    // Verify card ownership
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select('*')
      .eq('id', cardId)
      .eq('user_id', user.id)
      .single();

    if (cardError || !card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Hash the PIN
    const pinHash = await bcrypt.hash(pin, 10);

    // Update card with PIN
    const { error: updateError } = await supabase
      .from('cards')
      .update({
        pin_hash: pinHash,
        pin_set: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', cardId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating PIN:', updateError);
      return res.status(500).json({ error: 'Failed to set PIN' });
    }

    // Log audit trail
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        card_id: cardId,
        action: card.pin_set ? 'PIN_CHANGED' : 'PIN_SET',
        details: {
          card_last_four: card.card_number.slice(-4),
          timestamp: new Date().toISOString()
        },
        ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        user_agent: req.headers['user-agent']
      });

    if (auditError) {
      console.error('Audit log error:', auditError);
    }

    // Clear rate limiting on success
    PIN_ATTEMPTS.delete(attemptKey);

    res.status(200).json({
      success: true,
      message: 'PIN set successfully'
    });

  } catch (error) {
    console.error('Error in set-pin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
