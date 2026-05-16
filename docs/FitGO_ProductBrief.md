 FitGO — Product Brief
**Cliente:** Antigravity  
**Versión del documento:** 1.0  
**Fecha:** Abril 2026  
**Clasificación:** Confidencial

---

## 1. Visión General del Producto

**FitGO** es una aplicación móvil multiplataforma (iOS & Android) orientada al fitness y la nutrición personalizada, desarrollada con tecnologías de primer nivel. Su propuesta de valor central es ofrecer una experiencia de seguimiento nutricional inteligente, asistida por IA, con un modelo freemium que incentiva la conversión a la suscripción Pro mediante funciones exclusivas de alto valor percibido.

---

## 2. Stack Tecnológico

| Capa | Tecnología |
|---|---|
| **Frontend Mobile** | React Native + Expo (SDK 52+) |
| **Backend / BaaS** | Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions) |
| **IA / Coach** | Google Gemini API (gemini-1.5-pro / gemini-2.0-flash) |
| **Monetización** | RevenueCat (gestión de suscripciones iOS & Android) |
| **Escaneo QR / Cámara** | Expo Camera + ML Kit (Google) / OpenFoodFacts API |
| **Reconocimiento de voz** | Expo Speech / Whisper API (OpenAI) o Google Speech-to-Text |
| **Base de datos de alimentos** | OpenFoodFacts API + Edamam Nutrition API |
| **Notificaciones Push** | Expo Notifications + Supabase Edge Functions |
| **Analítica** | PostHog o Mixpanel |
| **CI/CD** | EAS (Expo Application Services) |

---

## 3. Arquitectura de la Aplicación

```
FitGO/
├── app/                      # Expo Router (file-based routing)
│   ├── (auth)/               # Flujos de autenticación
│   ├── (tabs)/               # Navegación principal (Tab Bar)
│   │   ├── dashboard/        # Resumen diario
│   │   ├── tracker/          # Registro de alimentos
│   │   ├── coach/            # Coach IA personalizado
│   │   ├── planner/          # Planificador nutricional
│   │   └── profile/          # Perfil, medidas y progreso
│   └── modals/               # Pantallas modales (scan, recipes, etc.)
├── components/               # Componentes reutilizables
├── hooks/                    # Custom hooks (useNutrition, useCoach, etc.)
├── services/                 # Integraciones externas (Gemini, Supabase, RevenueCat)
├── store/                    # Estado global (Zustand)
├── utils/                    # Helpers, constantes, validaciones
└── supabase/
    ├── functions/            # Edge Functions (IA, notificaciones)
    └── migrations/           # Esquema de base de datos
```

---

## 4. Módulos Funcionales

### 4.1 Autenticación y Onboarding
- Registro / Login con email, Google y Apple ID (Supabase Auth)
- Onboarding progresivo: objetivo (perder peso / ganar músculo / mantenimiento), medidas iniciales, nivel de actividad, preferencias alimenticias y alergias
- Cálculo automático de TDEE, macros objetivo y calorías diarias según perfil

### 4.2 Dashboard Principal
- Resumen diario: calorías consumidas vs. objetivo, macros en tiempo real (proteínas, carbohidratos, grasas)
- Anillo de progreso calórico y barras de macros
- Acceso rápido al registro de comidas y scanner
- Indicadores de racha (streak) y logros

### 4.3 Registro de Alimentos y Macros
- **Búsqueda manual** en base de datos combinada (OpenFoodFacts + Edamam)
- **Escaneo por código QR/barras** (Expo Camera + ML Kit)
- **Reconocimiento visual por cámara** (Gemini Vision API — foto del plato → estimación nutricional)
- **Registro por voz** (dictado de comidas con Speech-to-Text → parseo con Gemini)
- Historial de comidas frecuentes y favoritas
- Ajuste de porciones con escala de gramos/tazas/unidades
- Registro por comidas del día: desayuno, almuerzo, cena, snacks

### 4.4 Coach Nutricional IA (Gemini)
- Chat conversacional con contexto persistente del usuario (historial, macros, objetivos, medidas)
- Responde preguntas sobre nutrición, sugiere ajustes, motiva y hace seguimiento
- Genera planes alimenticios personalizados en base a preferencias y progreso
- Análisis semanal automatizado con recomendaciones de ajuste
- Modo voz (speak-to-coach): el usuario habla y el coach responde

### 4.5 Seguimiento de Medidas y Composición Corporal
- Registro periódico de: peso, % grasa corporal, medidas (cintura, cadera, pecho, brazos, piernas, cuello)
- Gráficas de progreso con tendencias (Chart / Victory Native)
- Cálculo de IMC, índice cintura-cadera, masa muscular estimada
- Recordatorios configurables para registrar medidas
- Fotografías de progreso (almacenadas en Supabase Storage)

### 4.6 Planificador Nutricional
- Calendario semanal y mensual de comidas
- Generación de plan semanal por IA según objetivos y calorías objetivo
- Ajuste dinámico: si el usuario no cumple su objetivo durante varios días, el coach sugiere correcciones
- Generación automática de lista de compras desde el plan semanal
- Plantillas de planes reutilizables

### 4.7 Recetas (Pro)
- Biblioteca de recetas con información nutricional completa
- Filtros por: objetivo, tiempo de preparación, calorías, macros, restricciones dietéticas
- Generación de recetas personalizadas por IA según ingredientes disponibles
- Agregar recetas directamente al planificador o al tracker

### 4.8 Nutricionista Personal IA (Pro)
- Creación colaborativa de planes alimenticios estructurados (semana a semana)
- El "nutricionista" (Gemini con prompt especializado) ajusta el plan según feedback del usuario
- Exportación del plan en PDF
- Historial de planes anteriores

