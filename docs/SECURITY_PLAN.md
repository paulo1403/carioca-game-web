# 🔒 Plan de Seguridad y Autenticación - Carioca Game

> **Objetivo:** Implementar un sistema robusto de seguridad para prevenir trampas, proteger el juego y requerir autenticación de usuarios.

---

## 📊 Estado Actual

### ❌ Vulnerabilidades Identificadas

1. **Sin autenticación de usuarios**
   - Cualquiera puede crear partidas sin cuenta
   - No hay persistencia de identidad entre sesiones
   - No hay perfiles de usuario ni estadísticas

2. **Sin validación de sesión**
   - Los `playerId` se pueden falsificar fácilmente
   - No hay tokens de autenticación
   - Cualquier cliente puede enviar requests con cualquier `playerId`

3. **Sin rate limiting**
   - Vulnerable a ataques de spam/DoS
   - Un usuario malicioso podría hacer 1000+ requests/segundo

4. **Validación insuficiente**
   - No se valida integridad completa del estado del juego
   - Posible duplicación de cartas
   - No se registran acciones para auditoría

5. **Race conditions**
   - Múltiples requests simultáneos podrían causar estados inconsistentes
   - No hay locks en operaciones críticas

6. **Bots vulnerables**
   - Un jugador podría controlar bots simulando requests

---

## 🎯 Objetivos del Plan

### Corto Plazo (Crítico)
- ✅ Implementar autenticación obligatoria
- ✅ Sistema de tokens JWT para sesiones de juego
- ✅ Rate limiting básico
- ✅ Validación server-side completa

### Mediano Plazo (Importante)
- ✅ Sistema de logging y auditoría
- ✅ Protección contra race conditions
- ✅ Dashboard de administración
- ✅ Sistema de reportes de trampas

### Largo Plazo (Deseable)
- ✅ Sistema de ranking/ELO
- ✅ Detección automática de patrones sospechosos
- ✅ Replay de partidas para auditoría
- ✅ Sistema de moderación

---

## 🔐 Sistema de Autenticación Recomendado

### Opción 1: **NextAuth.js (Auth.js)** ⭐ RECOMENDADO

**Ventajas:**
- ✅ Gratuito y open source
- ✅ Integración nativa con Next.js
- ✅ Soporte para múltiples providers (Google, GitHub, Discord, Email)
- ✅ Se integra perfectamente con Prisma
- ✅ Session management incluido
- ✅ CSRF protection automático
- ✅ Comunidad muy activa

**Desventajas:**
- ❌ Requiere configuración inicial
- ❌ Debes manejar email sending (para magic links)

**Stack Técnico:**
```
NextAuth.js v5 + Prisma Adapter + Google OAuth + Email Magic Links
```

### Opción 2: **Clerk**

**Ventajas:**
- ✅ Managed service (menos código)
- ✅ UI pre-construida (modals, sign-in forms)
- ✅ Muy fácil de implementar
- ✅ Webhooks para sincronización

**Desventajas:**
- ❌ Servicio de pago ($25/mes después de 10k MAU)
- ❌ Vendor lock-in
- ❌ Menos control sobre el flujo

### Opción 3: **Supabase Auth**

**Ventajas:**
- ✅ Gratuito hasta 50k MAU
- ✅ Auth + Database en uno
- ✅ Row Level Security (RLS)

**Desventajas:**
- ❌ Requiere migrar de PostgreSQL local a Supabase
- ❌ Menor control sobre infraestructura

---

## 📋 Plan de Implementación

### **FASE 1: Autenticación de Usuarios** 🔴 CRÍTICO
**Duración estimada:** 3-4 días

#### 1.1 Configurar NextAuth.js

**Archivos a crear/modificar:**
```
src/
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts          # NextAuth config
│   ├── login/
│   │   └── page.tsx                   # Página de login
│   └── register/
│       └── page.tsx                   # Página de registro
├── lib/
│   └── auth.ts                        # Auth utilities
└── middleware.ts                      # Protected routes
```

