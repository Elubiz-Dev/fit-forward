import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check } from 'lucide-react-native';
import { useTheme } from '../hooks/useTheme';
import { Radius, Spacing } from '../constants';

interface SuccessModalProps {
  visible: boolean;
  title: string;
  message: string;
  buttonText?: string;
  onClose: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({ visible, title, message, buttonText = 'OK', onClose }) => {

  const colors = useTheme();
  const [scale] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      scale.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
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
              colors={['#7C5CFC', '#4338CA']}
              style={styles.iconCircle}
            >
              <Check size={32} color="#fff" strokeWidth={3} />
            </LinearGradient>
            <View style={[styles.iconPulse, { borderColor: '#7C5CFC' }]} />
          </View>
          
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
          
          <TouchableOpacity style={styles.button} onPress={onClose} activeOpacity={0.8}>
            <LinearGradient
              colors={['#7C5CFC', '#4338CA']}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>{buttonText}</Text>

            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    marginBottom: Spacing.lg,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    shadowColor: '#7C5CFC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  iconPulse: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    opacity: 0.15,
  },

  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  button: {
    width: '100%',
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
