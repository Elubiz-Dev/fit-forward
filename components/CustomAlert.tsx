import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle, CheckCircle2, Info, HelpCircle, XCircle } from 'lucide-react-native';
import { useTheme } from '../hooks/useTheme';
import { Radius, Spacing, Shadow } from '../constants';

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

interface CustomAlertProps {
  visible: boolean;
  type?: AlertType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  actions?: { text: string; onPress: () => void; type?: 'primary' | 'secondary' | 'destructive' }[];
}

export const CustomAlert: React.FC<CustomAlertProps> = ({ 
  visible, 
  type = 'info', 
  title, 
  message, 
  confirmText = 'OK', 
  cancelText = 'Cancel', 
  onConfirm, 
  onCancel,
  actions
}) => {
  const colors = useTheme();
  const [scale] = React.useState(new Animated.Value(0));
  const [opacity] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      scale.setValue(0);
      opacity.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  const getIcon = () => {
    const size = 32;
    switch (type) {
      case 'success': return <CheckCircle2 size={size} color="#fff" strokeWidth={2.5} />;
      case 'error':   return <XCircle size={size} color="#fff" strokeWidth={2.5} />;
      case 'warning': return <AlertCircle size={size} color="#fff" strokeWidth={2.5} />;
      case 'confirm': return <HelpCircle size={size} color="#fff" strokeWidth={2.5} />;
      default:        return <Info size={size} color="#fff" strokeWidth={2.5} />;
    }
  };

  const getColors = (): [string, string] => {
    switch (type) {
      case 'success': return [colors.success, '#15803D'];
      case 'error':   return [colors.error, '#B91C1C'];
      case 'warning': return [colors.warning, '#B45309'];
      case 'confirm': return [colors.primary, colors.primaryDark];
      default:        return [colors.primary, colors.primaryDark];
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity }]} />
        
        <Animated.View style={[
          styles.card, 
          { 
            backgroundColor: colors.surface, 
            borderColor: colors.border,
            transform: [{ scale }]
          }
        ]}>
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={getColors()}
              style={styles.iconCircle}
            >
              {getIcon()}
            </LinearGradient>
            <View style={[styles.iconPulse, { borderColor: getColors()[0] }]} />
          </View>
          
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
          
          <View style={[styles.buttonRow, actions ? { flexDirection: 'column' } : {}]}>
            {actions ? (
              actions.map((action, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={[styles.button, { width: '100%' }]} 
                  onPress={action.onPress} 
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={action.type === 'destructive' ? ['#EF4444', '#B91C1C'] : action.type === 'secondary' ? [colors.surfaceAlt, colors.surfaceAlt] : getColors()}
                    style={styles.buttonGradient}
                  >
                    <Text style={[styles.buttonText, action.type === 'secondary' && { color: colors.textSecondary }]}>{action.text}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))
            ) : (
              <>
                {onCancel && (
                  <TouchableOpacity 
                    style={[styles.button, styles.cancelButton, { borderColor: colors.border }]} 
                    onPress={onCancel} 
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>{cancelText}</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={[styles.button, onCancel ? { flex: 1.5 } : { width: '100%' }]} 
                  onPress={onConfirm} 
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={getColors()}
                    style={styles.buttonGradient}
                  >
                    <Text style={styles.buttonText}>{confirmText}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadow.md,
  },
  iconContainer: {
    marginTop: -Spacing.xl - 20,
    marginBottom: Spacing.lg,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  iconPulse: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    opacity: 0.2,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: Spacing.sm,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
    opacity: 0.9,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  button: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
  },
  buttonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
