
import { supabase } from '../../../lib/supabaseClient';
import bcrypt from 'bcryptjs';

const VERIFY_ATTEMPTS = new Map(); // In-memory rate limiting
const MAX_ATTEMPTS = 5;
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

    // Validate PIN format
    if (!/^\d{4,6}$/.test(pin)) {
      return res.status(400).json({ error: 'Invalid PIN format' });
    }

    // Rate limiting
    const attemptKey = `verify-${user.id}-${cardId}`;
    const attempts = VERIFY_ATTEMPTS.get(attemptKey) || { count: 0, timestamp: Date.now() };
    
    if (Date.now() - attempts.timestamp > ATTEMPT_WINDOW) {
      attempts.count = 0;
      attempts.timestamp = Date.now();
    }

    if (attempts.count >= MAX_ATTEMPTS) {
      // Lock card after too many failed attempts
      await supabase
        .from('cards')
        .update({ is_locked: true })
        .eq('id', cardId)
        .eq('user_id', user.id);

      return res.status(429).json({ 
        error: 'Card locked due to too many failed attempts. Please contact support.',
        locked: true
      });
    }

    attempts.count++;
    VERIFY_ATTEMPTS.set(attemptKey, attempts);

    // Verify card ownership
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select('pin_hash, card_number, is_locked, pin_set')
      .eq('id', cardId)
      .eq('user_id', user.id)
      .single();

    if (cardError || !card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    if (card.is_locked) {
      return res.status(403).json({ error: 'Card is locked', locked: true });
    }

    if (!card.pin_set || !card.pin_hash) {
      return res.status(400).json({ error: 'PIN not set for this card' });
    }

    // Verify PIN
    const pinMatch = await bcrypt.compare(pin, card.pin_hash);

    // Log audit trail
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        card_id: cardId,
        action: pinMatch ? 'PIN_VERIFY_SUCCESS' : 'PIN_VERIFY_FAILED',
        details: {
          card_last_four: card.card_number.slice(-4),
          attempt: attempts.count,
          timestamp: new Date().toISOString()
        },
        ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        user_agent: req.headers['user-agent']
      });

    if (!pinMatch) {
      return res.status(401).json({ 
        error: 'Incorrect PIN',
        attemptsRemaining: MAX_ATTEMPTS - attempts.count
      });
    }

    // Clear rate limiting on success
    VERIFY_ATTEMPTS.delete(attemptKey);

    res.status(200).json({
      success: true,
      message: 'PIN verified successfully'
    });

  } catch (error) {
    console.error('Error in verify-pin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
