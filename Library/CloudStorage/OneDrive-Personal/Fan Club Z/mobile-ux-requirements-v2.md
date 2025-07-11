# Fan Club Z - Mobile UI/UX Requirements Document v2.0
## Apple-Inspired Design System

### Executive Summary
This document establishes a comprehensive design system for Fan Club Z mobile application, inspired by Apple's iOS design principles as seen in iTunes, Apple Music, and native iOS apps. The focus is on creating a clean, sleek, and modern interface with exceptional readability and usability.

---

## 1. Core Design Principles

### 1.1 Design Philosophy
```
PRINCIPLE: Clarity, Deference, and Depth

Clarity: 
- Text is legible at every size
- Icons are precise and lucid
- Adornments are subtle and appropriate

Deference:
- UI helps users understand and interact with content
- Content is paramount, not the UI

Depth:
- Visual layers and realistic motion convey hierarchy
- Smooth transitions enhance delight and understanding
```

### 1.2 Visual Language
```
REQUIREMENT: Adopt Apple's visual language

Key Elements:
- Generous white space
- Edge-to-edge layouts
- Subtle depth through shadows and blur
- Vibrant colors used sparingly
- Focus on typography and content
```

---

## 2. Typography System

### 2.1 Font Selection
```
REQUIREMENT: Implement Apple-inspired typography

Primary Font: Inter (closest web alternative to SF Pro)
Fallback: -apple-system, system-ui, BlinkMacSystemFont

Font Stack:
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 
            'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
```

### 2.2 Type Scale
```
REQUIREMENT: Large, readable text sizes matching Apple standards

Display:
- Hero: 34px/41px, font-weight: 700, tracking: 0.37px
- Title 1: 28px/34px, font-weight: 700, tracking: 0.36px
- Title 2: 22px/28px, font-weight: 700, tracking: 0.35px
- Title 3: 20px/25px, font-weight: 600, tracking: 0.38px

Body:
- Large: 17px/22px, font-weight: 400, tracking: -0.41px
- Regular: 17px/22px, font-weight: 400, tracking: -0.41px
- Small: 15px/20px, font-weight: 400, tracking: -0.24px

Labels:
- Caption 1: 12px/16px, font-weight: 400, tracking: 0px
- Caption 2: 11px/13px, font-weight: 400, tracking: 0.06px

Implementation:
// tailwind.config.ts
fontSize: {
  'display': ['34px', { lineHeight: '41px', letterSpacing: '0.37px' }],
  'title-1': ['28px', { lineHeight: '34px', letterSpacing: '0.36px' }],
  'title-2': ['22px', { lineHeight: '28px', letterSpacing: '0.35px' }],
  'title-3': ['20px', { lineHeight: '25px', letterSpacing: '0.38px' }],
  'body-lg': ['17px', { lineHeight: '22px', letterSpacing: '-0.41px' }],
  'body': ['17px', { lineHeight: '22px', letterSpacing: '-0.41px' }],
  'body-sm': ['15px', { lineHeight: '20px', letterSpacing: '-0.24px' }],
  'caption-1': ['12px', { lineHeight: '16px', letterSpacing: '0px' }],
  'caption-2': ['11px', { lineHeight: '13px', letterSpacing: '0.06px' }],
}
```

---

## 3. Color System

### 3.1 Color Palette
```
REQUIREMENT: Minimal, sophisticated color palette

Primary Colors:
- Background: #FFFFFF (light) / #000000 (dark)
- Surface: #F2F2F7 (light) / #1C1C1E (dark)
- Secondary Surface: #FFFFFF (light) / #2C2C2E (dark)

Text Colors:
- Primary: #000000 (light) / #FFFFFF (dark)
- Secondary: #3C3C43 @ 60% (light) / #EBEBF5 @ 60% (dark)
- Tertiary: #3C3C43 @ 30% (light) / #EBEBF5 @ 30% (dark)

System Colors:
- Blue (Primary): #007AFF
- Green (Success): #34C759
- Red (Danger): #FF3B30
- Orange (Warning): #FF9500
- Purple (Premium): #AF52DE

Semantic Grays:
gray: {
  50: '#F2F2F7',   // Background
  100: '#E5E5EA',  // Separators
  200: '#D1D1D6',  // Borders
  300: '#C7C7CC',  // Disabled
  400: '#AEAEB2',  // Placeholder
  500: '#8E8E93',  // Secondary text
  600: '#636366',  // Tertiary text
  700: '#48484A',  // Dark mode surface
  800: '#3A3A3C',  // Dark mode secondary
  900: '#2C2C2E',  // Dark mode primary
}
```

