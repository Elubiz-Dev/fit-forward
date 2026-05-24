# 📱 FitGO - Documentación Técnica y Funcional

**FitGO** es una aplicación móvil avanzada de salud, nutrición y fitness diseñada para ofrecer una experiencia premium. Combina el registro de macros y entrenamientos con Inteligencia Artificial y un sistema de gamificación social altamente adictivo.

---

## 🛠️ 1. Stack Tecnológico (Tech Stack)

*   **Framework Principal:** React Native con **Expo** (SDK 50+).
*   **Lenguaje:** TypeScript (Tipado estricto).
*   **Enrutamiento:** Expo Router (Navegación basada en archivos).
*   **Gestión del Estado:** Zustand (Múltiples stores persistentes con AsyncStorage).
*   **Backend / Base de Datos:** Supabase (PostgreSQL, Autenticación, Storage, Funciones RPC).
*   **Estilos y UI:** React Native StyleSheet, Expo Linear Gradient, Expo Blur, animaciones fluidas con **React Native Reanimated**.
*   **Inteligencia Artificial:** GROQ API (Llama3/Mixtral) para asistentes virtuales rápidos.
*   **Monetización:** RevenueCat (Suscripciones In-App).

---

## 🏗️ 2. Arquitectura de Estado (Zustand Stores)

Toda la lógica de negocio y caché local se maneja mediante módulos separados en `store/`:

1.  **`authStore.ts`**: Maneja la sesión de Supabase, la información básica del usuario, cálculos de TDEE y configuración de macros objetivo.
2.  **`nutritionStore.ts`**: El núcleo del registro diario. Guarda logs de comida, agua, sueño y métricas. Sincroniza en background con la tabla `daily_metrics`.
3.  **`leagueStore.ts`**: Maneja el sistema de gamificación ("Ligas FitGO"). Almacena el *Squad* actual del usuario, puntos y rankings.
4.  **`socialStore.ts`**: Maneja la interacción entre usuarios, sistema de seguidores, y chats uno-a-uno.
5.  **`settingsStore.ts`**: Preferencias locales (Tema oscuro/claro, idioma, notificaciones).
6.  **`bodyStore.ts`**: Registro de medidas corporales y progreso físico a lo largo del tiempo.
7.  **`purchaseStore.ts`**: Control de RevenueCat, verificación de estado *Premium* (Pro).

---

## 🗺️ 3. Estructura de Navegación (Expo Router)

La app utiliza una navegación de Bottom Tabs (`app/(tabs)`) con 5 secciones principales protegidas por una barrera de autenticación (`_layout.tsx` a nivel global):

*   **`/tracker` (Main):** Registro diario de alimentos, agua, sueño y macros.
*   **`/dashboard` (Progreso):** Gráficos de tendencias, anillos de actividad y widgets de progreso.
*   **`/coach` (Entrenador IA):** Chatbots impulsados por IA con roles específicos (Nutricionista, Entrenador, Médico deportivo).
*   **`/planner` (Planificador):** Generación automática de planes de comida y rutinas de ejercicio semanales.
*   **`/social` (Ligas):** Sistema de clanes (Squads) y tabla de clasificación gamificada.
*   **`/profile` (Perfil):** Configuración de cuenta, ajuste de metas corporales y estado de suscripción.

---

## ⚡ 4. Módulos y Funcionalidades Principales

### A. Registro de Nutrición en Tiempo Real
Permite a los usuarios registrar alimentos (integración con Edamam API / Base de datos propia). Calcula automáticamente el desglose de Proteínas, Carbohidratos y Grasas.
*   **Gamificación Activa:** Cuando los macros del día llegan al 100% (con 5% de flexibilidad), el sistema dispara la función `checkAndAwardMacroPoints` otorgando puntos en tiempo real al usuario.

### B. Sistema de Ligas y Squads (Social)
En lugar de amigos individuales aislados, los usuarios forman **Squads de hasta 5 personas**.
*   **Puntos:** Se ganan puntos al completar entrenamientos, registrar comidas o cumplir metas de macros.
*   **Tiers (Ligas):** Los squads progresan a través de rangos visualmente distintos: *Carbono, Neón, Titanio, Cuarzo, Zenit*.
*   El cálculo se apoya en funciones RPC de Supabase (ej. `get_squad_leaderboard`) para asegurar integridad de datos.

### C. Coach de Inteligencia Artificial
Chatbot que mantiene contexto del usuario (sabe su peso, edad, metas y macros de ese día) para dar respuestas ultrarrápidas y personalizadas gracias a la API de Groq.

### D. Splash Screen y UI Dinámica
*   UI fuertemente adaptada al **Dark Mode**.
*   Uso intensivo de gradientes dual-tone y *Glassmorphism* (cristal esmerilado).
*   Splash Screen customizado mediante `Animated.View` en `app/_layout.tsx` para ocultar la inicialización y dar una vibra premium.
*   Teclado gestionado globalmente mediante `KeyboardAvoidingView` desde el layout raíz para asegurar visibilidad de inputs.

---

## 🔒 5. Base de Datos (Supabase)

La app asume un backend en Supabase con (al menos) las siguientes tablas clave:
*   `users`: Perfil extendido, metas, tokens, `league_points`, `current_streak`.
*   `food_logs` / `activity_logs`: Registros atómicos diarios por usuario.
*   `daily_metrics`: Consolidado diario (agua, sueño, pasos).
*   `squads` / `squad_members`: Manejo de clanes y uniones.
*   **Funciones RPC**: Lógica pesada delegada al backend para recalcular el Tier de una liga o sumar puntos seguros.

---

## 🚀 6. Consideraciones para Desarrolladores o IAs

Si una IA va a modificar este código, debe tener en cuenta:
1.  **Fast Refresh / Local Dev:** El desarrollo se hace vía `npx expo start --dev-client`.
2.  **Manejo de UI:** No usar Tailwind. Se usan StyleSheet globales (`constants/Theme.ts`, `Colors`, `Spacing`). Los gradientes se aplican usando `LinearGradient` de `expo-linear-gradient`.
3.  **Persistencia:** Zustand ya se encarga de guardar el caché localmente. Cualquier mutación (como `awardPoints`) debe actualizar tanto el estado local con `set()` como la base de datos `supabase`.
4.  **Icons:** Se utiliza `lucide-react-native` para iconografía.

---
*Este documento fue generado automáticamente para dar contexto completo sobre la arquitectura, propósito y estándares de diseño de FitGO.*
