# RedditFrost Design System

## Overview
All components must be imported from the design system located in `components/ui/` to ensure consistency across the application.

## Design System Components

### Core Components

#### Button (`components/ui/button.tsx`)
```tsx
import { Button } from '@/components/ui';

<Button variant="primary" size="md">Click me</Button>
```
- **Variants**: `primary`, `secondary`, `success`, `danger`, `ghost`
- **Sizes**: `sm`, `md`, `lg`

#### Input (`components/ui/input.tsx`)
```tsx
import { Input } from '@/components/ui';

<Input label="Email" type="email" placeholder="you@example.com" />
```
- Includes label and error handling
- Light mode styling built-in

#### Textarea (`components/ui/textarea.tsx`)
```tsx
import { Textarea } from '@/components/ui';

<Textarea label="Description" rows={4} />
```

#### Select (`components/ui/select.tsx`)
```tsx
import { Select } from '@/components/ui';

<Select label="Choose option">
  <option value="1">Option 1</option>
</Select>
```

#### Card (`components/ui/card.tsx`)
```tsx
import { Card } from '@/components/ui';

<Card variant="default">
  Content here
</Card>
```
- **Variants**: `default`, `outlined`, `elevated`

#### Badge (`components/ui/badge.tsx`)
```tsx
import { Badge } from '@/components/ui';

<Badge variant="success">Active</Badge>
```
- **Variants**: `default`, `success`, `warning`, `danger`, `info`

#### PageContainer (`components/ui/page-container.tsx`)
```tsx
import { PageContainer } from '@/components/ui';

<PageContainer maxWidth="lg">
  Page content
</PageContainer>
```
- Handles page layout and background
- **MaxWidth**: `sm`, `md`, `lg`, `xl`, `2xl`, `full`

#### PageHeader (`components/ui/page-header.tsx`)
```tsx
import { PageHeader } from '@/components/ui';
import { Settings } from 'lucide-react';

<PageHeader
  title="Page Title"
  description="Page description"
  icon={Settings}
  action={<Button>Action</Button>}
/>
```

## Usage Rules

1. **Never use raw HTML elements** - Always use design system components
2. **Never use inline styles** - Use component props and variants
3. **Import from `@/components/ui`** - Single import point for all components
4. **Light mode only** - All components are styled for light mode
5. **Consistent spacing** - Use Tailwind spacing utilities consistently

## Example

❌ **Wrong:**
```tsx
<button className="px-4 py-2 bg-blue-600">Click</button>
<input className="w-full px-4 py-2 bg-white border" />
```

✅ **Correct:**
```tsx
import { Button, Input } from '@/components/ui';

<Button variant="primary">Click</Button>
<Input label="Email" type="email" />
```

## Color Palette (Light Mode Only)

- **Primary**: Blue-600 (#2563eb)
- **Success**: Green-600 (#16a34a)
- **Danger**: Red-600 (#dc2626)
- **Background**: White / Blue-50 gradient
- **Text**: Gray-900 (primary), Gray-600 (secondary)
- **Borders**: Gray-200, Gray-300

