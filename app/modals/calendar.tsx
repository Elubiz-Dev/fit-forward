import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useNutritionStore } from '../../store';
import { Radius } from '../../constants';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CalendarModal() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { streakDays, activeDays, selectedDate, setDate } = useNutritionStore();

  // Derive plannedDays from the real activeDays count
  const plannedDays = Object.keys(activeDays).length;

  // Best streak: iterate backwards over all active days to find longest consecutive run
  const bestStreak = useMemo(() => {
    const dates = Object.keys(activeDays).sort();
    if (dates.length === 0) return 0;
    let best = 1;
    let current = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        current++;
        if (current > best) best = current;
      } else {
        current = 1;
      }
    }
    return best;
  }, [activeDays]);

  const [viewDate, setViewDate] = useState(new Date(selectedDate));

  const daysHeader = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  const calendarData = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const emptyDays = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = viewDate.toLocaleDateString(
      t('common.locale') || 'es-MX',
      { month: 'long', year: 'numeric' }
    );
    return {
      monthName: monthName.charAt(0).toUpperCase() + monthName.slice(1),
      daysInMonth,
      emptyDays,
      year,
      month,
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

  const today = new Date().toISOString().split('T')[0];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
          <Text style={[s.closeText, { color: colors.textPrimary }]}>✕</Text>
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.textPrimary }]}>Mis Rachas</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Streak Cards ── */}
        <View style={s.cardsRow}>
          {/* Current Streak */}
          <LinearGradient
            colors={['#2D1B00', '#1C1200']}
            style={s.card}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={[s.cardAccent, { backgroundColor: '#FF6B0020' }]} />
            <View style={[s.iconWrap, { backgroundColor: '#FF6B0030' }]}>
              <Text style={s.iconEmoji}>🔥</Text>
            </View>
            <Text style={[s.cardValue, { color: '#FF8C42' }]}>{streakDays}</Text>
            <Text style={[s.cardLabel, { color: colors.textPrimary }]}>Racha actual</Text>
            <View style={s.cardDivider} />
            <View style={s.bestRow}>
              <Text style={s.trophy}>🏆</Text>
              <Text style={[s.bestText, { color: colors.textSecondary }]}>
                Récord: <Text style={{ color: '#FF8C42', fontWeight: '700' }}>{bestStreak}</Text>
              </Text>
            </View>
          </LinearGradient>

          {/* Planned Days */}
          <LinearGradient
            colors={['#001F12', '#001208']}
            style={s.card}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={[s.cardAccent, { backgroundColor: '#22C55E20' }]} />
            <View style={[s.iconWrap, { backgroundColor: '#22C55E20' }]}>
              <Text style={s.iconEmoji}>📅</Text>
            </View>
            <Text style={[s.cardValue, { color: '#22C55E' }]}>{plannedDays}</Text>
            <Text style={[s.cardLabel, { color: colors.textPrimary }]}>Días activos</Text>
            <View style={s.cardDivider} />
            <View style={s.bestRow}>
              <Text style={s.trophy}>⭐</Text>
              <Text style={[s.bestText, { color: colors.textSecondary }]}>
                Total registrado
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* ── Mini Stats Bar ── */}
        <View style={[s.statsBar, { backgroundColor: colors.surface, borderColor: '#2C2C2E' }]}>
          <View style={s.statItem}>
            <Text style={[s.statNum, { color: colors.primary }]}>{streakDays}</Text>
            <Text style={[s.statLbl, { color: colors.textSecondary }]}>Racha</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: '#2C2C2E' }]} />
          <View style={s.statItem}>
            <Text style={[s.statNum, { color: '#22C55E' }]}>{plannedDays}</Text>
            <Text style={[s.statLbl, { color: colors.textSecondary }]}>Activos</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: '#2C2C2E' }]} />
          <View style={s.statItem}>
            <Text style={[s.statNum, { color: '#F59E0B' }]}>{bestStreak}</Text>
            <Text style={[s.statLbl, { color: colors.textSecondary }]}>Récord</Text>
          </View>
        </View>

        {/* ── Calendar Card ── */}
        <View style={[s.calCard, { backgroundColor: colors.surface, borderColor: '#2C2C2E' }]}>
          {/* Month navigation */}
          <View style={s.calHeader}>
            <TouchableOpacity
              onPress={() => changeMonth(-1)}
              style={[s.navBtn, { backgroundColor: '#1C1C1E' }]}
            >
              <Text style={[s.navArrow, { color: colors.textPrimary }]}>‹</Text>
            </TouchableOpacity>
            <Text style={[s.calMonth, { color: colors.textPrimary }]}>
              {calendarData.monthName}
            </Text>
            <TouchableOpacity
              onPress={() => changeMonth(1)}
              style={[s.navBtn, { backgroundColor: '#1C1C1E' }]}
            >
              <Text style={[s.navArrow, { color: colors.textPrimary }]}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Day-of-week headers */}
          <View style={s.weekRow}>
            {daysHeader.map((d, i) => (
              <Text
                key={`hdr-${i}`}
                style={[s.weekDay, { color: colors.textSecondary }]}
              >
                {d}
              </Text>
            ))}
          </View>

          {/* Days grid */}
          <View style={s.daysGrid}>
            {Array.from({ length: calendarData.emptyDays }).map((_, i) => (
              <View key={`e-${i}`} style={s.dayCell} />
            ))}

            {Array.from({ length: calendarData.daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayDate = new Date(calendarData.year, calendarData.month, day)
                .toISOString()
                .split('T')[0];
              const isToday = dayDate === today;
              const isSelected = dayDate === selectedDate;
              const isActive = !!activeDays[dayDate];

              return (
                <TouchableOpacity
                  key={`day-${day}`}
                  style={s.dayCell}
                  onPress={() => handleSelectDay(day)}
                  activeOpacity={0.7}
                >
                  {isSelected ? (
                    <LinearGradient
                      colors={[colors.primary, colors.primary + 'CC']}
                      style={s.dayCircleSelected}
                    >
                      <Text style={[s.dayText, { color: '#fff' }]}>{day}</Text>
                    </LinearGradient>
                  ) : isToday ? (
                    <View style={[s.dayCircleToday, { borderColor: colors.primary }]}>
                      <Text style={[s.dayText, { color: colors.primary }]}>{day}</Text>
                    </View>
                  ) : (
                    <View style={s.dayCircle}>
                      <Text style={[s.dayText, { color: colors.textPrimary }]}>{day}</Text>
                    </View>
                  )}
                  {/* Activity dot */}
                  <View
                    style={[
                      s.dot,
                      {
                        backgroundColor: isActive
                          ? '#22C55E'
                          : 'transparent',
                        borderColor: isActive ? 'transparent' : '#3C3C3E',
                        borderWidth: isActive ? 0 : 1,
                      },
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend */}
          <View style={s.legend}>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: '#22C55E' }]} />
              <Text style={[s.legendText, { color: colors.textSecondary }]}>Día activo</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendCircle, { borderColor: colors.primary }]} />
              <Text style={[s.legendText, { color: colors.textSecondary }]}>Hoy</Text>
            </View>
            <View style={s.legendItem}>
              <LinearGradient colors={[colors.primary, colors.primary + 'CC']} style={s.legendFill} />
              <Text style={[s.legendText, { color: colors.textSecondary }]}>Seleccionado</Text>
            </View>
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
    paddingVertical: 14,
  },
  closeBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  closeText: { fontSize: 22, fontWeight: '300' },
  title: { fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 16 },

  // Streak Cards
  cardsRow: { flexDirection: 'row', gap: 12 },
  card: {
    flex: 1,
    borderRadius: Radius.xl,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    overflow: 'hidden',
    position: 'relative',
  },
  cardAccent: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  iconEmoji: { fontSize: 32 },
  cardValue: { fontSize: 42, fontWeight: '900', letterSpacing: -1, lineHeight: 50 },
  cardLabel: { fontSize: 12, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  cardDivider: { width: '100%', height: 1, backgroundColor: '#2C2C2E', marginVertical: 12 },
  bestRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trophy: { fontSize: 13 },
  bestText: { fontSize: 12, fontWeight: '500' },

  // Stats Bar
  statsBar: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  statLbl: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  statDivider: { width: 1, marginVertical: 4 },

  // Calendar Card
  calCard: {
    borderRadius: Radius.xl,
    padding: 16,
    borderWidth: 1,
  },
  calHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrow: { fontSize: 22, fontWeight: '600', lineHeight: 26 },
  calMonth: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },

  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekDay: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 12, fontWeight: '700' },

  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 6,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleToday: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  dayCircleSelected: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { fontSize: 14, fontWeight: '600' },
  dot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 2 },

  // Legend
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 3.5 },
  legendCircle: { width: 7, height: 7, borderRadius: 3.5, borderWidth: 1.5 },
  legendFill: { width: 7, height: 7, borderRadius: 3.5 },
  legendText: { fontSize: 11, fontWeight: '500' },
});
