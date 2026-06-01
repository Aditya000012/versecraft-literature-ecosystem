# Versecraft

**Versecraft** is an AI-powered literary ecosystem built to make literature feel alive again.

It is not just a reading app or a chatbot. Versecraft is a digital literary universe where readers can explore books, authors, movements, translations, recommendations, reading companions, personal anthologies, timelines, wishlists, and immersive literary experiences inside a calm, elegant, book-first interface.

---

## ✦ Vision

Modern reading platforms often feel like marketplaces.

Versecraft is designed to feel different.

It is built as a literary sanctuary — a place where books are not merely searched, purchased, or stored, but discovered, interpreted, discussed, translated, remembered, and lived with.

The goal is simple:

> make literature feel personal, intelligent, multilingual, and alive.

---

## ✦ Core Features

### Grand Library

Explore books through a refined literary interface with genre shelves, search, wishlist support, reading lists, and free public-domain reading integrations.

### In-App Reader

Read available public-domain works directly inside Versecraft through an integrated reader experience.

### Reader Hub

A personal reading room for currently reading books, reading progress, personal shelves, reading lists, and uploaded EPUB volumes.

### Author’s Hall

Discover major literary voices through elegant author profiles, biographies, key works, influences, legacy, and connected literary identity.

### Literary Movements

Explore movements such as Romanticism, Modernism, Realism, Gothic Literature, Surrealism, Existentialism, Magical Realism, and more through structured literary archive pages.

### Companion Chat

AI-powered literary companions designed for reading discussion, interpretation, creative exploration, and emotionally aware literary conversation.

### Translation Chamber

A literary translation interface focused on preserving meaning, rhythm, tone, and emotional cadence across languages.

### Curated Alcove

AI-assisted book recommendations shaped by genre, era, language, mood, and author vibe, with poetic curator notes.

### Personal Anthology

Save meaningful verses, reflections, fragments, and literary moments into a personal archive.

### Wishlist & Reading Lists

Organize books into personal collections, future reads, and thematic shelves.

### Timeline & Exploration Timer

Track reading activity and literary exploration across time.

---

## ✦ Tech Stack

* **Next.js 14**
* **TypeScript**
* **React 18**
* **Tailwind CSS**
* **Firebase**
* **Google Gemini API**
* **Groq API**
* **Google Books API**
* **Framer Motion**
* **html2canvas**

---

## ✦ Project Structure

```txt
versecraft/
├── app/              # Next.js app routes and pages
├── components/       # Reusable UI components
├── contexts/         # Global React contexts
├── lib/              # Utilities, Firebase config, constants
├── scratch/          # Development scratch files
├── public/           # Static assets if used
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.mjs
```

---

## ✦ Environment Variables

Versecraft uses external APIs and Firebase services. Create a `.env.local` file in the root directory.

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# AI APIs
GEMINI_API_KEY=
GROQ_API_KEY=

# Books
GOOGLE_BOOKS_API_KEY=
```

Never commit `.env` or `.env.local` files.

---

## ✦ Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Start production server:

```bash
npm start
```

Open:

```txt
http://localhost:3000
```

---

## ✦ Design Philosophy

Versecraft follows a literary-first design system:

* cream and parchment-inspired surfaces
* black and charcoal typography
* serif-led editorial hierarchy
* thin dividers instead of heavy containers
* calm spacing
* minimal motion
* no marketplace energy
* no dashboard clutter

The interface is built to feel closer to a reading room, archive, study desk, or literary chamber than a conventional web app.

---

## ✦ Current Status

Versecraft is under active development.

The current version includes the foundation of the full literature ecosystem: library, reader, author hall, movements archive, recommendations, translation, companion chat, profile systems, and reading collections.

Future improvements may include:

* deeper Gutenberg/public-domain integration
* richer reading analytics
* improved EPUB handling
* advanced literary companion memory
* expanded multilingual support
* author and movement graph visualizations
* deployment-ready production hardening

---

## ✦ Ownership

This project is proprietary.

© 2026 Versecraft. All rights reserved.

Unauthorized copying, redistribution, reproduction, or commercial use of this codebase is not permitted.

The repository is public for demonstration and portfolio purposes only. Usage as an end user is welcome through the deployed application when available.
