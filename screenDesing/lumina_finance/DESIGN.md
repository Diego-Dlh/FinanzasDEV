---
name: Lumina Finance
colors:
  surface: '#fbf9fb'
  surface-dim: '#dbd9db'
  surface-bright: '#fbf9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f5'
  surface-container: '#efedef'
  surface-container-high: '#eae7ea'
  surface-container-highest: '#e4e2e4'
  on-surface: '#1b1b1d'
  on-surface-variant: '#44474d'
  inverse-surface: '#303032'
  inverse-on-surface: '#f2f0f2'
  outline: '#75777e'
  outline-variant: '#c5c6cd'
  surface-tint: '#515f78'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#0d1c32'
  on-primary-container: '#76849f'
  inverse-primary: '#b9c7e4'
  secondary: '#006e2a'
  on-secondary: '#ffffff'
  secondary-container: '#5cfd80'
  on-secondary-container: '#00732c'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#410004'
  on-tertiary-container: '#ee4647'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#b9c7e4'
  on-primary-fixed: '#0d1c32'
  on-primary-fixed-variant: '#39475f'
  secondary-fixed: '#69ff87'
  secondary-fixed-dim: '#3ce36a'
  on-secondary-fixed: '#002108'
  on-secondary-fixed-variant: '#00531e'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3ae'
  on-tertiary-fixed: '#410004'
  on-tertiary-fixed-variant: '#930015'
  background: '#fbf9fb'
  on-background: '#1b1b1d'
  surface-variant: '#e4e2e4'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  numeric-display:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '500'
    lineHeight: 34px
    letterSpacing: -0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 24px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

The design system is engineered for a premium, high-trust financial environment. It targets a modern, tech-savvy demographic that values clarity and sophistication over traditional banking complexity. 

The visual style is a fusion of **High-End Minimalism** and **Subtle Glassmorphism**. The interface prioritizes negative space to reduce cognitive load while managing complex financial data. To evoke a sense of "digital luxury," the system employs expansive tap targets, buttery-smooth transitions, and a layered depth model that mimics physical cards floating in a digital space. 

The emotional goal is "Confident Control"—the user should feel that their finances are organized, secure, and effortlessly manageable.

## Colors

The palette is anchored by **Deep Elegant Blue**, used sparingly for primary actions and brand moments to maintain its high-end status. 

- **Primary (#0A192F):** Used for primary buttons, active states, and high-level navigation.
- **Semantic Logic:** Financial health is communicated through vibrant, high-saturation accents. **Vibrant Green** represents liquidity and growth (Income/Savings), while **Soft Red** and **Warm Orange** provide gentle but clear friction for expenses and alerts.
- **Neutrals:** A scale of cool-toned slates replaces pure blacks to ensure the UI feels expansive rather than heavy.
- **Surface Strategy:** In light mode, surfaces use pure white (#FFFFFF) against a very light grey (#F8F9FA) background to create soft contrast without the need for harsh borders.

## Typography

This design system utilizes **Inter** exclusively to leverage its exceptional legibility and systematic weight distribution. 

- **Hierarchy:** We use tight letter-spacing on larger headings to create a modern, "editorial" look typical of high-end fintech. 
- **Numeric Data:** For currency and balances, use `numeric-display`. Ensure `font-variant-numeric: tabular-nums` is enabled in CSS to prevent layout shifting during real-time balance updates.
- **Scaling:** On mobile, `display-lg` is reserved for total balance views. All other headings should default to `headline-md` or `headline-sm` to preserve vertical real estate.

## Layout & Spacing

The system follows a strict **4px baseline grid** to ensure mathematical harmony. 

- **Margins:** A generous 24px horizontal margin is applied to all mobile screens to create a premium, "breathable" feel.
- **Component Spacing:** Content inside cards should follow a 16px (stack-md) rhythm. 
- **The "Safe Zone":** Primary Action Buttons (FABs or Bottom Sticky Buttons) must sit 32px above the home indicator to maintain clear visual separation from the navigation bar.
- **Vertical Rhythm:** Group related financial data points with 8px spacing, while separating distinct sections (e.g., Accounts vs. Recent Transactions) with 32px spacing.

## Elevation & Depth

Depth is achieved through **Ambient Shadows** and **Glassmorphism**, rather than traditional skeuomorphism.

- **Level 0 (Background):** Solid background color.
- **Level 1 (Cards):** White or Deep Slate surfaces with a 1px low-opacity border (10% Primary) and a soft, highly diffused shadow (Y: 4, Blur: 20, Opacity: 0.05).
- **Level 2 (Modals/Overlays):** These utilize a **Backdrop Blur (20px)** effect. Surfaces are 80% opaque to allow the colors of the underlying dashboard to bleed through, creating a sense of continuity.
- **The "Floating" Effect:** Transaction items do not use shadows; they sit flat on Level 1 surfaces. Only main container cards or high-priority prompts receive elevation.

## Shapes

The shape language is defined by **large, friendly radii** that soften the "seriousness" of financial data.

- **Main Containers/Cards:** Use a 24px radius (`rounded-xl` equivalent). This is the signature look of the app.
- **Action Elements:** Buttons use a slightly tighter 16px radius to distinguish them as interactive objects.
- **Selection Controls:** Checkboxes and radio buttons should be fully rounded (circular) to align with the soft aesthetic of the overall system.
- **Progress Bars:** Should always have fully rounded end-caps.

## Components

- **Buttons:** Primary buttons are solid Deep Blue with white text. Secondary buttons use a light blue ghost style or a subtle glass effect. All buttons have a height of 56px for optimal thumb interaction.
- **Cards:** The "Wealth Card" (Main Balance) should feature a subtle mesh gradient or a glassmorphic overlay. Internal padding is fixed at 20px.
- **Progress Bars:** Use a thick 8px track. The background track should be a 10% opacity version of the progress color (e.g., light green track for a vibrant green bar).
- **List Items:** Transactions follow a "Three-Line" pattern: Icon (left, 40px circle), Title/Category (center-top), Date/Time (center-bottom), and Amount (right-aligned).
- **Input Fields:** Use "Floating Labels." The border should only appear on focus, using the Primary color. The default state is a soft-grey filled background with a 12px radius.
- **Chips:** Used for filtering categories. They should be pill-shaped with a 1px border, filling with the Primary color only when selected.