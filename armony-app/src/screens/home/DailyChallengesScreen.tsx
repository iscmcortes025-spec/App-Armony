// src/screens/home/DailyChallengesScreen.tsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../navigation/StackNavigator";
import { useFocusEffect } from "@react-navigation/native";

// 🚀 Herramientas Offline y Backend Propio
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { PracticeLocalService } from "../../services/PracticeLocalService";

type NavProp = StackNavigationProp<RootStackParamList, "DailyChallenges">;

interface Props {
  navigation: NavProp;
}

type ChallengeType = "lesson" | "theory" | "metronome" | "other";

type Challenge = {
  id: string;
  section: "today" | "tomorrow";
  title: string;
  description: string;
  type: ChallengeType;
  requiredMinutes?: number;
  done: boolean;
};

// 📌 Ajusta la IP si pruebas en dispositivo físico (ej. 192.168.1.X)
const API_URL = "https://app-armony.onrender.com";

const pad2 = (n: number) => String(n).padStart(2, "0");
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const DailyChallengesScreen: React.FC<Props> = ({ navigation }) => {
  // ✅ Retos base
  const baseChallenges: Challenge[] = useMemo(
    () => [
      {
        id: "nom-1",
        section: "today",
        title: "Reto de Hoy: Nomenclatura",
        description:
          "Identifica las 7 notas básicas y sus equivalentes en el sistema latino (C=Do, D=Re, etc).",
        type: "theory",
        done: false,
      },
      {
        id: "rit-1",
        section: "today",
        title: "Reto: Práctica de Ritmo",
        description:
          "Usa el Metrónomo (Acel.) para practicar con el pulso estable a 96 BPM por 5 minutos.",
        type: "metronome",
        requiredMinutes: 5,
        done: false,
      },
      {
        id: "tri-1",
        section: "tomorrow",
        title: "Reto de Mañana",
        description: "¡Desbloquea el Reto de Acordes Tríada!",
        type: "lesson",
        done: false,
      },
    ],
    [],
  );

  const [challenges, setChallenges] = useState<Challenge[]>(baseChallenges);
  const [streak, setStreak] = useState<number>(0);

  // -----------------------------
  // ✅ TIMER
  // -----------------------------
  const timedChallenge = useMemo(
    () => challenges.find((c) => c.requiredMinutes && c.section === "today"),
    [challenges],
  );

  const initialSeconds = (timedChallenge?.requiredMinutes ?? 0) * 60;
  const [timerSeconds, setTimerSeconds] = useState<number>(initialSeconds);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const savingRef = useRef(false);

  const mmss = (s: number) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${pad2(m)}:${pad2(r)}`;
  };

  useEffect(() => {
    setTimerSeconds(initialSeconds);
    setTimerRunning(false);
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
  }, [initialSeconds]);

  // -----------------------------
  // ✅ Persistir estado (Backend + Caché Local)
  // -----------------------------
  const persistDailyState = useCallback(async (nextChallenges: Challenge[]) => {
    if (savingRef.current) return;
    savingRef.current = true;

    try {
      const key = todayKey();

      // 1. Guardado local inmediato en SQLite
      await PracticeLocalService.upsertDailyChallenges({
        dateKey: key,
        challenges: nextChallenges,
      });

      // 2. Guardado en caché para lectura rápida adicional
      await AsyncStorage.setItem(
        `challenges_${key}`,
        JSON.stringify(nextChallenges),
      );

      // 3. Si hay internet, podemos opcionalmente sincronizar al backend
      const networkState = await NetInfo.fetch();
      if (networkState.isConnected) {
        const token = await AsyncStorage.getItem("userToken");
        if (token) {
          await fetch(`${API_URL}/sync/challenges/daily`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              dateKey: key,
              challenges: nextChallenges,
            }),
          });
        }
      }
    } catch (e) {
      console.log("persistDailyState error:", e);
    } finally {
      savingRef.current = false;
    }
  }, []);

  // -----------------------------
  // ✅ Guardar Sesión de Práctica (SQLite Offline -> FastAPI)
  // -----------------------------
  const savePracticeSession = useCallback(
    async (payload: { type: string; durationSeconds: number; meta?: any }) => {
      try {
        await PracticeLocalService.addSession({
          type: payload.type,
          durationSeconds: payload.durationSeconds,
          meta: payload.meta,
          createdAt: new Date(),
        });
      } catch (e) {
        console.log("savePracticeSession error:", e);
      }
    },
    [],
  );

  const setDone = (id: string, done: boolean) => {
    setChallenges((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, done } : c));
      persistDailyState(next);
      return next;
    });
  };

  // -----------------------------
  // ✅ Cargar estado del día
  // -----------------------------
  const loadTodayState = useCallback(async () => {
    try {
      const key = todayKey();
      let savedData = null;

      // 1. Intentar cargar desde el backend (datos frescos)
      const networkState = await NetInfo.fetch();
      const token = await AsyncStorage.getItem("userToken");

      if (networkState.isConnected && token) {
        const response = await fetch(
          `${API_URL}/sync/challenges/daily?date=${key}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (response.ok) {
          const apiData = await response.json();
          savedData = apiData.challenges;
          // Actualizamos la caché local con lo que vino del server
          await AsyncStorage.setItem(
            `challenges_${key}`,
            JSON.stringify(savedData),
          );
        }
      }

      // 2. Si falló el backend o estamos offline, leemos la caché local
      if (!savedData) {
        const localCache = await AsyncStorage.getItem(`challenges_${key}`);
        if (localCache) savedData = JSON.parse(localCache);
      }

      // 3. Unir datos guardados con los base (Merge)
      if (savedData && Array.isArray(savedData)) {
        const merged = baseChallenges.map((b) => {
          const found = savedData.find((x: any) => x.id === b.id);
          return found ? { ...b, done: !!found.done } : b;
        });
        setChallenges(merged);
      } else {
        setChallenges(baseChallenges);
      }
    } catch (e) {
      console.log("loadTodayState error:", e);
      setChallenges(baseChallenges);
    }
  }, [baseChallenges]);

  // -----------------------------
  // ✅ Cargar Racha (Streak) desde FastAPI
  // -----------------------------
  const loadStreak = useCallback(async () => {
    try {
      const networkState = await NetInfo.fetch();
      const token = await AsyncStorage.getItem("userToken");

      if (networkState.isConnected && token) {
        // Asume que FastAPI calcula la racha y te la devuelve lista
        const response = await fetch(`${API_URL}/sync/users/me/streak`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setStreak(data.streak || 0);
          await AsyncStorage.setItem(
            "offline_streak",
            String(data.streak || 0),
          );
        }
      } else {
        // Fallback offline
        const localStreak = await AsyncStorage.getItem("offline_streak");
        if (localStreak) setStreak(Number(localStreak));
      }
    } catch (e) {
      console.log("loadStreak error:", e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTodayState();
      loadStreak();
      return () => stopTimer();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadTodayState, loadStreak]),
  );

  // -----------------------------
  // ✅ LÓGICA DEL TIMER
  // -----------------------------
  const stopTimer = () => {
    setTimerRunning(false);
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
  };

  const startTimer = () => {
    if (!timedChallenge) return;
    if (timedChallenge.done) return;

    setTimerRunning(true);
    if (tickRef.current) clearInterval(tickRef.current);

    tickRef.current = setInterval(() => {
      setTimerSeconds((s) => {
        if (s <= 1) return 0;
        return s - 1;
      });
    }, 1000);
  };

  const resetTimer = () => {
    stopTimer();
    setTimerSeconds(initialSeconds);
  };

  useEffect(() => {
    if (!timedChallenge) return;

    if (timerSeconds === 0 && timerRunning) {
      stopTimer();
      setDone(timedChallenge.id, true);

      savePracticeSession({
        type: "daily_challenge",
        durationSeconds: (timedChallenge.requiredMinutes ?? 0) * 60,
        meta: {
          challengeId: timedChallenge.id,
          title: timedChallenge.title,
          kind: timedChallenge.type,
          bpmHint: 96,
        },
      });

      Alert.alert(
        "¡Reto completado!",
        "Excelente, se registraron tus 5 minutos ✅",
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerSeconds]);

  // -----------------------------
  // ✅ NAVEGACIÓN
  // -----------------------------
  const openChallenge = (c: Challenge) => {
    if (c.type === "metronome") {
      navigation.navigate("Metronome");
      return;
    }
    if (c.type === "lesson") {
      navigation.navigate("TheoryLessonDetail", {
        lessonName: "Teoría Musical",
      });
      return;
    }
    if (c.type === "theory") {
      navigation.navigate("LessonDetail", { lessonName: "Lecciones" });
      return;
    }
    Alert.alert("Reto", "Aquí podrías abrir una pantalla específica del reto.");
  };

  const todayList = challenges.filter((c) => c.section === "today");
  const tomorrowList = challenges.filter((c) => c.section === "tomorrow");

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.screenPad}>
        {/* HEADER */}
        <LinearGradient
          colors={["#E860FF", "#60AFFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={24} color="#111" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Retos diarios</Text>

          <View style={styles.headerIconWrap}>
            <View style={styles.headerIconInner}>
              <Ionicons name="calendar-outline" size={22} color="#222" />
            </View>
          </View>
        </LinearGradient>

        {/* CARD RACHA */}
        <LinearGradient
          colors={["#F4B0FF", "#A9E2FF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.streakCard}
        >
          <Text style={styles.streakLabel}>TU RACHA ACTUAL</Text>
          <Text style={styles.streakValue}>{streak}</Text>
          <View style={styles.streakRow}>
            <Text style={styles.streakSub}>
              ¡Sigue practicando para no perder tu racha!
            </Text>
            <View style={styles.pill}>
              <Text style={styles.pillText}>Pendiente</Text>
            </View>
          </View>
        </LinearGradient>

        {/* RETO DE HOY */}
        <Text style={styles.sectionTitle}>Reto de hoy</Text>
        {todayList.map((c) => {
          const isTimed = !!c.requiredMinutes;

          return (
            <TouchableOpacity
              key={c.id}
              activeOpacity={0.9}
              onPress={() => openChallenge(c)}
              style={styles.challengeCard}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.challengeTitle}>{c.title}</Text>
                <Text style={styles.challengeDesc}>{c.description}</Text>

                {isTimed && (
                  <View style={styles.timerRow}>
                    <View style={styles.timerBadge}>
                      <Ionicons name="time-outline" size={16} color="#222" />
                      <Text style={styles.timerText}>{mmss(timerSeconds)}</Text>
                    </View>

                    {!c.done && (
                      <View style={styles.timerBtns}>
                        <TouchableOpacity
                          onPress={() =>
                            timerRunning ? stopTimer() : startTimer()
                          }
                          style={styles.timerBtn}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.timerBtnText}>
                            {timerRunning ? "Pausar" : "Iniciar"}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={resetTimer}
                          style={[styles.timerBtn, styles.timerBtnGhost]}
                          activeOpacity={0.85}
                        >
                          <Text
                            style={[
                              styles.timerBtnText,
                              styles.timerBtnTextGhost,
                            ]}
                          >
                            Reset
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>

              <TouchableOpacity
                onPress={() => setDone(c.id, !c.done)}
                activeOpacity={0.85}
                style={styles.doneBtn}
              >
                {c.done ? (
                  <View style={styles.doneCircleOn}>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                  </View>
                ) : (
                  <View style={styles.doneCircleOff} />
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}

        {/* RETO DE MAÑANA */}
        <Text style={styles.sectionTitle}>Reto de Mañana</Text>
        {tomorrowList.map((c) => (
          <TouchableOpacity
            key={c.id}
            activeOpacity={0.9}
            onPress={() => openChallenge(c)}
            style={styles.challengeCard}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.challengeTitle}>{c.title}</Text>
              <Text style={styles.challengeDesc}>{c.description}</Text>
            </View>

            <View style={styles.doneBtn}>
              <View style={styles.doneCircleOff} />
            </View>
          </TouchableOpacity>
        ))}

        {/* BOTÓN VOLVER */}
        <TouchableOpacity
          onPress={() => navigation.navigate("Home")}
          activeOpacity={0.9}
          style={styles.ctaWrap}
        >
          <LinearGradient
            colors={["#E860FF", "#60AFFF"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.cta}
          >
            <Text style={styles.ctaText}>Volver a Inicio →</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default DailyChallengesScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#EFEFEF" },
  screenPad: { padding: 14 },
  header: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    marginLeft: 10,
    fontSize: 22,
    fontWeight: "900",
    color: "#111",
  },
  headerIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(255,255,255,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  streakCard: {
    marginTop: 14,
    borderRadius: 16,
    padding: 14,
  },
  streakLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: "#2B2B2B",
    textAlign: "center",
    letterSpacing: 0.4,
  },
  streakValue: {
    marginTop: 6,
    fontSize: 30,
    fontWeight: "900",
    color: "#111",
    textAlign: "center",
  },
  streakRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  streakSub: { flex: 1, fontSize: 12, color: "#222" },
  pill: {
    backgroundColor: "rgba(255,255,255,0.75)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  pillText: { fontSize: 12, fontWeight: "800", color: "#333" },
  sectionTitle: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: "800",
    color: "#1C1C1C",
  },
  challengeCard: {
    marginTop: 10,
    backgroundColor: "#EDE7F6",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  challengeTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#111",
    marginBottom: 6,
  },
  challengeDesc: {
    fontSize: 12,
    color: "#333",
    lineHeight: 17,
  },
  doneBtn: {
    paddingTop: 2,
    paddingLeft: 6,
  },
  doneCircleOff: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.10)",
  },
  doneCircleOn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#34C759",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      android: { elevation: 2 },
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
    }),
  },
  timerRow: { marginTop: 10, gap: 10 },
  timerBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.7)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  timerText: { fontSize: 12, fontWeight: "900", color: "#111" },
  timerBtns: { flexDirection: "row", gap: 10 },
  timerBtn: {
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  timerBtnText: { fontSize: 12, fontWeight: "900", color: "#111" },
  timerBtnGhost: { backgroundColor: "rgba(255,255,255,0.55)" },
  timerBtnTextGhost: { color: "#333" },
  ctaWrap: { marginTop: 16, borderRadius: 14, overflow: "hidden" },
  cta: { paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#FFF", fontWeight: "900", fontSize: 14 },
});
