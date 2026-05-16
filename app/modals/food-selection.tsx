import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store';
import { supabase } from '../../services/supabase';
import { Radius, Spacing } from '../../constants';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Apple, ChevronLeft, Sparkles, AlertCircle } from 'lucide-react-native';

const FOOD_CATEGORIES = [
  {
    id: 'proteins',
    title: 'proteins',
    min: 3,
    items: [
      { id: 'chicken', label: 'chicken', emoji: '🍗' },
      { id: 'beef', label: 'beef', emoji: '🥩' },
      { id: 'fish', label: 'fish', emoji: '🐟' },
      { id: 'salmon', label: 'salmon', emoji: '🍣' },
      { id: 'tuna', label: 'tuna', emoji: '🐟' },
      { id: 'turkey', label: 'turkey', emoji: '🦃' },
      { id: 'pork', label: 'pork', emoji: '🥩' },
      { id: 'eggs', label: 'eggs', emoji: '🥚' },
      { id: 'tofu', label: 'tofu', emoji: '🧊' },
      { id: 'greek_yogurt', label: 'greek_yogurt', emoji: '🍦' },
      { id: 'cottage_cheese', label: 'cottage_cheese', emoji: '🧀' },
      { id: 'protein_powder', label: 'protein_powder', emoji: '🥛' },
      { id: 'shrimp', label: 'shrimp', emoji: '🦐' },
      { id: 'seitan', label: 'seitan', emoji: '🌾' },
      { id: 'tempeh', label: 'tempeh', emoji: '🧊' },
      { id: 'lamb', label: 'lamb', emoji: '🍖' },
    ]
  },
  {
    id: 'carbs',
    title: 'carbs',
    min: 3,
    items: [
      { id: 'rice', label: 'rice', emoji: '🍚' },
      { id: 'potato', label: 'potato', emoji: '🥔' },
      { id: 'sweet_potato', label: 'sweet_potato', emoji: '🍠' },
      { id: 'pasta', label: 'pasta', emoji: '🍝' },
      { id: 'oats', label: 'oats', emoji: '🥣' },
      { id: 'quinoa', label: 'quinoa', emoji: '🥗' },
      { id: 'couscous', label: 'couscous', emoji: '🍚' },
      { id: 'bulgur', label: 'bulgur', emoji: '🥣' },
      { id: 'beans', label: 'beans', emoji: '🫘' },
      { id: 'lentils', label: 'lentils', emoji: '🥘' },
      { id: 'bread', label: 'bread', emoji: '🍞' },
      { id: 'rice_cakes', label: 'rice_cakes', emoji: '🍘' },
      { id: 'corn', label: 'corn', emoji: '🌽' },
      { id: 'tortilla', label: 'tortilla', emoji: '🫓' },
      { id: 'plantain', label: 'plantain', emoji: '🍌' },
    ]
  },
  {
    id: 'fats',
    title: 'fats',
    min: 1,
    items: [
      { id: 'avocado', label: 'avocado', emoji: '🥑' },
      { id: 'nuts', label: 'nuts', emoji: '🥜' },
      { id: 'almonds', label: 'almonds', emoji: '🫘' },
      { id: 'walnuts', label: 'walnuts', emoji: '🥜' },
      { id: 'peanut_butter', label: 'peanut_butter', emoji: '🍯' },
      { id: 'olive_oil', label: 'olive_oil', emoji: '🫒' },
      { id: 'cheese', label: 'cheese', emoji: '🧀' },
      { id: 'yogurt', label: 'yogurt', emoji: '🍦' },
      { id: 'chia_seeds', label: 'chia_seeds', emoji: '🌱' },
      { id: 'pumpkin_seeds', label: 'pumpkin_seeds', emoji: '🎃' },
      { id: 'sunflower_seeds', label: 'sunflower_seeds', emoji: '🌻' },
      { id: 'coconut_oil', label: 'coconut_oil', emoji: '🥥' },
      { id: 'ghee', label: 'ghee', emoji: '🧈' },
    ]
  },
  {
    id: 'fruits',
    title: 'fruits',
    min: 2,
    items: [
      { id: 'banana', label: 'banana', emoji: '🍌' },
      { id: 'apple', label: 'apple', emoji: '🍎' },
      { id: 'berries', label: 'berries', emoji: '🍓' },
      { id: 'grapes', label: 'grapes', emoji: '🍇' },
      { id: 'watermelon', label: 'watermelon', emoji: '🍉' },
      { id: 'orange', label: 'orange', emoji: '🍊' },
      { id: 'mango', label: 'mango', emoji: '🥭' },
      { id: 'pineapple', label: 'pineapple', emoji: '🍍' },
      { id: 'peach', label: 'peach', emoji: '🍑' },
      { id: 'pear', label: 'pear', emoji: '🍐' },
      { id: 'kiwi', label: 'kiwi', emoji: '🥝' },
      { id: 'cherry', label: 'cherry', emoji: '🍒' },
    ]
  },
  {
    id: 'veggies',
    title: 'veggies',
    min: 2,
    items: [
      { id: 'broccoli', label: 'broccoli', emoji: '🥦' },
      { id: 'spinach', label: 'spinach', emoji: '🥬' },
      { id: 'kale', label: 'kale', emoji: '🥬' },
      { id: 'carrot', label: 'carrot', emoji: '🥕' },
      { id: 'tomato', label: 'tomato', emoji: '🍅' },
      { id: 'onion', label: 'onion', emoji: '🧅' },
      { id: 'lettuce', label: 'lettuce', emoji: '🥬' },
      { id: 'cucumber', label: 'cucumber', emoji: '🥒' },
      { id: 'bell_pepper', label: 'bell_pepper', emoji: '🫑' },
      { id: 'zucchini', label: 'zucchini', emoji: '🥒' },
      { id: 'asparagus', label: 'asparagus', emoji: '🥬' },
      { id: 'cauliflower', label: 'cauliflower', emoji: '🥦' },
      { id: 'mushroom', label: 'mushroom', emoji: '🍄' },
      { id: 'eggplant', label: 'eggplant', emoji: '🍆' },
    ]
  },
  {
    id: 'condiments',
    title: 'condiments',
    min: 1,
    items: [
      { id: 'salt', label: 'salt', emoji: '🧂' },
      { id: 'pepper', label: 'pepper', emoji: '🌶️' },
      { id: 'soy_sauce', label: 'soy_sauce', emoji: '🍶' },
      { id: 'hot_sauce', label: 'hot_sauce', emoji: '🥫' },
      { id: 'sriracha', label: 'sriracha', emoji: '🔥' },
      { id: 'garlic', label: 'garlic', emoji: '🧄' },
      { id: 'mustard', label: 'mustard', emoji: '🍯' },
      { id: 'lemon_juice', label: 'lemon_juice', emoji: '🍋' },
      { id: 'balsamic', label: 'balsamic', emoji: '🍶' },
      { id: 'cinnamon', label: 'cinnamon', emoji: '🪵' },
      { id: 'turmeric', label: 'turmeric', emoji: '🟡' },
      { id: 'ginger', label: 'ginger', emoji: '🫚' },
      { id: 'mayonnaise', label: 'mayonnaise', emoji: '🍯' },
      { id: 'ketchup', label: 'ketchup', emoji: '🥫' },
    ]
  }
];

