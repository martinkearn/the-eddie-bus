---
name: Community Mobility System
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#5d3f3c'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f1f1'
  outline: '#926f6b'
  outline-variant: '#e7bdb8'
  surface-tint: '#c00014'
  primary: '#ba0013'
  on-primary: '#ffffff'
  primary-container: '#e31e24'
  on-primary-container: '#fffafa'
  inverse-primary: '#ffb4ab'
  secondary: '#5f5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e2dfde'
  on-secondary-container: '#636262'
  tertiary: '#1e51cd'
  on-tertiary: '#ffffff'
  tertiary-container: '#406be7'
  on-tertiary-container: '#fdfaff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad6'
  primary-fixed-dim: '#ffb4ab'
  on-primary-fixed: '#410002'
  on-primary-fixed-variant: '#93000d'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#dce1ff'
  tertiary-fixed-dim: '#b5c4ff'
  on-tertiary-fixed: '#00164e'
  on-tertiary-fixed-variant: '#003cae'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  callout:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 30px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  margin-mobile: 1rem
  margin-desktop: 2.5rem
  gutter: 1.5rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 2rem
  section-gap: 4rem
---

## Brand & Style

The visual identity is rooted in reliability, accessibility, and local warmth. It balances a professional service standard with the approachable heart of a community charity. The design language is intentionally clear to accommodate users with varying degrees of visual and cognitive ability, ensuring that the service feels "by the community, for the community."

The style is **Corporate / Modern** with a **Tactile** warmth. It utilizes high-contrast elements for legibility while employing soft, rounded corners to evoke a sense of safety and friendliness. The presence of the physical minibus in imagery serves as a "hero" element, grounding the digital experience in the tangible reality of the transport service.

## Colors

The palette is led by a high-visibility **Brand Red**, pulled directly from the vehicle livery, used primarily for calls to action and key branding moments. This is grounded by a deep **Charcoal Black** for maximum text contrast and structural elements.

A secondary **Action Blue** is introduced specifically for accessibility-related icons and links, adhering to international standards for disability signage. The background palette relies on a clean **White** and **Soft Gray** to maintain a spacious, non-cluttered environment that reduces cognitive load for elderly users.

## Typography

The typography system prioritizes legibility above all else. **Plus Jakarta Sans** provides a friendly, slightly rounded character for headings, making the charity feel modern and welcoming. **Inter** is used for all functional body copy due to its exceptional tall x-height and letter-spacing, which aids readability for users with visual impairments.

Standard body text is set at a generous 18px (`body-lg`) to ensure comfort for elderly eyes. Line heights are kept airy (minimum 1.5x) to prevent lines of text from blurring together.

## Layout & Spacing

This design system uses a **Fluid Grid** model to ensure the interface remains usable on various devices, from desktop computers to large-font tablets.

- **Desktop:** 12-column grid with a max-width of 1280px.
- **Tablet:** 8-column grid with 24px margins.
- **Mobile:** 4-column grid with 16px margins.

The spacing rhythm is based on an 8px scale. Generous "touch targets" are prioritized; no interactive element should be smaller than 44x44px. White space is used aggressively to separate different services (e.g., shopping trips vs. medical appointments) to prevent user error.

## Elevation & Depth

Depth is used sparingly and functionally to indicate interactivity. The system uses **Tonal Layers** and **Soft Ambient Shadows** rather than complex gradients.

- **Level 0 (Surface):** The main background, pure white or light gray.
- **Level 1 (Cards):** Subtle 1px borders in a mid-gray color, with a very soft, diffused shadow to indicate the card is "lifted" and tappable.
- **Level 2 (Modals/Pop-overs):** Higher contrast shadows with a 15% opacity black tint to focus the user's attention on critical information, such as booking confirmations.

## Shapes

The shape language is defined by a **Rounded** aesthetic (0.5rem base radius). This specific radius echoes the friendly nature of the community service and mimics the rounded features of the minibus itself. 

- **Buttons:** Fully rounded (pill-shaped) or 0.5rem radius to feel "soft" to the touch.
- **Images:** Always clipped with a 1rem radius (`rounded-lg`) to maintain a consistent friendly container.
- **Inputs:** 0.5rem radius with a clear 2px border on focus for accessibility.

## Components

### Buttons
Primary buttons use the Brand Red with white text. Secondary buttons use a thick Charcoal Black outline. All buttons must have a minimum height of 56px on mobile to ensure they are easy to press for users with limited dexterity.

### Cards
Cards are the primary way to display transport schedules or news. They feature a white background, a 1px light gray border, and a 1rem corner radius. Content inside cards should have at least 24px of internal padding.

### Input Fields
Fields must have high-contrast labels that never disappear (no "placeholder-only" labels). Error states must use both a color change (Red) and an icon (e.g., an exclamation mark) to be accessible to colorblind users.

### Accessibility Chips
Small, high-contrast badges (e.g., "Wheelchair Accessible," "Dementia Friendly") should be used alongside trip listings to provide immediate reassurance to the user.

### Imagery
Photography should always feature the bus in local Bromsgrove environments or show friendly drivers and smiling passengers. Use a slight warm tint on images to enhance the community feel.