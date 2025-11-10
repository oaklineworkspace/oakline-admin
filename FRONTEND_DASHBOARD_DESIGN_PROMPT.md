# Frontend Dashboard Design Prompt
## Copy and Paste This to Replit AI in Your Frontend Repository

---

## 🎯 Objective
Create a modern, responsive dashboard in my frontend repository that matches the design, structure, and styling of the Oakline Bank Admin Loans page (`/admin/admin-loans`).

---

## 🎨 Design System & Color Scheme

### **Container & Background**
```css
- Background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)
- Minimum Height: 100vh
- Padding: clamp(1rem, 3vw, 20px)
- Bottom Padding: 100px (for footer space)
```

### **Color Palette**
```css
Primary Blue: #1e40af to #3b82f6 (gradient)
Dark Blue: #1A3E6F (headings)
Success Green: #059669 to #10b981 (gradient)
Error Red: #ef4444 to #dc2626 (gradient)
Gray Text: #718096 (secondary text)
Dark Gray: #4a5568 (labels)
Border Gray: #e2e8f0
Background White: #ffffff
```

### **Typography**
```css
Title: clamp(1.5rem, 4vw, 28px), weight 700
Subtitle: clamp(0.85rem, 2vw, 14px)
Body Text: clamp(0.85rem, 2vw, 14px)
Stat Value: clamp(1.5rem, 4vw, 28px), weight 700
```

---

## 📦 Component Structure

### **1. Header Section**
- **White card** with rounded corners (12px)
- **Box shadow**: 0 2px 8px rgba(0,0,0,0.1)
- **Flexbox layout** with space-between alignment
- **Responsive** with flexWrap and gap

```jsx
<header style={{
  background: 'white',
  padding: 'clamp(1.5rem, 4vw, 24px)',
  borderRadius: '12px',
  marginBottom: '20px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '16px'
}}>
  {/* Title Section */}
  <div>
    <h1 style={{
      margin: '0 0 8px 0',
      fontSize: 'clamp(1.5rem, 4vw, 28px)',
      color: '#1A3E6F',
      fontWeight: '700'
    }}>
      📊 Your Dashboard Title
    </h1>
    <p style={{
      margin: 0,
      color: '#718096',
      fontSize: 'clamp(0.85rem, 2vw, 14px)'
    }}>
      Brief description or subtitle
    </p>
  </div>

  {/* Action Buttons */}
  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
    <button style={{
      padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
      background: '#4299e1',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: 'clamp(0.85rem, 2vw, 14px)',
      fontWeight: '600',
      cursor: 'pointer'
    }}>
      🔄 Refresh
    </button>
  </div>
</header>
```

### **2. Statistics Cards Grid**
```jsx
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '16px',
  marginBottom: '20px'
}}>
  {/* Individual Stat Card */}
  <div style={{
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  }}>
    <h3 style={{
      margin: '0 0 8px 0',
      fontSize: 'clamp(0.85rem, 2vw, 14px)',
      color: '#718096',
      fontWeight: '500'
    }}>
      Metric Label
    </h3>
    <p style={{
      margin: 0,
      fontSize: 'clamp(1.5rem, 4vw, 28px)',
      color: '#1A3E6F',
      fontWeight: '700'
    }}>
      123
    </p>
  </div>
</div>
```

### **3. Tab Navigation**
```jsx
<div style={{
  display: 'flex',
  background: 'white',
  borderRadius: '12px',
  padding: '5px',
  marginBottom: '20px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  gap: '5px',
  flexWrap: 'wrap'
}}>
  {['All', 'Active', 'Completed'].map(tab => (
    <button
      key={tab}
      style={{
        flex: 1,
        minWidth: '100px',
        padding: '12px 20px',
        border: 'none',
        background: activeTab === tab 
          ? 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)'
          : 'transparent',
        color: activeTab === tab ? 'white' : '#666',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: 'clamp(0.85rem, 2vw, 14px)',
        fontWeight: '500',
        transition: 'all 0.3s'
      }}
    >
      {tab}
    </button>
  ))}
</div>
```

