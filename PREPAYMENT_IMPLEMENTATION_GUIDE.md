
# Prepayment Implementation Guide for Frontend

## Overview
This guide details how to update the frontend to properly handle and display loan prepayments (when users pay multiple months upfront).

## Current Backend Logic (Already Implemented)
The admin backend now correctly handles prepayments:
- **Calculates months covered**: `FLOOR(payment_amount / monthly_payment_amount)`
- **Updates next payment date**: Adds `(months_covered × 30 days)` to current date
- **Increments payments_made**: By actual months covered, not just +1
- **Updates loan balance**: Properly tracks remaining balance after prepayment

## Frontend Updates Required

### 1. Loan Dashboard Display Enhancements

**File**: `pages/loans/[loanId].js` (or similar user-facing loan detail page)

**Add these calculated fields**:
```javascript
// Calculate prepayment status
const monthlyPayment = parseFloat(loan.monthly_payment_amount) || 0;
const paymentsMade = loan.payments_made || 0;
const termMonths = loan.term_months || 0;
const monthsAhead = Math.max(0, paymentsMade - getMonthsSinceLoanStart(loan.disbursed_at));

function getMonthsSinceLoanStart(disbursedDate) {
  if (!disbursedDate) return 0;
  const start = new Date(disbursedDate);
  const now = new Date();
  const monthsDiff = (now.getFullYear() - start.getFullYear()) * 12 + 
                     (now.getMonth() - start.getMonth());
  return Math.max(0, monthsDiff);
}
```

**Display prepayment status**:
```jsx
{monthsAhead > 0 && (
  <div style={styles.prepaymentBadge}>
    <span style={styles.badgeIcon}>✓</span>
    <span style={styles.badgeText}>
      {monthsAhead} month{monthsAhead !== 1 ? 's' : ''} paid ahead
    </span>
  </div>
)}

<div style={styles.paymentProgress}>
  <div style={styles.progressBar}>
    <div 
      style={{
        ...styles.progressFill,
        width: `${Math.min(100, (paymentsMade / termMonths) * 100)}%`
      }}
    />
  </div>
  <span style={styles.progressText}>
    {paymentsMade} of {termMonths} payments made
  </span>
</div>
```

**Styles to add**:
```javascript
prepaymentBadge: {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 16px',
  background: '#d1fae5',
  color: '#065f46',
  borderRadius: '8px',
  fontWeight: '600',
  fontSize: '14px',
  marginTop: '12px'
},
badgeIcon: {
  fontSize: '16px'
},
paymentProgress: {
  marginTop: '16px'
},
progressBar: {
  width: '100%',
  height: '8px',
  background: '#e5e7eb',
  borderRadius: '4px',
  overflow: 'hidden'
},
progressFill: {
  height: '100%',
  background: 'linear-gradient(90deg, #10b981, #059669)',
  transition: 'width 0.3s ease'
},
progressText: {
  display: 'block',
  marginTop: '8px',
  fontSize: '13px',
  color: '#6b7280'
}
```

### 2. Payment Submission Form Updates

**File**: `pages/make-payment.js` (or similar payment submission page)

**Add payment calculator**:
```jsx
const [paymentAmount, setPaymentAmount] = useState('');
const monthlyPayment = parseFloat(loan?.monthly_payment_amount) || 0;
const monthsCovered = paymentAmount ? Math.floor(parseFloat(paymentAmount) / monthlyPayment) : 0;

// Calculate next payment date based on prepayment
function calculateNextPaymentDate(monthsCovered) {
  const nextDate = new Date(loan.next_payment_date || new Date());
  nextDate.setDate(nextDate.getDate() + (30 * monthsCovered));
  return nextDate;
}

const projectedNextPaymentDate = calculateNextPaymentDate(monthsCovered);
```

**Display payment breakdown**:
```jsx
{paymentAmount && parseFloat(paymentAmount) > 0 && (
  <div style={styles.paymentCalculator}>
    <div style={styles.calculatorHeader}>
      <h3 style={styles.calculatorTitle}>Payment Breakdown</h3>
    </div>
    <div style={styles.calculatorBody}>
      <div style={styles.calculatorRow}>
        <span>Payment amount:</span>
        <span style={styles.calculatorValue}>
          ${parseFloat(paymentAmount).toLocaleString()}
        </span>
      </div>
      <div style={styles.calculatorRow}>
        <span>Monthly payment:</span>
        <span style={styles.calculatorValue}>
          ${monthlyPayment.toLocaleString()}
        </span>
      </div>
      <div style={styles.calculatorRow}>
        <span>Months covered:</span>
        <span style={{...styles.calculatorValue, color: '#059669', fontWeight: '700'}}>
          {monthsCovered} month{monthsCovered !== 1 ? 's' : ''}
        </span>
      </div>
      <div style={{...styles.calculatorRow, borderTop: '1px solid #e5e7eb', paddingTop: '12px', marginTop: '12px'}}>
        <span style={styles.nextPaymentLabel}>Next payment due:</span>
        <span style={styles.nextPaymentDate}>
          {projectedNextPaymentDate.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          })}
        </span>
      </div>
      {monthsCovered > 1 && (
        <div style={styles.prepaymentNotice}>
          <span style={styles.noticeIcon}>ℹ️</span>
          <span style={styles.noticeText}>
            This payment covers {monthsCovered} months. You won't need to make another payment until {projectedNextPaymentDate.toLocaleDateString()}.
          </span>
        </div>
      )}
    </div>
  </div>
)}
```

