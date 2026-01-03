# Microsoft Fluent Design System Implementation

This document outlines how the application follows Microsoft's Fluent Design System guidelines.

## References
- [Microsoft Fluent Design System](https://fluent2.microsoft.design)
- [Layout Guidelines](https://fluent2.microsoft.design/layout)
- [Component Guidelines](https://fluent2.microsoft.design/components/web/react/core)
- [Design Principles](https://fluent2.microsoft.design/design-principles)

## Implementation Details

### 1. Grid System
- **12-Column Grid**: Flexible layout system allowing division into halves, thirds, fourths, and sixths
- **Gutters**: Spacing between columns using Microsoft's 4px base unit
- **Margins**: Proper framing of content
- **Implementation**: Custom `Grid` component with Microsoft spacing tokens

### 2. Spacing System
Microsoft uses a **4px base unit** for all spacing:
- `xs`: 4px (1 * 4px)
- `sm`: 8px (2 * 4px)
- `md`: 12px (3 * 4px)
- `lg`: 16px (4 * 4px) - Standard card padding
- `xl`: 20px (5 * 4px)
- `2xl`: 24px (6 * 4px)
- `3xl`: 32px (8 * 4px)
- `4xl`: 40px (10 * 4px) - Standard button height
- `5xl`: 48px (12 * 4px)

### 3. Components

#### Buttons
- **Heights**: 32px (small), 40px (medium), 48px (large)
- **Border Radius**: 2px
- **Colors**: Microsoft Blue (#0078D4) for primary
- **Focus States**: Ring indicators with proper offset

#### Cards
- **Padding**: 16px (standard)
- **Border Radius**: 2px
- **Border**: 1px solid #EDEBE9
- **Shadows**: Microsoft shadow tokens for elevated variant

#### Tabs
- **Selected State**: Blue underline (2px height), blue text, semibold font
- **Unselected**: Gray text, hover to neutral
- **Focus States**: Ring indicators

#### Inputs
- **Height**: 40px (standard)
- **Padding**: 12px horizontal (px-3)
- **Border Radius**: 2px
- **Focus**: Blue border and ring

#### Navigation (Sidebar)
- **Selected State**: Background hover, blue text, 2px left border indicator
- **Icons**: 16px (h-4 w-4)
- **Spacing**: 2px vertical between items

### 4. Typography
- **Font**: Segoe UI (Microsoft's signature typeface)
- **Font Weights**: Normal (400), Semibold (600)
- **Text Colors**: Microsoft neutral scale

### 5. Colors
- **Primary**: #0078D4 (Microsoft Blue)
- **Neutral**: #323130 (primary text)
- **Neutral Secondary**: #605E5C
- **Neutral Tertiary**: #A19F9D
- **Borders**: #EDEBE9
- **Backgrounds**: #FFFFFF, #FAF9F8, #F3F2F1

### 6. Design Principles Applied
1. **Natural on Every Platform**: Consistent patterns across all pages
2. **Built for Focus**: Clear visual hierarchy, minimal clutter
3. **Inclusive**: Proper focus states, accessible colors
4. **Unmistakably Microsoft**: Segoe UI, Microsoft colors, Fluent patterns

## Component Usage

All components follow Microsoft's guidelines:
- `Grid`: 12-column system with Microsoft spacing
- `Card`: Standard padding and borders
- `Button`: Microsoft heights and colors
- `Input`: 40px height, proper focus states
- `Tabs`: Microsoft-style underline indicators
- `Badge`: Microsoft color scheme
- `Select`: Consistent with Input styling

## Page Layouts

All pages use:
- **Page Padding**: 24px (p-6) instead of 32px
- **Grid Gaps**: 12px (gap-3) or 16px (gap-4) instead of 24px
- **Margins**: Microsoft spacing tokens
- **Background**: #FAF9F8 (ms-neutralLighter)

