import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  AppState,
  AppStateStatus,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { Accelerometer } from "expo-sensors";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../navigation/StackNavigator";
import { useFocusEffect } from "@react-navigation/native";
import { PracticeLocalService } from "../../services/PracticeLocalService";

type MetronomeNavProp = StackNavigationProp<RootStackParamList, "Metronome">;

interface Props {
  navigation: MetronomeNavProp;
}

const MetronomeScreen: React.FC<Props> = ({ navigation }) => {
  const [bpm, setBpm] = useState(96);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sensorMode, setSensorMode] = useState(true);
  const [haptics, setHaptics] = useState(true);

  // expo-audio player
  const player = useAudioPlayer(require("../../../assets/metronome.mp3"));

  // Intervalos
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ✅ TRACKING práctica (solo cuando está INICIAR)
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const playStartRef = useRef<number | null>(null);
  const totalMsRef = useRef<number>(0);
  const bpmStartRef = useRef<number | null>(null);

  // Evitar dobles guardados por blur/background/back simultáneo
  const savingRef = useRef<boolean>(false);

  // ----------------------------
  // 1) Tick
  // ----------------------------
  const playTick = useCallback(async () => {
    try {
      player.seekTo(0);
      player.play();
    } catch (e) {
      console.log("playTick error", e);
    }
    if (haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [player, haptics]);

  // ----------------------------
  // ✅ Guardar práctica en SQLite local
  // ----------------------------
  const savePracticeIfNeeded = useCallback(async () => {
    if (savingRef.current) return;

    if (playStartRef.current != null) {
      totalMsRef.current += Date.now() - playStartRef.current;
      playStartRef.current = null;
    }

    const totalSeconds = Math.floor(totalMsRef.current / 1000);

    if (totalSeconds < 10) {
      totalMsRef.current = 0;
      bpmStartRef.current = null;
      return;
    }

    const bpmStart = bpmStartRef.current ?? bpm;

    savingRef.current = true;
    try {
      await PracticeLocalService.addSession({
        type: "metronome",
        durationSeconds: totalSeconds,
        bpmStart,
        bpmEnd: bpm,
        createdAt: new Date(),
      });
    } catch (e) {
      console.log("savePracticeIfNeeded error:", e);
    } finally {
      totalMsRef.current = 0;
      bpmStartRef.current = null;
      savingRef.current = false;
    }
  }, [bpm]);

  // ----------------------------
  // 2) Iniciar metrónomo
  // ----------------------------
  const startMetronome = useCallback(() => {
    const interval = 60000 / bpm;

    if (intervalRef.current) clearInterval(intervalRef.current);

    if (bpmStartRef.current == null) bpmStartRef.current = bpm;
    if (playStartRef.current == null) playStartRef.current = Date.now();

    playTick();
    intervalRef.current = setInterval(playTick, interval);

    setIsPlaying(true);
  }, [bpm, playTick]);

  // ----------------------------
  // 3) Detener metrónomo (y guardar)
  // ----------------------------
  const stopMetronome = useCallback(
    async (shouldSave: boolean = true) => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      setIsPlaying(false);

      if (playStartRef.current != null) {
        totalMsRef.current += Date.now() - playStartRef.current;
        playStartRef.current = null;
      }

      if (shouldSave) {
        await savePracticeIfNeeded();
      }
    },
    [savePracticeIfNeeded],
  );

  const toggleMetronome = () => {
    if (isPlaying) stopMetronome(true);
    else startMetronome();
  };

  // ----------------------------
  // 4) Acelerómetro: subir/bajar BPM
  // ----------------------------
  useEffect(() => {
    if (!sensorMode) {
      Accelerometer.removeAllListeners();
      return;
    }

    Accelerometer.setUpdateInterval(250);
    const subscription = Accelerometer.addListener(({ x }) => {
      if (x > 0.35) setBpm((prev) => Math.max(prev - 1, 40));
      if (x < -0.35) setBpm((prev) => Math.min(prev + 1, 220));
    });

    return () => subscription.remove();
  }, [sensorMode]);

  // ✅ Si cambia BPM mientras suena, reinicia intervalo con nuevo bpm
  useEffect(() => {
    if (!isPlaying) return;

    if (intervalRef.current) clearInterval(intervalRef.current);
    const interval = 60000 / bpm;
    intervalRef.current = setInterval(playTick, interval);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpm, isPlaying]);

  // Limpiar intervalo al desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ✅ Guardar al salir de la screen (blur)
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (isPlaying) {
          stopMetronome(true);
        } else {
          savePracticeIfNeeded();
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPlaying, savePracticeIfNeeded]),
  );

  // ✅ Pausar/guardar si app se va a background
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (next) => {
      const prev = appState.current;
      appState.current = next;

      if (prev === "active" && next !== "active") {
        if (isPlaying) {
          await stopMetronome(true);
        } else {
          await savePracticeIfNeeded();
        }
      }
    });

    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, savePracticeIfNeeded]);

  const handleBack = async () => {
    if (isPlaying) await stopMetronome(true);
    else await savePracticeIfNeeded();
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cardWrapper}>
        <LinearGradient colors={["#F5A1FF", "#9ED7FF"]} style={styles.card}>
          <View style={styles.cardHeader}>
            <TouchableOpacity onPress={handleBack} style={styles.headerBack}>
              <Ionicons name="chevron-back" size={22} color="#000" />
              <Text style={styles.headerTitle}>Metrónomo</Text>
            </TouchableOpacity>

            <View style={styles.iconCircle}>
              <Ionicons name="musical-notes-outline" size={22} color="#fff" />
            </View>
          </View>

          <View style={styles.bpmContainer}>
            <Text style={styles.bpmLabel}>BPM</Text>
            <Text style={styles.bpmText}>{bpm}</Text>
          </View>

          <View style={styles.optionsContainer}>
            <View style={styles.optionRow}>
              <Text style={styles.optionText}>Modo sensor (Acelerómetro)</Text>
              <Switch value={sensorMode} onValueChange={setSensorMode} />
            </View>

            <View style={styles.optionRow}>
              <Text style={styles.optionText}>Haptics (vibración)</Text>
              <Switch value={haptics} onValueChange={setHaptics} />
            </View>
          </View>

          <TouchableOpacity
            style={styles.buttonWrapper}
            onPress={toggleMetronome}
          >
            <LinearGradient
              colors={["#F36BFF", "#8FD3FF"]}
              style={styles.button}
            >
              <Text style={styles.buttonText}>
                {isPlaying ? "DETENER" : "INICIAR"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.tipBox}>
            <Ionicons name="bulb-outline" size={16} color="#FFB300" />
            <Text style={styles.tipText}>
              Inclina el teléfono: derecha ↑ BPM, izquierda ↓ BPM.
            </Text>
          </View>
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E5E6F0",
    alignItems: "center",
    paddingVertical: 10,
  },
  cardWrapper: { width: "92%", height: "92%" },
  card: {
    flex: 1,
    borderRadius: 24,
    padding: 20,
    justifyContent: "space-between",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerBack: { flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", marginLeft: 4 },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  bpmContainer: { alignItems: "center" },
  bpmLabel: { color: "#333" },
  bpmText: { fontSize: 56, fontWeight: "800", color: "#111" },
  optionsContainer: { marginTop: 20, gap: 14 },
  optionRow: { flexDirection: "row", justifyContent: "space-between" },
  optionText: { fontSize: 14, color: "#222" },
  buttonWrapper: { width: "70%", alignSelf: "center", borderRadius: 999 },
  button: { paddingVertical: 12, borderRadius: 999, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  tipBox: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.8)",
    padding: 10,
    borderRadius: 14,
  },
  tipText: { marginLeft: 6, fontSize: 12, color: "#444" },
});

export default MetronomeScreen;
