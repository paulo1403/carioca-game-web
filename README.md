# 🃏 Carioca Game Web

Juego de cartas Carioca multijugador en tiempo real construido con Next.js 15, React 19 y TypeScript.

## 🔒 Seguridad y Autenticación

Este proyecto está en proceso de implementar un sistema robusto de seguridad y autenticación. Consulta la documentación detallada:

- 📊 **[Resumen Ejecutivo](./docs/EXECUTIVE_SUMMARY.md)** - Visión general y justificación
- 🔐 **[Plan de Seguridad](./docs/SECURITY_PLAN.md)** - Plan completo de seguridad y prevención de trampas
- 🔑 **[Implementación de Autenticación](./docs/AUTH_IMPLEMENTATION.md)** - Guía paso a paso de NextAuth.js
- 🗺️ **[Roadmap](./docs/ROADMAP.md)** - Timeline detallado día a día

### Próximas Mejoras de Seguridad

- ✅ Autenticación obligatoria con NextAuth.js (Google, GitHub, Magic Links)
- ✅ Sistema de tokens JWT para sesiones de juego
- ✅ Rate limiting para prevenir ataques DoS
- ✅ Validación server-side completa (anti-trampa)
- ✅ Sistema de logging y auditoría
- ✅ Protección contra race conditions
- ✅ Detección automática de actividad sospechosa

## 🚀 Características

- 🎮 Juego multijugador en tiempo real (3-5 jugadores)
- 🤖 Bots con 3 niveles de dificultad (Fácil, Medio, Difícil)
- 📱 Diseño responsive optimizado para móvil y desktop
- 🎨 Sistema de colores unificado con tema oscuro
- ⚡ Optimizado con React Query para mínimo uso de red
- 🔄 Polling adaptativo según estado del juego
- 📊 Historial de partidas
- 🎯 Touch targets optimizados para móviles (≥44px)

## 🛠️ Stack Tecnológico

- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, Tailwind CSS 4
- **Base de datos**: PostgreSQL con Prisma
- **Estado**: React Query (TanStack Query)
- **TypeScript**: 5.x
- **Sonidos**: use-sound

## 🛠️ Guía de Despliegue y Configuración

### 💻 Ambiente Local (Desde Cero)

Sigue estos pasos para configurar el proyecto en tu máquina local por primera vez.

