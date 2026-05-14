import React from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TouchableWithoutFeedback, Animated, Platform
} from 'react-native';
import { Camera, Image as ImageIcon, X } from 'lucide-react-native';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { Spacing, Radius } from '../constants';

interface ImagePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onCamera: () => void;
  onGallery: () => void;
}

export function ImagePickerModal({ visible, onClose, onCamera, onGallery }: ImagePickerModalProps) {
  const colors = useTheme();
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.overlay}>
          {/* Fallback for blur: semi-transparent dark overlay */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
          
          <TouchableWithoutFeedback>
            <View style={[s.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={s.header}>
                <Text style={[s.title, { color: colors.textPrimary }]}>
                  {t('coach.pickImageTitle', 'Seleccionar Imagen')}
                </Text>
                <TouchableOpacity onPress={onClose} style={[s.closeBtn, { backgroundColor: colors.surfaceAlt }]}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[s.subtitle, { color: colors.textMuted }]}>
                {t('coach.pickImageSub', '¿Desde dónde quieres subir la foto?')}
              </Text>

              <View style={s.options}>
                <TouchableOpacity 
                  style={[s.option, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                  onPress={() => { onCamera(); onClose(); }}
                  activeOpacity={0.7}
                >
                  <View style={[s.iconCircle, { backgroundColor: colors.primary + '20' }]}>
                    <Camera size={24} color={colors.primary} />
                  </View>
                  <Text style={[s.optionText, { color: colors.textPrimary }]}>
                    {t('coach.camera', 'Cámara')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[s.option, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                  onPress={() => { onGallery(); onClose(); }}
                  activeOpacity={0.7}
                >
                  <View style={[s.iconCircle, { backgroundColor: '#10B98120' }]}>
                    <ImageIcon size={24} color="#10B981" />
                  </View>
                  <Text style={[s.optionText, { color: colors.textPrimary }]}>
                    {t('coach.gallery', 'Galería')}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={[s.cancelBtn, { backgroundColor: colors.surfaceAlt }]} 
                onPress={onClose}
              >
                <Text style={[s.cancelText, { color: colors.textSecondary }]}>
                  {t('common.cancel', 'Cancelar')}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderTopWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 24,
    fontWeight: '500',
  },
  options: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  option: {
    flex: 1,
    padding: 20,
    borderRadius: Radius.xl,
    alignItems: 'center',
    borderWidth: 1,
    gap: 12,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 16,
    borderRadius: Radius.xl,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