**Styles for calculator**:
```javascript
paymentCalculator: {
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  marginTop: '16px',
  overflow: 'hidden'
},
calculatorHeader: {
  padding: '12px 16px',
  background: '#f3f4f6',
  borderBottom: '1px solid #e5e7eb'
},
calculatorTitle: {
  margin: 0,
  fontSize: '14px',
  fontWeight: '600',
  color: '#374151'
},
calculatorBody: {
  padding: '16px'
},
calculatorRow: {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '8px',
  fontSize: '14px',
  color: '#4b5563'
},
calculatorValue: {
  fontWeight: '600',
  color: '#111827'
},
nextPaymentLabel: {
  fontWeight: '600',
  color: '#374151'
},
nextPaymentDate: {
  fontWeight: '700',
  color: '#059669'
},
prepaymentNotice: {
  display: 'flex',
  gap: '12px',
  marginTop: '12px',
  padding: '12px',
  background: '#d1fae5',
  borderRadius: '6px',
  alignItems: 'flex-start'
},
noticeIcon: {
  fontSize: '16px',
  flexShrink: 0
},
noticeText: {
  fontSize: '13px',
  color: '#065f46',
  lineHeight: '1.5'
}
```

### 3. Payment History Display Updates

**File**: `pages/payment-history.js` (or similar)

**Enhanced payment card display**:
```jsx
{payments.map((payment) => {
  const monthsCovered = Math.floor(parseFloat(payment.amount) / parseFloat(payment.loans?.monthly_payment_amount || 1));
  
  return (
    <div key={payment.id} style={styles.paymentCard}>
      <div style={styles.paymentHeader}>
        <div style={styles.paymentDate}>
          {new Date(payment.payment_date).toLocaleDateString()}
        </div>
        <div style={styles.paymentStatus}>
          <span style={{
            ...styles.statusBadge,
            background: payment.status === 'completed' ? '#d1fae5' :
                       payment.status === 'pending' ? '#fef3c7' : '#fee2e2',
            color: payment.status === 'completed' ? '#065f46' :
                  payment.status === 'pending' ? '#92400e' : '#991b1b'
          }}>
            {payment.status.toUpperCase()}
          </span>
        </div>
      </div>
      <div style={styles.paymentDetails}>
        <div style={styles.paymentAmount}>
          ${parseFloat(payment.amount).toLocaleString()}
        </div>
        {monthsCovered > 1 && (
          <div style={styles.monthsCoveredBadge}>
            Covers {monthsCovered} months
          </div>
        )}
        <div style={styles.paymentBreakdown}>
          <div>Principal: ${parseFloat(payment.principal_amount || 0).toLocaleString()}</div>
          <div>Interest: ${parseFloat(payment.interest_amount || 0).toLocaleString()}</div>
        </div>
        <div style={styles.balanceAfter}>
          Balance after: ${parseFloat(payment.balance_after || 0).toLocaleString()}
        </div>
      </div>
    </div>
  );
})}
```

**Additional styles**:
```javascript
monthsCoveredBadge: {
  display: 'inline-block',
  padding: '4px 10px',
  background: '#dbeafe',
  color: '#1e40af',
  borderRadius: '12px',
  fontSize: '12px',
  fontWeight: '600',
  marginTop: '8px'
}
```

### 4. Loan Summary Widget

