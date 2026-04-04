# Design System Document: Precision Logistics Interface

## 1. Overview & Creative North Star
**Creative North Star: "The Orchestrated Flow"**

This design system moves beyond the utility of a standard warehouse tool to create a high-end, editorial logistics experience. Inspired by the immersive, content-first approach of modern media players, "The Orchestrated Flow" treats warehouse data not as a static grid, but as a dynamic rhythm. 

By leveraging **Asymmetric Depth** and **Tonal Layering**, we eliminate the "industrial" clutter often found in logistics software. The interface should feel like a premium dashboard—silent when idle, but vibrantly responsive during action. We replace rigid lines with breathing room and subtle shifts in luminescence, ensuring the user (the Packer) remains focused on the physical task without cognitive overload.

---

## 2. Colors & Surface Philosophy
The palette is rooted in deep obsidian tones, punctuated by a hyper-vibrant "Signal Green" that guides the eye to the next logical step in the packing process.

### The "No-Line" Rule
**Traditional 1px borders are strictly prohibited for sectioning.** 
Structural boundaries must be defined exclusively through background color shifts. To separate the navigation from the workspace, use `surface-container-low` against the base `surface`. This creates a sophisticated, "app-native" feel that feels molded rather than assembled.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of materials. 
- **Base Layer:** `surface` (#0e0e0e) – The infinite floor.
- **Sectional Layer:** `surface-container-low` (#131313) – Large layout blocks (e.g., Sidebars).
- **Interactive Layer:** `surface-container` (#1a1a1a) – The primary workspace.
- **Focus Layer:** `surface-container-highest` (#262626) – Elevated cards or active modals.

### The Glass & Gradient Rule
To achieve a "Spotify-inspired" depth, use **Glassmorphism** for floating elements (like a "Package Complete" toast). 
- **Token:** Use `surface-variant` at 60% opacity with a `24px` backdrop-blur.
- **Signature Texture:** Primary buttons (`primary`) should use a subtle linear gradient transitioning from `primary` (#72fe8f) to `primary-container` (#1cb853) at a 135-degree angle. This adds "soul" and a tactile, pressed-glass quality to actions.

---

## 3. Typography
We utilize a dual-font strategy to balance editorial authority with functional clarity.

*   **Display & Headlines (Manrope):** Chosen for its geometric precision and modern "tech" feel. Use `display-lg` and `headline-md` for high-level warehouse stats or large order numbers.
*   **Interface & Body (Inter):** A workhorse for readability. Use `body-md` for all item descriptions and `label-sm` for technical metadata (SKUs, weights).

**Visual Hierarchy Tip:** Always pair a `headline-sm` in `on-surface` (Pure White) with a `label-md` in `on-surface-variant` (Muted Gray) to create immediate contrast between the "Object" and its "Context."

---

## 4. Elevation & Depth
We define importance through **Tonal Layering** rather than structural geometry.

*   **The Layering Principle:** A card containing a "Priority Shipment" should not have a thick border; instead, place a `surface-container-highest` card on top of a `surface-container-low` background. The slight shift in charcoal creates a natural, soft lift.
*   **Ambient Shadows:** For floating elements (Modals/Popovers), use a `48px` blur with 8% opacity. The shadow color must be `on-primary-container` (a deep green-tinted black) rather than pure gray, mimicking the way light reacts with the accent color.
*   **The "Ghost Border" Fallback:** If accessibility requires a stroke (e.g., in high-glare environments), use the `outline-variant` token at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Buttons
*   **Primary:** High-radius (`full`), Gradient (`primary` to `primary-container`), Text: `on-primary` (Bold).
*   **Secondary:** Ghost style. No background, `outline` token at 20% for the frame.
*   **Tertiary:** Text-only using `primary` color for high-visibility utility links.

### Input Fields
*   **Styling:** Forgo the 4-sided box. Use a `surface-container-high` background with a `sm` (0.25rem) bottom-only accent of `primary` when focused.
*   **States:** Error states use `error` (#ff7351) with a soft glow (outer-shadow) rather than a thick red border.

### Cards & Lists (The Warehouse Grid)
*   **No Dividers:** Lists of orders or items must never use horizontal lines. Use `16px` of vertical whitespace. 
*   **Active State:** An "active" item in a list should transition its background to `surface-bright` (#2c2c2c) and add a `2px` vertical pill of `primary` to the left edge.

### Custom Logistics Components
*   **The Packing Progress Bar:** A thick, `lg` rounded track using `surface-container-highest`. The fill is a `primary` gradient. As it reaches 100%, add a subtle outer glow (bloom) to signify completion.
*   **Status Badges:** Use `secondary-container` with `on-secondary-container` text. Keep corners `full` (pill shape) for a soft, friendly professional look.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use extreme whitespace. If you think there is enough room between items, add 8px more.
*   **Do** use `manrope` for numbers. In a warehouse app, numbers are the most important data; they deserve the "Display" typeface treatment.
*   **Do** use `surface-tint` for subtle overlays to indicate "Success" states across the whole screen.

### Don’t:
*   **Don’t** use pure `#000000` for backgrounds. Use `surface` (#0e0e0e) to allow for depth and shadows to remain visible.
*   **Don’t** use "Alert Red" for everything. Reserve `error` for critical blockers. Use `tertiary` (Blue) for neutral notifications.
*   **Don’t** use standard 4px rounded corners. Stick to the `md` (0.75rem) and `lg` (1rem) scales to maintain the Spotify-inspired modern aesthetic.