# ScholarX — UI Design & Extracted Color Palette Specification

We have sampled the exact color palette from your reference screenshot and generated the official **ScholarX Mentor & Faculty Portal UI Mockup**.

---

## 1. Visual Design Comparison

````carousel
![Reference UI (Student Portal)](/C:/Users/sahil/.gemini/antigravity/brain/69325728-56a6-4814-9210-ed2cfa27a4ef/reference_student_ui.png)
<!-- slide -->
![ScholarX Mentor Dashboard Mockup](/C:/Users/sahil/.gemini/antigravity/brain/69325728-56a6-4814-9210-ed2cfa27a4ef/scholarx_mentor_ui_1788347796784.jpg)
````

---

## 2. Extracted Palette & Design Tokens

Sampled directly from your reference interface:

| Role | Color Sample / Token | HEX Code | RGB | Usage in ScholarX Mentor Portal |
| :--- | :--- | :--- | :--- | :--- |
| **Hero Banner / Deep Pine** | `var(--sx-banner-pine)` | `#16302C` | `rgb(22, 48, 44)` | Hero welcome banner, primary headings, sidebar active text |
| **Primary Action / Deep Teal**| `var(--sx-primary-teal)`| `#15635E` | `rgb(21, 99, 94)` | Primary buttons ("View Details", "Create Class"), focus rings |
| **Vibrant Neon Mint** | `var(--sx-neon-mint)` | `#21DB93` | `rgb(33, 219, 147)`| Circular mastery/attendance progress gauge, online status dots |
| **Canvas Background** | `var(--sx-canvas-sage)` | `#EEF3F1` | `rgb(238, 243, 241)`| Full application canvas background (soft frost sage) |
| **Card & Surface** | `var(--sx-surface-white)`| `#FFFFFF` | `rgb(255, 255, 255)`| Dashboard cards, widgets, modal containers, data tables |
| **Active Nav / Soft Mint** | `var(--sx-nav-active)` | `#E5EDED` | `rgb(229, 237, 237)`| Active sidebar item pill highlight |
| **Borders & Dividers** | `var(--sx-border-subtle)`| `#DDE5E2` | `rgb(221, 229, 226)`| Subtle card outlines and divider rules |
| **Competency Tag Pills** | `var(--sx-chip-mint)` | `#E6F4F0` | `rgb(230, 244, 240)`| Assessment tags (`Oral Assessment`, `CO1`, `CO2`) |
| **Muted Text / Secondary** | `var(--sx-text-muted)` | `#5A6B67` | `rgb(90, 107, 103)` | Subtitles, roll numbers, timestamps, placeholder text |

---

## 3. Angular 21 Production CSS Tokens (`styles.scss`)

```scss
/* ScholarX Enterprise Academic Theme (Pine & Neon Mint) */
:root {
  /* Brand Surfaces */
  --sx-canvas: #eef3f1;
  --sx-surface: #ffffff;
  --sx-surface-hover: #f7faf9;
  --sx-border: #dde5e2;

  /* Hero & Primary Actions */
  --sx-hero-pine: #16302c;
  --sx-hero-pine-hover: #0f2421;
  --sx-primary-teal: #15635e;
  --sx-primary-teal-hover: #0e4c48;
  --sx-primary-teal-active: #093835;

  /* Neon Mint Accents */
  --sx-neon-mint: #21db93;
  --sx-neon-mint-glow: rgba(33, 219, 147, 0.25);

  /* Navigation & Chips */
  --sx-nav-pill-active: #e5eded;
  --sx-chip-bg: #e6f4f0;
  --sx-chip-text: #15635e;

  /* Typography */
  --sx-text-primary: #16302c;
  --sx-text-secondary: #5a6b67;
  --sx-text-light: #ffffff;

  /* Card Geometry */
  --sx-radius-sm: 8px;
  --sx-radius-md: 14px;
  --sx-radius-lg: 20px;
  --sx-radius-full: 9999px;
  --sx-shadow-card: 0 1px 3px rgba(22, 48, 44, 0.04), 0 4px 12px rgba(22, 48, 44, 0.02);
}
```

---

## 4. Layout Architecture of the Mockup

1. **Sidebar Navigation (Left)**:
   - Modern `ScholarX` logo with academic shield icon.
   - Clean menu items with rounded pill indicator for active route (`Dashboard`).
   - Muted slate-green icon styling.
2. **Hero Header (Top)**:
   - Dark pine container (`#16302C`) with rounded corners (`16px`).
   - Profile badges: `ID: SX-M401` and `Dept: Computer Science`.
   - Circular progress ring in vibrant neon mint (`#21DB93`) showcasing **94.2% Attendance**.
3. **Quick Action Cards (Row 1)**:
   - 4 modular cards with soft mint icon boxes: `Active Classes (5)`, `Pending Approvals (7)`, `Oral VIVAs (3)`, `Students (186)`.
4. **Primary Content Grid (Row 2)**:
   - **Left Column**: Active assessment cards featuring subject codes, scheduled viva dates, competency chips (`CO1`, `CO2`), and the deep teal `[View Details]` button.
   - **Right Column**: Candidate queue & mentor chats widget with search bar and live green status indicators.
