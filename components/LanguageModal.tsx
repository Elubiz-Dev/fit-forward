import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { Radius } from '../constants';

interface LanguageModalProps {
  visible: boolean;
  currentLang: string;
  onSelect: (lang: any) => void;
  onClose: () => void;
}

export default function LanguageModal({
  visible, currentLang, onSelect, onClose,
}: LanguageModalProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  
  const languages = [
    { id: 'en', name: 'English' },
    { id: 'es', name: 'Español' },
    { id: 'fr', name: 'Français' },
    { id: 'pt', name: 'Português' },
    { id: 'it', name: 'Italiano' },
    { id: 'de', name: 'Deutsch' },
    { id: 'ru', name: 'Русский' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={[s.box, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.title, { color: colors.textPrimary }]}>{t('profile.language')}</Text>
          <ScrollView style={{ maxHeight: 350 }}>
            {languages.map((l) => (
              <TouchableOpacity
                key={l.id}
                style={[
                  s.item, 
                  { borderTopColor: colors.border },
                  currentLang === l.id && { backgroundColor: colors.primary + '22' }
                ]}
                onPress={() => { onSelect(l.id); onClose(); }}
              >
                <Text style={[
                  s.itemText, 
                  { color: currentLang === l.id ? colors.primary : colors.textPrimary },
                  currentLang === l.id && { fontWeight: '700' }
                ]}>
                  {l.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={s.footer}>
            <TouchableOpacity style={[s.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[s.cancelText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  box:       { borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden' },
  title:     { fontSize: 18, fontWeight: '700', margin: 24, marginBottom: 16 },
  item:      { padding: 18, paddingHorizontal: 24, borderTopWidth: 1 },
  itemText:  { fontSize: 16 },
  footer:    { padding: 16, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', flexDirection: 'row' },
  cancelBtn: { flex: 1, borderRadius: Radius.md, borderWidth: 1, paddingVertical: 12, alignItems: 'center' },
  cancelText:{ fontWeight: '600' },
});
