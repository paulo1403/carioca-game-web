# 🔐 Guía de Implementación de Autenticación

> **Recomendación:** NextAuth.js v5 (Auth.js) con Google OAuth + Magic Links

---

## 🎯 ¿Por qué NextAuth.js?

### Ventajas
- ✅ **Gratuito y Open Source**
- ✅ **Integración nativa con Next.js 14+ (App Router)**
- ✅ **Prisma Adapter incluido** - Se conecta directo a tu BD
- ✅ **Múltiples providers** sin configuración extra
- ✅ **CSRF Protection automático**
- ✅ **Session Management** incluido
- ✅ **TypeScript first-class support**
- ✅ **Comunidad activa** (usado por Vercel, Netflix, etc.)

### Comparación con Alternativas

| Feature | NextAuth.js | Clerk | Supabase Auth |
|---------|-------------|-------|---------------|
| Costo | Gratis | $25/mes (10k MAU) | Gratis (50k MAU) |
| Self-hosted | ✅ Sí | ❌ No | ⚠️ Limitado |
| Control total | ✅ Sí | ❌ No | ⚠️ Parcial |
| UI incluida | ⚠️ Básica | ✅ Completa | ✅ Completa |
| Prisma integration | ✅ Nativa | ⚠️ Webhooks | ❌ Propia BD |
| Learning curve | Media | Baja | Media |

---

## 📦 Instalación

### 1. Instalar Dependencias

```bash
# NextAuth.js v5 (beta estable)
npm install next-auth@beta

# Prisma Adapter
npm install @auth/prisma-adapter

# Utilidades
npm install bcryptjs
npm install -D @types/bcryptjs

# Para envío de emails (Magic Links)
npm install nodemailer
npm install -D @types/nodemailer
```

### 2. Variables de Entorno

```env
# .env.local

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=tu-secret-super-seguro-genera-con-openssl-random-32

# Google OAuth (https://console.cloud.google.com)
GOOGLE_CLIENT_ID=tu-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-google-client-secret

# GitHub OAuth (https://github.com/settings/developers)
GITHUB_ID=tu-github-client-id
GITHUB_SECRET=tu-github-client-secret

# Email (para Magic Links)
EMAIL_SERVER=smtp://usuario:password@smtp.gmail.com:587
EMAIL_FROM=noreply@carioca-game.com

# Database (ya existe)
DATABASE_URL=postgresql://...
```

**Generar NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

---

## 🗄️ Schema de Base de Datos

### Actualizar Prisma Schema

```prisma
// prisma/schema.prisma

// ==================== AUTH MODELS ====================

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  password      String?   // Para email/password (opcional)
  
  // NextAuth relations
  accounts      Account[]
  sessions      Session[]
  
  // Game relations
  createdGames  GameSession[] @relation("CreatedGames")
  players       Player[]
  
  // Estadísticas
  gamesPlayed   Int       @default(0)
  gamesWon      Int       @default(0)
  totalScore    Int       @default(0)
  elo           Int       @default(1200)
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([email])
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// ==================== GAME MODELS (ACTUALIZADOS) ====================

model GameSession {
  id           String    @id
  creatorId    String
  creator      User      @relation("CreatedGames", fields: [creatorId], references: [id])
  
  status       String
  currentTurn  Int       @default(0)
  currentRound Int       @default(1)
  direction    String    @default("clockwise")
  deck         String
  discardPile  String
  lastAction   String?
  pendingDiscardIntents String @default("[]")
  pendingBuyIntents String @default("[]")
  readyForNextRound String @default("[]")
  reshuffleCount Int @default(0)
  
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  
  players      Player[]
  history      GameHistory?
  logs         GameLog[]
  
  @@index([creatorId])
  @@index([status])
}

model Player {
  id            String      @id
  userId        String?     // NULL para bots, FK a User para humanos
  user          User?       @relation(fields: [userId], references: [id])
  
  name          String
  hand          String
  melds         String      @default("[]")
  boughtCards   String      @default("[]")
  score         Int         @default(0)
  roundScores   String      @default("[]")
  buysUsed      Int         @default(0)
  roundBuys     String      @default("[]")
  isBot         Boolean     @default(false)
  difficulty    String?
  hasDrawn      Boolean     @default(false)
  
  createdAt     DateTime    @default(now())
  gameSessionId String
  gameSession   GameSession @relation(fields: [gameSessionId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([gameSessionId])
}

model GameHistory {
  id            String      @id @default(uuid())
  gameSessionId String      @unique
  gameSession   GameSession @relation(fields: [gameSessionId], references: [id])
  winnerId      String?
  participants  String
  playedAt      DateTime    @default(now())
  
  @@index([playedAt])
}

// ==================== SECURITY MODELS ====================

model GameLog {
  id            String      @id @default(cuid())
  gameSessionId String
  gameSession   GameSession @relation(fields: [gameSessionId], references: [id], onDelete: Cascade)
  userId        String?
  playerId      String
  action        String
  payload       String      @db.Text
  success       Boolean
  errorMessage  String?
  ipAddress     String?
  userAgent     String?
  timestamp     DateTime    @default(now())
  
  @@index([gameSessionId])
  @@index([userId])
  @@index([playerId])
  @@index([timestamp])
}

model SuspiciousActivity {
  id          String   @id @default(cuid())
  userId      String?
  playerId    String
  gameId      String
  reason      String
  severity    String   // LOW, MEDIUM, HIGH, CRITICAL
  autoDetected Boolean @default(true)
  reviewed    Boolean  @default(false)
  reviewedBy  String?
  reviewedAt  DateTime?
  createdAt   DateTime @default(now())
  
  @@index([userId])
  @@index([severity, reviewed])
  @@index([createdAt])
}
```