### **4. Search & Filter Section**
```jsx
<div style={{
  background: 'white',
  padding: '20px',
  borderRadius: '12px',
  marginBottom: '20px',
  display: 'flex',
  gap: '12px',
  flexWrap: 'wrap',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
}}>
  {/* Search Input */}
  <input
    type="text"
    placeholder="Search..."
    style={{
      flex: 1,
      minWidth: '250px',
      padding: '12px',
      border: '2px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: 'clamp(0.85rem, 2vw, 14px)',
      outline: 'none'
    }}
  />
  
  {/* Filter Dropdown */}
  <select style={{
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    cursor: 'pointer',
    outline: 'none'
  }}>
    <option>All Types</option>
    <option>Type 1</option>
    <option>Type 2</option>
  </select>
</div>
```

### **5. Date Range Filter**
```jsx
<div style={{
  background: 'white',
  padding: '20px',
  borderRadius: '12px',
  marginBottom: '20px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
}}>
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    fontSize: 'clamp(0.9rem, 2.2vw, 16px)',
    fontWeight: '600',
    color: '#1A3E6F'
  }}>
    📅 Date Range Filter
  </div>
  
  <div style={{
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'flex-end'
  }}>
    {/* Start Date */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{
        fontSize: 'clamp(0.8rem, 2vw, 13px)',
        fontWeight: '500',
        color: '#4a5568'
      }}>
        From
      </label>
      <input
        type="date"
        style={{
          padding: '10px',
          border: '2px solid #e2e8f0',
          borderRadius: '8px',
          fontSize: 'clamp(0.85rem, 2vw, 14px)',
          outline: 'none',
          minWidth: '150px'
        }}
      />
    </div>
    
    {/* End Date */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{
        fontSize: 'clamp(0.8rem, 2vw, 13px)',
        fontWeight: '500',
        color: '#4a5568'
      }}>
        To
      </label>
      <input
        type="date"
        style={{
          padding: '10px',
          border: '2px solid #e2e8f0',
          borderRadius: '8px',
          fontSize: 'clamp(0.85rem, 2vw, 14px)',
          outline: 'none',
          minWidth: '150px'
        }}
      />
    </div>
    
    {/* Clear Button */}
    <button style={{
      padding: '10px 16px',
      background: '#ef4444',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: 'clamp(0.85rem, 2vw, 14px)',
      fontWeight: '600',
      cursor: 'pointer',
      whiteSpace: 'nowrap'
    }}>
      🗑️ Clear
    </button>
  </div>
</div>
```

### **6. Content Cards Grid**
```jsx
<div style={{
  display: 'grid',
  gap: 'clamp(1rem, 3vw, 20px)',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 400px), 1fr))'
}}>
  {/* Individual Card */}
  <div style={{
    backgroundColor: 'white',
    padding: 'clamp(12px, 3vw, 20px)',
    borderRadius: 'clamp(6px, 1.5vw, 12px)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s'
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
  }}>
    {/* Card Header */}
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '16px',
      gap: '12px'
    }}>
      <div>
        <h3 style={{
          margin: '0 0 4px 0',
          fontSize: 'clamp(1rem, 3vw, 18px)',
          color: '#1A3E6F',
          fontWeight: '600'
        }}>
          Card Title
        </h3>
        <p style={{
          margin: 0,
          fontSize: 'clamp(0.8rem, 2vw, 14px)',
          color: '#718096'
        }}>
          Subtitle or description
        </p>
      </div>
      
      {/* Status Badge */}
      <span style={{
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
        fontWeight: '700',
        backgroundColor: '#10b98120',
        color: '#059669',
        whiteSpace: 'nowrap'
      }}>
        ✅ Active
      </span>
    </div>

    {/* Card Body */}
    <div style={{ marginBottom: '16px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '8px 0',
        borderBottom: '1px solid #f7fafc',
        fontSize: 'clamp(0.85rem, 2vw, 14px)'
      }}>
        <span style={{ color: '#4a5568', fontWeight: '600' }}>
          Field Label:
        </span>
        <span style={{ color: '#2d3748', textAlign: 'right' }}>
          Value
        </span>
      </div>
    </div>

    {/* Card Actions */}
    <div style={{
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap'
    }}>
      <button style={{
        flex: 1,
        padding: '10px',
        background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: 'clamp(0.85rem, 2vw, 14px)',
        fontWeight: '600',
        cursor: 'pointer'
      }}>
        Action
      </button>
    </div>
  </div>
</div>
```

