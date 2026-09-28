# ADR-A: Mobile Strategy

## Context
The project requires a strong mobile presence (P11 - Mobile First, Quick entry < 10 seconds). We must decide whether to build a native app immediately or start with a web-based approach.

## Options
1. **(Recommended)** **PWA-First with Next.js**: Build the Next.js web application with a strong mobile-first design, installable via Progressive Web App (PWA) standards.
2. **React Native / Expo**: Build a separate native mobile application from day one.

## Proposed Decision: Option 1
We will start with a **PWA-First** approach.
- **Why**: Reduces context switching and allows the core team to focus entirely on the domain logic and the unified Next.js application. Modern PWAs support offline capabilities (via Service Workers and IndexedDB) which satisfies P9.
- **Future**: Once the core product is stable and validated (V1.5+), we can extract the `packages/` logic and build a dedicated `apps/mobile` native app if platform-specific features (like native widgets) are strictly required.
