# 4casta – Private Branch Forecasting with Voice-First AI

**4casta** is a premium, local-first forecasting platform designed for managing and predicting operational performance across 46 branches and 7 regions. It features a sophisticated Voice-First AI assistant for hands-free navigation and deep data insights.

## 🚀 Core Architecture

Unlike traditional web apps, **4casta** is built with a **local-first** philosophy. It uses **Dexie.js (IndexedDB)** for persistent, high-performance client-side data management, allowing for instant dashboard updates and smooth performance even with large historical datasets (2023–2025).

## 🎙️ Voice-First AI Assistant

One of the platform's standout features is the integrated AI Assistant:
- **Speech Recognition**: Voice-commanded navigation (e.g., "Go to forecast", "Show my data").
- **Kokoro TTS**: High-quality, on-device text-to-speech output using the `Kokoro-82M` model for natural-sounding voice feedback.
- **Multilingual Support**: Support for various voice profiles (Heart, Sky, Alloy, Adam, Echo, Onyx).

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui, Framer Motion
- **Database**: Dexie.js (IndexedDB) for local state, with Supabase integration for hybrid cloud sync.
- **Charts**: Recharts for interactive analytics.
- **AI/ML**: Kokoro-js for TTS, on-device Speech Recognition API.

## 🔐 Role-Based Access Control

The platform implements a strict hierarchical dashboard system:
- **HQ Admin**: Full company-wide visibility and user management.
- **Region Admin**: Filtered access to specific regional performance and branches.
- **Branch User**: Encapsulated view of their specific branch data only.

## 📁 Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Environment Setup
Copy `.env.example` to `.env` and configure your Supabase credentials (for hybrid sync features):
```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

### 3. Run Development Server
```bash
pnpm dev
```
The application will automatically seed the local IndexedDB with 3 years of historical data on the first visit to the login page.

## 📊 Forecasting Engine

The platform uses a sophisticated forecasting logic:
- **Core Method**: Seasonal Naive + Growth Trend.
- **Data Range**: Uses actuals from 2023–2025 to generate 2026 Monthly Forecasts.
- **Drivers**: Incorporates working day adjustments and regional seasonal indices.
- **Rebuild**: You can force-rebuild forecasts via scripts:
  ```bash
  pnpm forecast:rebuild
  ```

## 📋 Data Import

Automated imports from Excel are supported via Node scripts:
```bash
node scripts/import-branch-file.mjs --branch <id> --file <path> --year <year>
```
*Format requirements: Column A (Description), Columns B-M (Jan-Dec values).*

## 📄 Documentation

- `SUPABASE_SETUP.md` – Database schema and auth configuration.
- `UPLOAD_FORMAT.md` – Excel layout guidelines.
- `TESTING_ROLES.md` – Detailed walkthrough of RLS and Role views.

## ⚖️ License
Private.