**Add to dashboard or loan overview**:
```jsx
function LoanSummaryWidget({ loan }) {
  const monthlyPayment = parseFloat(loan.monthly_payment_amount) || 0;
  const paymentsMade = loan.payments_made || 0;
  const termMonths = loan.term_months || 0;
  const monthsSinceLoanStart = getMonthsSinceLoanStart(loan.disbursed_at);
  const monthsAhead = Math.max(0, paymentsMade - monthsSinceLoanStart);
  const isAhead = monthsAhead > 0;
  const isBehind = monthsAhead < 0;
  
  return (
    <div style={styles.summaryWidget}>
      <h3 style={styles.widgetTitle}>Payment Status</h3>
      <div style={styles.statusIndicator}>
        {isAhead && (
          <div style={{...styles.statusCard, background: '#d1fae5', borderLeft: '4px solid #059669'}}>
            <div style={styles.statusIcon}>✓</div>
            <div>
              <div style={styles.statusLabel}>Ahead of Schedule</div>
              <div style={styles.statusValue}>{monthsAhead} months paid in advance</div>
            </div>
          </div>
        )}
        {isBehind && (
          <div style={{...styles.statusCard, background: '#fee2e2', borderLeft: '4px solid #dc2626'}}>
            <div style={styles.statusIcon}>⚠</div>
            <div>
              <div style={styles.statusLabel}>Payment Due</div>
              <div style={styles.statusValue}>{Math.abs(monthsAhead)} months behind</div>
            </div>
          </div>
        )}
        {!isAhead && !isBehind && (
          <div style={{...styles.statusCard, background: '#e0e7ff', borderLeft: '4px solid #4f46e5'}}>
            <div style={styles.statusIcon}>✓</div>
            <div>
              <div style={styles.statusLabel}>On Track</div>
              <div style={styles.statusValue}>All payments current</div>
            </div>
          </div>
        )}
      </div>
      <div style={styles.nextPaymentInfo}>
        <span style={styles.nextPaymentLabel}>Next payment due:</span>
        <span style={styles.nextPaymentValue}>
          {new Date(loan.next_payment_date).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}
```

## Implementation Checklist

- [ ] Update loan detail page with prepayment status display
- [ ] Add payment progress bar to show total payments made
- [ ] Implement payment calculator in submission form
- [ ] Show months covered in payment breakdown
- [ ] Display projected next payment date based on prepayment
- [ ] Update payment history to show months covered per payment
- [ ] Add visual indicators (badges, color coding) for payment status
- [ ] Create loan summary widget showing ahead/behind status
- [ ] Test with various payment amounts (partial, exact, prepayment)
- [ ] Ensure mobile responsiveness for all new components

## API Response Format (for reference)

The backend returns loan data in this format:
```json
{
  "loan": {
    "id": "uuid",
    "principal": 10000,
    "remaining_balance": 8500,
    "monthly_payment_amount": 300,
    "term_months": 36,
    "payments_made": 5,
    "next_payment_date": "2025-02-15",
    "disbursed_at": "2024-10-01",
    "status": "active"
  }
}
```

Payment data format:
```json
{
  "id": "uuid",
  "amount": 1500,
  "principal_amount": 1450,
  "interest_amount": 50,
  "balance_after": 8500,
  "payment_date": "2025-01-15",
  "status": "completed",
  "loans": {
    "monthly_payment_amount": 300
  }
}
```

## Notes
- All date calculations use 30-day months for consistency
- Backend function `approve_loan_payment_atomic` handles all atomicity
- Frontend should be read-only; all calculations are for display only
- Always validate payment amounts before submission
- Show clear warnings when payment amount is less than monthly payment

## Support Functions

Add these utility functions to `lib/utils/calculations.js`:

```javascript
export function calculateMonthsCovered(paymentAmount, monthlyPayment) {
  if (!monthlyPayment || monthlyPayment <= 0) return 1;
  return Math.floor(paymentAmount / monthlyPayment);
}

export function calculateNextPaymentDate(currentDate, monthsCovered) {
  const nextDate = new Date(currentDate);
  nextDate.setDate(nextDate.getDate() + (30 * monthsCovered));
  return nextDate;
}

export function getMonthsSinceLoanStart(disbursedDate) {
  if (!disbursedDate) return 0;
  const start = new Date(disbursedDate);
  const now = new Date();
  const monthsDiff = (now.getFullYear() - start.getFullYear()) * 12 + 
                     (now.getMonth() - start.getMonth());
  return Math.max(0, monthsDiff);
}

export function calculatePaymentStatus(paymentsMade, disbursedDate) {
  const monthsSinceLoanStart = getMonthsSinceLoanStart(disbursedDate);
  const monthsAhead = paymentsMade - monthsSinceLoanStart;
  
  return {
    monthsAhead: monthsAhead,
    isAhead: monthsAhead > 0,
    isBehind: monthsAhead < 0,
    isOnTrack: monthsAhead === 0
  };
}
```

## Testing Scenarios

1. **Exact monthly payment**: $300 → covers 1 month
2. **Prepayment**: $1,500 → covers 5 months
3. **Partial payment**: $150 → covers 0 months (should warn)
4. **Overpayment**: $10,000 (more than remaining balance) → handle gracefully
5. **Multiple prepayments**: Track cumulative months ahead correctly

---

**Last Updated**: January 2025
**Backend Version**: v2.0 with atomic prepayment support
