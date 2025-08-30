# Fan Club Z - Modern UI/UX Design System v3.0
*"Effortless Sophistication" - Evolved for 2025*

## Design Philosophy Evolution

### Core Principles (Enhanced)
1. **Invisible Complexity**: Make sophisticated prediction mechanics feel effortless
2. **Emotional Intelligence**: Design that responds to user psychology and behavior
3. **Progressive Disclosure**: Reveal complexity gradually as users become more engaged
4. **Spatial Harmony**: Perfect spacing, typography, and visual hierarchy
5. **Authentic Interactions**: Natural, predictable, and delightful micro-interactions

### Design DNA
- **Primary Inspiration**: Apple's Financial Apps (Stocks, Wallet) + Stripe Dashboard
- **Secondary Influence**: Linear's design system + Discord's social engagement
- **Mobile Paradigm**: Instagram Stories + Robinhood's simplicity
- **Social Elements**: Twitter's engagement patterns + WhatsApp's conversation design

---

## Enhanced Color System v3.0

### Primary Brand Palette
```css
/* Core Brand Colors - Psychology-Driven */
--emerald-50: #ECFDF5;   /* Success backgrounds, gentle highlights */
--emerald-100: #D1FAE5;  /* Subtle success states, progress bars */
--emerald-500: #10B981;  /* Primary brand color - trust & growth */
--emerald-600: #059669;  /* Interactive states, buttons */
--emerald-700: #047857;  /* Deep brand elements, navigation */
--emerald-900: #064E3B;  /* High contrast text, premium features */

/* Sophisticated Neutrals - Apple-Inspired */
--gray-25: #FCFCFD;      /* Card backgrounds, modal overlays */
--gray-50: #F9FAFB;      /* App background, subtle contrasts */
--gray-100: #F3F4F6;     /* Dividers, disabled states */
--gray-200: #E5E7EB;     /* Borders, input backgrounds */
--gray-300: #D1D5DB;     /* Placeholder text, inactive icons */
--gray-400: #9CA3AF;     /* Secondary text, descriptions */
--gray-500: #6B7280;     /* Body text, captions */
--gray-600: #4B5563;     /* Headings, important text */
--gray-700: #374151;     /* Primary text, navigation */
--gray-800: #1F2937;     /* High contrast headings */
--gray-900: #111827;     /* Maximum contrast, logos */

/* Semantic Colors - Clear Communication */
--blue-500: #3B82F6;     /* Information, links, progress */
--blue-600: #2563EB;     /* Interactive blue elements */
--yellow-400: #FBBF24;   /* Warnings, pending states */
--red-500: #EF4444;      /* Errors, destructive actions */
--purple-500: #8B5CF6;   /* Premium features, achievements */
--indigo-500: #6366F1;   /* Data visualization, charts */
```

### Advanced Gradient System
```css
/* Brand Gradients */
--gradient-emerald: linear-gradient(135deg, #10B981 0%, #059669 100%);
--gradient-success: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%);
--gradient-premium: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%);
--gradient-warning: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);

/* Sophisticated Glass Effects */
--glass-emerald: rgba(16, 185, 129, 0.1);
--glass-blue: rgba(59, 130, 246, 0.1);
--glass-purple: rgba(139, 92, 246, 0.1);
--backdrop-blur: blur(20px);
```

---

## Advanced Typography System

### Font Stack
```css
--font-primary: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
--font-mono: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
```

### Type Scale (Enhanced)
```css
/* Display Sizes - Hero Content */
.text-display-2xl { font-size: 72px; line-height: 80px; letter-spacing: -0.025em; }
.text-display-xl { font-size: 60px; line-height: 72px; letter-spacing: -0.025em; }
.text-display-lg { font-size: 48px; line-height: 60px; letter-spacing: -0.02em; }
.text-display-md { font-size: 36px; line-height: 44px; letter-spacing: -0.02em; }

/* Headings - Clear Hierarchy */
.text-h1 { font-size: 30px; line-height: 38px; font-weight: 700; }
.text-h2 { font-size: 24px; line-height: 32px; font-weight: 600; }
.text-h3 { font-size: 20px; line-height: 28px; font-weight: 600; }
.text-h4 { font-size: 18px; line-height: 26px; font-weight: 600; }

/* Body Text - Optimized Readability */
.text-lg { font-size: 18px; line-height: 28px; font-weight: 400; }
.text-base { font-size: 16px; line-height: 24px; font-weight: 400; }
.text-sm { font-size: 14px; line-height: 20px; font-weight: 400; }
.text-xs { font-size: 12px; line-height: 16px; font-weight: 500; }

/* Specialized Text */
.text-caption { font-size: 11px; line-height: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
.text-micro { font-size: 10px; line-height: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; }
```

