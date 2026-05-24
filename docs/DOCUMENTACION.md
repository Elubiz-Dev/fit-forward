# FitGO - Documentación de la Aplicación

## ¿Qué es FitGO?
**FitGO** es una aplicación móvil moderna e integral de salud, fitness y nutrición. Desarrollada para iOS y Android, su principal objetivo es ayudar a los usuarios a registrar su progreso físico, monitorear su alimentación y entrenamientos, y ofrecer orientación personalizada mediante asistentes de Inteligencia Artificial.

---

## 🛠 Stack Tecnológico y Herramientas

- **Frontend & Framework:** React Native con Expo (SDK 55) y Expo Router para una navegación basada en sistema de archivos.
- **Backend & Base de Datos:** Supabase (Autenticación, base de datos y almacenamiento).
- **Manejo de Estado Global:** Zustand.
- **Inteligencia Artificial:** OpenAI API (GPT) integrado para los asistentes virtuales.
- **Monetización:** RevenueCat (`react-native-purchases`) para gestionar compras integradas y suscripciones.
- **Gráficos e Interfaz:** `react-native-gifted-charts` para métricas, íconos de `lucide-react-native`, animaciones con `react-native-reanimated` y componentes estilo *Glassmorphism* (`GlassCard`).
- **Internacionalización:** `i18next` y `react-i18next` para ofrecer soporte multilenguaje.
- **Hardware Integrado:** Uso de la cámara para escanear comida/fotos de progreso (`expo-camera`) y micrófonos para comandos de voz (`expo-audio`).

---

## 📱 Estructura y Secciones Principales (Tabs)

La aplicación está dividida en 5 pestañas principales:

1. **Dashboard:** Pantalla principal con el resumen diario, métricas de progreso rápido y accesos directos.
2. **Tracker (Seguimiento):** Herramienta central para registrar el consumo de alimentos, agua y calorías diarias.
3. **Planner (Planificador):** Sección dedicada a rutinas de entrenamiento o planes de alimentación.
4. **Coach (Asistente IA):** Interacción directa con modelos de Inteligencia Artificial especializados en fitness y salud.
5. **Profile (Perfil):** Configuración del usuario, ajustes, suscripciones y preferencias.

---

## ✨ Características y Funcionalidades Clave

### 1. Autenticación y Onboarding (Asistente de Metas)
- Flujo completo de registro, inicio de sesión y recuperación de contraseñas.
- **Goal Wizard:** Un asistente paso a paso que recopila información como peso, nivel de actividad física y NEAT (Termogénesis por actividad sin ejercicio) para crear un perfil metabólico preciso.

### 2. Nutrición y Alimentación Inteligente
- **Escáner de Alimentos (Scan):** Uso de la cámara para escanear códigos de barras de productos alimenticios.
- **Registro por Voz:** Permite a los usuarios dictar qué comieron y la IA lo procesa e ingresa automáticamente.
- **Base de Datos y Recetas:** Búsqueda manual de alimentos, exploración de recetas saludables e información nutricional detallada.

### 3. Inteligencia Artificial (AI Coach)
El módulo más innovador de FitGO. Ofrece 3 "personalidades" o expertos distintos:
- 🏋️ **Trainer (Entrenador):** Para consejos sobre rutinas, técnicas de ejercicio y motivación.
- 🥗 **Coach de alimentación:** Para análisis de dieta, recomendaciones de macros y recetas.
- 🩺 **Coach de bienestar:** Para consultas de bienestar general (recordando que no reemplaza a un profesional).
- Incluye un chat interactivo e historial de las conversaciones para dar seguimiento al usuario.

### 4. Seguimiento Físico y Salud
- Registro de mediciones corporales (Body Measurements).
- Monitoreo del sueño (Sleep tracking).
- Seguimiento visual del progreso del peso con gráficos de tendencia.
- **Muscle Directory:** Un directorio/guía interactiva sobre grupos musculares.

### 5. Elementos Sociales y Gamificación
- Perfil social donde se puede compartir progreso.
- **Logros (Achievements):** Sistema de medallas y objetivos desbloqueables que fomentan la constancia y motivación del usuario.
- Recordatorios personalizables (Reminders).

### 6. Sistema Premium
- **Paywall:** Pantalla de bloqueo para funcionalidades gratuitas versus funcionalidades de paga (como accesos ilimitados al AI Coach o planes avanzados). Integrado con pasarelas de pago de Apple App Store y Google Play Store.

---

## 🎨 Diseño y UI/UX
- Interfaz en Modo Oscuro (Dark Mode por defecto).
- Tarjetas animadas (AnimatedCards) y efectos de vidrio esmerilado (Glassmorphism).
- Alertas y modales personalizados y amigables.
- Gráficas atractivas e interactivas para visualizar el cumplimiento de metas y progresión a lo largo del calendario.
