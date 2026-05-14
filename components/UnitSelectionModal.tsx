import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, X } from 'lucide-react-native';
import { useTheme } from '../hooks/useTheme';
import { Radius, Spacing } from '../constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface UnitOption {
  value: string;
  label: string;
  description?: string;
}

interface UnitSelectionModalProps {
  visible: boolean;
  title: string;
  options: UnitOption[];
  selectedValue: string;
  onSelect: (value: any) => void;
  onClose: () => void;
}

export function UnitSelectionModal({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: UnitSelectionModalProps) {
  const colors = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          activeOpacity={1} 
          onPress={onClose} 
        />
        
        <View style={[s.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.header}>
            <Text style={[s.title, { color: colors.textPrimary }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={s.optionsContainer}>
            {options.map((option) => {
              const isSelected = option.value === selectedValue;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    s.option,
                    { 
                      backgroundColor: isSelected ? colors.primary + '10' : colors.surfaceAlt + '40',
                      borderColor: isSelected ? colors.primary : colors.border + '20'
                    }
                  ]}
                  onPress={() => {
                    onSelect(option.value);
                    onClose();
                  }}
                >
                  <View style={s.optionContent}>
                    <View>
                      <Text style={[
                        s.optionLabel, 
                        { color: isSelected ? colors.primary : colors.textPrimary }
                      ]}>
                        {option.label}
                      </Text>
                      {option.description && (
                        <Text style={[s.optionDesc, { color: colors.textMuted }]}>
                          {option.description}
                        </Text>
                      )}
                    </View>
                    {isSelected && (
                      <View style={[s.checkCircle, { backgroundColor: colors.primary }]}>
                        <Check size={14} color="#fff" strokeWidth={3} />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
            <Text style={[s.cancelText, { color: colors.textSecondary }]}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  closeBtn: {
    padding: 4,
  },
  optionsContainer: {
    gap: 10,
  },
  option: {
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    padding: 16,
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  optionDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
