# 📋 Plan de Actualización: "Carioca Pro Update"

Este documento resume todas las mejoras, correcciones y nuevas funcionalidades planificadas para la próxima versión del juego. El objetivo es mejorar la estabilidad, la fluidez y la experiencia sensorial.

---

## � Correcciones de Lógica y Bugs
- [x] **Sincronización de Contratos (Rondas):** 
    - Alinear las definiciones de rondas entre el frontend (`rules.ts`) y el backend (`gameService.ts`).
    - Corregir error donde no aparece el botón de "Bajarse" en las rondas de Escala (como la ronda de Escala de 7).
- [x] **Intercambio de Joker Pro:** 
    - Corregir validación para que permita robar el Joker con **exactamente 1 carta** requerida.
    - Eliminar el paso manual: al robar el Joker, la carta del jugador debe reemplazarlo automáticamente en el juego de mesa.
- [x] **Rotación de Turnos Realista:** 
    - Implementar la lógica de inicio de ronda: el turno inicial debe rotar hacia el jugador a la derecha de quien inició la ronda pasada.
    - Se ha ajustado toda la lógica de juego para rotar a la derecha (sentido antihorario), siendo consistente con el estilo realista de Carioca.

## 🤖 Optimización de Inteligencia Artificial (Bots)
- [x] **Mecanismo Anti-Bloqueo (Watchdog):**
    - Implementar un temporizador de seguridad de **10 segundos**.
    - Si un bot no realiza una acción en ese tiempo, el sistema forzará una jugada válida (robar + descartar la carta de mayor valor) para que el juego nunca se detenga.

## 🔊 Experiencia de Usuario y Sonido
- [x] **Alerta de Turno Humano:** 
    - Añadir un sonido distintivo (ej: "Sharp Echo") que se reproduzca **únicamente** cuando el turno pase a un jugador humano.
- [x] **Gestión Visual de la Mano:** 
    - Las nuevas cartas robadas se colocarán a la **derecha** de la mano actual para que el usuario sepa siempre qué acaba de recibir.
    - Se ha añadido un borde verde (emerald) para resaltar las cartas nuevas.
- [x] **Privacidad de Puntajes:** 
    - Ocultar el puntaje total acumulado de los oponentes durante la ronda para aumentar el suspenso. Solo se mostrará la cantidad de cartas y las compras realizadas.
- [x] **Control de Compras Dinámico:** 
    - Deshabilitar visualmente el botón de "Comprar" una vez que el jugador de turno ha realizado su robo reglamentario.

## 📊 Post-Juego y Estadísticas
- [x] **Tabla de Resultados Detallada:** 
    - Al finalizar la partida, mostrar una tabla con el desglose de puntos de cada jugador en cada una de las 8 rondas, junto a la sumatoria final.
- [x] **Gestión de Identidad:** 
    - Permitir a los jugadores cambiar su nombre predeterminado ("Jugador Invitado") antes de iniciar o durante la sesión online.
- [x] **Historial y Novedades:**
    - Se agregó un botón de "Novedades" (Sparkles) en la pantalla principal para informar a los usuarios sobre las últimas mejoras y correcciones.

## � Estándares Técnicos
- **Estado Asíncrono:** Uso extensivo de **React Query** para la tabla de resultados y sincronización de datos.
- **Arquitectura Limpia:** Lógica extraída en `hooks` y `utils`. 
- **Código Limpio:** Comentarios concisos y útiles, priorizando la legibilidad del código.

---
*Este plan está sujeto a ajustes según las pruebas de usuario.*
