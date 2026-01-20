# 🗺️ Roadmap de Implementación - Sistema de Seguridad y Autenticación

> **Proyecto:** Carioca Game Web  
> **Objetivo:** Implementar autenticación obligatoria y sistema de seguridad completo  
> **Duración estimada:** 2-3 semanas

---

## 📅 Timeline General

```
Semana 1: Autenticación + Tokens
├── Días 1-3: Setup NextAuth.js
├── Días 4-5: Tokens de juego (JWT)
└── Día 6-7: Testing y ajustes

Semana 2: Validación + Seguridad
├── Días 1-2: Rate Limiting
├── Días 3-4: Validadores completos
└── Días 5-7: Logging y auditoría

Semana 3: Refinamiento + Testing
├── Días 1-2: Race condition protection
├── Días 3-4: Tests de seguridad
└── Días 5-7: Bug fixes y optimización
```

---

## 🎯 Prioridades

### 🔴 CRÍTICO (Debe hacerse primero)
1. **Autenticación de usuarios** - Sin esto, todo lo demás no tiene sentido
2. **Tokens de sesión de juego** - Prevenir suplantación de identidad
3. **Rate Limiting básico** - Prevenir ataques DoS simples
4. **Validación server-side completa** - Prevenir trampas básicas

### 🟡 IMPORTANTE (Hacer después de crítico)
5. **Sistema de logging** - Auditoría y detección de trampas
6. **Protección contra race conditions** - Evitar bugs de concurrencia
7. **Validación de integridad del juego** - Detectar estados imposibles
8. **Protección de bots** - Evitar control externo de bots

### 🟢 DESEABLE (Bueno tener)
9. **Dashboard de administración** - Monitoreo y moderación
10. **Sistema de reportes** - Los usuarios pueden reportar trampas
11. **Detección automática de patrones** - ML para detectar tramposos
12. **Sistema de ELO/Ranking** - Competitivo y motivante

---

## 📋 FASE 1: Autenticación (Días 1-3)

### Día 1: Setup Inicial
**Duración:** 4-6 horas

#### Tareas
- [x] Leer documentación completa
- [ ] Instalar dependencias
  ```bash
  npm install next-auth@beta @auth/prisma-adapter bcryptjs nodemailer
  npm install -D @types/bcryptjs @types/nodemailer
  ```
- [ ] Generar `NEXTAUTH_SECRET`
  ```bash
  openssl rand -base64 32
  ```
- [ ] Actualizar `.env.local` con variables
- [ ] Actualizar `prisma/schema.prisma`
- [ ] Ejecutar migración
  ```bash
  npx prisma migrate dev --name add_authentication
  npx prisma generate
  ```

#### Archivos a crear/modificar
```
prisma/schema.prisma                    ← Actualizar
.env.local                              ← Actualizar
src/types/next-auth.d.ts               ← Crear
src/app/api/auth/[...nextauth]/route.ts ← Crear
```

#### Criterios de éxito
- ✅ Base de datos migrada sin errores
- ✅ Tablas User, Account, Session creadas
- ✅ Variables de entorno configuradas

---

### Día 2: Configurar Providers OAuth
**Duración:** 4-6 horas

#### Tareas
- [ ] Crear proyecto en Google Cloud Console
- [ ] Configurar OAuth consent screen
- [ ] Crear credenciales OAuth 2.0
- [ ] Configurar redirect URIs
- [ ] Repetir para GitHub OAuth
- [ ] Implementar configuración NextAuth.js
- [ ] Probar login con Google
- [ ] Probar login con GitHub

#### Archivos a crear
```
src/app/api/auth/[...nextauth]/route.ts ← Implementar
```

#### Criterios de éxito
- ✅ Login con Google funciona
- ✅ Login con GitHub funciona
- ✅ Usuario se crea en base de datos
- ✅ Session se mantiene después de refresh

---

### Día 3: UI de Autenticación
**Duración:** 4-6 horas

#### Tareas
- [ ] Crear página de login (`/login`)
- [ ] Crear página de verificación email
- [ ] Crear componente Header con avatar
- [ ] Implementar `useAuth` hook
- [ ] Configurar middleware de protección
- [ ] Probar flujo completo
- [ ] Styling y UX polish

#### Archivos a crear
```
src/app/login/page.tsx                  ← Crear
src/app/auth/verify-request/page.tsx    ← Crear
src/hooks/useAuth.ts                    ← Crear
src/middleware.ts                       ← Crear
src/components/Header.tsx               ← Actualizar
```

