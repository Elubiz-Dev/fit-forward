/**
 * Sanitizador ligero para FitGO.
 * React Native escapa automáticamente el texto dentro de <Text />, 
 * por lo que el riesgo de XSS es nulo en mobile.
 * Este helper asegura que los tags HTML se limpien antes de procesar el texto.
 */
export const safe = (str: string | undefined | null): string => {
  if (!str) return '';
  
  // 1. Decodificar entidades básicas si fuera necesario (opcional)
  // 2. Eliminar tags HTML (XSS Protection para portabilidad Web)
  return str.replace(/<[^>]*>?/gm, '');
};