### 3.2 Color Usage
```
REQUIREMENT: Restrained use of color

Rules:
1. Use color to indicate interactivity
2. Prefer monochrome for most UI elements
3. Apply color consistently across similar elements
4. Use semantic colors for system states

Examples:
- Primary actions: bg-blue-500 text-white
- Destructive actions: text-red-500
- Success states: text-green-500
- Links and interactive text: text-blue-500
- Regular buttons: bg-gray-100 text-black (light mode)
```

---

## 4. Spacing & Layout

### 4.1 Spacing System
```
REQUIREMENT: Consistent, generous spacing

Base Unit: 4px
Scale:
- 2xs: 4px
- xs: 8px
- sm: 12px
- md: 16px
- lg: 20px
- xl: 24px
- 2xl: 32px
- 3xl: 48px
- 4xl: 64px

Page Margins:
- Phone: 16px (md)
- Tablet: 24px (xl)

Section Spacing:
- Between sections: 32px (2xl)
- Within sections: 16px (md)
- Between cards: 12px (sm)
```

### 4.2 Layout Grid
```
REQUIREMENT: Edge-to-edge layouts with safe areas

Structure:
- Full bleed backgrounds
- Content respects safe areas
- Cards can extend to edges with internal padding

Implementation:
// Full width container
<div className="min-h-screen bg-white">
  // Edge-to-edge section
  <section className="bg-gray-50">
    // Content with margins
    <div className="px-4 py-8">
      {content}
    </div>
  </section>
</div>
```

---

## 5. Component Design

### 5.1 Navigation Bar
```
REQUIREMENT: Large, clear navigation matching iOS style

Top Navigation:
- Height: 96px (large) / 44px (collapsed)
- Large title: 34px bold
- Blur background: backdrop-blur-md bg-white/80
- Border: 0.5px solid rgba(0,0,0,0.1)

<header className="sticky top-0 z-40">
  <div className="bg-white/80 backdrop-blur-md border-b border-gray-200/50">
    <div className="px-4 pt-12 pb-2">
      <h1 className="text-display font-bold">Discover</h1>
    </div>
  </div>
</header>

Bottom Tab Bar:
- Height: 83px (49px bar + 34px safe area)
- Icon size: 24px
- Label: 10px
- Background: backdrop-blur-xl bg-white/75
- Active tint: primary blue
- Inactive: gray-400
```

### 5.2 Cards
```
REQUIREMENT: Clean cards with subtle depth

Card Specifications:
- Background: white
- Corner radius: 12px
- Shadow: 0 2px 8px rgba(0,0,0,0.04)
- Padding: 16px
- No borders in light mode

<div className="bg-white rounded-xl shadow-sm p-4">
  // Card content
</div>

Interactive Cards:
- Hover: transform scale(0.98)
- Active: opacity(0.7)
- Transition: all 0.1s ease-out
```

### 5.3 Buttons
```
REQUIREMENT: Clear button hierarchy

Primary Button:
- Height: 50px
- Font: 17px semibold
- Radius: 10px
- Background: blue-500
- Text: white

<button className="h-[50px] px-6 bg-blue-500 text-white 
                   font-semibold text-body rounded-[10px] 
                   active:scale-95 transition-transform">
  Continue
</button>

Secondary Button:
- Same size as primary
- Background: gray-100
- Text: black
- No border

Text Button:
- No background
- Blue-500 text
- Font-weight: 400
```

### 5.4 Lists & Tables
```
REQUIREMENT: iOS-style grouped lists

List Group:
- Background: gray-50
- Radius: 10px
- Separator: inset 16px
- Row height: 44px minimum

<div className="bg-gray-50 rounded-[10px] overflow-hidden">
  <div className="divide-y divide-gray-200">
    <div className="flex items-center px-4 h-11 bg-white">
      <span className="flex-1 text-body">Label</span>
      <span className="text-gray-500">Value</span>
      <ChevronRight className="w-5 h-5 text-gray-300 ml-2" />
    </div>
  </div>
</div>
```

