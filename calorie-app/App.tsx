import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { CalorieEstimate, estimateCalories } from './src/gemini';

// Shrink big phone photos before upload: faster and cheaper, still plenty for Gemini.
async function toSmallJpegBase64(uri: string): Promise<string> {
  const ctx = ImageManipulator.manipulate(uri);
  ctx.resize({ width: 1024 });
  const image = await ctx.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!result.base64) throw new Error('Could not process the photo.');
  return result.base64;
}

export default function App() {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CalorieEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(source: 'camera' | 'library') {
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Camera access needed', 'Allow camera access in Settings to snap your food.');
        return;
      }
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
    const picked =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (picked.canceled || !picked.assets[0]) return;

    const uri = picked.assets[0].uri;
    setPhotoUri(uri);
    await analyze(uri);
  }

  async function analyze(uri: string) {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const base64 = await toSmallJpegBase64(uri);
      setResult(await estimateCalories(base64));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Calorie Snap</Text>
        <Text style={styles.subtitle}>Take a photo of your meal and Gemini will estimate the calories.</Text>

        <View style={styles.buttons}>
          <Pressable style={[styles.button, styles.primary]} onPress={() => pick('camera')} disabled={loading}>
            <Text style={styles.primaryText}>📷  Take Photo</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.secondary]} onPress={() => pick('library')} disabled={loading}>
            <Text style={styles.secondaryText}>🖼️  Choose Photo</Text>
          </Pressable>
        </View>

        {photoUri && <Image source={{ uri: photoUri }} style={styles.photo} />}

        {loading && (
          <View style={styles.card}>
            <ActivityIndicator size="large" />
            <Text style={styles.muted}>Asking Gemini…</Text>
          </View>
        )}

        {error && (
          <View style={[styles.card, styles.errorCard]}>
            <Text style={styles.errorText}>{error}</Text>
            {photoUri && (
              <Pressable onPress={() => analyze(photoUri)}>
                <Text style={styles.link}>Try again</Text>
              </Pressable>
            )}
          </View>
        )}

        {result && !result.isFood && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No food found 🤔</Text>
            <Text style={styles.muted}>{result.notes || 'Try a clearer photo of your meal.'}</Text>
          </View>
        )}

        {result && result.isFood && (
          <View style={styles.card}>
            <Text style={styles.total}>{result.totalCalories}</Text>
            <Text style={styles.totalLabel}>estimated calories · {result.confidence} confidence</Text>

            <View style={styles.macros}>
              <Macro label="Protein" grams={result.proteinGrams} />
              <Macro label="Carbs" grams={result.carbsGrams} />
              <Macro label="Fat" grams={result.fatGrams} />
            </View>

            {result.items.map((item, i) => (
              <View key={i} style={styles.item}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.muted}>{item.portion}</Text>
                </View>
                <Text style={styles.itemCal}>{item.calories} kcal</Text>
              </View>
            ))}

            {!!result.notes && <Text style={styles.notes}>{result.notes}</Text>}
            <Text style={styles.disclaimer}>AI estimate only — actual values may vary.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Macro({ label, grams }: { label: string; grams: number }) {
  return (
    <View style={styles.macro}>
      <Text style={styles.macroValue}>{grams}g</Text>
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F7F9' },
  container: { padding: 20, gap: 16 },
  title: { fontSize: 34, fontWeight: '800', color: '#111' },
  subtitle: { fontSize: 16, color: '#555' },
  buttons: { flexDirection: 'row', gap: 12 },
  button: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  primary: { backgroundColor: '#22A06B' },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D0D4DA' },
  secondaryText: { color: '#111', fontWeight: '700', fontSize: 16 },
  photo: { width: '100%', aspectRatio: 1, borderRadius: 16, backgroundColor: '#ddd' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, gap: 10, alignItems: 'stretch' },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  errorCard: { backgroundColor: '#FFF0F0' },
  errorText: { color: '#B00020' },
  link: { color: '#0A66C2', fontWeight: '600' },
  muted: { color: '#666', fontSize: 14, textAlign: 'left' },
  total: { fontSize: 56, fontWeight: '800', color: '#22A06B', textAlign: 'center' },
  totalLabel: { textAlign: 'center', color: '#666', marginTop: -6 },
  macros: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },
  macro: { alignItems: 'center' },
  macroValue: { fontSize: 20, fontWeight: '700' },
  item: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#DDD',
  },
  itemName: { fontSize: 16, fontWeight: '600', textTransform: 'capitalize' },
  itemCal: { fontSize: 16, fontWeight: '700' },
  notes: { fontSize: 14, color: '#444', fontStyle: 'italic' },
  disclaimer: { fontSize: 12, color: '#999', textAlign: 'center' },
});
