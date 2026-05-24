import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, X, Upload, Brain, CheckCircle, ArrowUpCircle, History, ChevronRight } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { Spacing, Radius, Shadow } from '../../constants';
import { analyzePhysiquePhoto } from '../../services/groq';
import { useSettingsStore, useProgressStore } from '../../store';
import { getLocalDateString } from '../../utils/date';

export default function ProgressEvaluationModal() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { language } = useSettingsStore();
  const { evaluations, addEvaluation } = useProgressStore();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    id?: string;
    feedback: string;
    strengths: string[];
    improvements: string[];
    estimatedFatPercentage: string;
    base64ImageData?: string;
  } | null>(null);

  const [showHistory, setShowHistory] = useState(false);

  const pickImage = async (useCamera: boolean = false) => {
    try {
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          alert(t('common.cameraPermissionDenied', 'Se necesita permiso para la cámara.'));
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [3, 4],
          quality: 0.8,
          base64: true,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          alert(t('common.galleryPermissionDenied', 'Se necesita permiso para la galería.'));
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [3, 4],
          quality: 0.8,
          base64: true,
        });
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setBase64Image(result.assets[0].base64 || null);
        setResult(null); // Clear previous result
        setShowHistory(false);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const handleAnalyze = async () => {
    if (!base64Image || !imageUri) return;
    setIsAnalyzing(true);
    try {
      const response = await analyzePhysiquePhoto(base64Image, language);
      const dataUri = `data:image/jpeg;base64,${base64Image}`;
      const newEvaluation = {
        id: Math.random().toString(36).substring(7),
        uri: imageUri,
        base64ImageData: dataUri,
        date: getLocalDateString(),
        ...response
      };
      setResult(newEvaluation);
      addEvaluation(newEvaluation);
    } catch (error) {
      console.error(error);
      alert(t('common.error', 'Ocurrió un error al analizar la imagen.'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderResult = (res: typeof result, hideNewBtn = false) => {
    if (!res) return null;
    return (
      <View style={s.resultContainer}>
        <View style={[s.resultCard, { backgroundColor: colors.surface }]}>
          <Text style={[s.resultTitle, { color: colors.primary }]}>{t('evaluation.feedbackTitle', 'Veredicto del Coach')}</Text>
          <Text style={[s.feedbackText, { color: colors.textPrimary }]}>{res.feedback}</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: Spacing.md }}>
          <View style={[s.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[s.statLabel, { color: colors.textSecondary }]}>{t('evaluation.estFat', 'Grasa Est.')}</Text>
            <Text style={[s.statValue, { color: colors.primary }]}>{res.estimatedFatPercentage}</Text>
          </View>
        </View>

        <View style={[s.listCard, { backgroundColor: colors.surface }]}>
          <View style={s.listHeader}>
            <CheckCircle size={20} color={colors.success} />
            <Text style={[s.listTitle, { color: colors.success }]}>{t('evaluation.strengths', 'Puntos Fuertes')}</Text>
          </View>
          {res.strengths.map((str, i) => (
            <Text key={i} style={[s.listItem, { color: colors.textPrimary }]}>• {str}</Text>
          ))}
        </View>

        <View style={[s.listCard, { backgroundColor: colors.surface }]}>
          <View style={s.listHeader}>
            <ArrowUpCircle size={20} color={colors.warning} />
            <Text style={[s.listTitle, { color: colors.warning }]}>{t('evaluation.improvements', 'Áreas de Mejora')}</Text>
          </View>
          {res.improvements.map((imp, i) => (
            <Text key={i} style={[s.listItem, { color: colors.textPrimary }]}>• {imp}</Text>
          ))}
        </View>
        
        {!hideNewBtn && (
          <TouchableOpacity style={[s.primaryBtn, { backgroundColor: colors.primary, marginTop: Spacing.lg }]} onPress={() => { setImageUri(null); setResult(null); }}>
            <Text style={s.primaryBtnText}>{t('evaluation.newAnalysis', 'Nuevo Análisis')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const viewHistoryItem = (item: typeof evaluations[0]) => {
    // Use base64 data URI if available (persists across app sessions), otherwise fall back to uri
    const displayUri = item.base64ImageData || item.uri;
    setImageUri(displayUri);
    setResult(item);
    setShowHistory(false);
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Text style={[s.title, { color: colors.textPrimary }]}>
          {t('dashboard.evaluatePhysique', 'Evaluación Físca IA')}
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={[s.closeBtn, { backgroundColor: colors.surface }]}>
          <X size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        {showHistory ? (
          <View>
             <TouchableOpacity style={s.backToMainBtn} onPress={() => setShowHistory(false)}>
               <ChevronRight size={20} color={colors.primary} style={{ transform: [{ rotate: '180deg' }] }} />
               <Text style={[s.backToMainText, { color: colors.primary }]}>{t('common.back', 'Volver')}</Text>
             </TouchableOpacity>
             <Text style={[s.historyTitle, { color: colors.textPrimary }]}>{t('evaluation.history', 'Historial de Evaluaciones')}</Text>
             {evaluations.length === 0 ? (
               <Text style={[s.instruction, { color: colors.textSecondary }]}>{t('evaluation.noHistory', 'Aún no hay evaluaciones.')}</Text>
             ) : (
               evaluations.map(e => (
                 <TouchableOpacity key={e.id} style={[s.historyItem, { backgroundColor: colors.surface, borderBottomColor: colors.border }]} onPress={() => viewHistoryItem(e)}>
                   <Image source={{ uri: e.base64ImageData || e.uri }} style={s.historyThumb} />
                   <View style={s.historyInfo}>
                     <Text style={[s.historyDate, { color: colors.textPrimary }]}>{e.date}</Text>
                     <Text style={[s.historyFat, { color: colors.textSecondary }]}>Grasa: {e.estimatedFatPercentage}</Text>
                   </View>
                   <ChevronRight size={20} color={colors.textSecondary} />
                 </TouchableOpacity>
               ))
             )}
          </View>
        ) : !imageUri ? (
          <View style={s.uploadSection}>
            <Text style={[s.instruction, { color: colors.textSecondary }]}>
              {t('evaluation.instruction', 'Sube o toma una foto de tu físico actual para recibir un análisis detallado de la IA sobre tus puntos fuertes y áreas a mejorar.')}
            </Text>
            
            <View style={s.buttonRow}>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => pickImage(true)}>
                <Camera size={24} color={colors.primary} />
                <Text style={[s.actionBtnText, { color: colors.textPrimary }]}>{t('common.camera', 'Cámara')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => pickImage(false)}>
                <Upload size={24} color={colors.primary} />
                <Text style={[s.actionBtnText, { color: colors.textPrimary }]}>{t('common.gallery', 'Galería')}</Text>
              </TouchableOpacity>
            </View>

            {evaluations.length > 0 && (
              <TouchableOpacity style={[s.historyBtn, { backgroundColor: colors.surface }]} onPress={() => setShowHistory(true)}>
                <History size={20} color={colors.textPrimary} />
                <Text style={[s.historyBtnText, { color: colors.textPrimary }]}>{t('evaluation.viewHistory', 'Ver Historial')}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={s.imageSection}>
            <Image source={{ uri: imageUri }} style={s.previewImage} />
            
            {!result && !isAnalyzing && (
              <View style={s.buttonRowImage}>
                <TouchableOpacity style={[s.secondaryBtn, { backgroundColor: colors.surface }]} onPress={() => { setImageUri(null); setResult(null); }}>
                  <Text style={[s.secondaryBtnText, { color: colors.textPrimary }]}>{t('common.retake', 'Cambiar')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.primaryBtn, { backgroundColor: colors.primary }]} onPress={handleAnalyze}>
                  <Brain size={20} color="#FFF" />
                  <Text style={s.primaryBtnText}>{t('evaluation.analyzeBtn', 'Analizar Físico')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {isAnalyzing && (
          <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[s.loadingText, { color: colors.textSecondary }]}>
              {t('evaluation.analyzing', 'Analizando tu desarrollo muscular...')}
            </Text>
          </View>
        )}

        {result && renderResult(result, !!result.id && imageUri === evaluations.find(e => e.id === result.id)?.uri)}

        {result && result.id && (
          <TouchableOpacity style={[s.secondaryBtn, { backgroundColor: colors.surface, marginTop: Spacing.md }]} onPress={() => { setImageUri(null); setResult(null); }}>
             <Text style={[s.secondaryBtnText, { color: colors.textPrimary }]}>{t('evaluation.backToMain', 'Volver al Inicio')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1 },
  title: { fontSize: 20, fontWeight: '700' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: 60 },
  uploadSection: { alignItems: 'center', marginTop: Spacing.xl },
  instruction: { fontSize: 16, textAlign: 'center', marginBottom: Spacing.xl, lineHeight: 24 },
  buttonRow: { flexDirection: 'row', gap: Spacing.md, width: '100%', justifyContent: 'center' },
  actionBtn: { flex: 1, height: 120, borderRadius: Radius.xl, borderWidth: 1, justifyContent: 'center', alignItems: 'center', gap: 12, ...Shadow.sm },
  actionBtnText: { fontSize: 16, fontWeight: '600' },
  historyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.xl, padding: Spacing.md, borderRadius: Radius.lg, width: '100%', justifyContent: 'center' },
  historyBtnText: { fontSize: 16, fontWeight: '600' },
  imageSection: { alignItems: 'center' },
  previewImage: { width: '100%', height: 400, borderRadius: Radius.xl, resizeMode: 'cover' },
  buttonRowImage: { flexDirection: 'row', gap: Spacing.md, width: '100%', marginTop: Spacing.lg },
  secondaryBtn: { flex: 1, height: 50, borderRadius: Radius.full, justifyContent: 'center', alignItems: 'center' },
  secondaryBtnText: { fontSize: 16, fontWeight: '600' },
  primaryBtn: { flex: 2, height: 50, borderRadius: Radius.full, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  loadingContainer: { alignItems: 'center', marginTop: Spacing.xl * 2 },
  loadingText: { marginTop: Spacing.md, fontSize: 16, fontWeight: '500' },
  resultContainer: { marginTop: Spacing.xl, gap: Spacing.md },
  resultCard: { padding: Spacing.lg, borderRadius: Radius.xl, ...Shadow.sm },
  resultTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  feedbackText: { fontSize: 15, lineHeight: 22 },
  statCard: { flex: 1, padding: Spacing.md, borderRadius: Radius.lg, alignItems: 'center', ...Shadow.sm },
  statLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: '800' },
  listCard: { padding: Spacing.lg, borderRadius: Radius.xl, ...Shadow.sm },
  listHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  listTitle: { fontSize: 16, fontWeight: '700' },
  listItem: { fontSize: 15, lineHeight: 22, marginBottom: 6 },
  backToMainBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },
  backToMainText: { fontSize: 16, fontWeight: '600' },
  historyTitle: { fontSize: 22, fontWeight: '700', marginBottom: Spacing.lg },
  historyItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: Radius.lg, marginBottom: Spacing.md },
  historyThumb: { width: 60, height: 60, borderRadius: Radius.md, marginRight: Spacing.md },
  historyInfo: { flex: 1 },
  historyDate: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  historyFat: { fontSize: 14 },
});