**Schema de Prisma actualizado:**
```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  password      String?   // Para email/password
  accounts      Account[]
  sessions      Session[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // Relaciones con el juego
  gameSessions  GameSession[] @relation("CreatedGames")
  players       Player[]
  
  // Estadísticas
  gamesPlayed   Int       @default(0)
  gamesWon      Int       @default(0)
  totalScore    Int       @default(0)
  elo           Int       @default(1200)
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
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model GameSession {
  id           String    @id
  creatorId    String
  creator      User      @relation("CreatedGames", fields: [creatorId], references: [id])
  // ... resto de campos existentes
}

model Player {
  id            String      @id
  userId        String?     // NULL para bots
  user          User?       @relation(fields: [userId], references: [id])
  name          String
  // ... resto de campos existentes
}
```

#### 1.2 Implementar Providers

**Proveedores a soportar:**
1. ✅ **Google OAuth** (más común)
2. ✅ **GitHub OAuth** (para desarrolladores)
3. ✅ **Email Magic Links** (sin password)
4. ⚠️ **Credenciales** (email/password) - Opcional

**Configuración inicial:**
```bash
# Instalar dependencias
npm install next-auth@beta @auth/prisma-adapter
npm install bcryptjs @types/bcryptjs
npm install nodemailer @types/nodemailer

# Variables de entorno necesarias
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=tu-secret-super-seguro-min-32-chars

# Google OAuth
GOOGLE_CLIENT_ID=tu-google-client-id
GOOGLE_CLIENT_SECRET=tu-google-client-secret

# GitHub OAuth
GITHUB_ID=tu-github-id
GITHUB_SECRET=tu-github-secret

# Email (para magic links)
EMAIL_SERVER=smtp://user:pass@smtp.gmail.com:587
EMAIL_FROM=noreply@carioca-game.com
```

#### 1.3 Proteger Rutas

**Middleware para rutas protegidas:**
```typescript
// middleware.ts
export { default } from "next-auth/middleware"

export const config = {
  matcher: [
    "/game/:path*",
    "/history",
    "/profile/:path*",
  ]
}
```

#### 1.4 Actualizar API Endpoints

**Todos los endpoints deben verificar autenticación:**
```typescript
// Ejemplo: src/app/api/game/create/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'No autenticado' },
      { status: 401 }
    );
  }

  const userId = session.user.id;
  // ... resto de lógica usando userId en lugar de generarlo
}
```

---

### **FASE 2: Tokens de Sesión de Juego** 🔴 CRÍTICO
**Duración estimada:** 2 días

#### 2.1 Sistema de Tokens JWT para Partidas

**Propósito:** Un usuario autenticado recibe un token específico para cada partida que puede usar para realizar acciones.

**Flujo:**
```
1. Usuario autenticado crea/se une a partida
2. Backend genera JWT token específico para ese usuario + partida
3. Cliente guarda token y lo envía en cada request de acción
4. Backend valida token antes de procesar acción
```

**Implementación:**
```typescript
// src/lib/gameTokens.ts
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.GAME_TOKEN_SECRET || 'game-token-secret-min-32-chars'
);

export interface GameTokenPayload {
  userId: string;
  playerId: string;
  gameId: string;
  iat: number;
  exp: number;
}

export async function generateGameToken(
  userId: string,
  playerId: string,
  gameId: string
): Promise<string> {
  return await new SignJWT({ userId, playerId, gameId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

export async function verifyGameToken(
  token: string
): Promise<GameTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as GameTokenPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}
```

#### 2.2 Middleware de Validación