### 5.5 Form Elements
```
REQUIREMENT: Native-feeling inputs

Text Input:
- Height: 44px
- Font-size: 17px
- Border: none
- Background: gray-100
- Radius: 10px
- Padding: 0 16px

<input className="h-11 px-4 text-body bg-gray-100 
                  rounded-[10px] placeholder-gray-500
                  focus:bg-gray-200 transition-colors" />

Toggle Switch:
- iOS style toggle
- 51x31px size
- Green when on
```

---

## 6. Icons & Imagery

### 6.1 Icon System
```
REQUIREMENT: SF Symbols style icons

Specifications:
- Use Lucide React (closest to SF Symbols)
- Consistent 2px stroke width
- Sizes: 20px (small), 24px (regular), 28px (large)
- Color: Match text color
- Optical adjustments for clarity

Icon Usage:
- Navigation: 24px
- Inline text: 20px
- Buttons: 20px
- Empty states: 64px+
```

### 6.2 Image Treatment
```
REQUIREMENT: High-quality imagery

Guidelines:
- Prefer vector graphics
- High resolution photos (2x, 3x)
- Consistent corner radius: 8px or 12px
- Subtle shadows for depth
- Aspect ratios: 16:9, 1:1, 4:3
```

---

## 7. Motion & Animation

### 7.1 Animation Principles
```
REQUIREMENT: Smooth, purposeful animations

Timing:
- Micro: 0.1s (button presses)
- Short: 0.2s (state changes)
- Medium: 0.3s (page transitions)
- Long: 0.4s (complex animations)

Easing:
- Standard: cubic-bezier(0.25, 0.1, 0.25, 1)
- Decelerate: cubic-bezier(0, 0, 0.2, 1)
- Accelerate: cubic-bezier(0.4, 0, 1, 1)
```

### 7.2 Interaction Feedback
```
REQUIREMENT: Immediate visual feedback

Touch States:
- Buttons: scale(0.95) + opacity(0.7)
- Cards: scale(0.98) + shadow reduction
- Tabs: color change instant
- Toggles: spring animation

Haptic Feedback:
- Light: Selection change
- Medium: Action confirmation
- Heavy: Important alerts
```

---

## 8. Bet Card Redesign

### 8.1 Bet Card Structure
```
REQUIREMENT: iTunes-style content cards

Layout:
<div className="bg-white rounded-xl shadow-sm overflow-hidden">
  // Hero image or gradient (optional)
  <div className="h-32 bg-gradient-to-br from-blue-400 to-purple-500" />
  
  // Content
  <div className="p-4">
    // Category badge
    <span className="text-caption-1 text-gray-500 uppercase tracking-wide">
      SPORTS
    </span>
    
    // Title
    <h3 className="text-title-3 font-semibold mt-1 line-clamp-2">
      Manchester City vs Arsenal - Who wins the title race?
    </h3>
    
    // Metadata row
    <div className="flex items-center mt-3 text-body-sm text-gray-500">
      <Users className="w-4 h-4 mr-1" />
      <span>1,234</span>
      
      <span className="mx-3">•</span>
      
      <Clock className="w-4 h-4 mr-1" />
      <span>2d 14h</span>
      
      <span className="mx-3">•</span>
      
      <TrendingUp className="w-4 h-4 mr-1" />
      <span>$25K pool</span>
    </div>
    
    // Action button
    <button className="mt-4 w-full h-11 bg-gray-100 rounded-[10px] 
                       font-medium text-body">
      View Details
    </button>
  </div>
</div>
```

### 8.2 Bet Detail View
```
REQUIREMENT: Full-screen detail view

Structure:
- Large hero image/gradient
- Floating close button
- Content scrolls under hero
- Fixed bottom action bar

<div className="min-h-screen bg-white">
  // Hero
  <div className="relative h-64 bg-gradient-to-br from-blue-400 to-purple-500">
    <button className="absolute top-12 right-4 w-8 h-8 bg-black/20 
                       backdrop-blur-md rounded-full">
      <X className="w-4 h-4 text-white" />
    </button>
  </div>
  
  // Content
  <div className="px-4 py-6 -mt-8">
    <div className="bg-white rounded-xl shadow-lg p-4">
      {/* Bet details */}
    </div>
  </div>
  
  // Fixed action bar
  <div className="fixed bottom-0 left-0 right-0 p-4 
                  bg-white/80 backdrop-blur-xl border-t">
    <button className="w-full h-[50px] bg-blue-500 text-white 
                       font-semibold rounded-[10px]">
      Place Bet
    </button>
  </div>
</div>
```

