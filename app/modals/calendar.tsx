import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore, useNutritionStore } from '../../store';
import { Radius, Spacing } from '../../constants';
import { useTranslation } from 'react-i18next';

export default function CalendarModal() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { streakDays, plannedDays, activeDays, selectedDate, setDate } = useNutritionStore();
  const { profile } = useAuthStore();

  const [viewDate, setViewDate] = useState(new Date(selectedDate));

  const daysHeader = [t('planner.mon')[0], t('planner.tue')[0], t('planner.wed')[0], t('planner.thu')[0], t('planner.fri')[0], t('planner.sat')[0], t('planner.sun')[0]];

  const calendarData = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    // Adjust for Monday start (firstDayOfMonth: 0=Sun, 1=Mon...6=Sat)
    const emptyDays = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const monthName = viewDate.toLocaleDateString(t('common.locale') || 'en-US', { month: 'long', year: 'numeric' });
    
    return {
      monthName: monthName.charAt(0).toUpperCase() + monthName.slice(1),
      daysInMonth,
      emptyDays,
      year,
      month
    };
  }, [viewDate]);

  const changeMonth = (offset: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
    setViewDate(newDate);
  };

  const handleSelectDay = (day: number) => {
    const newDate = new Date(calendarData.year, calendarData.month, day);
    const dateString = newDate.toISOString().split('T')[0];
    setDate(dateString);
    router.back();
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
          <Text style={[s.closeText, { color: colors.textPrimary }]}>✕</Text>
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.textPrimary }]}>{t('planner.myStreaks')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.flamesRow}>
          <View style={s.flameCol}>
            <View style={s.iconCircle}>
              <Text style={{ fontSize: 40 }}>🔥</Text>
            </View>
            <Text style={[s.flameLabel, { color: colors.textPrimary }]}>{t('dashboard.streak').replace('{{count}}', '')}</Text>
            <Text style={[s.flameNum, { color: colors.primary }]}>{streakDays}</Text>
            <Text style={[s.flameSub, { color: colors.textSecondary }]}>{t('planner.currentStreak')}</Text>
            <View style={[s.divider, { backgroundColor: colors.border }]} />
            <Text style={[s.flameBest, { color: colors.textPrimary }]}>🏆 Récord: {streakDays}</Text>
          </View>
          
          <View style={s.flameCol}>
            <View style={[s.iconCircle, { backgroundColor: '#102A1E' }]}>
              <Text style={{ fontSize: 40 }}>🔥</Text>
            </View>
            <Text style={[s.flameLabel, { color: colors.textPrimary }]}>{t('planner.planned')}</Text>
            <Text style={[s.flameNum, { color: '#22C55E' }]}>{plannedDays}</Text>
            <Text style={[s.flameSub, { color: colors.textSecondary }]}>{t('planner.totalDays')}</Text>
            <View style={[s.divider, { backgroundColor: colors.border }]} />
            <Text style={[s.flameBest, { color: colors.textPrimary }]}>🏆 Récord: {plannedDays}</Text>
          </View>
        </View>

        <View style={[s.calendarCard, { backgroundColor: colors.surface }]}>
          <View style={s.calHeader}>
            <TouchableOpacity onPress={() => changeMonth(-1)}>
              <Text style={{ color: colors.textPrimary, fontSize: 24 }}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={[s.calMonth, { color: colors.textPrimary }]}>{calendarData.monthName}</Text>
            <TouchableOpacity onPress={() => changeMonth(1)}>
              <Text style={{ color: colors.textPrimary, fontSize: 24 }}>{'>'}</Text>
            </TouchableOpacity>
          </View>
          
          <View style={s.weekDays}>
            {daysHeader.map((d, i) => (
              <Text key={`${d}-${i}`} style={[s.weekDay, { color: colors.textSecondary }]}>{d}</Text>
            ))}
          </View>

          <View style={s.daysGrid}>
            {Array.from({ length: calendarData.emptyDays }).map((_, i) => (
              <View key={`empty-${i}`} style={s.dayCell} />
            ))}
            {Array.from({ length: calendarData.daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayDate = new Date(calendarData.year, calendarData.month, day).toISOString().split('T')[0];
              const isSelected = dayDate === selectedDate;
              const isActive = activeDays[dayDate];
              
              return (
                <TouchableOpacity 
                  key={day} 
                  style={s.dayCell} 
                  onPress={() => handleSelectDay(day)}
                >
                  <View style={[s.dayNumCircle, isSelected && { backgroundColor: colors.primary }]}>
                    <Text style={[s.dayText, { color: isSelected ? colors.background : colors.textPrimary }]}>
                      {day}
                    </Text>
                  </View>
                  <View style={[s.dot, { backgroundColor: isActive ? '#22C55E' : colors.textMuted }]} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeBtn: { width: 40, height: 40, justifyContent: 'center' },
  closeText: { fontSize: 24, fontWeight: '300' },
  title: { fontSize: 18, fontWeight: '700' },
  content: { padding: 16, gap: 24 },
  flamesRow: { flexDirection: 'row', gap: 16 },
  flameCol: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: Radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#332B12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  flameLabel: { fontSize: 13, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  flameNum: { fontSize: 32, fontWeight: '800', marginBottom: 2 },
  flameSub: { fontSize: 11, fontWeight: '500', marginBottom: 12 },
  divider: { width: '100%', height: 1, marginBottom: 12 },
  flameBest: { fontSize: 11, fontWeight: '600', color: '#999' },

  calendarCard: {
    borderRadius: Radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  calHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
    marginBottom: 20,
  },
  calMonth: { fontSize: 17, fontWeight: '700' },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  weekDay: { width: '14.28%', textAlign: 'center', fontSize: 13, fontWeight: '600' },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  dayNumCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dayText: { fontSize: 15, fontWeight: '600' },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