export default function FoodSelectionModal() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { profile, setProfile } = useAuthStore();
  const [selected, setSelected] = useState<string[]>(profile?.availableFoods || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = (categoryItems: {id: string}[]) => {
    const itemIds = categoryItems.map(i => i.id);
    const allSelected = itemIds.every(id => selected.includes(id));
    
    if (allSelected) {
      setSelected(prev => prev.filter(id => !itemIds.includes(id)));
    } else {
      setSelected(prev => [...new Set([...prev, ...itemIds])]);
    }
  };

  const handleSave = async () => {
    // Validation
    for (const cat of FOOD_CATEGORIES) {
      const selectedInCategory = cat.items.filter(item => selected.includes(item.id));
      if (selectedInCategory.length < cat.min) {
        setError(
          t('onboarding.validationFoodMin', { 
            category: t(`onboarding.${cat.title}`), 
            min: cat.min 
          })
        );
        return;
      }
    }

    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ available_foods: selected })
        .eq('id', profile.id);

      if (error) throw error;
      setProfile({ ...profile, availableFoods: selected });
      router.back();
    } catch (err) {
      console.error(err);
      Alert.alert(t('common.error'), t('profile.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      {/* Error Overlay */}
      {error && (
        <View style={s.errorContainer}>
          <LinearGradient
            colors={[colors.error + 'EE', colors.error]}
            style={s.errorGradient}
          >
            <AlertCircle size={22} color="#FFF" />
            <Text style={s.errorText}>{error}</Text>
          </LinearGradient>
        </View>
      )}

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ChevronLeft size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.textPrimary }]}>{t('profile.mealPlanFoods')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={s.content} 
        showsVerticalScrollIndicator={false}
      >
        <View style={s.intro}>
           <View style={[s.iconCircle, { backgroundColor: colors.primary + '15' }]}>
              <Apple size={32} color={colors.primary} />
           </View>
           <Text style={[s.introTitle, { color: colors.textPrimary }]}>{t('onboarding.foodsTitle')}</Text>
           <Text style={[s.introSub, { color: colors.textSecondary }]}>{t('onboarding.foodsSub')}</Text>
        </View>

        {FOOD_CATEGORIES.map((cat) => (
          <View key={cat.id} style={s.category}>
            <View style={s.catHeader}>
              <View>
                <Text style={[s.catTitle, { color: colors.textPrimary }]}>{t(`onboarding.${cat.title}`)}</Text>
                <Text style={[s.catSub, { color: colors.textSecondary }]}>{t('onboarding.chooseAtLeast', { count: cat.min })}</Text>
              </View>
              <TouchableOpacity onPress={() => selectAll(cat.items)}>
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>{t('onboarding.selectAll')}</Text>
              </TouchableOpacity>
            </View>
            
            <View style={s.grid}>
              {cat.items.map((item) => {
                const active = selected.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      s.pill, 
                      { backgroundColor: colors.surface, borderColor: colors.border }, 
                      active && { 
                        borderColor: colors.primary, 
                        backgroundColor: colors.primary + '15',
                        shadowColor: colors.primary,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 4,
                      }
                    ]}
                    onPress={() => toggle(item.id)}
                    activeOpacity={0.7}
                  >
                    {active && (
                      <LinearGradient
                        colors={[colors.primary + '10', colors.primary + '05']}
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                    <Text style={{ fontSize: 16, marginRight: 8 }}>{item.emoji}</Text>
                    <Text style={[s.pillText, { color: colors.textSecondary }, active && { color: colors.textPrimary, fontWeight: '800' }]}>
                      {t(`onboarding.foodItems.${item.label}`) || item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
          <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.saveGrad}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={s.saveText}>{t('common.save')}</Text>
                <Sparkles size={18} color="#fff" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1 },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:   { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title:     { fontSize: 18, fontWeight: '800' },
  content:   { padding: 20, paddingBottom: 120 },
  intro:     { alignItems: 'center', marginBottom: 32 },
  iconCircle: { 
    width: 80, height: 80, borderRadius: 40, 
    justifyContent: 'center', alignItems: 'center', 
    marginBottom: 24,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10
  },
  introTitle: { fontSize: 24, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  introSub:  { fontSize: 14, textAlign: 'center', opacity: 0.7, paddingHorizontal: 20, marginBottom: 10 },
  category:  { marginBottom: 36 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  catTitle:  { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  catSub:    { fontSize: 13, opacity: 0.6, fontWeight: '600', marginTop: 2 },
  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  pill:      { 
    borderRadius: 20, 
    borderWidth: 1.5, 
    paddingHorizontal: 16, 
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden'
  },
  pillText:  { fontSize: 15, fontWeight: '600' },
  footer:    { 
    position: 'absolute', bottom: 0, left: 0, right: 0, 
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: 'transparent'
  },
  saveBtn:   { 
    borderRadius: Radius.xl, 
    overflow: 'hidden', 
    shadowColor: '#7C5CFC', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8 
  },
  saveGrad:  { paddingVertical: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  saveText:  { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  errorContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  errorGradient: {
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  errorText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
});