---

## 9. Authentication UI

### 9.1 Sign In Screen
```
REQUIREMENT: Clean, focused authentication

Layout:
<div className="min-h-screen bg-white flex flex-col">
  // App icon
  <div className="flex-1 flex items-center justify-center px-8">
    <div className="w-full max-w-sm">
      <div className="w-20 h-20 bg-blue-500 rounded-[18px] 
                      mx-auto mb-8 flex items-center justify-center">
        <span className="text-white text-3xl font-bold">Z</span>
      </div>
      
      <h1 className="text-title-1 font-bold text-center mb-2">
        Welcome to Fan Club Z
      </h1>
      <p className="text-body text-gray-500 text-center mb-8">
        Bet on what matters to you
      </p>
      
      // Social buttons
      <button className="w-full h-[50px] bg-black text-white 
                         rounded-[10px] font-medium mb-3">
        <Apple className="w-5 h-5 inline mr-2" />
        Continue with Apple
      </button>
      
      <button className="w-full h-[50px] bg-white border 
                         border-gray-200 rounded-[10px] font-medium">
        <Google className="w-5 h-5 inline mr-2" />
        Continue with Google
      </button>
      
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-caption-1">
          <span className="px-4 bg-white text-gray-500">or</span>
        </div>
      </div>
      
      // Email option
      <button className="w-full h-[50px] bg-gray-100 
                         rounded-[10px] font-medium">
        Sign in with Email
      </button>
    </div>
  </div>
  
  // Footer
  <div className="p-8 text-center">
    <p className="text-body-sm text-gray-500">
      Don't have an account? 
      <button className="text-blue-500 ml-1">Sign up</button>
    </p>
  </div>
</div>
```

---

## 10. Empty States

### 10.1 Empty State Design
```
REQUIREMENT: Friendly, helpful empty states

Structure:
<div className="flex flex-col items-center justify-center py-12 px-8">
  <div className="w-24 h-24 bg-gray-100 rounded-full 
                  flex items-center justify-center mb-6">
    <Icon className="w-12 h-12 text-gray-400" />
  </div>
  
  <h3 className="text-title-3 font-semibold mb-2">
    No Bets Yet
  </h3>
  
  <p className="text-body text-gray-500 text-center mb-6">
    Start exploring trending bets or create your own
  </p>
  
  <button className="h-11 px-6 bg-blue-500 text-white 
                     font-medium rounded-[10px]">
    Explore Bets
  </button>
</div>
```

---

## 11. Loading States

### 11.1 Skeleton Screens
```
REQUIREMENT: Smooth skeleton loading

Implementation:
<div className="bg-white rounded-xl p-4 animate-pulse">
  <div className="h-4 bg-gray-200 rounded w-1/4 mb-3" />
  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
  <div className="h-6 bg-gray-200 rounded w-1/2 mb-4" />
  <div className="h-11 bg-gray-200 rounded" />
</div>

Timing:
- Show immediately
- Fade out over 0.3s when content loads
- Match exact dimensions of content
```

### 11.2 Progress Indicators
```
REQUIREMENT: Minimal progress indication

Types:
1. Navigation bar spinner (20px)
2. Pull-to-refresh (iOS style)
3. Button loading state (inner spinner)
4. Full-screen only for critical loads

<button disabled className="relative">
  <span className="opacity-0">Place Bet</span>
  <div className="absolute inset-0 flex items-center justify-center">
    <Spinner className="w-5 h-5 animate-spin" />
  </div>
</button>
```

---

## 12. Dark Mode

### 12.1 Dark Mode Colors
```
REQUIREMENT: True black dark mode

Backgrounds:
- Primary: #000000
- Secondary: #1C1C1E
- Tertiary: #2C2C2E

Text:
- Primary: #FFFFFF
- Secondary: rgba(235,235,245,0.6)
- Tertiary: rgba(235,235,245,0.3)

Implementation:
<div className="bg-white dark:bg-black">
  <h1 className="text-black dark:text-white">Title</h1>
  <p className="text-gray-500 dark:text-gray-400">Body text</p>
</div>
```

---

## 13. Responsive Breakpoints

