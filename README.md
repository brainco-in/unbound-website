# Unbound - Cloud Platform Engineering

A modern, interactive consultancy website built with Next.js 14, featuring unique scroll animations and a scratch-to-reveal hero section.

## Features

- **Scratch-to-Reveal Hero**: Interactive canvas-based scratch effect revealing tech terminology
- **Scroll-Triggered Zoom Transition**: Smooth zoom-out animation using GSAP ScrollTrigger
- **Horizontal Scroll Services**: Pinned horizontal scroll section for service cards
- **Theme Toggle**: Light/Dark/System theme support with smooth transitions
- **Contact Form**: Clean, animated form with mock submission

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Animations**: GSAP + ScrollTrigger
- **Theme**: next-themes
- **Language**: TypeScript

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
/app
  layout.tsx          # Root layout with providers
  page.tsx            # Main landing page
  contact/page.tsx    # Contact form page
  globals.css         # Global styles & CSS variables
/components
  scratch-reveal.tsx      # Canvas scratch effect
  zoom-transition.tsx     # GSAP zoom animation
  value-proposition.tsx   # Text section
  horizontal-services.tsx # Horizontal scroll services
  cta-section.tsx         # Get started CTA
  contact-form.tsx        # Contact form
  navbar.tsx              # Navigation
  theme-toggle.tsx        # Theme switcher
/lib
  gsap-config.ts      # GSAP initialization
  utils.ts            # Utility functions
/providers
  theme-provider.tsx  # Theme context
```

## Interaction Flow

1. **Screen 1**: "UNBOUND" text with scratch-to-reveal interaction
2. **Screen 2**: Scroll triggers zoom-out transition to tagline
3. **Screen 3**: Value proposition text section
4. **Screen 4**: Horizontal scroll through service cards
5. **Screen 5**: Get Started CTA → Contact page

## License

© 2026 Unbound. All rights reserved.
