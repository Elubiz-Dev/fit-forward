# Guía del Proyecto FitGO

Este documento proporciona una visión general de la estructura del proyecto y la función de cada una de sus partes principales para facilitar el desarrollo.

## 📁 Estructura de Directorios

### 1. `app/` (Expo Router)
Es el núcleo de la navegación de la aplicación. Utiliza un sistema basado en archivos.
*   **`(auth)/`**: Contiene las pantallas de autenticación (Login, Registro, Recuperación de contraseña).
*   **`(tabs)/`**: Contiene la navegación principal por pestañas (Dashboard, Tracker, Profile, Planner, etc.).
*   **`modals/`**: Pantallas que se abren como modales (Añadir actividad, Medidas corporales, Detalles de comida, Escaneo).
*   **`_layout.tsx`**: Define la estructura base y los proveedores globales de la aplicación.
*   **`onboarding.tsx`**: El flujo inicial para nuevos usuarios donde se recolectan datos físicos y objetivos.

### 2. `services/` (Lógica de API)
Contiene la comunicación con servicios externos.
*   **`supabase.ts`**: Configuración y cliente de Supabase para base de datos y autenticación.
*   **`groq.ts`**: Lógica para interactuar con la API de Groq (Inteligencia Artificial para análisis de nutrición y entrenamiento).
*   **`foodDatabase.ts`**: Servicio para buscar y gestionar información nutricional de alimentos.

### 3. `store/` (Estado Global)
*   **`index.ts`**: Gestiona el estado global de la aplicación (datos del usuario, progreso diario, configuración) utilizando una tienda centralizada (Zustand). Es el punto de verdad para los datos que se comparten entre pantallas.

### 4. `components/` (Componentes Reutilizables)
*   Contiene piezas de la interfaz de usuario que se usan en múltiples lugares, como modales de éxito, selección de idioma, y pantallas especializadas como `TrainerScreen` y `NutritionistScreen`.

### 5. `supabase/` (Base de Datos)
*   **`migrations/`**: Scripts SQL que definen la estructura de las tablas, funciones y políticas de seguridad (RLS) en la base de datos Supabase.

### 6. `assets/` (Recursos Estáticos)
*   Imágenes, iconos y fuentes utilizados en la aplicación.

### 7. `i18n/` (Internacionalización)
*   Gestiona las traducciones de la aplicación (Español, Inglés, etc.) para que la interfaz pueda cambiar de idioma dinámicamente.

---

## 🛠️ Cómo Trabajar en el Proyecto

### Añadir una nueva pantalla
Crea un archivo `.tsx` dentro de la carpeta correspondiente en `app/`. Si es una pestaña, añádela en `(tabs)/`. Si es una pantalla auxiliar, en la raíz de `app/` o en `modals/`.

### Modificar la Base de Datos
Si necesitas cambiar la estructura de los datos, añade un nuevo archivo `.sql` en `supabase/migrations/` y asegúrate de aplicar los cambios en tu instancia de Supabase.

### Lógica de Negocio e IA
Si vas a mejorar las respuestas de la IA o añadir nuevas capacidades de análisis, el lugar principal es `services/groq.ts`.

---

## 🚀 Comandos Útiles
*   `npm install`: Instala las dependencias.
*   `npx expo start`: Inicia el servidor de desarrollo de Expo.
