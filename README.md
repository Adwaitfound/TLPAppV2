# 🎬 Video Production Management App

A modern, full-stack video production management platform built with Next.js 14, TypeScript, and Supabase.

![Video Production App](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)

## ✨ Features

- 📊 **Dashboard** - Real-time overview of projects, revenue, and activities
- 🎯 **Project Management** - Track video production projects from planning to completion
- 👥 **Client Management** - Manage client relationships and communications
- 💰 **Invoicing** - Create, send, and track invoices
- 📈 **Analytics** - Visualize performance metrics and insights
- 🌓 **Dark/Light Mode** - Beautiful UI with theme switching
- 📱 **Responsive Design** - Optimized for desktop, tablet, and mobile

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Icons**: Lucide React
- **Animations**: Framer Motion

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Real-time**: Supabase Realtime
- **API**: Next.js API Routes + Server Actions

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase account (free tier available)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Adwaitfound/video-production-app.git
cd video-production-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up the database:
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor
   - Run the migration file from `supabase/migrations/001_initial_schema.sql`

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📂 Project Structure

```
video-production-app/
├── app/                      # Next.js 14 App Router
│   ├── dashboard/           # Dashboard pages
│   │   ├── projects/       # Projects management
│   │   ├── clients/        # Client management
│   │   ├── invoices/       # Invoice management
│   │   ├── analytics/      # Analytics & reports
│   │   └── settings/       # Settings page
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Landing page
├── components/              # React components
│   ├── ui/                 # shadcn/ui components
│   ├── dashboard/          # Dashboard-specific components
│   ├── shared/             # Shared components
│   └── theme-provider.tsx  # Theme provider
├── lib/                     # Utility functions
│   ├── supabase/           # Supabase client setup
│   └── utils.ts            # Helper functions
├── types/                   # TypeScript type definitions
├── supabase/               # Supabase configuration
│   └── migrations/         # Database migrations
├── public/                  # Static assets
└── tailwind.config.js      # Tailwind CSS configuration
```

## 🎨 Design System

### Color Palette
- **Primary**: Yellow/Lime (#E8FF59) - CTAs and accents
- **Secondary**: Blue (#4C6FFF) - Cards and highlights
- **Dark mode**: Deep blacks with subtle grays
- **Light mode**: Clean whites
- **Status colors**: Success (green), Warning (yellow), Danger (red), Info (blue)

### Typography
- **Font**: Inter
- **Headings**: Bold (700)
- **Body**: Medium (500) and Regular (400)

### Components
- Large rounded corners (16-24px)
- Soft layered shadows
- Smooth animations and transitions
- Card-based layouts

## 📊 Database Schema

The app uses PostgreSQL (via Supabase) with the following main tables:

- **users** - User accounts and profiles
- **clients** - Client information
- **projects** - Video production projects
- **project_files** - Project file attachments
- **project_comments** - Comments and feedback
- **invoices** - Invoice records
- **invoice_items** - Invoice line items
- **milestones** - Project milestones

See `supabase/migrations/001_initial_schema.sql` for the complete schema.

## 🔐 Authentication

This app is configured to use Supabase Authentication. To enable authentication:

1. Enable Email/Password authentication in your Supabase project
2. Configure the authentication callback URLs in Supabase
3. Implement the auth pages (coming in Phase 2)

## 🚢 Deployment

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Adwaitfound/video-production-app)

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add environment variables (Supabase URL and Key)
4. Deploy!

### Environment Variables

Make sure to set these in your deployment platform:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 📝 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Backend powered by [Supabase](https://supabase.com/)
- Icons from [Lucide](https://lucide.dev/)

---

Made with ❤️ for video production teams