---

## 5. Modelo Freemium — Free vs. Pro

### Plan Gratuito (Free)
| Funcionalidad | Límite |
|---|---|
| Registro de calorías y macros diarios | ✅ Ilimitado |
| Búsqueda manual de alimentos | ✅ Ilimitado |
| Escaneo de código de barras | ✅ 5 escaneos/día |
| Dashboard y progreso básico | ✅ |
| Seguimiento de peso | ✅ Solo peso |
| Coach IA | ⚠️ 10 mensajes/día |
| Planificador nutricional | ⚠️ Solo vista semanal (sin generación IA) |
| Reconocimiento por cámara | 🔒 Pro |
| Registro por voz | 🔒 Pro |
| Recetas | 🔒 Pro |
| Nutricionista personal IA | 🔒 Pro |
| Seguimiento de medidas completo | 🔒 Pro |
| Fotografías de progreso | 🔒 Pro |
| Lista de compras automática | 🔒 Pro |
| Exportar planes en PDF | 🔒 Pro |
| Análisis semanal IA | 🔒 Pro |
| Sin anuncios | 🔒 Pro |

### Plan Pro (Suscripción vía RevenueCat)
- Mensual, anual y lifetime
- Acceso completo a todas las funcionalidades
- Paywalls nativos gestionados por RevenueCat (A/B testing de offerwalls integrado)
- Prueba gratuita de 7 días

---

## 6. Base de Datos (Supabase — PostgreSQL)

### Tablas principales
- `users` — Perfil, objetivos, TDEE, preferencias
- `food_logs` — Registro de comidas por día y por usuario
- `foods` — Cache local de alimentos consultados
- `body_measurements` — Peso, medidas, % grasa, fecha
- `meal_plans` — Planes nutricionales generados
- `meal_plan_items` — Comidas dentro de un plan
- `recipes` — Recetas (Pro)
- `coach_conversations` — Historial de chat con el coach IA
- `user_subscriptions` — Estado de suscripción (sincronizado con RevenueCat webhooks)
- `progress_photos` — URLs de fotos en Supabase Storage

### Row Level Security (RLS)
Todas las tablas tienen políticas RLS activas: cada usuario solo accede a sus propios datos.

---

## 7. Integraciones Externas

| Servicio | Propósito | Endpoint / SDK |
|---|---|---|
| **Gemini API** | Coach IA, análisis de fotos de platos, parseo de voz, generación de planes | `gemini-1.5-pro`, `gemini-2.0-flash` |
| **RevenueCat** | Suscripciones, paywalls, webhooks de estado Pro | SDK React Native |
| **OpenFoodFacts** | Base de datos nutricional abierta (500k+ alimentos) | REST API |
| **Edamam** | Base de datos nutricional premium + análisis de recetas | REST API |
| **Google ML Kit** | Escaneo de códigos de barras en tiempo real | Expo Camera + MLKit |
| **Google/Whisper STT** | Transcripción de voz para registro y coach | API REST |
| **Supabase Storage** | Fotos de progreso, exportaciones PDF | SDK |
| **Supabase Edge Functions** | Lógica serverless: notificaciones, análisis semanal IA | Deno / TypeScript |

---

## 8. Flujo de Monetización con RevenueCat

1. Al completar el onboarding, se muestra el paywall nativo (RevenueCat Paywalls)
2. Las funciones Pro están protegidas con un HOC `<ProGate>` que verifica el estado de suscripción en tiempo real
3. Al tocar una función bloqueada, se abre el paywall contextual
4. RevenueCat gestiona: compra, restauración, período de gracia, renovación y cancelación
5. Webhook de RevenueCat → Supabase Edge Function → actualiza `user_subscriptions`

---

## 9. Consideraciones de UX/UI

- Diseño: dark mode first, con modo claro opcional
- Design system propio con tokens de color, tipografía (Inter / DM Sans) y espaciado
- Animaciones fluidas con Reanimated 3
- Onboarding con animaciones Lottie
- Componentes de paywall con Shimmer effect para contenido Pro bloqueado
- Accesibilidad: soporte para lectores de pantalla (a11y)

---

## 10. Fases de Desarrollo Sugeridas

### Fase 1 — MVP (8–10 semanas)
- Autenticación + Onboarding
- Dashboard + Tracker manual y por QR
- Seguimiento de peso
- Coach IA básico (10 msg/día Free)
- RevenueCat integrado (sin funciones Pro aún)

### Fase 2 — Core Pro (4–6 semanas)
- Reconocimiento por cámara (Gemini Vision)
- Registro por voz
- Seguimiento de medidas completo
- Planificador nutricional con IA
- Paywalls contextuales activos

### Fase 3 — Premium Features (4–5 semanas)
- Recetas Pro
- Nutricionista personal IA
- Análisis semanal automatizado
- Exportación PDF
- Lista de compras

### Fase 4 — Optimización y Escala
- A/B testing de paywalls (RevenueCat Experiments)
- Analytics avanzados (PostHog)
- Localización (ES / EN / PT)
- Widget iOS/Android para resumen rápido

---

## 11. Estimación de Recursos

| Rol | Dedicación estimada |
|---|---|
| React Native Developer (x2) | Full-time, Fases 1–3 |
| Backend / Supabase Developer | Full-time, Fases 1–2; part-time Fase 3 |
| UI/UX Designer | Full-time Fases 1–2; part-time Fase 3 |
| AI/Prompt Engineer | Part-time Fases 1–3 |
| QA Engineer | Part-time desde Fase 1 |
| Project Manager | Part-time todas las fases |

---

*Documento preparado por Antigravity para el proyecto FitGO.*  
*Versión sujeta a revisión y aprobación del cliente.*
