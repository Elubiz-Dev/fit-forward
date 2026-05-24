import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Platform, TextInput, KeyboardTypeOptions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle, CheckCircle2, Info, HelpCircle, XCircle, Sparkles } from 'lucide-react-native';
import { useTheme } from '../hooks/useTheme';
import { Radius, Spacing, Shadow } from '../constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

interface CustomAlertProps {
  visible: boolean;
  type?: AlertType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (val?: string) => void;
  onCancel?: () => void;
  actions?: { text: string; onPress: () => void; type?: 'primary' | 'secondary' | 'destructive' }[];
  showInput?: boolean;
  initialInputValue?: string;
  keyboardType?: KeyboardTypeOptions;
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
  actions,
  showInput,
  initialInputValue = '',
  keyboardType = 'numeric'
}) => {
  const colors = useTheme();
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const [inputValue, setInputValue] = React.useState(initialInputValue);

  useEffect(() => {
    if (visible) {
      setInputValue(initialInputValue);
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 7,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, { toValue: 1.15, duration: 1500, useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
          ])
        )
      ]).start();
    } else {
      scale.setValue(0);
      opacity.setValue(0);
      pulse.setValue(1);
    }
  }, [visible]);

  if (!visible) return null;

  const getIcon = () => {
    const size = 36;
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
      case 'success': return ['#10B981', '#059669'];
      case 'error':   return ['#EF4444', '#B91C1C'];
      case 'warning': return ['#F59E0B', '#D97706'];
      case 'confirm': return ['#7C5CFC', '#4338CA'];
      default:        return ['#3B82F6', '#1E40AF'];
    }
  };

  const mainColors = getColors();

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
          {/* Top accent stripe for premium feel */}
          <LinearGradient
            colors={[mainColors[0], 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.topStripe}
          />

          <View style={styles.iconWrapper}>
            <Animated.View style={[
              styles.iconPulse, 
              { borderColor: mainColors[0], transform: [{ scale: pulse }] }
            ]} />
            <LinearGradient
              colors={mainColors}
              style={styles.iconCircle}
            >
              {getIcon()}
            </LinearGradient>
            
            {type === 'success' && (
              <>
                <View style={[styles.sparkle, { top: -10, right: -15 }]}>
                  <Sparkles size={18} color="#F59E0B" fill="#F59E0B" />
                </View>
                <View style={[styles.sparkle, { bottom: 0, left: -20 }]}>
                  <Sparkles size={14} color="#F59E0B" fill="#F59E0B" />
                </View>
              </>
            )}
          </View>
          
          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
            <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
            
            {showInput && (
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderColor: colors.border }]}
                value={inputValue}
                onChangeText={setInputValue}
                keyboardType={keyboardType}
                autoFocus
              />
            )}
          </View>
          
          <View style={[styles.buttonRow, actions ? { flexDirection: 'column' } : {}]}>
            {actions ? (
              actions.map((action, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={[styles.button, { width: '100%', marginBottom: idx < actions.length - 1 ? 8 : 0 }]} 
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
                  onPress={() => onConfirm(inputValue)} 
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={mainColors}
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
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 32,
    borderWidth: 1.5,
    padding: Spacing.xl,
    paddingTop: Spacing['2xl'],
    alignItems: 'center',
    overflow: 'hidden',
    ...Shadow.lg,
  },
  topStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    opacity: 0.5,
  },
  iconWrapper: {
    marginBottom: Spacing.xl,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  iconPulse: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    opacity: 0.2,
  },
  sparkle: {
    position: 'absolute',
    zIndex: 3,
  },
  content: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: Spacing.sm,
    textAlign: 'center',
    letterSpacing: -0.8,
  },
  message: {
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
    paddingHorizontal: 10,
  },
  input: {
    width: '100%',
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  button: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '700',
  },
});