#### Criterios de éxito
- ✅ UI de login atractiva
- ✅ Redirect automático a login si no autenticado
- ✅ Redirect a home después de login
- ✅ Header muestra info del usuario
- ✅ Logout funciona correctamente

---

## 📋 FASE 2: Integración con el Juego (Días 4-5)

### Día 4: Migrar Endpoints
**Duración:** 6-8 horas

#### Tareas
- [ ] Actualizar `/api/game/create` para usar `session.user.id`
- [ ] Actualizar `/api/game/[id]/join` para validar sesión
- [ ] Actualizar `/api/game/[id]/move` para validar sesión
- [ ] Actualizar modelo `GameSession` para relacionar con `User`
- [ ] Actualizar modelo `Player` para relacionar con `User`
- [ ] Migrar datos existentes (si hay)
- [ ] Probar creación de juego
- [ ] Probar unirse a juego

#### Archivos a modificar
```
src/app/api/game/create/route.ts        ← Actualizar
src/app/api/game/[id]/join/route.ts     ← Actualizar
src/app/api/game/[id]/move/route.ts     ← Actualizar
src/app/api/game/[id]/start/route.ts    ← Actualizar
src/app/api/game/[id]/leave/route.ts    ← Actualizar
src/app/api/game/[id]/add-bot/route.ts  ← Actualizar
```

#### Criterios de éxito
- ✅ Solo usuarios autenticados pueden crear juegos
- ✅ `creatorId` apunta a `User.id` real
- ✅ Jugadores humanos tienen `userId` no nulo
- ✅ Bots tienen `userId` nulo
- ✅ No se pueden hacer requests sin autenticación

---

### Día 5: Tokens de Juego (JWT)
**Duración:** 4-6 horas

#### Tareas
- [ ] Implementar `generateGameToken`
- [ ] Implementar `verifyGameToken`
- [ ] Crear middleware `validateGameAccess`
- [ ] Modificar `/api/game/[id]/join` para devolver token
- [ ] Modificar `/api/game/create` para devolver token
- [ ] Actualizar hooks del frontend para guardar tokens
- [ ] Modificar todos los endpoints de acción para validar token
- [ ] Probar flujo completo con tokens

#### Archivos a crear/modificar
```
src/lib/gameTokens.ts                   ← Crear
src/middleware/validateGameAccess.ts    ← Crear
src/hooks/useGameToken.ts               ← Crear
src/hooks/game/useGameActions.ts        ← Actualizar
src/hooks/game/useGameLobby.ts          ← Actualizar
```

#### Criterios de éxito
- ✅ Token JWT se genera al crear/unirse a juego
- ✅ Token se valida en cada acción
- ✅ Token inválido retorna 401
- ✅ Token de otro juego retorna 403
- ✅ Frontend guarda y envía token correctamente

---

## 📋 FASE 3: Rate Limiting (Días 6-7)

### Día 6: Implementar Rate Limiter
**Duración:** 3-4 horas

#### Tareas
- [ ] Instalar `lru-cache`
  ```bash
  npm install lru-cache
  ```
- [ ] Implementar `rateLimit` utility
- [ ] Crear `apiLimiter` global
- [ ] Crear `gameLimiter` para acciones
- [ ] Aplicar a endpoints críticos
- [ ] Configurar límites apropiados
- [ ] Probar con requests rápidos

#### Archivos a crear/modificar
```
src/lib/rateLimit.ts                    ← Crear
src/app/api/game/[id]/move/route.ts     ← Actualizar
src/app/api/game/create/route.ts        ← Actualizar
```

#### Criterios de éxito
- ✅ Rate limiter funciona correctamente
- ✅ Retorna 429 después de límite
- ✅ Límite se resetea después del intervalo
- ✅ Frontend muestra mensaje apropiado

---

### Día 7: Testing y Refinamiento
**Duración:** 4-6 horas

#### Tareas
- [ ] Escribir tests para autenticación
- [ ] Escribir tests para tokens
- [ ] Escribir tests para rate limiting
- [ ] Probar flujo completo end-to-end
- [ ] Detectar y arreglar bugs
- [ ] Documentar cambios
- [ ] Code review

#### Archivos a crear
```
tests/auth/login.test.ts                ← Crear
tests/auth/tokens.test.ts               ← Crear
tests/security/rateLimit.test.ts        ← Crear
```