```typescript
// src/middleware/validateGameAccess.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyGameToken } from '@/lib/gameTokens';

export async function validateGameAccess(
  req: NextRequest,
  expectedGameId: string,
  expectedPlayerId: string
): Promise<NextResponse | null> {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'No autorizado - Token requerido' },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
  const payload = await verifyGameToken(token);

  if (!payload) {
    return NextResponse.json(
      { error: 'Token inválido o expirado' },
      { status: 401 }
    );
  }

  if (payload.gameId !== expectedGameId) {
    return NextResponse.json(
      { error: 'Token no válido para esta partida' },
      { status: 403 }
    );
  }

  if (payload.playerId !== expectedPlayerId) {
    return NextResponse.json(
      { error: 'Token no válido para este jugador' },
      { status: 403 }
    );
  }

  return null; // Validación exitosa
}
```

#### 2.3 Actualizar Hooks del Frontend

```typescript
// src/hooks/useGameToken.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GameTokenStore {
  tokens: Record<string, string>; // gameId -> token
  setToken: (gameId: string, token: string) => void;
  getToken: (gameId: string) => string | undefined;
  removeToken: (gameId: string) => void;
}

export const useGameTokenStore = create<GameTokenStore>()(
  persist(
    (set, get) => ({
      tokens: {},
      setToken: (gameId, token) =>
        set((state) => ({
          tokens: { ...state.tokens, [gameId]: token },
        })),
      getToken: (gameId) => get().tokens[gameId],
      removeToken: (gameId) =>
        set((state) => {
          const { [gameId]: _, ...rest } = state.tokens;
          return { tokens: rest };
        }),
    }),
    {
      name: 'game-tokens',
    }
  )
);
```

---

### **FASE 3: Rate Limiting** 🟡 IMPORTANTE
**Duración estimada:** 1 día

#### 3.1 Rate Limiter Global

```typescript
// src/lib/rateLimit.ts
import { LRUCache } from 'lru-cache';

type RateLimitOptions = {
  interval: number;
  uniqueTokenPerInterval: number;
};

export function rateLimit(options: RateLimitOptions) {
  const tokenCache = new LRUCache<string, number[]>({
    max: options.uniqueTokenPerInterval || 500,
    ttl: options.interval || 60000,
  });

  return {
    check: (limit: number, token: string): Promise<void> =>
      new Promise((resolve, reject) => {
        const tokenCount = tokenCache.get(token) || [0];
        if (tokenCount[0] === 0) {
          tokenCache.set(token, tokenCount);
        }
        tokenCount[0] += 1;

        const currentUsage = tokenCount[0];
        const isRateLimited = currentUsage >= limit;

        return isRateLimited ? reject() : resolve();
      }),
  };
}

// Limiters específicos
export const apiLimiter = rateLimit({
  interval: 60 * 1000, // 1 minuto
  uniqueTokenPerInterval: 500,
});

export const gameLimiter = rateLimit({
  interval: 10 * 1000, // 10 segundos
  uniqueTokenPerInterval: 1000,
});
```

#### 3.2 Aplicar en Endpoints

```typescript
// src/app/api/game/[id]/move/route.ts
import { gameLimiter } from '@/lib/rateLimit';

export async function POST(request: Request, { params }) {
  const { playerId } = await request.json();
  
  // Rate limit: max 15 acciones por 10 segundos
  try {
    await gameLimiter.check(15, playerId);
  } catch {
    return NextResponse.json(
      { error: 'Demasiadas peticiones. Espera un momento.' },
      { status: 429 }
    );
  }

  // ... resto de lógica
}
```

---

### **FASE 4: Validación Server-Side Completa** 🟡 IMPORTANTE
**Duración estimada:** 2-3 días

#### 4.1 Validador de Juego

