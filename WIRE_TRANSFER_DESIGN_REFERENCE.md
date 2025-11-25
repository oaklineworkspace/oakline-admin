# Wire Transfer Page - Design Reference
## Based on Admin Transactions Page

---

## Layout Structure
- **Container**: Full-width responsive with padding (`clamp` values for mobile-first)
- **Header Section**: Title + subtitle with action buttons (Refresh, Create, Dashboard)
- **Statistics Grid**: 6 cards showing key metrics (Total, Pending, Completed, Failed, Volume, etc.)
- **Tabs Section**: Tab-based filtering (All, Completed, Pending, Failed)
- **Filters Section**: Search input, user dropdown, status dropdown, type dropdown, date filter
- **Main Content**: Grid of transaction/wire transfer cards (responsive, collapsible on mobile)
- **Modals**: Edit modal, Create modal, Review modal with forms

---

## Color Scheme & Status Badges

### Status Colors:
- **Completed**: Background `#d1fae5`, Text `#065f46` (Green)
- **Pending**: Background `#fef3c7`, Text `#92400e` (Yellow)
- **Failed/Cancelled**: Background `#fee2e2`, Text `#991b1b` (Red)
- **Reversed**: Background `#dbeafe`, Text `#1e40af` (Blue)
- **Hold**: Background `#fed7aa`, Text `#92400e` (Orange)

### Button Colors:
- **Create/Approve**: Green gradient (`#059669` → `#10b981`)
- **Bulk Delete**: Red (`#dc2626`) with shadow
- **Refresh**: Blue (`#4299e1`)
- **Back/Secondary**: Gray (`#718096`)
- **Edit**: Blue (`#3b82f6`)
- **Delete/Reject**: Red (`#dc2626`)

---

## Button Styles (Inline Styles)

```javascript
bulkDeleteButton: {
  padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
  backgroundColor: '#dc2626',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: 'clamp(0.85rem, 2vw, 14px)',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
},

refreshButton: {
  padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
  backgroundColor: '#4299e1',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: 'clamp(0.85rem, 2vw, 14px)',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.3s ease'
},

createButton: {
  padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
  backgroundImage: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: 'clamp(0.85rem, 2vw, 14px)',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.3s ease'
},

backButton: {
  padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
  backgroundColor: '#718096',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: 'clamp(0.85rem, 2vw, 14px)',
  fontWeight: '600',
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-block'
},

editButton: {
  flex: '1 1 48%',
  padding: '10px',
  backgroundColor: '#3b82f6',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.3s ease'
},

deleteButton: {
  flex: '1 1 48%',
  padding: '10px',
  backgroundColor: '#dc2626',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  marginLeft: '8px'
}
```

---

## Key UI Components

### 1. Stats Cards
- 6-column grid layout
- Each card has colored left border (4px solid)
- Contains label and numeric value
- Responsive: `display: grid, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'`

### 2. Wire Transfer Cards
- Responsive grid card layout
- Checkbox on left + info container (name, email)
- Status badge on right (uppercase, padded, rounded)
- Body section with details (Account, Amount, Description, Date)
- Footer with Edit/Delete buttons
- Selected state highlight

### 3. Search & Filters
- Responsive flex layout
- Search input with placeholder icon
- Select dropdowns for User, Status, Type, Date
- "Select All" checkbox

### 4. Date Range Filter
- Shows when "Custom Range" is selected
- "From" and "To" date inputs
- "Clear Dates" button appears when dates are selected

### 5. Status Badge
```javascript
statusBadge: {
  padding: '6px 12px',
  borderRadius: '6px',
  fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
  fontWeight: '700',
  backgroundColor: style.bg,
  color: style.color,
  textTransform: 'uppercase'
}
```

### 6. Modals
- Dark overlay background (rgba(0, 0, 0, 0.5))
- White card centered on screen
- Header with title + close button (×)
- Body with form groups
- Footer with action buttons