**Prerrequisitos:**
- [Node.js](https://nodejs.org/) (v18 o superior)
- [PostgreSQL](https://www.postgresql.org/) (Instalado y corriendo)
- Git

**Pasos:**

1.  **Clonar el repositorio**
    ```bash
    git clone <repository-url>
    cd carioca-game-web
    ```

2.  **Instalar dependencias**
    ```bash
    npm install
    ```

3.  **Configurar Variables de Entorno**
    Crea un archivo `.env` basado en el ejemplo:
    ```bash
    cp .env.example .env
    ```
    Abre el archivo `.env` y configura tu conexión a la base de datos:
    ```env
    DATABASE_URL="postgresql://usuario:password@localhost:5432/carioca_game?schema=public"
    ```

4.  **Configurar Base de Datos**
    Ejecuta las migraciones para crear las tablas:
    ```bash
    npm run db:migrate
    ```

5.  **Iniciar Servidor de Desarrollo**
    ```bash
    npm run dev
    ```
    El juego estará disponible en [http://localhost:3000](http://localhost:3000).

### 🚀 Ambiente QAS / Producción (Vercel)

Despliegue recomendado usando [Vercel](https://vercel.com) con Supabase.

**1. Configuración de Variables en Vercel**
Ve a tu proyecto en Vercel > Settings > Environment Variables y agrega las siguientes:

| Variable | Descripción | Valor / Origen |
|:---|:---|:---|
| `DATABASE_URL` | Conexión (Pooler) | Supabase > Settings > Database > Connection Pooling (Transaction) |
| `DIRECT_URL` | Conexión Directa | Supabase > Settings > Database > Direct connection |
| `NEXT_PUBLIC_SUPABASE_URL` | URL de la API | Supabase > Settings > API > Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Llave Pública | Supabase > Settings > API > anon / public |
| `AUTH_SECRET` | Llave secreta Auth | Generar con `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | Confianza en host | `true` (necesario para Vercel) |

**Nota**: Asegúrate de reemplazar `[YOUR-PASSWORD]` por tu contraseña real de Supabase en `DATABASE_URL` y `DIRECT_URL`.

**2. Despliegue**
Conecta tu repositorio de GitHub a Vercel. Vercel detectará automáticamente que es un proyecto Next.js.
- **Build Command**: `next build` (default)
- **Install Command**: `npm install` o `pnpm install` (default)
- **Output Directory**: `.next` (default)

Al hacer push a `main`, Vercel iniciará el despliegue automáticamente.

**3. Migraciones de Base de Datos**
Vercel no ejecuta migraciones automáticamente. Puedes hacerlo desde tu local conectándote a la DB de producción o agregar un paso en el build (no recomendado para producción crítica, pero útil en hobby).

Para correr migraciones manualmente desde tu PC a la DB de Supabase:
```bash
# Asegúrate de tener las credenciales de Supabase en tu .env local
npx prisma migrate deploy
```

## 🎮 Cómo Jugar

1. **Crear Sala**: Crea una nueva sala desde la página principal
2. **Invitar Jugadores**: Comparte el código de sala o el QR code
3. **Añadir Bots** (opcional): Añade bots para completar jugadores
4. **Iniciar Partida**: Se requieren mínimo 3 jugadores
5. **Jugar**: Sigue las reglas de Carioca para completar las 7 rondas

### Reglas Básicas

- **Objetivo**: Completar los contratos de cada ronda y tener la menor puntuación
- **Compras**: Máximo 7 compras por partida
- **Jokers**: Pueden sustituir cualquier carta (robables si tienes la carta real)
- **7 Rondas** con contratos progresivamente más difíciles

## 📁 Estructura del Proyecto

```
carioca-game-web/
├── src/
│   ├── app/                    # App Router de Next.js
│   │   ├── api/               # API Routes
│   │   ├── game/[id]/         # Página de juego
│   │   └── history/           # Historial de partidas
│   ├── components/            # Componentes React
│   │   ├── GameRoom/          # Componentes de sala de juego
│   │   │   ├── index.tsx      # Orquestador principal
│   │   │   ├── GameLobby.tsx  # Sala de espera (WAITING)
│   │   │   └── GameBoard.tsx  # Tablero de juego (PLAYING)
│   │   ├── Card.tsx           # Componente de carta
│   │   ├── Board.tsx          # Tablero principal
│   │   └── ...                # Otros componentes
│   ├── hooks/                 # Custom hooks
│   │   ├── game/              # Hooks de lógica de juego
│   │   │   ├── useGameState.ts    # Estado del juego con React Query
│   │   │   └── useGameActions.ts  # Acciones del juego
│   │   └── ...
│   ├── services/              # Lógica de negocio
│   │   └── gameService.ts     # Servicio principal del juego
│   └── types/                 # Tipos TypeScript
├── prisma/                    # Esquema y migraciones de DB
└── public/                    # Assets estáticos
```

## 🎨 Cambios Recientes

### ✅ Optimización de Requests (~70% reducción)

- **Eliminado polling duplicado**: Migración completa a React Query
- **Polling adaptativo**:
  - Sala de espera: cada 8 segundos (~7.5 req/min)
  - Jugando: cada 3 segundos (~20 req/min)
  - Juego terminado: 0 requests
- **Antes**: ~24-60 requests/min → **Después**: ~7.5-20 requests/min

### 🎯 UI Mejorada

- **Cartas responsive**: Tamaños optimizados para touch (80x112px en móvil)
- **Layout móvil**: Grid 2x2 para 5 jugadores, mejor uso del espacio
- **Barra flotante**: Estado persistente al terminar ronda
- **Botón "Continuar"**: Ahora marca automáticamente como listo

### 🏗️ Refactoring

- **GameRoom** dividido en 3 componentes (GameLobby, GameBoard, index)
- Sistema de colores unificado con CSS variables
- Mejor organización y mantenibilidad

## 🚀 Scripts Disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm start            # Iniciar servidor de producción
npm run lint         # Ejecutar ESLint
npm run format       # Formatear código con Prettier
```

## 📖 Documentación

### Para Usuarios
- [Cómo Jugar](#-cómo-jugar) - Reglas básicas del juego
- [Guía de Despliegue](#-guía-de-despliegue-y-configuración) - Setup del proyecto

### Para Desarrolladores
- [Estructura del Proyecto](#-estructura-del-proyecto) - Organización del código
- [Scripts Disponibles](#-scripts-disponibles) - Comandos útiles
- [Performance](#-performance) - Métricas y optimización
- **[Auditoría React Query](./REACT_QUERY_AUDIT.md)** - Migración completa a React Query

### Seguridad
- **[Resumen Ejecutivo](./docs/EXECUTIVE_SUMMARY.md)** - ROI y justificación
- **[Plan de Seguridad](./docs/SECURITY_PLAN.md)** - Implementación completa
- **[Autenticación](./docs/AUTH_IMPLEMENTATION.md)** - NextAuth.js setup
- **[Roadmap](./docs/ROADMAP.md)** - Timeline de implementación

## 🔧 Configuración de Base de Datos

```bash
# Crear migración
npx prisma migrate dev --name nombre_migracion

# Sincronizar schema sin migración
npx prisma db push

# Abrir Prisma Studio
npx prisma studio

# Generar cliente de Prisma
npx prisma generate
```

## 📱 Responsive Design

- **Mobile**: ≥320px (iPhone SE)
- **Tablet**: ≥768px
- **Desktop**: ≥1024px

Características móviles:
- Touch targets ≥44px (estándar iOS/Android)
- Cards 25% más grandes en móvil
- Safe areas para iPhone con notch
- Grid layout optimizado para 5 jugadores

## 🐛 Debugging

### React Query DevTools

En modo desarrollo, accede a las DevTools en la esquina inferior izquierda para:
- Ver queries activas
- Verificar intervalos de refetch
- Inspeccionar cache
- Debug de mutaciones

### Network Monitoring

Verifica los requests en DevTools del navegador:
- Filtrar por "state" para ver polling
- Debería haber ~1 request cada 3-8 segundos
- Sin requests duplicados

## 📈 Performance

- **Build time**: ~3-4 segundos
- **Initial load**: Optimizado con Next.js App Router
- **Code splitting**: Automático por ruta
- **Caching**: React Query con staleTime de 1s

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 🔐 Estado de Seguridad

| Aspecto | Estado | Próximo |
|---------|--------|---------|
| Autenticación | ⏳ Planificado | NextAuth.js |
| Autorización | ⏳ Planificado | JWT Tokens |
| Rate Limiting | ⏳ Planificado | LRU Cache |
| Validación | ⚠️ Parcial | Validadores completos |
| Logging | ❌ No implementado | Auditoría completa |
| Anti-trampa | ⚠️ Básico | Validación server-side |

**Consulta [SECURITY_PLAN.md](./docs/SECURITY_PLAN.md) para más detalles.**

## 👤 Autor

Paulo - [GitHub Profile](https://github.com/paulo1403)

## 🙏 Agradecimientos

- Inspirado en el juego tradicional de cartas Carioca
- Iconos de [Lucide React](https://lucide.dev)
- Sonidos de [use-sound](https://github.com/joshwcomeau/use-sound)

---

**¡Disfruta jugando Carioca! 🎉🃏**
