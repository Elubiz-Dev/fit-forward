import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { useTheme } from './useTheme';
import { useSegments } from 'expo-router';

// Safely detect if edge-to-edge is enabled to avoid warnings
let isEdgeToEdgeActive = false;
try {
  const { isEdgeToEdge } = require('react-native-is-edge-to-edge');
  isEdgeToEdgeActive = isEdgeToEdge();
} catch (e) {
  // Fallback
}

/**
 * useKeyboardNavBar
 * ------------------
 * Configura la barra de navegación de Android para que sea completamente transparente
 * y flote de forma absoluta sobre la interfaz de la app.
 *
 * NO fuerza la visibilidad manual (hidden/visible), permitiendo que el sistema decida:
 * - Si el teléfono usa navegación por gestos: la barra de botones nunca aparece.
 * - Si el teléfono usa navegación clásica de 3 botones: se muestran los botones de forma transparente.
 */
export function useKeyboardNavBar() {
  const colors = useTheme();
  const segments = useSegments();

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (isEdgeToEdgeActive) return; // Edge-to-edge handles absolute position and transparency natively

    NavigationBar.setPositionAsync('absolute');
    NavigationBar.setBackgroundColorAsync('#00000000');

    return () => {
      const inTabs = segments[0] === '(tabs)';
      const targetColor = inTabs ? colors.surface : colors.background;
      NavigationBar.setPositionAsync('relative');
      NavigationBar.setBackgroundColorAsync(targetColor);
      NavigationBar.setBorderColorAsync(targetColor);
    };
  }, [colors, segments]);
}
