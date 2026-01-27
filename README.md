# Carioca Game Web

A multiplayer real-time card game built with Next.js 15, React 19, and TypeScript.

## Security and Authentication

This project is in the process of implementing a robust security and authentication system. Please refer to the detailed documentation for more information.

### Upcoming Security Improvements

- Mandatory authentication with NextAuth.js (Google, GitHub, Magic Links)
- JWT token system for game sessions
- Rate limiting to prevent DoS attacks
- Complete server-side validation (anti-cheat)
- Logging and auditing system
- Protection against race conditions
- Automatic detection of suspicious activity

## Features

- Real-time multiplayer game (3-5 players)
- Bots with 3 difficulty levels (Easy, Medium, Hard)
- Responsive design optimized for mobile and desktop
- Unified color system with dark theme
- Optimized with React Query for minimal network usage
- Adaptive polling based on game state
- Game history
- Touch targets optimized for mobile devices (≥44px)

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, Tailwind CSS 4
- **Database**: PostgreSQL with Prisma
- **State Management**: React Query (TanStack Query)
- **TypeScript**: 5.x
- **Audio**: use-sound

## Deployment and Configuration Guide

### Local Environment Setup (From Scratch)

Follow these steps to set up the project on your local machine for the first time.

**Prerequisites:**
- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/) (package manager)
- [PostgreSQL](https://www.postgresql.org/) (installed and running)
- Git

**Steps:**

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd carioca-game-web
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file based on the example:
   ```bash
   cp .env.example .env
   ```
   Open the `.env` file and configure your database connection:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/carioca_game?schema=public"
   ```

4. **Configure Database**
   Run migrations to create the tables:
   ```bash
   pnpm run db:migrate
   ```

5. **Start Development Server**
   ```bash
   pnpm run dev
   ```
   The game will be available at [http://localhost:3000](http://localhost:3000).

### QAS / Production Environment (Vercel)

Recommended deployment using [Vercel](https://vercel.com) with Supabase.

**1. Environment Variables Configuration in Vercel**
Go to your project in Vercel > Settings > Environment Variables and add the following:

| Variable | Description | Value / Source |
|:---|:---|:---|
| `DATABASE_URL` | Connection (Pooler) | Supabase > Settings > Database > Connection Pooling (Transaction) |
| `DIRECT_URL` | Direct Connection | Supabase > Settings > Database > Direct connection |
| `NEXT_PUBLIC_SUPABASE_URL` | API URL | Supabase > Settings > API > Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Key | Supabase > Settings > API > anon / public |
| `AUTH_SECRET` | Auth Secret Key | Generate with `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | Trust Host | `true` (required for Vercel) |
| `EMAIL_HOST` | SMTP Host | `smtp.gmail.com` |
| `EMAIL_USER` | SMTP User | Your email (e.g., `cariocagameweb@gmail.com`) |
| `EMAIL_PASS` | SMTP Password | Your app password |
| `EMAIL_FROM` | Sender | Your email (e.g., `cariocagameweb@gmail.com`) |

**Note**: Make sure to replace `[YOUR-PASSWORD]` with your actual Supabase password in `DATABASE_URL` and `DIRECT_URL`.

**2. Deployment**
Connect your GitHub repository to Vercel. Vercel will automatically detect that it is a Next.js project.
- **Build Command**: `next build` (default)
- **Install Command**: `pnpm install` (default)
- **Output Directory**: `.next` (default)

When pushing to `main`, Vercel will automatically start the deployment.

**3. Database Migrations**
Vercel does not run migrations automatically. You can do this from your local machine by connecting to the production database or add a build step (not recommended for critical production, but useful for hobby projects).

To run migrations manually from your PC to the Supabase database:
```bash
# Ensure you have Supabase credentials in your local .env
npx prisma migrate deploy
```

## How to Play

1. **Create Room**: Create a new room from the main page
2. **Invite Players**: Share the room code or QR code
3. **Add Bots** (optional): Add bots to complete players
4. **Start Game**: Minimum 3 players required
5. **Play**: Follow Carioca rules to complete the 7 rounds

### Basic Rules

- **Objective**: Complete the contracts of each round and have the lowest score
- **Buys**: Maximum 7 buys per game
- **Jokers**: Can replace any card (stealable if you have the real card)
- **7 Rounds** with progressively more difficult contracts

## Project Structure

```
carioca-game-web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes
│   │   ├── game/[id]/         # Game page
│   │   └── history/           # Game history
│   ├── components/            # React components
│   │   ├── GameRoom/          # Game room components
│   │   │   ├── index.tsx      # Main orchestrator
│   │   │   ├── GameLobby.tsx  # Waiting room (WAITING)
│   │   │   └── GameBoard.tsx  # Game board (PLAYING)
│   │   ├── Card.tsx           # Card component
│   │   ├── Board.tsx          # Main board
│   │   └── ...                # Other components
│   ├── hooks/                 # Custom hooks
│   │   ├── game/              # Game logic hooks
│   │   │   ├── useGameState.ts    # Game state with React Query
│   │   │   └── useGameActions.ts  # Game actions
│   │   └── ...
│   ├── services/              # Business logic
│   │   └── gameService.ts     # Main game service
│   └── types/                 # TypeScript types
├── prisma/                    # Database schema and migrations
└── public/                    # Static assets
```

## Recent Changes

### Request Optimization (~70% reduction)

- **Eliminated duplicate polling**: Complete migration to React Query
- **Adaptive polling**:
  - Waiting room: every 8 seconds (~7.5 req/min)
  - Playing: every 3 seconds (~20 req/min)
  - Game finished: 0 requests
- **Before**: ~24-60 requests/min → **After**: ~7.5-20 requests/min

### Improved UI

- **Responsive cards**: Sizes optimized for touch (80x112px on mobile)
- **Mobile layout**: 2x2 grid for 5 players, better space usage
- **Floating bar**: Persistent state when round ends
- **Continue button**: Now automatically marks as ready

### Refactoring

- **GameRoom** split into 3 components (GameLobby, GameBoard, index)
- Unified color system with CSS variables
- Better organization and maintainability

## Available Scripts

```bash
pnpm run dev          # Development server
pnpm run build        # Production build
pnpm start            # Start production server
pnpm run lint         # Run Biome linter
pnpm run format       # Format code with Biome
```

## Database Configuration

```bash
# Create migration
npx prisma migrate dev --name migration_name

# Sync schema without migration
npx prisma db push

# Open Prisma Studio
npx prisma studio

# Generate Prisma client
npx prisma generate
```

## Responsive Design

- **Mobile**: ≥320px (iPhone SE)
- **Tablet**: ≥768px
- **Desktop**: ≥1024px

Mobile features:
- Touch targets ≥44px (iOS/Android standard)
- Cards 25% larger on mobile
- Safe areas for iPhone with notch
- Grid layout optimized for 5 players

## Debugging

### React Query DevTools

In development mode, access DevTools in the bottom left corner to:
- View active queries
- Verify refetch intervals
- Inspect cache
- Debug mutations

### Network Monitoring

Check requests in browser DevTools:
- Filter by "state" to see polling
- Should have ~1 request every 3-8 seconds
- No duplicate requests

## Performance

- **Build time**: ~3-4 seconds
- **Initial load**: Optimized with Next.js App Router
- **Code splitting**: Automatic per route
- **Caching**: React Query with 1s staleTime

## Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is open source and available under the MIT license.

## Security Status

| Aspect | Status | Next |
|---------|--------|---------|
| Authentication | Planned | NextAuth.js |
| Authorization | Planned | JWT Tokens |
| Rate Limiting | Planned | LRU Cache |
| Validation | Partial | Complete validators |
| Logging | Not implemented | Full audit |
| Anti-cheat | Basic | Server-side validation |

## Author

Paulo - [GitHub Profile](https://github.com/paulo1403)

## Acknowledgments

- Inspired by the traditional Carioca card game
- Icons from [Lucide React](https://lucide.dev)
- Sounds from [use-sound](https://github.com/joshwcomeau/use-sound)