```typescript
// src/validators/gameValidators.ts
import { Card, Player, GameState } from '@/types/game';

export class GameValidator {
  /**
   * Valida que una carta sea válida según las reglas
   */
  static isValidCard(card: Card): boolean {
    if (card.suit === 'JOKER') {
      return card.value === 0;
    }
    const validSuits = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];
    return (
      validSuits.includes(card.suit) &&
      card.value >= 1 &&
      card.value <= 13
    );
  }

  /**
   * Valida que no haya cartas duplicadas
   */
  static hasNoDuplicateCards(cards: Card[]): boolean {
    const ids = new Set<string>();
    for (const card of cards) {
      if (ids.has(card.id)) return false;
      ids.add(card.id);
    }
    return true;
  }

  /**
   * Valida que todas las cartas pertenezcan a la mano del jugador
   */
  static allCardsInHand(cards: Card[], hand: Card[]): boolean {
    const handIds = new Set(hand.map(c => c.id));
    return cards.every(c => handIds.has(c.id));
  }

  /**
   * Valida la integridad completa del estado del juego
   */
  static validateGameIntegrity(gameState: GameState): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // 1. Recolectar todas las cartas
    const allCards: Card[] = [
      ...gameState.deck,
      ...gameState.discardPile,
    ];
    
    gameState.players.forEach(p => {
      allCards.push(...p.hand);
      p.melds.forEach(meld => allCards.push(...meld));
    });

    // 2. Verificar unicidad
    if (!this.hasNoDuplicateCards(allCards)) {
      errors.push('Cartas duplicadas detectadas');
    }

    // 3. Verificar cantidad (2 mazos = 108 cartas)
    if (allCards.length !== 108) {
      errors.push(`Total de cartas inválido: ${allCards.length} (esperado: 108)`);
    }

    // 4. Verificar validez de cada carta
    const invalidCards = allCards.filter(c => !this.isValidCard(c));
    if (invalidCards.length > 0) {
      errors.push(`${invalidCards.length} cartas con valores inválidos`);
    }

    // 5. Verificar límites de compras
    gameState.players.forEach(p => {
      if (p.buysUsed > 7) {
        errors.push(`${p.name} excedió límite de compras (${p.buysUsed}/7)`);
      }
    });

    // 6. Verificar que el turno sea válido
    if (gameState.currentTurn < 0 || gameState.currentTurn >= gameState.players.length) {
      errors.push(`Turno inválido: ${gameState.currentTurn}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Valida que un jugador pueda realizar una acción
   */
  static canPlayerAct(
    player: Player,
    gameState: GameState,
    action: string
  ): { valid: boolean; error?: string } {
    const currentPlayer = gameState.players[gameState.currentTurn];
    
    // Solo el jugador actual puede robar o descartar
    if (action === 'DRAW_DECK' || action === 'DISCARD') {
      if (currentPlayer.id !== player.id) {
        return { valid: false, error: 'No es tu turno' };
      }
    }

    // No se puede descartar sin haber robado
    if (action === 'DISCARD' && !player.hasDrawn) {
      return { valid: false, error: 'Debes robar antes de descartar' };
    }

    // No se puede robar dos veces
    if (action === 'DRAW_DECK' && player.hasDrawn) {
      return { valid: false, error: 'Ya robaste en este turno' };
    }

    return { valid: true };
  }
}
```

#### 4.2 Validador de Inputs

```typescript
// src/validators/inputValidators.ts
export class InputValidator {
  static sanitizePlayerName(name: string): string | null {
    if (!name || typeof name !== 'string') return null;
    
    const sanitized = name
      .trim()
      .replace(/[<>\"']/g, '') // Prevenir XSS básico
      .substring(0, 50);

    if (sanitized.length < 2) return null;
    return sanitized;
  }

  static isValidDifficulty(diff: string): boolean {
    return ['EASY', 'MEDIUM', 'HARD'].includes(diff);
  }

  static isValidAction(action: string): boolean {
    const validActions = [
      'DRAW_DECK',
      'DRAW_DISCARD',
      'DOWN',
      'ADD_TO_MELD',
      'STEAL_JOKER',
      'DISCARD',
      'INTEND_BUY',
      'INTEND_DRAW_DISCARD',
    ];
    return validActions.includes(action);
  }

  static isValidCardId(id: string): boolean {
    // Los IDs de cartas deben seguir un formato específico
    return /^[A-Z0-9-]+$/.test(id) && id.length > 0 && id.length < 100;
  }
}
```

---

### **FASE 5: Logging y Auditoría** 🟢 DESEABLE
**Duración estimada:** 2 días

#### 5.1 Schema de Logs

```prisma
model GameLog {
  id            String   @id @default(cuid())
  gameSessionId String
  gameSession   GameSession @relation(fields: [gameSessionId], references: [id], onDelete: Cascade)
  userId        String?
  playerId      String
  action        String
  payload       String   @db.Text
  ipAddress     String?
  userAgent     String?
  success       Boolean
  errorMessage  String?
  timestamp     DateTime @default(now())
  
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
}
```

#### 5.2 Servicio de Auditoría

```typescript
// src/services/auditService.ts
import { prisma } from '@/lib/prisma';

export async function logGameAction(params: {
  gameId: string;
  userId?: string;
  playerId: string;
  action: string;
  payload: any;
  success: boolean;
  errorMessage?: string;
  request?: Request;
}) {
  const ipAddress = params.request?.headers.get('x-forwarded-for') || 
                    params.request?.headers.get('x-real-ip') || 
                    'unknown';
  const userAgent = params.request?.headers.get('user-agent') || 'unknown';

  await prisma.gameLog.create({
    data: {
      gameSessionId: params.gameId,
      userId: params.userId,
      playerId: params.playerId,
      action: params.action,
      payload: JSON.stringify(params.payload),
      success: params.success,
      errorMessage: params.errorMessage,
      ipAddress,
      userAgent,
    },
  });
}

export async function detectSuspiciousActivity(
  gameId: string
): Promise<{
  suspicious: boolean;
  reasons: string[];
}> {
  const reasons: string[] = [];
  
  // Detectar acciones muy rápidas
  const recentActions = await prisma.gameLog.findMany({
    where: {
      gameSessionId: gameId,
      timestamp: {
        gte: new Date(Date.now() - 10000), // Últimos 10 segundos
      },
    },
    orderBy: { timestamp: 'asc' },
  });

  // Agrupar por jugador
  const actionsPerPlayer = recentActions.reduce((acc, log) => {
    acc[log.playerId] = (acc[log.playerId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  for (const [playerId, count] of Object.entries(actionsPerPlayer)) {
    if (count > 20) {
      reasons.push(`Jugador ${playerId}: ${count} acciones en 10s (posible bot)`);
      
      await prisma.suspiciousActivity.create({
        data: {
          playerId,
          gameId,
          reason: `${count} acciones en 10 segundos`,
          severity: 'HIGH',
        },
      });
    }
  }

  // Detectar muchos errores consecutivos
  const recentErrors = recentActions.filter(a => !a.success);
  if (recentErrors.length > 10) {
    reasons.push('Demasiados errores consecutivos (posible exploit attempt)');
  }

  return {
    suspicious: reasons.length > 0,
    reasons,
  };
}

export async function flagSuspiciousPlayer(params: {
  userId?: string;
  playerId: string;
  gameId: string;
  reason: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}) {
  await prisma.suspiciousActivity.create({
    data: {
      userId: params.userId,
      playerId: params.playerId,
      gameId: params.gameId,
      reason: params.reason,
      severity: params.severity,
      autoDetected: false,
    },
  });
}
```

---

### **FASE 6: Protección contra Race Conditions** 🟢 DESEABLE
**Duración estimada:** 1 día

#### 6.1 Sistema de Locks

```typescript
// src/lib/locks.ts
const gameLocks = new Map<string, Promise<any>>();

export async function withGameLock<T>(
  gameId: string,
  fn: () => Promise<T>
): Promise<T> {
  // Esperar a que termine cualquier operación pendiente
  while (gameLocks.has(gameId)) {
    await gameLocks.get(gameId);
  }

  // Adquirir lock
  const promise = fn().finally(() => {
    gameLocks.delete(gameId);
  });

  gameLocks.set(gameId, promise);
  return promise;
}

// Uso en endpoints
export async function processMove(/* ... */) {
  return withGameLock(sessionId, async () => {
    // Toda la lógica aquí está protegida
    // ...
  });
}
```

---

### **FASE 7: Protección de Bots** 🟡 IMPORTANTE
**Duración estimada:** 1 día

#### 7.1 Marcar Acciones de Bots

```typescript
// src/services/gameService.ts

export async function processMove(
  sessionId: string,
  playerId: string,
  action: string,
  payload: any = {},
  _internal = false // Nueva bandera
) {
  // Verificar que los bots solo sean controlados internamente
  const player = await prisma.player.findUnique({
    where: { id: playerId },
  });

  if (player?.isBot && !_internal) {
    return {
      success: false,
      error: 'Acción no permitida para bots',
      status: 403,
    };
  }

  // ... resto de lógica
}

// Solo callable internamente
export async function processBotTurn(
  sessionId: string,
  botId: string
) {
  // ... lógica de bot
  return processMove(sessionId, botId, action, payload, true);
}
```

---

## 🧪 Testing de Seguridad

### Tests a Implementar

```typescript
// tests/security/auth.test.ts
describe('Authentication Security', () => {
  it('should reject unauthenticated game creation', async () => {});
  it('should reject invalid JWT tokens', async () => {});
  it('should reject expired tokens', async () => {});
  it('should reject token for wrong game', async () => {});
});

// tests/security/rateLimit.test.ts
describe('Rate Limiting', () => {
  it('should block after 15 requests in 10s', async () => {});
  it('should allow requests after timeout', async () => {});
});

// tests/security/validation.test.ts
describe('Input Validation', () => {
  it('should reject duplicate card IDs', async () => {});
  it('should reject invalid card values', async () => {});
  it('should reject actions out of turn', async () => {});
  it('should reject bot control from client', async () => {});
});

// tests/security/integrity.test.ts
describe('Game Integrity', () => {
  it('should detect when total cards != 108', async () => {});
  it('should detect duplicate cards', async () => {});
  it('should detect exceeded buy limits', async () => {});
});
```

---

## 📊 Checklist de Implementación

### Fase 1: Autenticación ✅
- [ ] Instalar NextAuth.js y dependencias
- [ ] Actualizar schema de Prisma
- [ ] Configurar Google OAuth
- [ ] Configurar GitHub OAuth
- [ ] Implementar Email Magic Links
- [ ] Crear páginas de login/register
- [ ] Proteger rutas con middleware
- [ ] Actualizar todos los endpoints para requerir auth
- [ ] Migrar `creatorId` y `playerId` a usar IDs de usuario

### Fase 2: Tokens de Juego ✅
- [ ] Implementar generación de JWT para partidas
- [ ] Implementar verificación de JWT
- [ ] Crear middleware de validación
- [ ] Actualizar hooks del frontend para usar tokens
- [ ] Modificar todos los endpoints para validar tokens

### Fase 3: Rate Limiting ✅
- [ ] Implementar rate limiter
- [ ] Aplicar a endpoints de creación
- [ ] Aplicar a endpoints de acciones
- [ ] Aplicar a endpoints de lobby
- [ ] Añadir respuestas 429 apropiadas

### Fase 4: Validación ✅
- [ ] Crear GameValidator
- [ ] Crear InputValidator
- [ ] Aplicar validación en processMove
- [ ] Aplicar validación en DOWN action
- [ ] Aplicar validación en ADD_TO_MELD
- [ ] Aplicar validación en DISCARD
- [ ] Añadir verificación de integridad periódica

### Fase 5: Auditoría ✅
- [ ] Actualizar schema con GameLog
- [ ] Actualizar schema con SuspiciousActivity
- [ ]