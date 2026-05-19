import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Platform, Animated, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors, Spacing, Radius } from '../../constants';
import { useSettingsStore, Reminder } from '../../store';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { 
  Bell, ChevronLeft, Clock, Utensils, Droplets, Dumbbell, 
  Settings, Check, X, AlertCircle, Pill, Footprints, Moon, Coffee
} from 'lucide-react-native';
import { GlassCard } from '../../components/GlassCard';
import { scheduleReminder, cancelReminder, requestNotificationPermissions, sendTestNotification } from '../../services/notifications';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function RemindersModal() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { reminders, setReminders } = useSettingsStore();
  const [localReminders, setLocalReminders] = useState<Reminder[]>(() => {
    const merged = [...reminders];
    const defaultReminders: Reminder[] = [
      { id: '1', title: 'Breakfast', body: 'Time for a healthy breakfast!', time: '08:00', enabled: false, days: [0,1,2,3,4,5,6], type: 'meal' },
      { id: '2', title: 'Lunch', body: 'Don\'t forget your nutritious lunch!', time: '13:00', enabled: false, days: [0,1,2,3,4,5,6], type: 'meal' },
      { id: '3', title: 'Dinner', body: 'Time for your evening meal.', time: '20:00', enabled: false, days: [0,1,2,3,4,5,6], type: 'meal' },
      { id: '4', title: 'Water', body: 'Stay hydrated! Drink some water.', time: '10:00', enabled: false, days: [0,1,2,3,4,5,6], type: 'water' },
      { id: '5', title: 'Workout', body: 'Time to hit your daily movement goal!', time: '18:00', enabled: false, days: [0,1,2,3,4,5,6], type: 'workout' },
      { id: '6', title: 'Snack', body: 'Time for a healthy snack!', time: '16:30', enabled: false, days: [0,1,2,3,4,5,6], type: 'meal' },
      { id: '7', title: 'Vitamins', body: 'Remember to take your vitamins and supplements!', time: '09:00', enabled: false, days: [0,1,2,3,4,5,6], type: 'general' },
      { id: '8', title: 'Walk', body: 'Check your steps! Time for a short walk.', time: '12:00', enabled: false, days: [0,1,2,3,4,5,6], type: 'workout' },
      { id: '9', title: 'Sleep', body: 'Wind down and prepare for a restful sleep.', time: '22:30', enabled: false, days: [0,1,2,3,4,5,6], type: 'general' },
    ];
    defaultReminders.forEach(def => {
      if (!merged.some(r => r.id === def.id)) {
        merged.push(def);
      }
    });
    return merged.sort((a, b) => Number(a.id) - Number(b.id));
  });
  const [showTimePicker, setShowTimePicker] = useState<string | null>(null);

  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  const handleToggle = async (id: string) => {
    const updated = localReminders.map(r => {
      if (r.id === id) {
        return { ...r, enabled: !r.enabled };
      }
      return r;
    });
    setLocalReminders(updated);
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (event.type === 'set' && selectedDate && showTimePicker) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;
      
      const updated = localReminders.map(r => {
        if (r.id === showTimePicker) {
          return { ...r, time: timeStr };
        }
        return r;
      });
      setLocalReminders(updated);
    }
    setShowTimePicker(null);
  };

  const handleSave = async () => {
    // Cancel old ones and schedule new ones
    // To keep it simple, we cancel all and reschedule all enabled ones
    // Or we could be more surgical.
    
    const finalReminders = [...localReminders];
    
    for (let i = 0; i < finalReminders.length; i++) {
      const r = finalReminders[i];
      // Cancel previous if exists
      if (reminders.find(old => old.id === r.id)?.notificationId) {
        await cancelReminder(reminders.find(old => old.id === r.id)!.notificationId!);
      }
      
      if (r.enabled) {
        const notifId = await scheduleReminder(r);
        finalReminders[i] = { ...r, notificationId: notifId };
      } else {
        finalReminders[i] = { ...r, notificationId: undefined };
      }
    }
    
    setReminders(finalReminders);
    router.back();
  };

  const getIcon = (type: string, title?: string) => {
    const lowerTitle = title?.toLowerCase() || '';
    if (lowerTitle.includes('snack') || lowerTitle.includes('merienda')) {
      return <Coffee size={20} color="#F59E0B" />;
    }
    if (lowerTitle.includes('vitamin') || lowerTitle.includes('suplemento')) {
      return <Pill size={20} color="#A78BFA" />;
    }
    if (lowerTitle.includes('walk') || lowerTitle.includes('pasos') || lowerTitle.includes('caminata')) {
      return <Footprints size={20} color="#10B981" />;
    }
    if (lowerTitle.includes('sleep') || lowerTitle.includes('dormir') || lowerTitle.includes('descanso')) {
      return <Moon size={20} color="#6366F1" />;
    }

    switch (type) {
      case 'meal': return <Utensils size={20} color="#FF4D4D" />;
      case 'water': return <Droplets size={20} color="#3B82F6" />;
      case 'workout': return <Dumbbell size={20} color="#10B981" />;
      default: return <Bell size={20} color="#F59E0B" />;
    }
  };

  const getAccentColor = (type: string, title?: string) => {
    const lowerTitle = title?.toLowerCase() || '';
    if (lowerTitle.includes('snack') || lowerTitle.includes('merienda')) return '#F59E0B';
    if (lowerTitle.includes('vitamin') || lowerTitle.includes('suplemento')) return '#A78BFA';
    if (lowerTitle.includes('walk') || lowerTitle.includes('pasos') || lowerTitle.includes('caminata')) return '#10B981';
    if (lowerTitle.includes('sleep') || lowerTitle.includes('dormir') || lowerTitle.includes('descanso')) return '#6366F1';
    
    switch (type) {
      case 'meal': return '#FF4D4D';
      case 'water': return '#3B82F6';
      case 'workout': return '#10B981';
      default: return '#F59E0B';
    }
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={[s.backBtn, { backgroundColor: colors.surface }]}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.textPrimary }]}>{t('profile.reminders', 'Recordatorios')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.heroSection}>
          <LinearGradient colors={[colors.primary + '30', 'transparent']} style={s.heroIconContainer}>
            <Bell size={40} color={colors.primary} />
          </LinearGradient>
          <Text style={[s.heroTitle, { color: colors.textPrimary }]}>{t('reminders.stayOnTrack', 'Mantente en el Camino')}</Text>
          <Text style={[s.heroSubtitle, { color: colors.textSecondary }]}>
            {t('reminders.subtitle', 'Configura alertas para no olvidar tus comidas, hidratación y entrenamientos.')}
          </Text>
        </View>

        {localReminders.map((reminder) => {
          const accent = getAccentColor(reminder.type, reminder.title);
          return (
            <GlassCard 
              key={reminder.id} 
              style={[s.reminderCard, { opacity: reminder.enabled ? 1 : 0.65 }]} 
              noPadding
              accentColor={accent}
              showStripe
            >
              <View style={s.reminderRow}>
                <View style={[s.iconBox, { backgroundColor: accent + '15' }]}>
                  {getIcon(reminder.type, reminder.title)}
                </View>
                <View style={s.reminderContent}>
                  <Text style={[s.reminderTitle, { color: colors.textPrimary }]}>
                    {t(`reminders.${reminder.title.toLowerCase()}`, reminder.title)}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => setShowTimePicker(reminder.id)}
                    style={[s.timeSelector, { backgroundColor: colors.surfaceAlt }]}
                  >
                    <Clock size={12} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={[s.reminderTime, { color: colors.primary }]}>{reminder.time}</Text>
                  </TouchableOpacity>
                </View>
                <Switch
                  value={reminder.enabled}
                  onValueChange={() => handleToggle(reminder.id)}
                  trackColor={{ false: '#3F3F46', true: colors.primary }}
                  thumbColor={Platform.OS === 'ios' ? '#fff' : (reminder.enabled ? '#fff' : '#A1A1AA')}
                />
              </View>
            </GlassCard>
          );
        })}

        <View style={s.infoBox}>
          <AlertCircle size={16} color={colors.textMuted} />
          <Text style={[s.infoText, { color: colors.textMuted }]}>
            {t('reminders.permissionInfo', 'Asegúrate de permitir las notificaciones en los ajustes de tu sistema.')}
          </Text>
        </View>
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity style={[s.saveBtn, { marginBottom: 12 }]} onPress={handleSave}>
          <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.saveGrad}>
            <Check size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={s.saveText}>{t('common.save', 'Guardar Cambios')}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[s.saveBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border, elevation: 0 }]} 
          onPress={() => sendTestNotification()}
        >
          <View style={s.saveGrad}>
            <Bell size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <Text style={[s.saveText, { color: colors.textSecondary }]}>{t('reminders.testNotif', 'Probar Notificación')}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {showTimePicker && (
        <DateTimePicker
          value={(() => {
            const [h, m] = localReminders.find(r => r.id === showTimePicker)!.time.split(':').map(Number);
            const d = new Date();
            d.setHours(h, m, 0, 0);
            return d;
          })()}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  scroll: {
    padding: 20,
    paddingBottom: 100,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  reminderCard: {
    marginBottom: 12,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'transparent',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  reminderTime: {
    fontSize: 12,
    fontWeight: '700',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    maxWidth: '80%',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'transparent',
  },
  saveBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#7C5CFC',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  saveGrad: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