#### Criterios de éxito
- ✅ Tests pasan
- ✅ No hay regresiones
- ✅ Flujo completo funciona sin errores
- ✅ Documentación actualizada

---

## 📋 FASE 4: Validación Server-Side (Días 8-10)

### Día 8-9: Validadores
**Duración:** 8-10 horas

#### Tareas
- [ ] Crear `GameValidator` class
- [ ] Implementar `isValidCard`
- [ ] Implementar `hasNoDuplicateCards`
- [ ] Implementar `allCardsInHand`
- [ ] Implementar `validateGameIntegrity`
- [ ] Implementar `canPlayerAct`
- [ ] Crear `InputValidator` class
- [ ] Aplicar validaciones a `processMove`
- [ ] Aplicar validaciones a todas las acciones
- [ ] Probar con inputs maliciosos

#### Archivos a crear/modificar
```
src/validators/gameValidators.ts        ← Crear
src/validators/inputValidators.ts       ← Crear
src/services/gameService.ts             ← Actualizar
```

#### Criterios de éxito
- ✅ Se detectan cartas duplicadas
- ✅ Se rechazan cartas inválidas
- ✅ Se valida que cartas estén en mano
- ✅ Se detectan estados imposibles
- ✅ Integridad se verifica periódicamente

---

### Día 10: Protección de Bots
**Duración:** 3-4 horas

#### Tareas
- [ ] Modificar `processMove` para rechazar requests de bots
- [ ] Añadir flag `_internal` a acciones de bots
- [ ] Validar que bots solo actúen desde `checkAndProcessBotTurns`
- [ ] Probar que no se puedan controlar bots desde cliente
- [ ] Añadir logging de intentos sospechosos

#### Archivos a modificar
```
src/services/gameService.ts             ← Actualizar
```

#### Criterios de éxito
- ✅ Requests de cliente con `playerId` de bot fallan
- ✅ Bots solo actúan desde servidor
- ✅ Intentos se registran en logs

---

## 📋 FASE 5: Logging y Auditoría (Días 11-13)

### Día 11: Schema y Servicio
**Duración:** 4-6 horas

#### Tareas
- [ ] Actualizar schema con `GameLog`
- [ ] Actualizar schema con `SuspiciousActivity`
- [ ] Ejecutar migración
- [ ] Implementar `logGameAction`
- [ ] Implementar `detectSuspiciousActivity`
- [ ] Implementar `flagSuspiciousPlayer`
- [ ] Probar logging

#### Archivos a crear/modificar
```
prisma/schema.prisma                    ← Actualizar
src/services/auditService.ts            ← Crear
```

#### Criterios de éxito
- ✅ Logs se guardan en base de datos
- ✅ Include IP y User Agent
- ✅ Timestamping correcto

---

### Día 12: Integración de Logging
**Duración:** 4-6 horas

#### Tareas
- [ ] Añadir logging a `/api/game/[id]/move`
- [ ] Añadir logging a todas las acciones
- [ ] Implementar detección automática de actividad sospechosa
- [ ] Crear endpoint `/api/admin/suspicious` (opcional)
- [ ] Probar con tráfico normal
- [ ] Probar con tráfico sospechoso

#### Archivos a modificar
```
src/app/api/game/[id]/move/route.ts     ← Actualizar
src/app/api/admin/suspicious/route.ts   ← Crear (opcional)
```

#### Criterios de éxito
- ✅ Todas las acciones se registran
- ✅ Actividad sospechosa se detecta
- ✅ Performance no se degrada

---

### Día 13: Dashboard (Opcional)
**Duración:** 6-8 horas

#### Tareas
- [ ] Crear página `/admin`
- [ ] Mostrar actividad sospechosa
- [ ] Mostrar logs recientes
- [ ] Implementar búsqueda de logs
- [ ] Implementar revisión de reportes
- [ ] Proteger con rol de admin

#### Archivos a crear
```
src/app/admin/page.tsx                  ← Crear
src/app/api/admin/logs/route.ts         ← Crear
```

#### Criterios de éxito
- ✅ Dashboard funcional
- ✅ Solo admins pueden acceder
- ✅ Información útil y clara

---

## 📋 FASE 6: Race Conditions y Refinamiento (Días 14-17)

### Día 14: Sistema de Locks
**Duración:** 3-4 horas

#### Tareas
- [ ] Implementar `withGameLock`
- [ ] Aplicar a `processMove`
- [ ] Aplicar a acciones críticas
- [ ] Probar con requests concurrentes
- [ ] Medir impact en performance

