// src/screens/home/ProgressScreen.tsx
import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../navigation/StackNavigator";
import { useFocusEffect } from "@react-navigation/native";

import { PracticeLocalService } from "../../services/PracticeLocalService";

type NavProp = StackNavigationProp<RootStackParamList, "Progress">;

interface Props {
  navigation: NavProp;
}

type LastSession = {
  id: string;
  type: string;
  durationSeconds: number;
  createdAt: Date;
  lessonName?: string | null;
};

const pad2 = (n: number) => String(n).padStart(2, "0");
const dayKeyLocal = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const formatRelative = (d: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const x = new Date(d);
  x.setHours(0, 0, 0, 0);

  const diffDays = Math.round((today.getTime() - x.getTime()) / 86400000);
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  return `Hace ${diffDays} días`;
};

const minutes = (sec: number) => Math.max(0, Math.round(sec / 60));

const ProgressScreen: React.FC<Props> = ({ navigation }) => {
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [lastSessions, setLastSessions] = useState<LastSession[]>([]);
  const [weekSeconds, setWeekSeconds] = useState(0);

  const reload = useCallback(async () => {
    const prog = await PracticeLocalService.getProgress(5 * 60);
    setTotalSeconds(prog.totalSeconds);
    setStreakDays(prog.streakDays);
    setWeekSeconds(prog.weekSeconds);

    const last = (await PracticeLocalService.getLastSessions(3)) ?? [];
    setLastSessions(last);
  }, []);

  // recarga cada vez que entras a la pantalla
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const hoursPracticed = useMemo(() => {
    const h = totalSeconds / 3600;
    return Math.round(h * 10) / 10; // 1 decimal
  }, [totalSeconds]);

  // meta semanal: por ejemplo 120 min = 2 horas
  const weeklyGoalSeconds = 2 * 3600;
  const weeklyPercent = useMemo(() => {
    const p = Math.min(1, weekSeconds / weeklyGoalSeconds);
    return Math.round(p * 100);
  }, [weekSeconds]);

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <LinearGradient
        colors={["#E860FF", "#60AFFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBack}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          <Text style={styles.headerTitle}>Mi progreso</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* CONTENIDO */}
      <View style={styles.content}>
        {/* CARD MAPA -> manda a pantalla real */}
        <TouchableOpacity
          style={styles.mapCard}
          activeOpacity={0.9}
          onPress={() => navigation.navigate("MiAvanceGps")}
        >
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map-outline" size={40} color="#60AFFF" />
            <Text style={styles.mapText}>Ver mapa real de prácticas (GPS)</Text>
          </View>

          <View style={styles.mapRow}>
            <Text style={styles.mapSubtitle}>Última racha:</Text>
            <Text style={styles.mapSubtitleBold}>{streakDays} días</Text>
          </View>
        </TouchableOpacity>

        {/* PROGRESO TOTAL */}
        <View style={styles.progressCard}>
          <Text style={styles.sectionTitle}>Progreso total</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{hoursPracticed}</Text>
              <Text style={styles.statLabel}>Horas practicadas</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statValue}>{streakDays}</Text>
              <Text style={styles.statLabel}>Días de racha</Text>
            </View>
          </View>

          {/* PROGRESO SEMANAL */}
          <Text style={styles.sectionTitleSmall}>Plan semanal</Text>
          <View style={styles.progressBarBackground}>
            <View
              style={[styles.progressBarFill, { width: `${weeklyPercent}%` }]}
            />
          </View>
          <Text style={styles.progressPercent}>
            {weeklyPercent}% del plan semanal ({minutes(weekSeconds)} min /{" "}
            {minutes(weeklyGoalSeconds)} min)
          </Text>

          {/* ÚLTIMAS SESIONES */}
          <Text style={styles.sectionTitleSmall}>Últimas sesiones</Text>
          <View style={styles.sessionsList}>
            {lastSessions.length === 0 ? (
              <Text style={styles.sessionItem}>
                Aún no hay sesiones registradas.
              </Text>
            ) : (
              lastSessions.map((s) => (
                <Text key={s.id} style={styles.sessionItem}>
                  • {minutes(s.durationSeconds)} min — {s.type} —{" "}
                  {formatRelative(s.createdAt)}
                </Text>
              ))
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ProgressScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FC" },
  header: {
    paddingTop: 40,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerBack: { flexDirection: "row", alignItems: "center" },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 4,
  },
  content: { flex: 1, padding: 16, gap: 16 },

  mapCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    elevation: 3,
  },
  mapPlaceholder: {
    height: 140,
    backgroundColor: "#E3F2FD",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  mapText: {
    marginTop: 8,
    fontSize: 13,
    color: "#555",
    textAlign: "center",
    paddingHorizontal: 20,
    fontWeight: "700",
  },
  mapRow: { flexDirection: "row", justifyContent: "space-between" },
  mapSubtitle: { fontSize: 13, color: "#777" },
  mapSubtitleBold: { fontSize: 13, color: "#333", fontWeight: "800" },

  progressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  sectionTitleSmall: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "800",
    color: "#444",
  },

  statsRow: { flexDirection: "row", gap: 12 },
  statBox: {
    flex: 1,
    backgroundColor: "#F3F3F3",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontSize: 18, fontWeight: "900", color: "#111" },
  statLabel: { fontSize: 12, color: "#555", marginTop: 4, fontWeight: "700" },

  progressBarBackground: {
    height: 12,
    borderRadius: 999,
    backgroundColor: "#E0E0E0",
    overflow: "hidden",
    marginTop: 8,
  },
  progressBarFill: { height: "100%", backgroundColor: "#60AFFF" },
  progressPercent: { marginTop: 6, fontSize: 13, color: "#555" },

  sessionsList: { marginTop: 8 },
  sessionItem: { fontSize: 13, color: "#666", marginBottom: 6 },
});