### Typography Utilities
```css
.font-display { font-family: var(--font-primary); font-weight: 700; font-feature-settings: 'ss01', 'ss02'; }
.font-mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
.text-gradient-emerald { background: var(--gradient-emerald); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
```

---

## Sophisticated Shadow System

### Layered Elevation
```css
/* Base Shadows - Subtle Depth */
--shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);

/* Enhanced Shadows - Professional Depth */
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);

/* Brand Shadows - Colored Depth */
--shadow-emerald-sm: 0 4px 6px -1px rgba(16, 185, 129, 0.1), 0 2px 4px -1px rgba(16, 185, 129, 0.06);
--shadow-emerald-md: 0 10px 15px -3px rgba(16, 185, 129, 0.1), 0 4px 6px -2px rgba(16, 185, 129, 0.05);
--shadow-emerald-lg: 0 20px 25px -5px rgba(16, 185, 129, 0.2), 0 10px 10px -5px rgba(16, 185, 129, 0.1);

/* Interactive Shadows - Hover States */
--shadow-hover: 0 12px 20px -5px rgba(0, 0, 0, 0.15), 0 5px 8px -3px rgba(0, 0, 0, 0.1);
--shadow-pressed: 0 2px 4px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
```

---

## Modern Component Library

### Button System v3.0

#### Primary Buttons
```css
.btn-primary {
  padding: 12px 24px;
  border-radius: 12px;
  background: var(--gradient-emerald);
  color: white;
  font-weight: 600;
  font-size: 16px;
  line-height: 24px;
  border: none;
  box-shadow: var(--shadow-emerald-sm);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-emerald-md);
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow: var(--shadow-pressed);
}

/* Ripple Effect */
.btn-primary::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.3s, height 0.3s;
}

.btn-primary:active::after {
  width: 200px;
  height: 200px;
}
```

#### Ghost Buttons
```css
.btn-ghost {
  padding: 12px 24px;
  border-radius: 12px;
  background: transparent;
  color: var(--gray-600);
  font-weight: 500;
  border: 1.5px solid var(--gray-200);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-ghost:hover {
  background: var(--gray-50);
  border-color: var(--gray-300);
  color: var(--gray-700);
}
```

### Card System v3.0

#### Base Card Component
```css
.card {
  background: var(--gray-25);
  border-radius: 16px;
  padding: 20px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--gray-100);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
  border-color: var(--gray-200);
}

/* Card with Glass Effect */
.card-glass {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: var(--backdrop-blur);
  -webkit-backdrop-filter: var(--backdrop-blur);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
```

#### Prediction Card (Enhanced)
```css
.prediction-card {
  background: white;
  border-radius: 20px;
  padding: 24px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--gray-100);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.prediction-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--gradient-emerald);
}

.prediction-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
}

.prediction-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.prediction-card-avatar {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--gradient-emerald);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
}

.prediction-card-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--gray-800);
  line-height: 1.4;
  margin-bottom: 8px;
}

.prediction-card-description {
  font-size: 14px;
  color: var(--gray-500);
  line-height: 1.5;
  margin-bottom: 20px;
}
```

### Form Components v3.0

