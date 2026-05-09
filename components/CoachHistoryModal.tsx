import React from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  FlatList, Pressable, Alert
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { useCoachStore } from '../store';
import { Spacing, Radius } from '../constants';
import { supabase } from '../services/supabase';
import { CustomAlert } from './CustomAlert';

interface HistoryModalProps {
  visible: boolean;
  onClose: () => void;
  coachType: 'nutritionist' | 'trainer';
}

export default function CoachHistoryModal({ visible, onClose, coachType }: HistoryModalProps) {
  const colors = useTheme();
  const { t } = useTranslation();
  const {
    nutritionistSessions, trainerSessions,
    currentNutritionistSessionId, currentTrainerSessionId,
    setCurrentSessionId, setSessions, resetMessages
  } = useCoachStore();

  const [alert, setAlert] = React.useState<{
    visible: boolean;
    targetId: string | null;
  }>({ visible: false, targetId: null });

  const sessions = coachType === 'nutritionist' ? nutritionistSessions : trainerSessions;
  const currentId = coachType === 'nutritionist' ? currentNutritionistSessionId : currentTrainerSessionId;

  const handleSelect = (id: string | null) => {
    resetMessages(coachType);
    setCurrentSessionId(id, coachType);
    onClose();
  };

  const handleNewChat = () => {
    setCurrentSessionId(null, coachType);
    resetMessages(coachType);
    onClose();
  };

  const handleDelete = (id: string) => {
    setAlert({ visible: true, targetId: id });
  };

  const confirmDelete = async () => {
    const id = alert.targetId;
    if (!id) return;

    const { error } = await supabase.from('coach_sessions').delete().eq('id', id);
    if (!error) {
      const updated = sessions.filter(s => s.id !== id);
      setSessions(updated, coachType);
      if (currentId === id) {
        setCurrentSessionId(updated.length > 0 ? updated[0].id : null, coachType);
      }
    }
    setAlert({ visible: false, targetId: null });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.overlay}>
        <Pressable style={s.backdrop} onPress={onClose} />
        <View style={[s.content, { backgroundColor: colors.surface }]}>
          <View style={[s.header, { borderBottomColor: colors.border }]}>
            <Text style={[s.title, { color: colors.textPrimary }]}>{t('coach.history', 'History')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[s.closeText, { color: colors.primary }]}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[s.newBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
            onPress={handleNewChat}
          >
            <Text style={[s.newBtnText, { color: colors.primary }]}>+ {t('coach.newChat', 'New Chat')}</Text>
          </TouchableOpacity>

          <FlatList
            data={sessions}
            keyExtractor={item => item.id}
            contentContainerStyle={s.list}
            renderItem={({ item }) => (
              <View style={[s.itemRow, { borderBottomColor: colors.border }]}>
                <TouchableOpacity 
                  style={s.itemMain}
                  onPress={() => handleSelect(item.id)}
                >
                  <Text 
                    style={[
                      s.itemTitle, 
                      { color: colors.textPrimary },
                      currentId === item.id && { color: colors.primary, fontWeight: '700' }
                    ]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text style={[s.itemDate, { color: colors.textMuted }]}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => handleDelete(item.id)}
                  style={s.deleteBtn}
                >
                  <Text style={s.deleteIcon}>🗑️</Text>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={{ color: colors.textMuted }}>{t('coach.noHistory', 'No history yet')}</Text>
              </View>
            }
          />
        </View>
      </View>

      <CustomAlert
        visible={alert.visible}
        type="confirm"
        title={t('common.confirm')}
        message={t('coach.confirmDeleteSession', 'Are you sure you want to delete this chat?')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={confirmDelete}
        onCancel={() => setAlert({ visible: false, targetId: null })}
      />
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  content: { height: '70%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    padding: Spacing.base, borderBottomWidth: 1 
  },
  title: { fontSize: 18, fontWeight: '700' },
  closeText: { fontWeight: '600', fontSize: 16 },
  newBtn: { 
    margin: Spacing.base, padding: 14, borderRadius: Radius.md, 
    borderWidth: 1, borderStyle: 'dashed', alignItems: 'center' 
  },
  newBtnText: { fontWeight: '700', fontSize: 15 },
  list: { paddingHorizontal: Spacing.base },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  itemMain: { flex: 1 },
  itemTitle: { fontSize: 16, marginBottom: 4 },
  itemDate: { fontSize: 12 },
  deleteBtn: { padding: 8 },
  deleteIcon: { fontSize: 18 },
  empty: { padding: 40, alignItems: 'center' }
});