### 7. Error/Success Banners
```javascript
errorBanner: {
  backgroundColor: '#fee2e2',
  color: '#dc2626',
  padding: '16px',
  borderRadius: '8px',
  marginBottom: '20px',
  fontSize: 'clamp(0.85rem, 2vw, 14px)',
  fontWeight: '500'
},

successBanner: {
  backgroundColor: '#d1fae5',
  color: '#065f46',
  padding: '16px',
  borderRadius: '8px',
  marginBottom: '20px',
  fontSize: 'clamp(0.85rem, 2vw, 14px)',
  fontWeight: '500'
}
```

### 8. Loading State
- Spinner animation
- Loading text
- Centered display

### 9. Empty State
- Large icon (📋)
- "No transactions found" message
- Centered display

---

## Responsive Design Strategy

**Font Sizing**: Uses `clamp()` for all responsive sizes
- Small text: `clamp(0.75rem, 1.8vw, 12px)`
- Medium text: `clamp(0.85rem, 2vw, 14px)`
- Large text: `clamp(1rem, 2.5vw, 18px)`

**Padding/Spacing**: Uses `clamp()` for responsive spacing
- Example: `clamp(0.5rem, 2vw, 10px)`

**Grid Layouts**: Uses CSS Grid with auto-fit
- `gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'`

**Mobile-First Approach**:
- All elements stack vertically on mobile
- Flexbox with flex-wrap: wrap
- Buttons stack or shrink as needed

---

## Key Features to Replicate

- ✅ Search functionality (by name, email, account number)
- ✅ Multi-select with checkboxes
- ✅ "Select All" functionality with count
- ✅ Bulk delete/action button (shows only when items selected)
- ✅ Tab-based filtering (All, Completed, Pending, Failed)
- ✅ Date range filtering with custom picker
- ✅ Status badges with color coding
- ✅ Transaction card layout with inline controls
- ✅ Edit/Delete action buttons
- ✅ Success/Error notification banners
- ✅ Loading banner with progress for bulk operations
- ✅ Modal forms for create/edit operations
- ✅ Statistics dashboard (6 key metrics)
- ✅ Responsive design with clamp() values
- ✅ Spinner animation for loading
- ✅ Empty state message

---

## Implementation Notes

1. **State Management**:
   - Use `useState` for filters, modals, loading states
   - Use `useEffect` for data fetching and filtering
   - Consider `React.useMemo` for expensive calculations (stats)

2. **API Integration**:
   - Fetch wire transfers from API endpoint
   - Support filtering by status, date range, user
   - Support bulk operations with progress tracking

3. **Styling Approach**:
   - Use inline styles for all components (no CSS files needed)
   - Use `clamp()` for all responsive sizing
   - Apply conditional styles for selected/active states

4. **Accessibility**:
   - Semantic HTML
   - Proper label associations
   - Keyboard navigation support

5. **Performance**:
   - Memoize expensive calculations
   - Debounce search input
   - Lazy load images if needed

---

## Example Data Structure (for wire transfers)

```javascript
wireTransfer: {
  id: 'string',
  user_id: 'string',
  recipient_name: 'string',
  recipient_bank: 'string',
  recipient_account: 'string',
  routing_number: 'string',
  amount: 'number',
  status: 'pending|approved|completed|rejected|cancelled|hold',
  description: 'string',
  created_at: 'datetime',
  updated_at: 'datetime',
  reviewed_by: 'string (admin id)',
  reviewed_at: 'datetime',
  rejection_reason: 'string'
}
```

---

## Summary

When implementing the wire transfer page, match:
- **Colors**: Green (#059669) for success, Red (#dc2626) for delete, Blue (#3b82f6) for edit, Yellow (#fef3c7) for pending, Green (#d1fae5) for completed
- **Spacing**: All sizes use `clamp()` for responsiveness
- **Components**: Cards, modals, badges, filters, stats grid
- **Interaction**: Multi-select, bulk actions, date filtering, search
- **Feedback**: Loading banners, success/error messages, status indicators
