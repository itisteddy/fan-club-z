# Fan Club Z - Social Betting Platform 🎯

Fan Club Z is a mobile-first social betting platform that allows users to create and participate in bets on sports, pop culture, crypto, and viral moments. Built with React, TypeScript, and modern web technologies.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. **Clone and setup:**
```bash
git clone <repository-url>
cd "Fan Club Z"
npm run install:all
```

2. **Environment setup:**
```bash
cp .env.local .env
# Edit .env with your configuration
```

3. **Start development servers:**
```bash
npm run dev
```

This starts both the client (http://localhost:3000) and server (http://localhost:5001) concurrently.

### Individual Development

```bash
# Start only the client
npm run dev:client

# Start only the server  
npm run dev:server
```

### 📱 Mobile Development

To test on mobile devices:

1. **Start the development servers:**
```bash
npm run dev
```

2. **Find your computer's IP address:**
```bash
# macOS/Linux:
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows:
ipconfig

# Or use the helper script:
./mobile-setup.sh
```

3. **Access on mobile:**
- **Frontend**: `http://YOUR_IP_ADDRESS:3000`
- **Backend**: `http://YOUR_IP_ADDRESS:5001`

**Example**: If your IP is `192.168.1.100`, use `http://192.168.1.100:3000`

**Note**: Ensure both devices are on the same WiFi network.

## 🏗️ Project Structure

```
Fan Club Z/
├── client/                    # React frontend application
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── ui/           # Base UI components (buttons, cards, etc.)
│   │   │   ├── modals/       # Modal components
│   │   │   ├── onboarding/   # User onboarding flow
│   │   │   ├── BetCard.tsx   # Core bet display component
│   │   │   ├── BottomNavigation.tsx
│   │   │   └── MainHeader.tsx
│   │   ├── pages/            # Application pages/screens
│   │   │   ├── auth/         # Authentication pages
│   │   │   ├── DiscoverTab.tsx
│   │   │   ├── BetsTab.tsx
│   │   │   ├── CreateBetTab.tsx
│   │   │   ├── ClubsTab.tsx
│   │   │   ├── WalletTab.tsx
│   │   │   ├── ProfilePage.tsx
│   │   │   ├── BetDetailPage.tsx
│   │   │   └── ClubDetailPage.tsx
│   │   ├── store/            # Zustand state management
│   │   │   ├── authStore.ts  # Authentication state
│   │   │   ├── betStore.ts   # Betting logic and state
│   │   │   └── walletStore.ts # Wallet and transactions
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utilities and API client
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
├── server/                    # Express.js backend API
│   ├── src/
│   │   ├── index.ts          # Server entry point
│   │   ├── routes.ts         # API route definitions
│   │   └── storage.ts        # In-memory data storage
│   ├── package.json
│   └── tsconfig.json
├── shared/                    # Shared TypeScript types
│   └── schema.ts             # Common type definitions
├── package.json              # Root package.json with scripts
└── README.md
```

## ✨ Features

### 🎯 Core Betting System
- **Bet Creation**: Binary (Yes/No), Multiple choice, and Pool betting
- **Categories**: Sports, Pop Culture, Crypto, Politics, Custom
- **Real-time Updates**: Live betting pools and odds calculation
- **Smart Settlement**: Auto and manual settlement options

### 👥 Social Features
- **Likes & Comments**: Social interaction on bets
- **Sharing**: Share bets across platforms
- **Activity Feeds**: Live updates on betting activities
- **User Profiles**: Personal betting statistics and achievements

### 🏆 Clubs System
- **Club Creation**: Create betting communities around interests
- **Club Betting**: Exclusive bets within clubs
- **Discussions**: Club chat and discussion threads
- **Member Management**: Invite and manage club members

### 💰 Wallet & Transactions
- **Multi-currency Support**: USD, NGN, USDT, ETH
- **Deposit Methods**: Credit/debit cards, mobile money
- **Transaction History**: Detailed financial records
- **P2P Transfers**: Send funds between users

### 📱 Mobile-First Design
- **Responsive UI**: Optimized for mobile devices
- **Touch Interactions**: Mobile-friendly gestures
- **Bottom Navigation**: Thumb-friendly navigation
- **Smooth Animations**: 60fps transitions and micro-interactions

## 🎨 Design System

### Color Palette
- **Primary**: Green (#22c55e) - Main brand color
- **Background**: Light gray (#f9fafb)
- **Cards**: White with subtle shadows
- **Text**: Dark gray (#111827) for headings

### Components
- **Modern Cards**: Rounded corners with hover effects
- **Gradient Backgrounds**: Sophisticated color transitions
- **Consistent Typography**: Inter font family throughout
- **Smooth Animations**: CSS transitions for better UX

## 🔧 Technology Stack

### Frontend
- **React 18.3+** - Modern React with hooks
- **TypeScript** - Type safety and better DX
- **Wouter** - Lightweight routing
- **Zustand** - Simple state management
- **TanStack Query** - Data fetching and caching
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Radix UI** - Accessible component primitives

### Backend
- **Express.js** - Web application framework
- **TypeScript** - Type-safe backend development
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing
- **Zod** - Runtime type validation
- **In-Memory Storage** - Development data persistence

### Development Tools
- **Vite** - Fast build tool and dev server
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Concurrently** - Run multiple processes

## 📊 API Documentation

### Base URL
- Development: `http://localhost:5001/api`
- Production: `https://api.fanclubz.app`

### Authentication
```bash
# Register
POST /api/users/register
{
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "password": "securepassword"
}

# Login
POST /api/users/login
{
  "email": "john@example.com",
  "password": "securepassword"
}
```

### Betting
```bash
# Get all bets
GET /api/bets

# Get trending bets
GET /api/bets/trending

# Create bet
POST /api/bets
Authorization: Bearer <token>
{
  "title": "Will it rain tomorrow?",
  "description": "Weather prediction bet",
  "type": "binary",
  "category": "custom",
  "options": [
    {"label": "Yes"},
    {"label": "No"}
  ],
  "stakeMin": 1,
  "stakeMax": 100,
  "entryDeadline": "2025-07-05T12:00:00Z",
  "settlementMethod": "manual"
}

# Place bet
POST /api/bet-entries
Authorization: Bearer <token>
{
  "betId": "bet-id",
  "optionId": "option-id",
  "amount": 50
}
```

### Wallet
```bash
# Get balance
GET /api/wallet/balance/:userId
Authorization: Bearer <token>

# Deposit funds
POST /api/wallet/deposit
Authorization: Bearer <token>
{
  "amount": 100,
  "currency": "USD",
  "paymentMethod": "card"
}

# Get transactions
GET /api/transactions/:userId
Authorization: Bearer <token>
```

### Clubs
```bash
# Get all clubs
GET /api/clubs

# Create club
POST /api/clubs
Authorization: Bearer <token>
{
  "name": "Premier League Fans",
  "description": "For Premier League betting",
  "category": "sports",
  "isPrivate": false
}
```

## 🔒 Security Features

- **JWT Authentication** - Secure token-based auth
- **Password Hashing** - bcrypt with salt rounds
- **Input Validation** - Zod schema validation
- **CORS Protection** - Configured CORS policies
- **Helmet.js** - Security headers
- **Rate Limiting** - API request rate limiting (coming soon)

## 🚀 Deployment

### Environment Variables
Copy `.env.local` to `.env` and configure:

```bash
NODE_ENV=production
PORT=5001
JWT_SECRET=your-production-secret
# Add your production configuration
```

### Build Commands
```bash
# Build client and server
npm run build

# Start production server
npm start
```

### Docker Support (Coming Soon)
```dockerfile
# Dockerfile will be added for containerized deployment
```

## 🧪 Testing

### Demo Account
For testing the application:
- **Email**: demo@fanclubz.app
- **Password**: demo123

### Mock Data
The application includes comprehensive mock data:
- Sample users and bets
- Transaction history
- Club communities
- Comments and discussions

### Test Features
```bash
# Run tests (when implemented)
npm test

# Run E2E tests (when implemented) 
npm run test:e2e
```

## 🎯 Roadmap

### Phase 1: Core Platform ✅
- [x] User authentication and profiles
- [x] Basic betting system
- [x] Wallet functionality
- [x] Mobile-responsive design

### Phase 2: Social Features (In Progress)
- [x] Clubs and communities
- [x] Comments and reactions
- [ ] Real-time notifications
- [ ] User following system

### Phase 3: Advanced Features (Planned)
- [ ] KYC integration
- [ ] Real payment processing
- [ ] Smart contract integration
- [ ] Advanced analytics
- [ ] Push notifications

### Phase 4: Scale & Optimize (Future)
- [ ] Database optimization
- [ ] Caching layer
- [ ] Load balancing
- [ ] Advanced security

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Use meaningful commit messages
- Add tests for new features
- Update documentation

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support & Troubleshooting

### Common Issues

**Port Already in Use Error:**
```bash
# If you get EADDRINUSE error, kill the process using the port:
lsof -ti:5001 | xargs kill -9

# Or use a different port:
PORT=5002 npm run dev
```

**Build Errors:**
```bash
# Clear node_modules and reinstall:
rm -rf node_modules client/node_modules server/node_modules
npm run install:all
```

**Mobile Access Issues:**
```bash
# Can't access from mobile device:
# 1. Make sure both devices are on the same WiFi
# 2. Check your computer's firewall settings
# 3. Find your IP address:
ifconfig | grep "inet " | grep -v 127.0.0.1
# 4. Use the IP address: http://YOUR_IP:3000

# Get mobile URLs:
./mobile-setup.sh
```

### Getting Help
- **Documentation**: Check this README and code comments
- **Issues**: Create GitHub issues for bugs
- **Development**: Join our development discussions

## 🙏 Acknowledgments

- **Inspiration**: Modern betting platforms and social apps
- **Design**: Robinhood and Twitter design patterns
- **Technology**: React, TypeScript, and modern web stack

---

**Built with ❤️ by the Fan Club Z Team**

*Ready to revolutionize social betting? Let's make predictions fun again! 🚀*