### 13.1 Device Adaptations
```
REQUIREMENT: Optimize for all iOS devices

Breakpoints:
- iPhone SE: 375px
- iPhone 14/15: 390px
- iPhone Plus/Max: 428px
- iPad Mini: 768px
- iPad Pro: 1024px

Layout Changes:
- Single column on phones
- 2-column grid on tablets (landscape)
- Larger tap targets on tablets
- Adjusted typography scale
```

---

## 14. Implementation Examples

### 14.1 Discover Tab Redesign
```jsx
export const DiscoverTab = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Large Title Navigation */}
      <header className="sticky top-0 z-40">
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="px-4 pt-12 pb-2">
            <h1 className="text-display font-bold">Discover</h1>
          </div>
          
          {/* Search Bar */}
          <div className="px-4 pb-2">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 
                               w-5 h-5 text-gray-400" />
              <input
                type="search"
                placeholder="Search"
                className="w-full h-11 pl-11 pr-4 bg-gray-100 
                         rounded-[10px] text-body"
              />
            </div>
          </div>
        </div>
      </header>
      
      {/* Categories */}
      <ScrollView horizontal className="px-4 py-3">
        {categories.map(cat => (
          <Chip
            key={cat.id}
            selected={selectedCategory === cat.id}
            onPress={() => setSelectedCategory(cat.id)}
          >
            {cat.emoji} {cat.label}
          </Chip>
        ))}
      </ScrollView>
      
      {/* Featured Section */}
      <section className="px-4 mb-8">
        <h2 className="text-title-2 font-bold mb-4">Featured</h2>
        <div className="bg-gradient-to-br from-blue-500 to-purple-500 
                      rounded-2xl p-6 text-white">
          <h3 className="text-title-1 font-bold mb-2">
            Today's Top Bet
          </h3>
          <p className="text-body opacity-90 mb-4">
            Bitcoin to hit $100K by year end?
          </p>
          <button className="bg-white/20 backdrop-blur-md 
                           px-6 h-11 rounded-[10px] font-medium">
            View Details
          </button>
        </div>
      </section>
      
      {/* Bet List */}
      <section className="px-4">
        <h2 className="text-title-2 font-bold mb-4">Trending Now</h2>
        <div className="space-y-3">
          {bets.map(bet => (
            <BetCard key={bet.id} bet={bet} />
          ))}
        </div>
      </section>
    </div>
  )
}
```

### 14.2 Bottom Navigation Implementation
```jsx
export const BottomNavigation = () => {
  const tabs = [
    { id: 'discover', label: 'Discover', icon: Search },
    { id: 'activity', label: 'Activity', icon: TrendingUp },
    { id: 'clubs', label: 'Clubs', icon: Users },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'profile', label: 'Profile', icon: User },
  ]
  
  return (
    <div className="fixed bottom-0 left-0 right-0">
      <div className="bg-white/75 backdrop-blur-xl border-t 
                    border-gray-100 pb-safe">
        <div className="flex justify-around items-center h-[49px]">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = currentTab === tab.id
            
            return (
              <button
                key={tab.id}
                className="flex flex-col items-center justify-center 
                         min-w-[64px] h-full"
                onClick={() => setCurrentTab(tab.id)}
              >
                <Icon 
                  className={cn(
                    "w-6 h-6 mb-1",
                    isActive ? "text-blue-500" : "text-gray-400"
                  )}
                />
                <span 
                  className={cn(
                    "text-[10px]",
                    isActive ? "text-blue-500" : "text-gray-400"
                  )}
                >
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

---

## 15. Migration Checklist

### Phase 1: Foundation (Week 1)
- [ ] Install Inter font
- [ ] Update color system
- [ ] Implement new spacing scale
- [ ] Update typography scale
- [ ] Create base components

### Phase 2: Core Components (Week 2)
- [ ] Redesign navigation bars
- [ ] Update button styles
- [ ] Redesign cards
- [ ] Update form elements
- [ ] Implement loading states

### Phase 3: Feature Screens (Week 3)
- [ ] Redesign Discover tab
- [ ] Update authentication screens
- [ ] Redesign bet detail views
- [ ] Update profile screens
- [ ] Implement empty states

### Phase 4: Polish (Week 4)
- [ ] Add animations
- [ ] Implement dark mode
- [ ] Responsive testing
- [ ] Performance optimization
- [ ] Accessibility audit

---

This v2.0 design system brings Fan Club Z in line with Apple's design excellence, creating a premium, intuitive experience that users will love.