#### Enhanced Input Fields
```css
.input-group {
  position: relative;
  margin-bottom: 24px;
}

.input-field {
  width: 100%;
  padding: 16px 20px;
  border: 2px solid var(--gray-200);
  border-radius: 12px;
  font-size: 16px;
  font-weight: 400;
  background: white;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
}

.input-field:focus {
  border-color: var(--emerald-500);
  box-shadow: 0 0 0 4px var(--glass-emerald);
}

.input-field:focus + .input-label {
  transform: translateY(-32px) scale(0.85);
  color: var(--emerald-600);
  font-weight: 500;
}

.input-label {
  position: absolute;
  left: 20px;
  top: 16px;
  font-size: 16px;
  color: var(--gray-400);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
  background: white;
  padding: 0 4px;
}

/* Floating Label State */
.input-field:not(:placeholder-shown) + .input-label,
.input-field:focus + .input-label {
  transform: translateY(-32px) scale(0.85);
  color: var(--gray-600);
}
```

### Navigation System v3.0

#### Enhanced Bottom Navigation
```css
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-top: 1px solid var(--gray-100);
  padding: 8px 20px;
  padding-bottom: env(safe-area-inset-bottom, 8px);
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 50;
  backdrop-filter: var(--backdrop-blur);
  -webkit-backdrop-filter: var(--backdrop-blur);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border-radius: 12px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-decoration: none;
  color: var(--gray-400);
  min-width: 60px;
  position: relative;
}

.nav-item.active {
  color: var(--emerald-600);
  background: var(--glass-emerald);
}

.nav-item:hover {
  color: var(--gray-600);
  background: var(--gray-50);
}

.nav-item-icon {
  width: 24px;
  height: 24px;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-item.active .nav-item-icon {
  transform: scale(1.1);
}

.nav-item-label {
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Create Button (Special) */
.nav-create {
  background: var(--gradient-emerald);
  color: white;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-emerald-lg);
  border: none;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  margin: 0 8px;
}

.nav-create:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-emerald-lg);
}

.nav-create:active {
  transform: scale(0.95);
}
```

#### Modern Header
```css
.main-header {
  background: white;
  border-bottom: 1px solid var(--gray-100);
  padding: 16px 20px;
  padding-top: max(16px, env(safe-area-inset-top));
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 40;
  backdrop-filter: var(--backdrop-blur);
  -webkit-backdrop-filter: var(--backdrop-blur);
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-logo {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--gradient-emerald);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 18px;
}

.header-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--gray-800);
}

.header-subtitle {
  font-size: 12px;
  color: var(--gray-500);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-action {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--gray-50);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gray-600);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.header-action:hover {
  background: var(--gray-100);
  color: var(--gray-700);
  transform: scale(1.05);
}

.notification-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 18px;
  height: 18px;
  background: var(--red-500);
  color: white;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
}
```

---

## Advanced Animation System

### Micro-Interactions
```css
/* Smooth Hover Animations */
.hover-scale {
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.hover-scale:hover {
  transform: scale(1.05);
}

.hover-lift {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

/* Entrance Animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Loading Animations */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes shimmer {
  0% {
    background-position: -468px 0;
  }
  100% {
    background-position: 468px 0;
  }
}

/* Success Animation */
@keyframes checkmark {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}
```

### Loading States
```css
.skeleton {
  background: linear-gradient(90deg, var(--gray-100) 25%, var(--gray-200) 50%, var(--gray-100) 75%);
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
  border-radius: 8px;
}

.skeleton-text {
  height: 16px;
  margin-bottom: 8px;
}

.skeleton-title {
  height: 24px;
  width: 60%;
  margin-bottom: 12px;
}

.skeleton-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.skeleton-card {
  height: 200px;
  margin-bottom: 16px;
}
```

---

## Modern Layout Patterns

### Page Container
```css
.page-container {
  min-height: 100vh;
  padding-bottom: 100px; /* Account for bottom nav */
  background: var(--gray-50);
}

.page-content {
  max-width: 428px; /* iPhone 14 Pro Max width */
  margin: 0 auto;
  background: white;
  min-height: 100vh;
  box-shadow: var(--shadow-sm);
}

.content-section {
  padding: 24px 20px;
}

.section-header {
  margin-bottom: 20px;
}

.section-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--gray-800);
  margin-bottom: 4px;
}

.section-subtitle {
  font-size: 14px;
  color: var(--gray-500);
}
```

### Grid Systems
```css
.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

/* Responsive Grid */
.grid-responsive {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}
```

