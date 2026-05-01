import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius } from '../../constants';
import { getFoodByBarcode } from '../../services/foodDatabase';
import { analyzeFoodPhoto } from '../../services/groq';
import { useNutritionStore } from '../../store';

type ScanMode = 'barcode' | 'photo';

export default function ScanModal() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned]           = useState(false);
  const [loading, setLoading]           = useState(false);
  const [mode, setMode]                 = useState<ScanMode>('barcode');
  const [photoResult, setPhotoResult]   = useState<{
    foods: { name: string; grams: number; calories: number; protein: number; carbs: number; fat: number }[];
    totalCalories: number;
    confidence: 'high' | 'medium' | 'low';
    notes: string;
  } | null>(null);
  const [capturedUri, setCapturedUri]    = useState<string | null>(null);
  const cameraRef = useRef<any>(null);
  const { addLog } = useNutritionStore();

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  // ─── Barcode handler ─────────────────────────────────────────────────────────
  const handleBarcode = async ({ data }: { type: string; data: string }) => {
    if (scanned || loading || mode !== 'barcode') return;
    setScanned(true);
    setLoading(true);

    try {
      const food = await getFoodByBarcode(data);
      setLoading(false);

      if (!food) {
        Alert.alert(
          'Product not found',
          `Barcode: ${data}\n\nThis product isn't in our database yet.`,
          [
            { text: 'Try Again', onPress: () => setScanned(false) },
            { text: 'Close', onPress: () => router.back() },
          ]
        );
        return;
      }

      // Navigate to food detail to confirm and add
      router.replace({
        pathname: '/modals/food-detail',
        params: { foodJson: JSON.stringify(food) },
      });
    } catch {
      setLoading(false);
      Alert.alert('Error', 'Failed to look up barcode. Please try again.', [
        { text: 'OK', onPress: () => setScanned(false) },
      ]);
    }
  };

  // ─── Photo capture handler ohh sii ──────────────────────────────────────────────────
  const handleTakePhoto = async () => {
    if (loading || !cameraRef.current) return;
    setLoading(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.2,
        exif: false,
      });

      setCapturedUri(photo.uri);

      const result = await analyzeFoodPhoto(photo.base64);
      setPhotoResult(result);
    } catch (err: any) {
      console.error('Analysis Error:', err);
      Alert.alert('Analysis Failed', `Could not analyze the food photo.\n\nError: ${err?.message || err}`, [
        { text: 'OK' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ─── Add all detected foods to tracker ──────────────────────────────────────
  const handleAddAllFoods = () => {
    if (!photoResult) return;

    photoResult.foods.forEach((food) => {
      addLog({
        id:       `${Date.now()}-${food.name}`,
        foodItem: {
          id:       `ai-${Date.now()}-${food.name}`,
          name:     food.name,
          calories: Math.round((food.calories / food.grams) * 100),
          protein:  Math.round((food.protein / food.grams) * 100),
          carbs:    Math.round((food.carbs / food.grams) * 100),
          fat:      Math.round((food.fat / food.grams) * 100),
          source:   'custom',
        },
        grams:    food.grams,
        meal:     getAutoMeal(),
        loggedAt: new Date().toISOString(),
        calories: food.calories,
        protein:  food.protein,
        carbs:    food.carbs,
        fat:      food.fat,
      });
    });

    Alert.alert(
      'Added! ✅',
      `${photoResult.foods.length} item(s) added to ${getAutoMeal()}.`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  const getAutoMeal = (): 'breakfast' | 'lunch' | 'dinner' | 'snack' => {
    const h = new Date().getHours();
    if (h < 10) return 'breakfast';
    if (h < 14) return 'lunch';
    if (h < 18) return 'snack';
    return 'dinner';
  };

  const resetPhoto = () => {
    setCapturedUri(null);
    setPhotoResult(null);
  };

  // ─── Permission screens ────────────────────────────────────────────────────
  if (!permission) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={s.center}>
        <Text style={s.noPermText}>Camera permission is required to scan food.</Text>
        <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
          <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.permGrad}>
            <Text style={s.permBtnText}>Grant Permission</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Photo result screen ────────────────────────────────────────────────────
  if (photoResult && capturedUri) {
    const confidenceColor = photoResult.confidence === 'high'
      ? Colors.success
      : photoResult.confidence === 'medium'
        ? Colors.warning
        : Colors.error;

    return (
      <View style={s.container}>
        <View style={s.resultHeader}>
          <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
            <Text style={s.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={s.title}>AI Food Analysis</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.base, paddingBottom: 100 }}>
          {/* Captured image */}
          <Image source={{ uri: capturedUri }} style={s.capturedImage} resizeMode="cover" />

          {/* Confidence badge */}
          <View style={[s.confidenceBadge, { borderColor: confidenceColor }]}>
            <View style={[s.confidenceDot, { backgroundColor: confidenceColor }]} />
            <Text style={[s.confidenceText, { color: confidenceColor }]}>
              {photoResult.confidence.toUpperCase()} confidence
            </Text>
          </View>

          {/* Detected foods */}
          <Text style={s.sectionTitle}>Detected Foods</Text>
          {photoResult.foods.map((food, i) => (
            <View key={i} style={s.foodCard}>
              <View style={s.foodCardLeft}>
                <Text style={s.foodName}>{food.name}</Text>
                <Text style={s.foodGrams}>{food.grams}g</Text>
              </View>
              <View style={s.foodCardRight}>
                <Text style={s.foodCal}>{food.calories} kcal</Text>
                <View style={s.macroRow}>
                  <Text style={[s.macroTag, { color: Colors.protein }]}>P {food.protein}g</Text>
                  <Text style={[s.macroTag, { color: Colors.carbs }]}>C {food.carbs}g</Text>
                  <Text style={[s.macroTag, { color: Colors.fat }]}>F {food.fat}g</Text>
                </View>
              </View>
            </View>
          ))}

          {/* Total */}
          <LinearGradient colors={['#7C5CFC15', '#22D3EE11']} style={s.totalCard}>
            <Text style={s.totalLabel}>Total Calories</Text>
            <Text style={s.totalValue}>{photoResult.totalCalories} kcal</Text>
          </LinearGradient>

          {/* Notes */}
          {photoResult.notes && (
            <Text style={s.notesText}>💡 {photoResult.notes}</Text>
          )}
        </ScrollView>

        {/* Action buttons */}
        <View style={s.resultFooter}>
          <TouchableOpacity style={s.retryBtn} onPress={resetPhoto}>
            <Text style={s.retryText}>📷 Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.addAllBtn} onPress={handleAddAllFoods} activeOpacity={0.85}>
            <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.addAllGrad}>
              <Text style={s.addAllText}>Add All to {getAutoMeal().charAt(0).toUpperCase() + getAutoMeal().slice(1)}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Camera view ────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={mode === 'barcode' && !scanned ? handleBarcode : undefined}
        barcodeScannerSettings={mode === 'barcode' ? { barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr', 'code128'] } : undefined}
      />

      {/* Overlay */}
      <View style={s.overlay}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
            <Text style={s.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={s.title}>{mode === 'barcode' ? 'Scan Barcode' : 'Photo AI'}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Mode toggle */}
        <View style={s.modeRow}>
          <TouchableOpacity
            style={[s.modePill, mode === 'barcode' && s.modePillActive]}
            onPress={() => { setMode('barcode'); setScanned(false); }}
          >
            <Text style={[s.modeText, mode === 'barcode' && s.modeTextActive]}>🔍 Barcode</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.modePill, mode === 'photo' && s.modePillActive]}
            onPress={() => { setMode('photo'); setScanned(false); }}
          >
            <Text style={[s.modeText, mode === 'photo' && s.modeTextActive]}>📸 Food Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Viewfinder (barcode mode) or instructions (photo mode) */}
        <View style={s.viewfinderWrap}>
          {mode === 'barcode' ? (
            <View style={s.viewfinder}>
              <View style={[s.corner, s.tl]} />
              <View style={[s.corner, s.tr]} />
              <View style={[s.corner, s.bl]} />
              <View style={[s.corner, s.br]} />
            </View>
          ) : (
            <View style={s.photoInstructions}>
              <Text style={s.photoEmoji}>🍽️</Text>
              <Text style={s.photoHint}>Point at your food and tap the button below</Text>
              <Text style={s.photoHintSub}>AI will analyze the food and estimate nutrition</Text>
            </View>
          )}
        </View>

        {/* Status / shutter button */}
        <View style={s.statusWrap}>
          {mode === 'barcode' ? (
            <>
              {loading ? (
                <View style={s.statusPill}>
                  <ActivityIndicator color={Colors.primary} size="small" />
                  <Text style={s.statusText}>Looking up product…</Text>
                </View>
              ) : scanned ? (
                <View style={s.statusPill}>
                  <Text style={s.statusText}>✅ Barcode scanned</Text>
                </View>
              ) : (
                <View style={s.statusPill}>
                  <Text style={s.statusText}>Point at a barcode to scan</Text>
                </View>
              )}
            </>
          ) : (
            <>
              {loading ? (
                <View style={s.statusPill}>
                  <ActivityIndicator color={Colors.primary} size="small" />
                  <Text style={s.statusText}>Analyzing food…</Text>
                </View>
              ) : (
                <TouchableOpacity style={s.shutterOuter} onPress={handleTakePhoto} activeOpacity={0.8}>
                  <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.shutterInner}>
                    <Text style={s.shutterIcon}>📸</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#000' },
  center:       { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', padding: Spacing.base },
  noPermText:   { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginBottom: 20 },
  permBtn:      { borderRadius: Radius.md, overflow: 'hidden' },
  permGrad:     { paddingHorizontal: 24, paddingVertical: 14 },
  permBtnText:  { color: '#fff', fontWeight: '700', fontSize: 16 },
  overlay:      { flex: 1 },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.base, paddingTop: 56, paddingBottom: 12 },
  closeBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  closeText:    { color: '#fff', fontSize: 16, fontWeight: '700' },
  title:        { fontSize: 18, fontWeight: '700', color: '#fff' },

  // Mode toggle
  modeRow:      { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.base, marginBottom: 8 },
  modePill:     { flex: 1, borderRadius: Radius.full, paddingVertical: 10, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)' },
  modePillActive:{ backgroundColor: 'rgba(124,92,252,0.3)', borderColor: Colors.primary },
  modeText:     { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600' },
  modeTextActive:{ color: '#fff' },

  // Viewfinder
  viewfinderWrap:{ flex: 1, justifyContent: 'center', alignItems: 'center' },
  viewfinder:   { width: 260, height: 180 },
  corner:       { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE, borderColor: Colors.primary, borderWidth: CORNER_THICKNESS },
  tl:           { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  tr:           { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  bl:           { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  br:           { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },

  // Photo mode instructions
  photoInstructions: { alignItems: 'center', gap: 12, paddingHorizontal: 40 },
  photoEmoji:   { fontSize: 48 },
  photoHint:    { fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center' },
  photoHintSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },

  // Bottom area
  statusWrap:   { padding: Spacing.base, paddingBottom: 60, alignItems: 'center' },
  statusPill:   { flexDirection: 'row', gap: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: Radius.full, paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center' },
  statusText:   { color: '#fff', fontSize: 14, fontWeight: '500' },

  // Shutter button
  shutterOuter: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)', justifyContent: 'center', alignItems: 'center' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  shutterIcon:  { fontSize: 28 },

  // ── Result screen ──────────────────────────────────────────────────────────
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.base, paddingTop: 56, paddingBottom: 12, backgroundColor: Colors.background },
  capturedImage:{ width: '100%', height: 200, borderRadius: Radius.xl, marginBottom: Spacing.base },

  confidenceBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radius.full, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 6, marginBottom: Spacing.base },
  confidenceDot:   { width: 8, height: 8, borderRadius: 4 },
  confidenceText:  { fontSize: 12, fontWeight: '700' },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },

  foodCard:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.base, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  foodCardLeft:  { flex: 1, marginRight: 12 },
  foodName:      { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  foodGrams:     { fontSize: 12, color: Colors.textMuted },
  foodCardRight: { alignItems: 'flex-end' },
  foodCal:       { fontSize: 16, fontWeight: '800', color: Colors.accent, marginBottom: 4 },
  macroRow:      { flexDirection: 'row', gap: 8 },
  macroTag:      { fontSize: 11, fontWeight: '600' },

  totalCard:     { borderRadius: Radius.lg, padding: Spacing.base, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 8, borderWidth: 1, borderColor: '#7C5CFC33' },
  totalLabel:    { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  totalValue:    { fontSize: 22, fontWeight: '800', color: Colors.accent },

  notesText:     { fontSize: 13, color: Colors.textSecondary, marginTop: 8, lineHeight: 20 },

  resultFooter:  { flexDirection: 'row', gap: 10, padding: Spacing.base, borderTopWidth: 1, borderTopColor: Colors.border, paddingBottom: 36, backgroundColor: Colors.background },
  retryBtn:      { flex: 1, paddingVertical: 14, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  retryText:     { color: Colors.textSecondary, fontWeight: '600', fontSize: 15 },
  addAllBtn:     { flex: 2, borderRadius: Radius.md, overflow: 'hidden' },
  addAllGrad:    { paddingVertical: 14, alignItems: 'center' },
  addAllText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
});