### Migrar Base de Datos

```bash
# Crear migración
npx prisma migrate dev --name add_authentication

# Generar cliente
npx prisma generate
```

---

## ⚙️ Configuración de NextAuth.js

### 1. Archivo de Configuración Principal

```typescript
// src/app/api/auth/[...nextauth]/route.ts

import NextAuth, { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  
  providers: [
    // Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    
    // GitHub OAuth
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    
    // Email Magic Links
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),
    
    // Credenciales (Email/Password) - Opcional
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      }
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },

  pages: {
    signIn: '/login',
    signOut: '/logout',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
  },

  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },

  events: {
    async signIn({ user, account, profile }) {
      console.log(`User ${user.email} signed in via ${account?.provider}`);
    },
  },

  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### 2. Tipos de TypeScript

```typescript
// src/types/next-auth.d.ts

import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email: string;
    name?: string;
    image?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
  }
}
```

---

## 🎨 Páginas de Autenticación

### 1. Página de Login

```typescript
// src/app/login/page.tsx

"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await signIn("email", {
        email,
        callbackUrl: "/",
      });
    } catch (error) {
      console.error("Sign in error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "github") => {
    setIsLoading(true);
    await signIn(provider, { callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          Bienvenido a Carioca
        </h1>
        
        {/* OAuth Buttons */}
        <div className="space-y-3 mb-6">
          <button
            onClick={() => handleOAuthSignIn("google")}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <img src="/google-icon.svg" alt="Google" className="w-5 h-5" />
            Continuar con Google
          </button>
          
          <button
            onClick={() => handleOAuthSignIn("github")}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <img src="/github-icon.svg" alt="GitHub" className="w-5 h-5" />
            Continuar con GitHub
          </button>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">O continúa con email</span>
          </div>
        </div>

        {/* Email Magic Link */}
        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tu@email.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
          >
            {isLoading ? "Enviando..." : "Enviar link mágico"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Al continuar, aceptas nuestros{" "}
          <a href="/terms" className="text-blue-600 hover:underline">
            Términos de Servicio
          </a>
        </p>
      </div>
    </div>
  );
}
```

### 2. Verificación de Email

```typescript
// src/app/auth/verify-request/page.tsx

export default function VerifyRequestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700">
      <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        
        <h1 className="text-2xl font-bold mb-4 text-gray-800">
          Revisa tu email
        </h1>
        
        <p className="text-gray-600 mb-6">
          Te hemos enviado un link mágico. Haz clic en el link del email para iniciar sesión.
        </p>
        
        <p className="text-sm text-gray-500">
          No encuentras el email? Revisa tu carpeta de spam.
        </p>
      </div>
    </div>
  );
}
```

---

## 🛡️ Protección de Rutas

### 1. Middleware Global

```typescript
// src/middleware.ts

export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/game/:path*",
    "/history",
    "/profile/:path*",
    "/api/game/:path*",
  ]
};
```

### 2. Protección Manual en Páginas

```typescript
// src/app/game/[id]/page.tsx

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function GamePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }

  return (
    <div>
      <p>Jugando como: {session.user.name}</p>
      {/* Componentes del juego */}
    </div>
  );
}
```

### 3. Protección en API Routes

```typescript
// src/app/api/game/create/route.ts

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json(
      { error: "No autenticado" },
      { status: 401 }
    );
  }

  const userId = session.user.id;
  
  // Crear juego usando userId
  const roomId = uuidv4().slice(0, 8);
  
  await prisma.gameSession.create({
    data: {
      id: roomId,
      creatorId: userId, // Ahora usa el user.id real
      // ...
    }
  });

  return NextResponse.json({ roomId });
}
```

---

## 🎣 Hooks del Frontend

### 1. Hook de Sesión

```typescript
// src/hooks/useAuth.ts