### **7. Empty State**
```jsx
<div style={{
  textAlign: 'center',
  padding: '60px 20px'
}}>
  <p style={{
    fontSize: 'clamp(2.5rem, 6vw, 64px)',
    marginBottom: '16px'
  }}>
    📭
  </p>
  <p style={{
    fontSize: 'clamp(1rem, 3vw, 18px)',
    color: '#718096',
    fontWeight: '600'
  }}>
    No items found
  </p>
</div>
```

### **8. Loading State**
```jsx
<div style={{
  textAlign: 'center',
  padding: '60px 20px',
  color: '#718096'
}}>
  <div style={{
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #1e40af',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px'
  }} />
  <p>Loading...</p>
</div>

{/* Add this CSS animation to your stylesheet */}
<style jsx>{`
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`}</style>
```

### **9. Alert Banners**
```jsx
{/* Error Banner */}
{error && (
  <div style={{
    background: '#fee2e2',
    color: '#dc2626',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '500'
  }}>
    ❌ {error}
  </div>
)}

{/* Success Banner */}
{success && (
  <div style={{
    background: '#d1fae5',
    color: '#065f46',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '500'
  }}>
    ✅ {success}
  </div>
)}
```

---

## 🎯 Key Features to Implement

1. **Fully Responsive Design**
   - Use `clamp()` for all font sizes and padding
   - Grid layouts with `auto-fit` and `minmax()`
   - Mobile-first approach with flexWrap

2. **Modern Card-Based Layout**
   - White cards with rounded corners (12px)
   - Subtle shadows: `0 2px 8px rgba(0,0,0,0.1)`
   - Hover effects with transform and shadow changes

3. **Gradient Buttons**
   - Primary: `linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)`
   - Success: `linear-gradient(135deg, #059669 0%, #10b981 100%)`
   - Danger: `#ef4444` solid color

4. **Professional Typography**
   - Consistent use of clamp() for responsive text
   - Clear visual hierarchy with font weights
   - Proper spacing and line heights

5. **Interactive Elements**
   - Smooth transitions (0.3s ease)
   - Hover effects on cards and buttons
   - Active states for tabs

6. **Data Display**
   - Stat cards with large numbers
   - Key-value pairs in card bodies
   - Status badges with appropriate colors

---

## 📱 Responsive Breakpoints
```css
Mobile: < 640px (stacks everything)
Tablet: 640px - 1024px (2-column grids)
Desktop: > 1024px (3-4 column grids)
```

---

## ✅ Implementation Checklist

- [ ] Container with gradient background
- [ ] Header section with title and action buttons
- [ ] Statistics cards grid (auto-responsive)
- [ ] Tab navigation with active states
- [ ] Search and filter section
- [ ] Date range filter (optional)
- [ ] Content cards grid with hover effects
- [ ] Empty state display
- [ ] Loading state with spinner
- [ ] Error and success alert banners
- [ ] All responsive using clamp() and grid
- [ ] Smooth transitions and animations

---

## 🚀 Getting Started

1. Copy this entire design system to your frontend project
2. Start with the container and header
3. Add stat cards for key metrics
4. Implement tab navigation
5. Add filters and search
6. Create the cards grid for your main content
7. Add loading and empty states
8. Test responsiveness on different screen sizes
9. Fine-tune colors and spacing to match your brand

---

## 💡 Pro Tips

- **Always use clamp() for responsive sizing** - no media queries needed
- **Keep shadows subtle** - 0 2px 8px is usually enough
- **Use gradients for primary actions** - makes them pop
- **White space is your friend** - generous padding and gaps
- **Consistent border radius** - 8px for small elements, 12px for cards
- **Status colors** - Green for success, Red for errors, Blue for info, Yellow for warnings

---

**Happy Coding! 🎨✨**
