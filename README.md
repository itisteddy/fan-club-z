# Fan Club Z v2.0

A revolutionary social predictions platform that democratizes the predictions industry by enabling users to create, manage, and participate in their own prediction scenarios. Think Fantasy League meets TikTok meets Robinhood—designed for fans, by fans.

## 🚀 Quick Start

1. **Install dependencies**
   ```bash
   npm run install:all
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Run database migrations and seed data**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. **Start development servers**
   ```bash
   npm run dev
   ```

## 🏗️ Architecture

### Frontend (client/)
- **Framework**: React 18+ with TypeScript
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Styling**: Tailwind CSS + shadcn/ui
- **Animations**: Framer Motion
- **Routing**: React Router

### Backend (server/)
- **Runtime**: Node.js with Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT + Supabase Auth
- **Real-time**: WebSockets for live updates
- **Queue**: Bull Queue for background jobs

### Shared (shared/)
- **Types**: TypeScript interfaces and schemas
- **Validation**: Zod schemas
- **Utils**: Common utilities

## 🎯 Features

### Core Features
- ✅ User authentication and profiles
- ✅ Prediction creation and management
- ✅ Social engagement (comments, likes, reactions)
- ✅ In-app wallet system
- ✅ Club creation and management
- ✅ Real-time updates
- ✅ Mobile-first responsive design

### Phase 2 Features (Coming Soon)
- 🔜 KYC integration
- 🔜 Real payment processing
- 🔜 Advanced prediction mechanics
- 🔜 Creator monetization
- 🔜 Push notifications

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm 9+
- Supabase account

### Scripts
- `npm run dev` - Start development servers
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with test data

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App Configuration
VITE_APP_URL=http://localhost:5173
API_URL=http://localhost:3001

# JWT
JWT_SECRET=your_jwt_secret

# Redis (for production)
REDIS_URL=your_redis_url
```

## 📱 Mobile App

The application is built with a mobile-first approach and is fully responsive. It can be:
- Used as a Progressive Web App (PWA)
- Wrapped with Capacitor for native mobile apps
- Deployed as a web application

## 🔐 Security

- JWT-based authentication
- Input validation with Zod
- CORS protection
- Rate limiting
- Environment variable protection
- Supabase Row Level Security (RLS)

## 🎨 Design System

Built with modern design principles:
- **Primary Color**: #00D084 (Green)
- **Typography**: Inter font family
- **Components**: shadcn/ui with custom theming
- **Animations**: Framer Motion for smooth interactions
- **Mobile**: Touch-optimized with 44px minimum touch targets

## 📊 Database Schema

### Core Tables
- `users` - User profiles and authentication
- `predictions` - Prediction scenarios
- `prediction_options` - Available prediction outcomes
- `prediction_entries` - User predictions
- `clubs` - Community groups
- `comments` - Social interactions
- `reactions` - Likes and reactions
- `wallet_transactions` - Financial records

## 🚀 Deployment

### Development
- Client: Vite dev server on port 5173
- Server: Express server on port 3001
- Database: Supabase hosted

### Production
- Frontend: Vercel/Netlify
- Backend: Railway/Render
- Database: Supabase (production tier)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🎯 Roadmap

### Q1 2025
- [ ] Beta launch with 1,000 users
- [ ] KYC integration
- [ ] Payment processing
- [ ] Mobile app launch

### Q2 2025
- [ ] Advanced prediction mechanics
- [ ] Creator monetization
- [ ] Social features expansion
- [ ] Analytics dashboard

## 📞 Support

For support, email support@fanclubz.com or join our Discord community.

---

Built with ❤️ by the Fan Club Z team
# Trigger redeploy