"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export function useAuth() {
  const { data: session, status } = useSession();

  return {
    user: session?.user,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
    signIn,
    signOut,
  };
}
```

### 2. Uso en Componentes

```typescript
// src/components/Header.tsx

"use client";

import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const { user, isAuthenticated, signIn, signOut } = useAuth();

  return (
    <header>
      {isAuthenticated ? (
        <div className="flex items-center gap-4">
          <img src={user?.image || "/default-avatar.png"} alt={user?.name} className="w-10 h-10 rounded-full" />
          <span>{user?.name}</span>
          <button onClick={() => signOut()}>Salir</button>
        </div>
      ) : (
        <button onClick={() => signIn()}>Iniciar Sesión</button>
      )}
    </header>
  );
}
```

---

## 🔧 Configuración de Providers OAuth

### Google OAuth

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea un nuevo proyecto
3. Habilita "Google+ API"
4. Ve a "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Tipo: Web application
6. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (desarrollo)
   - `https://tu-dominio.com/api/auth/callback/google` (producción)
7. Copia Client ID y Client Secret a `.env.local`

### GitHub OAuth

1. Ve a [GitHub Settings](https://github.com/settings/developers)
2. "New OAuth App"
3. Configuración:
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Genera Client Secret
5. Copia Client ID y Client Secret a `.env.local`

---

## ✅ Checklist de Implementación

### Instalación
- [ ] Instalar `next-auth@beta`
- [ ] Instalar `@auth/prisma-adapter`
- [ ] Instalar `bcryptjs` y tipos
- [ ] Instalar `nodemailer` y tipos (si usas magic links)

### Base de Datos
- [ ] Actualizar schema de Prisma
- [ ] Ejecutar `npx prisma migrate dev`
- [ ] Verificar tablas: User, Account, Session, VerificationToken

### Configuración
- [ ] Crear `.env.local` con variables
- [ ] Generar `NEXTAUTH_SECRET`
- [ ] Configurar Google OAuth
- [ ] Configurar GitHub OAuth (opcional)
- [ ] Configurar Email server (opcional)

### Código
- [ ] Crear `/api/auth/[...nextauth]/route.ts`
- [ ] Crear tipos de TypeScript
- [ ] Crear página de login
- [ ] Crear middleware de protección
- [ ] Actualizar API routes para requerir auth

### Testing
- [ ] Probar login con Google
- [ ] Probar login con GitHub
- [ ] Probar magic link
- [ ] Probar protección de rutas
- [ ] Probar logout

---

## 🚀 Despliegue

### Variables de Entorno en Producción

```env
# Vercel / Producción
NEXTAUTH_URL=https://tu-dominio.com
NEXTAUTH_SECRET=tu-secret-de-produccion

# Actualizar callback URLs en Google/GitHub
# https://tu-dominio.com/api/auth/callback/google
# https://tu-dominio.com/api/auth/callback/github
```

---

## 📚 Recursos

- [NextAuth.js Docs](https://next-auth.js.org/)
- [Prisma Adapter](https://authjs.dev/reference/adapter/prisma)
- [Google OAuth Setup](https://next-auth.js.org/providers/google)
- [GitHub OAuth Setup](https://next-auth.js.org/providers/github)
- [Email Provider](https://next-auth.js.org/providers/email)

---

## 🎉 Resultado Final

Después de implementar esto, tendrás:

✅ Login con Google  
✅ Login con GitHub  
✅ Login con Magic Links (sin password)  
✅ Sesiones seguras con JWT  
✅ Protección automática de rutas  
✅ Integración completa con Prisma  
✅ Base para agregar estadísticas y ranking  
✅ Usuarios identificables (anti-trampa)