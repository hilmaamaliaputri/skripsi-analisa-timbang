import { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert, Modal, Pressable,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { MODELS, DEFAULT_MODEL_ID } from "./models";
import { runOcr } from "./ocr/runners";

export default function ScannerScreen() {
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  const [imageUri, setImageUri] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const model = MODELS.find((m) => m.id === modelId);

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Izin kamera ditolak");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!res.canceled && res.assets?.[0]) {
      setImageUri(res.assets[0].uri);
      setResult(null);
    }
  };

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Izin galeri ditolak");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!res.canceled && res.assets?.[0]) {
      setImageUri(res.assets[0].uri);
      setResult(null);
    }
  };

  const runScan = async () => {
    if (!imageUri) return;
    setScanning(true);
    setResult(null);
    try {
      const ocrResult = await runOcr(modelId, imageUri);
      setResult(ocrResult);
    } catch (e) {
      console.error("[scan] failed:", e);
      Alert.alert("Scan gagal", e?.message ?? String(e));
    } finally {
      setScanning(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>OCR Timbangan</Text>

      {/* Model Picker — dropdown */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Model OCR</Text>
        <TouchableOpacity style={styles.dropdownBtn} onPress={() => setPickerOpen(true)}>
          <View style={{ flex: 1 }}>
            <View style={styles.dropdownRow}>
              <Text style={styles.dropdownLabel}>
                {model.displayName}
              </Text>
              {model.displayBadge && (
                <View style={styles.dropdownBadge}>
                  <Text style={styles.dropdownBadgeText}>{model.displayBadge}</Text>
                </View>
              )}
            </View>
            <Text style={styles.dropdownCodename}>{model.name}</Text>
            <Text style={styles.dropdownMeta}>
              {model.displayAccuracy} · {model.displaySpeed}
            </Text>
          </View>
          <Text style={styles.dropdownCaret}>▼</Text>
        </TouchableOpacity>
        <Text style={styles.modelDescSmall}>{model.displayDescription}</Text>
      </View>

      {/* Dropdown Modal */}
      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Pilih Model OCR</Text>
            {MODELS.map((m) => {
              const active = m.id === modelId;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.modalOption, active && styles.modalOptionActive]}
                  onPress={() => { setModelId(m.id); setPickerOpen(false); }}
                >
                  <View style={styles.dropdownRow}>
                    <Text style={[styles.modalOptionLabel, active && styles.modalOptionLabelActive]}>
                      {m.displayName}
                    </Text>
                    {m.displayBadge && (
                      <View style={[styles.dropdownBadge, active && styles.dropdownBadgeActive]}>
                        <Text style={styles.dropdownBadgeText}>{m.displayBadge}</Text>
                      </View>
                    )}
                    {active && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.dropdownCodename}>{m.name}</Text>
                  <Text style={styles.modalOptionMeta}>
                    {m.displayAccuracy} · {m.displaySpeed}
                  </Text>
                  <Text style={styles.modalOptionDesc}>{m.displayDescription}</Text>
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Image Preview */}
      <View style={styles.imageWrap}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>Belum ada gambar</Text>
            <Text style={styles.imagePlaceholderHint}>Ambil foto atau pilih dari galeri</Text>
          </View>
        )}
      </View>

      {/* Input Buttons */}
      <View style={styles.inputRow}>
        <TouchableOpacity style={styles.inputBtn} onPress={pickFromCamera}>
          <Text style={styles.inputBtnText}>📷 Kamera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.inputBtn} onPress={pickFromGallery}>
          <Text style={styles.inputBtnText}>🖼 Galeri</Text>
        </TouchableOpacity>
      </View>

      {/* Scan Button */}
      <TouchableOpacity
        style={[styles.scanBtn, (!imageUri || scanning) && styles.scanBtnDisabled]}
        onPress={runScan}
        disabled={!imageUri || scanning}
      >
        {scanning ? (
          <View style={styles.scanLoading}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.scanBtnText}>Memindai…</Text>
          </View>
        ) : (
          <Text style={styles.scanBtnText}>▶ Scan ({model.displayName})</Text>
        )}
      </TouchableOpacity>

      {/* Result Card */}
      {result && (
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>Hasil</Text>
          {result.value != null ? (
            <Text style={styles.resultValue}>{result.value}</Text>
          ) : (
            <Text style={styles.resultValueMiss}>Tidak terbaca</Text>
          )}
          <View style={styles.divider} />
          <Text style={styles.resultMeta}>
            {result.bestIter ?? "—"} · {result.bestMethod ?? "—"} · {(result.elapsedMs / 1000).toFixed(1)}s · {model.displayName}
          </Text>

          <TouchableOpacity onPress={() => setShowDetail(!showDetail)}>
            <Text style={styles.detailToggle}>
              {showDetail ? "▼" : "▶"} Detail iter ({result.iters.length})
            </Text>
          </TouchableOpacity>

          {showDetail && (
            <View style={styles.iterList}>
              {result.iters.map((it) => (
                <View key={it.iter} style={styles.iterRow}>
                  <Text style={styles.iterName}>
                    {iconFor(it.verdict)} iter{it.iter} {it.method}
                  </Text>
                  <Text style={styles.iterValue}>
                    {it.value ?? "—"} · {it.ms}ms
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function iconFor(v) {
  if (v === "ok") return "✓";
  if (v === "exact") return "✅";
  if (v === "close") return "🟡";
  if (v === "wrong") return "❌";
  return "○";
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b1220" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "700", color: "#fff", marginBottom: 16 },

  section: { marginBottom: 16 },
  sectionLabel: { color: "#94a3b8", fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 },

  dropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dropdownLabel: { color: "#fff", fontSize: 16, fontWeight: "600" },
  dropdownBadge: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dropdownBadgeActive: { backgroundColor: "#22c55e" },
  dropdownBadgeText: { color: "#fff", fontSize: 10, fontWeight: "600" },
  dropdownCodename: { color: "#fbbf24", fontSize: 13, marginTop: 6, fontWeight: "600", letterSpacing: 0.3 },
  dropdownMeta: { color: "#94a3b8", fontSize: 12, marginTop: 4 },
  dropdownCaret: { color: "#94a3b8", fontSize: 12, marginLeft: 8 },
  modelDescSmall: { color: "#64748b", fontSize: 12, marginTop: 8, lineHeight: 18 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#0f172a",
    borderRadius: 14,
    padding: 16,
    maxHeight: "85%",
  },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 12 },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#1e293b",
    marginBottom: 8,
  },
  modalOptionActive: { backgroundColor: "#1e3a8a" },
  modalOptionLabel: { color: "#e2e8f0", fontSize: 15, fontWeight: "600", flex: 1 },
  modalOptionLabelActive: { color: "#fff" },
  modalOptionMeta: { color: "#94a3b8", fontSize: 12, marginTop: 4 },
  modalOptionDesc: { color: "#64748b", fontSize: 11, marginTop: 4, lineHeight: 16 },
  checkmark: { color: "#22c55e", fontSize: 16, fontWeight: "700" },

  imageWrap: {
    height: 240,
    backgroundColor: "#1e293b",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  imagePlaceholderText: { color: "#64748b", fontSize: 14 },
  imagePlaceholderHint: { color: "#475569", fontSize: 11, marginTop: 4 },

  inputRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  inputBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: "#1e293b",
    borderRadius: 10,
    alignItems: "center",
  },
  inputBtnText: { color: "#e2e8f0", fontSize: 15, fontWeight: "500" },

  scanBtn: {
    paddingVertical: 16,
    backgroundColor: "#22c55e",
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 16,
  },
  scanBtnDisabled: { backgroundColor: "#1e293b" },
  scanBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  scanLoading: { flexDirection: "row", gap: 8, alignItems: "center" },

  resultCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
  },
  resultLabel: { color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
  resultValue: { color: "#fff", fontSize: 36, fontWeight: "700", marginTop: 4 },
  resultValueMiss: { color: "#94a3b8", fontSize: 24, fontWeight: "500", marginTop: 4 },
  divider: { height: 1, backgroundColor: "#334155", marginVertical: 12 },
  resultMeta: { color: "#94a3b8", fontSize: 13 },

  detailToggle: { color: "#3b82f6", fontSize: 13, marginTop: 12, fontWeight: "500" },
  iterList: { marginTop: 8 },
  iterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomColor: "#334155",
    borderBottomWidth: 1,
  },
  iterName: { color: "#cbd5e1", fontSize: 12, flex: 1 },
  iterValue: { color: "#94a3b8", fontSize: 12 },
});
