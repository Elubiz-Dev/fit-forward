# Cambios Realizados - 08 de Mayo de 2026

Hoy se han llevado a cabo múltiples mejoras críticas en FitGO, centradas en la personalización de la IA, la seguridad, la persistencia de datos y la monetización.

## 1. Personalización del Coach de IA
- **Perfil de Salud Completo**: Se integró el perfil de salud detallado (condiciones médicas, medicamentos, restricciones dietéticas, estadísticas físicas) en el motor de coaching.
- **Prompts Dinámicos**: Actualización de `buildCoachSystemPrompt` para inyectar datos del usuario, garantizando recomendaciones seguras y personalizadas.
- **Validación de Objetivos**: Implementación de validación proactiva en el onboarding para asegurar que los objetivos de peso sean lógicamente alcanzables.

## 2. Historial de Chat y Sesiones
- **Persistencia de Conversaciones**: Creación de la tabla `coach_sessions` en Supabase para rastrear el historial de chats por sesión.
- **Gestión de Sesiones**: Actualización de `useCoachStore` para permitir cambiar entre sesiones, eliminar historiales y comenzar nuevos chats.
- **Edición de Mensajes**: Implementación de la capacidad de editar el último mensaje del usuario y regenerar la respuesta de la IA.
- **Interfaz de Historial**: Nuevo modal `CoachHistoryModal` para navegar por sesiones pasadas.

## 3. Integración de Suscripciones (RevenueCat)
- **Gating de Funcionalidades**: Migración de la lógica de "Pro" desde flags locales a un estado reactivo basado en RevenueCat (`purchaseStore`).
- **Restricción de Pantallas**: 
  - Límites de mensajes en `NutritionistScreen` y `TrainerScreen`.
  - Acceso restringido a generación de planes AI, análisis semanal y exportación PDF en el Planner.
  - Escaneo de comida por IA y registro por voz protegidos por suscripción.
- **Acceso Administrativo**: Mantenimiento de overrides para roles de "admin" y "super_admin".

## 4. Seguridad y Arquitectura
- **Proxy de IA**: Despliegue de la Edge Function `groq-proxy` en Supabase para ocultar la API Key de Groq del lado del cliente.
- **Esquema de Base de Datos**: Migraciones para soportar el perfil de salud y el historial de sesiones.

## 5. Localización y UI/UX
- **Planner**: Corrección de errores en el escape de llaves de traducción para exportaciones PDF.
- **Consistencia Visual**: Aplicación de la paleta de colores de la marca en todos los componentes y modales del Planner.
- **Reseteo Semanal**: Validación de la lógica de auto-reseteo para planes de comidas y entrenamientos.

---
*Documento generado automáticamente por Antigravity.*
