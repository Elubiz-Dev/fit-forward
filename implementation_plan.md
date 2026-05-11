# Plan de Implementación: Gráficas y Métricas

Este documento detalla los pasos para implementar las nuevas funcionalidades visuales en FitGO.

## 🚀 Objetivos
1.  **Dashboard/Tracker:** Gráfica de barras apiladas (Stacked Bar Chart) para resumen semanal.
2.  **Detalle de Comida:** Gráfica de dona (Donut Chart) para macros.
3.  **Perfil:** Gráfica de área (Area Chart) para progreso de peso.
4.  **Aesthetics:** Animaciones y degradados premium.

## 🛠️ Pasos a seguir

### 1. Preparación
- [x] Instalar `react-native-gifted-charts`.
- [x] Verificar funcionamiento de `react-native-svg`.

### 2. Fase 1: Resumen Semanal (Stacked Bar Chart)
- [x] Implementar el componente en `app/(tabs)/tracker/index.tsx`.
- [x] Conectar con los datos de `useNutritionStore`.
- [x] Estilizar con colores de la app y degradados.

### 3. Fase 2: Macros por Comida (Donut Chart)
- [x] Implementar en el modal de detalle de comida.
- [x] Mostrar porcentajes dinámicos.

### 4. Fase 3: Progreso de Peso (Area Chart)
- [x] Crear sección de estadísticas en el Perfil.
- [x] Graficar historial de peso.

---
**✅ Plan 100% completado.** Rama `tablas_y_metricas` lista.