---

## Enhanced Social Features

### Live Activity Feed
```css
.activity-feed {
  background: white;
  border-radius: 16px;
  padding: 0;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--gray-100);
  overflow: hidden;
}

.activity-item {
  padding: 16px 20px;
  border-bottom: 1px solid var(--gray-50);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.activity-item:hover {
  background: var(--gray-25);
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-avatar {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: var(--gradient-emerald);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  margin-right: 12px;
}

.activity-content {
  flex: 1;
}

.activity-text {
  font-size: 14px;
  color: var(--gray-700);
  line-height: 1.5;
  margin-bottom: 4px;
}

.activity-time {
  font-size: 12px;
  color: var(--gray-400);
}

.activity-new {
  position: relative;
}

.activity-new::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--emerald-500);
}
```

### Engagement Components
```css
.engagement-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 12px 0;
}

.engagement-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--gray-500);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 6px 12px;
  border-radius: 8px;
}

.engagement-item:hover {
  background: var(--gray-50);
  color: var(--gray-700);
}

.engagement-item.active {
  color: var(--emerald-600);
  background: var(--glass-emerald);
}

.engagement-icon {
  width: 18px;
  height: 18px;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.engagement-item:hover .engagement-icon {
  transform: scale(1.1);
}

.engagement-count {
  font-weight: 500;
}
```

---

## Responsive Design Guidelines

### Breakpoints
```css
/* Mobile First Approach */
.container {
  width: 100%;
  max-width: 428px; /* iPhone 14 Pro Max */
  margin: 0 auto;
  padding: 0 20px;
}

@media (min-width: 640px) {
  .container {
    max-width: 580px;
    padding: 0 24px;
  }
}

@media (min-width: 768px) {
  .container {
    max-width: 680px;
    padding: 0 32px;
  }
}

@media (min-width: 1024px) {
  .container {
    max-width: 800px;
    padding: 0 40px;
  }
}
```

### Safe Areas
```css
.safe-top {
  padding-top: env(safe-area-inset-top);
}

.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

.safe-left {
  padding-left: env(safe-area-inset-left);
}

.safe-right {
  padding-right: env(safe-area-inset-right);
}
```

---

## Accessibility Enhancements

### Focus States
```css
.focus-visible {
  outline: 2px solid var(--emerald-500);
  outline-offset: 2px;
}

.focus-ring {
  transition: box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.focus-ring:focus-visible {
  box-shadow: 0 0 0 4px var(--glass-emerald);
}
```

### Screen Reader Support
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: var(--gray-900);
  color: white;
  padding: 8px;
  text-decoration: none;
  border-radius: 4px;
  z-index: 100;
}

.skip-link:focus {
  top: 6px;
}
```

---

## Implementation Guidelines

### CSS Architecture
```
styles/
├── base/
│   ├── reset.css
│   ├── typography.css
│   └── variables.css
├── components/
│   ├── buttons.css
│   ├── cards.css
│   ├── forms.css
│   └── navigation.css
├── layouts/
│   ├── page.css
│   ├── grid.css
│   └── containers.css
├── utilities/
│   ├── spacing.css
│   ├── colors.css
│   └── animations.css
└── themes/
    ├── light.css
    └── dark.css
```

### Performance Optimizations
```css
/* Hardware Acceleration */
.gpu-accelerated {
  transform: translateZ(0);
  will-change: transform;
}

/* Efficient Transitions */
.efficient-transition {
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Reduce Motion for Accessibility */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## Testing & Quality Assurance

### Design System Checklist
- [ ] Color contrast meets WCAG 2.1 AA standards (4.5:1 minimum)
- [ ] All interactive elements have focus states
- [ ] Touch targets are minimum 44px × 44px
- [ ] Typography scales appropriately across breakpoints
- [ ] Animations respect prefers-reduced-motion
- [ ] Components work with screen readers
- [ ] Design system is documented and consistent
- [ ] Performance budget maintained (< 100kb CSS)

This comprehensive design system provides the foundation for a modern, sophisticated, and accessible Fan Club Z application that rivals leading fintech and social platforms while maintaining its unique prediction-focused identity.