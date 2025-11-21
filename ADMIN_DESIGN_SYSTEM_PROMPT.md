# Admin Page Design System Prompt

Copy and paste this prompt to Replit AI to create a new admin page with the same style and structure as the existing admin-transactions page.

---

## Prompt for Replit AI:

```
Create a new admin page that matches the Oakline Bank admin design system and structure.

The new page should follow these patterns from pages/admin/admin-transactions.js:

### Layout Structure:
1. **Header Section**: Title, subtitle, action buttons (refresh, back, add)
2. **Stats Grid**: 4-column responsive grid showing key metrics (optional)
3. **Tabs**: Horizontal tab navigation with active state styling
4. **Filters Section**: Search input + multiple select dropdowns + date range filter
5. **Date Range Section**: Start/End date inputs with clear button
6. **Content Container**: Main data grid displaying cards
7. **Empty State**: Icon + message when no data
8. **Loading State**: Spinner animation
9. **Modals**: Edit/Create modals with forms
10. **Footer**: AdminFooter component

### Design System to Use:
Import and apply the admin page styles from lib/adminPageStyles.js:

```javascript
import { adminPageStyles as styles } from '../../lib/adminPageStyles';
```

Then apply them to JSX elements like:
- Container: `style={styles.container}`
- Header: `style={styles.header}`
- Buttons: `style={styles.addButton}`, `style={styles.editButton}`
- Cards: `style={styles.card}`, `style={styles.cardSelected}`
- Modals: `style={styles.modal}`, `style={styles.modalBody}`
- Forms: `style={styles.formGroup}`, `style={styles.formInput}`

### Key Features to Include:
1. **Authentication**: Wrap page with AdminAuth component
2. **Loading Banner**: Use AdminLoadingBanner for async operations
3. **Search & Filter**: Multiple filter options with debouncing
4. **Responsive Design**: All components use clamp() for fluid sizing
5. **Modal Workflows**: Edit/Create/Delete actions with modals
6. **Error Handling**: Professional error/success banners
7. **State Management**: useState for modals, filters, pagination
8. **Real-time Updates**: Supabase subscriptions (optional)

### Color Palette (Tailwind):
- Primary Blue: #1e40af / #3b82f6 (gradients)
- Dark Blue: #1A3E6F (headers)
- Gray: #718096, #4a5568, #2d3748
- Success: #d1fae5 (background), #065f46 (text)
- Warning: #fef3c7 (background), #92400e (text)
- Error: #fee2e2 (background), #991b1b (text)
- Borders: #e2e8f0
- Background: #f8fafc

### Structure Template:
```
Admin Page Container
├── Header (Title + Actions)
├── Stats Grid (optional)
├── Tabs Navigation
├── Filters Section
├── Date Range Filter
├── Content Container
│   ├── Loading State / Empty State / Data Grid
│   └── Cards with Actions
├── Edit Modal
├── Create Modal
└── AdminFooter
```

### Components to Import:
- AdminAuth (wrapper)
- AdminFooter
- AdminLoadingBanner
- supabase client
- useState, useEffect, useRouter
- Link from Next.js

Make sure the page follows Oakline Bank professional styling, uses responsive design patterns, and includes proper error handling and loading states.
```

---

## How to Use This Prompt:

1. **In your separate frontend repository**, open Replit AI chat
2. **Paste the prompt above** (the text between the triple backticks)
3. **Specify the page name** you want to create (e.g., "admin-loans", "admin-users-settings")
4. **Replit AI will generate** a complete page matching this design system

---

## Styles File Location:

The `lib/adminPageStyles.js` file contains all reusable styles. You can:
- **Copy it to your frontend repo** at the same path
- **Reference it in your new pages** using: `import { adminPageStyles as styles } from '../../lib/adminPageStyles';`
- **Customize it** by modifying color values or sizing

---

## Files to Copy:

From your Oakline admin backend to your frontend repo:
```
/lib/adminPageStyles.js → Copy to your lib/ folder
/components/AdminAuth.js → If needed
/components/AdminFooter.js → If needed
/components/AdminLoadingBanner.js → If needed
```

---

## Quick Reference:

**Common Style Patterns:**
```jsx
// Container
<div style={styles.container}>
  {/* Page content */}
</div>

// Header with actions
<div style={styles.header}>
  <h1 style={styles.title}>Page Title</h1>
  <div style={styles.headerActions}>
    <button style={styles.addButton}>Add New</button>
  </div>
</div>

// Filters
<div style={styles.filtersSection}>
  <input style={styles.searchInput} placeholder="Search..." />
  <select style={styles.filterSelect}>
    <option>All</option>
  </select>
</div>

// Cards
<div style={styles.grid}>
  {data.map(item => (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h3 style={styles.cardTitle}>{item.title}</h3>
      </div>
      <div style={styles.cardBody}>
        {/* Content */}
      </div>
    </div>
  ))}
</div>

// Modal
<div style={styles.modalOverlay}>
  <div style={styles.modal}>
    <div style={styles.modalHeader}>
      <h2 style={styles.modalTitle}>Modal Title</h2>
      <button style={styles.closeBtn}>×</button>
    </div>
    <div style={styles.modalBody}>
      {/* Form content */}
    </div>
    <div style={styles.modalFooter}>
      <button style={styles.cancelButton}>Cancel</button>
      <button style={styles.confirmButton}>Save</button>
    </div>
  </div>
</div>
```

---

## Need Help?

- **Reference existing page**: pages/admin/admin-transactions.js
- **Design variations**: Edit lib/adminPageStyles.js
- **Component examples**: Check security-dashboard.js, manage-restriction-reasons.js