#### Archivos a crear/modificar
```
src/lib/locks.ts                        ← Crear
src/services/gameService.ts             ← Actualizar
```

#### Criterios de éxito
- ✅ No hay race conditions
- ✅ Estado del juego siempre consistente
- ✅ Performance aceptable

---

### Día 15-16: Tests Completos
**Duración:** 8-12 horas

#### Tareas
- [ ] Tests de autenticación
- [ ] Tests de autorización
- [ ] Tests de rate limiting
- [ ] Tests de validación
- [ ] Tests de integridad
- [ ] Tests de logging
- [ ] Tests de concurrencia
- [ ] Tests end-to-end

#### Archivos a crear
```
tests/security/auth.test.ts
tests/security/validation.test.ts
tests/security/integrity.test.ts
tests/security/rateLimit.test.ts
tests/e2e/gameplay.test.ts
```

#### Criterios de éxito
- ✅ Coverage > 80%
- ✅ Todos los tests pasan
- ✅ Edge cases cubiertos

---

### Día 17: Bug Fixes y Optimización
**Duración:** 6-8 horas

#### Tareas
- [ ] Revisar todos los TODOs
- [ ] Arreglar bugs encontrados
- [ ] Optimizar queries lentas
- [ ] Optimizar caching
- [ ] Code cleanup
- [ ] Documentación final
- [ ] Preparar para deploy

#### Criterios de éxito
- ✅ No hay bugs críticos
- ✅ Performance aceptable
- ✅ Código limpio y documentado

---

## 🎯 Métricas de Éxito

### Seguridad
- [ ] 100% de endpoints requieren autenticación
- [ ] 0 requests sin validar
- [ ] Rate limiting en todos los endpoints públicos
- [ ] Todas las acciones validadas server-side
- [ ] Logs de todas las acciones críticas

### Performance
- [ ] Tiempo de respuesta < 200ms (p95)
- [ ] No más de 10ms overhead por validaciones
- [ ] Logging asíncrono (no bloquea requests)
- [ ] Rate limiter < 1ms overhead

### Confiabilidad
- [ ] No hay race conditions
- [ ] Estado del juego siempre consistente
- [ ] Rollback automático en errores
- [ ] Tests coverage > 80%

---

## 🚀 Deploy Checklist

### Pre-Deploy
- [ ] Todos los tests pasan
- [ ] No hay warnings críticos
- [ ] Variables de entorno documentadas
- [ ] Migraciones de base de datos listas
- [ ] Backup de base de datos

### Deploy
- [ ] Ejecutar migraciones
- [ ] Configurar variables de entorno producción
- [ ] Actualizar callback URLs (Google/GitHub)
- [ ] Deploy a staging
- [ ] Smoke tests en staging
- [ ] Deploy a producción

### Post-Deploy
- [ ] Monitorear logs
- [ ] Verificar rate limiting
- [ ] Probar login con OAuth
- [ ] Probar flujo completo
- [ ] Monitorear performance

---

## 📚 Recursos y Referencias

- [SECURITY_PLAN.md](./SECURITY_PLAN.md) - Plan detallado de seguridad
- [AUTH_IMPLEMENTATION.md](./AUTH_IMPLEMENTATION.md) - Guía de autenticación
- [NextAuth.js Docs](https://next-auth.js.org/)
- [Prisma Security Best Practices](https://www.prisma.io/docs/guides/security)

---

## 🤝 Equipo y Responsabilidades

### Backend Developer
- Implementar autenticación
- Implementar validadores
- Implementar rate limiting
- Escribir tests

### Frontend Developer
- UI de login
- Integrar hooks de auth
- Actualizar componentes
- UX de errores

### DevOps
- Configurar OAuth providers
- Setup variables de entorno
- Deploy y migraciones
- Monitoreo

---

## ✅ Status Tracker

| Fase | Progreso | Status | Duración Real |
|------|----------|--------|---------------|
| 1. Autenticación | 0% | ⏳ Pendiente | - |
| 2. Integración | 0% | ⏳ Pendiente | - |
| 3. Rate Limiting | 0% | ⏳ Pendiente | - |
| 4. Validación | 0% | ⏳ Pendiente | - |
| 5. Logging | 0% | ⏳ Pendiente | - |
| 6. Refinamiento | 0% | ⏳ Pendiente | - |

**Progreso total:** 0% ⏳

---

**Última actualización:** 2024-01-XX  
**Próxima revisión:** Después de cada fase