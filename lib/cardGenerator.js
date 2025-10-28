
/**
 * Secure card generation utilities for Oakline Bank
 * Generates unique card numbers, CVCs, and manages card creation
 */

import { supabaseAdmin } from './supabaseAdmin';

/**
 * Generate a card number based on brand
 * Visa: starts with 4 (16 digits)
 * Mastercard: starts with 5 (16 digits)
 * Amex: starts with 34 or 37 (15 digits)
 */
function generateCardNumberForBrand(brand) {
  const normalizedBrand = brand?.toLowerCase() || 'visa';
  
  if (normalizedBrand === 'amex' || normalizedBrand === 'american express') {
    // Amex: 15 digits starting with 34 or 37
    const prefix = Math.random() > 0.5 ? '34' : '37';
    let number = prefix;
    for (let i = 2; i < 15; i++) {
      number += Math.floor(Math.random() * 10);
    }
    return number;
  } else if (normalizedBrand === 'mastercard') {
    // Mastercard: 16 digits starting with 5
    let number = '5';
    for (let i = 1; i < 16; i++) {
      number += Math.floor(Math.random() * 10);
    }
    return number;
  } else {
    // Visa (default): 16 digits starting with 4
    let number = '4';
    for (let i = 1; i < 16; i++) {
      number += Math.floor(Math.random() * 10);
    }
    return number;
  }
}

/**
 * Generate CVC based on brand
 * Amex: 4 digits
 * Others: 3 digits
 */
function generateCVC(brand) {
  const normalizedBrand = brand?.toLowerCase() || 'visa';
  const length = (normalizedBrand === 'amex' || normalizedBrand === 'american express') ? 4 : 3;
  
  let cvc = '';
  for (let i = 0; i < length; i++) {
    cvc += Math.floor(Math.random() * 10);
  }
  return cvc;
}

/**
 * Generate expiry date (4 years from now)
 */
function generateExpiryDate() {
  const today = new Date();
  today.setFullYear(today.getFullYear() + 4);
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = String(today.getFullYear()).slice(-2);
  return `${month}/${year}`;
}

/**
 * Mask card number for display
 * Shows only last 4 digits
 */
function maskCardNumber(cardNumber) {
  if (!cardNumber || cardNumber.length < 4) return '****';
  return `**** **** **** ${cardNumber.slice(-4)}`;
}

/**
 * Check if a card already exists for an account
 */
async function checkExistingCard(accountId) {
  const { data, error } = await supabaseAdmin
    .from('cards')
    .select('*')
    .eq('account_id', accountId)
    .not('status', 'in', '("replaced","deactivated","cancelled")')
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking existing card:', error);
    throw error;
  }

  return data;
}

/**
 * Generate a unique card number
 * Retries up to maxAttempts times if duplicates are found
 */
async function generateUniqueCardNumber(brand, maxAttempts = 20) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const cardNumber = generateCardNumberForBrand(brand);
    
    // Check if this card number already exists
    const { data, error } = await supabaseAdmin
      .from('cards')
      .select('id')
      .eq('card_number', cardNumber)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking card uniqueness:', error);
      throw error;
    }

    if (!data) {
      // Unique card number found
      return cardNumber;
    }

    console.log(`Card number collision (attempt ${attempt + 1}/${maxAttempts}), retrying...`);
  }

  throw new Error('Failed to generate unique card number after maximum attempts');
}

/**
 * Create audit log entry for card issuance
 */
async function createCardAuditLog(userId, accountId, cardId, adminId) {
  try {
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'card_issued',
        entity_type: 'card',
        entity_id: cardId,
        details: {
          account_id: accountId,
          issued_by: adminId || 'system',
          timestamp: new Date().toISOString()
        },
        ip_address: null,
        user_agent: 'system',
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit log failure shouldn't stop card creation
  }
}

/**
 * Main function to create a card for an account
 * Idempotent - returns existing card if one already exists
 */
export async function createCardForAccount(accountId, adminId = null) {
  try {
    console.log(`Creating card for account: ${accountId}`);

    // Check if card already exists for this account
    const existingCard = await checkExistingCard(accountId);
    if (existingCard) {
      console.log(`Card already exists for account ${accountId}, returning existing card`);
      return {
        success: true,
        cardId: existingCard.id,
        maskedNumber: maskCardNumber(existingCard.card_number),
        lastFour: existingCard.card_number.slice(-4),
        expiryDate: existingCard.expiry_date,
        brand: existingCard.card_brand,
        category: existingCard.card_category,
        existing: true
      };
    }

    // Fetch account details
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('user_id, application_id, account_type')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    // Fetch application to get card preferences
    let cardBrand = 'visa';
    let cardCategory = 'debit';

    if (account.application_id) {
      const { data: application } = await supabaseAdmin
        .from('applications')
        .select('chosen_card_brand, chosen_card_category')
        .eq('id', account.application_id)
        .single();

      if (application) {
        cardBrand = application.chosen_card_brand || 'visa';
        cardCategory = application.chosen_card_category || 'debit';
      }
    }

    // Generate unique card number
    const cardNumber = await generateUniqueCardNumber(cardBrand);
    const cvc = generateCVC(cardBrand);
    const expiryDate = generateExpiryDate();

    // Create card record
    const cardData = {
      user_id: account.user_id,
      account_id: accountId,
      card_number: cardNumber,
      card_brand: cardBrand.toLowerCase(),
      card_category: cardCategory.toLowerCase(),
      card_type: cardCategory.toLowerCase(),
      status: 'active',
      expiry_date: expiryDate,
      cvc: cvc,
      daily_limit: 5000,
      monthly_limit: 20000,
      daily_spent: 0,
      monthly_spent: 0,
      contactless: true,
      requires_3d_secure: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      activated_at: new Date().toISOString()
    };

    const { data: newCard, error: cardError } = await supabaseAdmin
      .from('cards')
      .insert([cardData])
      .select()
      .single();

    if (cardError) {
      console.error('Failed to create card:', cardError);
      throw cardError;
    }

    console.log(`Card created successfully for account ${accountId}`);

    // Create audit log
    await createCardAuditLog(account.user_id, accountId, newCard.id, adminId);

    // Return masked details only
    return {
      success: true,
      cardId: newCard.id,
      maskedNumber: maskCardNumber(cardNumber),
      lastFour: cardNumber.slice(-4),
      expiryDate: expiryDate,
      brand: cardBrand,
      category: cardCategory,
      existing: false
    };

  } catch (error) {
    console.error('Error in createCardForAccount:', error);
    throw error;
  }
}

export { maskCardNumber, generateExpiryDate };
