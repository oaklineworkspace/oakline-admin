
/**
 * Loan Payment Calculation Utilities
 * Ensures consistency across the application
 */

/**
 * Calculate how many months a payment covers
 * @param {number} paymentAmount - The payment amount
 * @param {number} monthlyPayment - The monthly payment amount
 * @returns {number} Number of months covered (minimum 1)
 */
export function calculateMonthsCovered(paymentAmount, monthlyPayment) {
  if (!monthlyPayment || monthlyPayment <= 0) return 1;
  if (!paymentAmount || paymentAmount <= 0) return 0;
  return Math.floor(paymentAmount / monthlyPayment);
}

/**
 * Calculate next payment date based on months covered
 * @param {Date|string} currentNextPaymentDate - Current next payment date
 * @param {number} monthsCovered - Number of months covered by payment
 * @returns {Date} New next payment date
 */
export function calculateNextPaymentDate(currentNextPaymentDate, monthsCovered) {
  const nextDate = new Date(currentNextPaymentDate || new Date());
  // Use 30-day months for consistency
  nextDate.setDate(nextDate.getDate() + (30 * monthsCovered));
  return nextDate;
}

/**
 * Calculate months since loan start
 * @param {Date|string} disbursedDate - Loan disbursement date
 * @returns {number} Number of months since loan started
 */
export function getMonthsSinceLoanStart(disbursedDate) {
  if (!disbursedDate) return 0;
  const start = new Date(disbursedDate);
  const now = new Date();
  const monthsDiff = (now.getFullYear() - start.getFullYear()) * 12 + 
                     (now.getMonth() - start.getMonth());
  return Math.max(0, monthsDiff);
}

/**
 * Calculate payment status relative to schedule
 * @param {number} paymentsMade - Number of payments made
 * @param {Date|string} disbursedDate - Loan disbursement date
 * @returns {object} Payment status details
 */
export function calculatePaymentStatus(paymentsMade, disbursedDate) {
  const monthsSinceLoanStart = getMonthsSinceLoanStart(disbursedDate);
  const monthsAhead = paymentsMade - monthsSinceLoanStart;
  
  return {
    monthsAhead: monthsAhead,
    isAhead: monthsAhead > 0,
    isBehind: monthsAhead < 0,
    isOnTrack: monthsAhead === 0,
    status: monthsAhead > 0 ? 'ahead' : monthsAhead < 0 ? 'behind' : 'on_track'
  };
}

/**
 * Calculate loan payment breakdown
 * @param {number} paymentAmount - Payment amount
 * @param {number} remainingBalance - Current loan balance
 * @param {number} interestRate - Annual interest rate (percentage)
 * @returns {object} Payment breakdown
 */
export function calculatePaymentBreakdown(paymentAmount, remainingBalance, interestRate) {
  const monthlyInterestRate = interestRate / 100 / 12;
  const interestAmount = remainingBalance * monthlyInterestRate;
  const principalAmount = Math.min(paymentAmount - interestAmount, remainingBalance);
  const newBalance = Math.max(0, remainingBalance - principalAmount);
  
  return {
    interestAmount: Math.max(0, interestAmount),
    principalAmount: Math.max(0, principalAmount),
    newBalance: newBalance,
    isFullPayoff: newBalance === 0
  };
}

/**
 * Format currency consistently
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
}

/**
 * Validate payment amount
 * @param {number} paymentAmount - Payment amount to validate
 * @param {number} monthlyPayment - Expected monthly payment
 * @param {number} remainingBalance - Current loan balance
 * @returns {object} Validation result
 */
export function validatePaymentAmount(paymentAmount, monthlyPayment, remainingBalance) {
  const errors = [];
  const warnings = [];
  
  if (paymentAmount <= 0) {
    errors.push('Payment amount must be greater than zero');
  }
  
  if (paymentAmount > remainingBalance) {
    errors.push(`Payment amount ($${paymentAmount.toLocaleString()}) exceeds remaining balance ($${remainingBalance.toLocaleString()})`);
  }
  
  if (paymentAmount < monthlyPayment && paymentAmount !== remainingBalance) {
    warnings.push(`Payment of $${paymentAmount.toLocaleString()} is less than monthly payment of $${monthlyPayment.toLocaleString()}. This may result in partial month coverage.`);
  }
  
  const monthsCovered = calculateMonthsCovered(paymentAmount, monthlyPayment);
  if (monthsCovered > 1) {
    warnings.push(`This payment covers ${monthsCovered} months.`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    monthsCovered
  };
}
