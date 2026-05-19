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
import { Camera, Image as ImageIcon, X, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../hooks/useTheme';
import { Radius, Spacing } from '../constants';
import { useTranslation } from 'react-i18next';

interface PhotoSourceModalProps {
  visible: boolean;
  onSelectCamera: () => void;
  onSelectGallery: () => void;
  onClose: () => void;
}

export function PhotoSourceModal({
  visible,
  onSelectCamera,
  onSelectGallery,
  onClose,
}: PhotoSourceModalProps) {
  const colors = useTheme();
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.dragIndicator, { backgroundColor: colors.border + '50' }]} />
          
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t('profile.photoSourceTitle', 'Foto de perfil')}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('profile.photoSourceSubtitle', '¿Cómo te gustaría seleccionar tu nueva foto de perfil?')}
          </Text>

          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={[styles.optionItem, { backgroundColor: colors.surfaceAlt + '40', borderColor: colors.border + '20' }]}
              onPress={() => {
                onSelectCamera();
                onClose();
              }}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.iconWrapper}>
                <Camera size={20} color="#FFF" strokeWidth={2.5} />
              </LinearGradient>
              <View style={styles.optionTexts}>
                <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                  {t('profile.takePhoto', 'Tomar foto')}
                </Text>
                <Text style={[styles.optionSubtitle, { color: colors.textMuted }]}>
                  {t('profile.takePhotoDesc', 'Usa la cámara de tu dispositivo')}
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionItem, { backgroundColor: colors.surfaceAlt + '40', borderColor: colors.border + '20' }]}
              onPress={() => {
                onSelectGallery();
                onClose();
              }}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#06B6D4', '#0891B2']} style={styles.iconWrapper}>
                <ImageIcon size={20} color="#FFF" strokeWidth={2.5} />
              </LinearGradient>
              <View style={styles.optionTexts}>
                <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                  {t('profile.chooseGallery', 'Elegir de la galería')}
                </Text>
                <Text style={[styles.optionSubtitle, { color: colors.textMuted }]}>
                  {t('profile.chooseGalleryDesc', 'Selecciona una imagen existente')}
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.surfaceAlt }]} onPress={onClose}>
            <Text style={[styles.cancelText, { color: colors.textPrimary }]}>
              {t('common.cancel', 'Cancelar')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  dragIndicator: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 24,
  },
  closeBtn: {
    padding: 4,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionTexts: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  cancelBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: Radius.xl,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
