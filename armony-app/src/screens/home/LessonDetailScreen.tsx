// src/screens/home/LessonDetailScreen.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  AppState,
  AppStateStatus,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { RootStackParamList } from "../../navigation/StackNavigator";
import { PracticeLocalService } from "../../services/PracticeLocalService";

// --- Tipos de navegación ---
type LessonDetailNavProp = StackNavigationProp<
  RootStackParamList,
  "LessonDetail"
>;
type LessonDetailRouteProp = RouteProp<RootStackParamList, "LessonDetail">;

interface LessonDetailProps {
  navigation: LessonDetailNavProp;
  route: LessonDetailRouteProp;
}

// 🔹 Imágenes grandes de cada tema
const imgAfinar = require("../../../assets/lesson_afinar_a4.png");
const imgNomenclatura = require("../../../assets/lesson_nomenclatura.png");
const imgPostura = require("../../../assets/lesson_postura.png");

// 🔹 Iconos circulares del header de cada tema
const iconTema1 = require("../../../assets/icon_afinar.png");
const iconTema2 = require("../../../assets/icon_nomenclatura.png");
const iconTema3 = require("../../../assets/icon_postura.png");

// --- ESTRUCTURA DE LOS TEMAS ---
interface LessonContent {
  temaId: number;
  temaNombre: string;
  subtitulo: string;
  contenido: string;
  imagen: any;
  icon: any;
  consejo: string;
}

const LESSON_DATA: LessonContent[] = [
  {
    temaId: 1,
    temaNombre: "Tema 1",
    subtitulo: "Cómo Afinar tu Instrumento",
    contenido:
      "La afinación es crucial para tocar en armonía con otros músicos o con grabaciones. Es la base de toda la música occidental.\n\n" +
      "La música moderna utiliza un tono de referencia universal: la nota **La 4 (A4)**.\n\n" +
      "Por convención internacional, esta nota debe sonar exactamente a **440 Hertz (Hz)**.",
    imagen: imgAfinar,
    icon: iconTema1,
    consejo:
      "Flat (Plano): La nota está más baja de 440 Hz. Debes subir el tono.\n" +
      "Sharp (Sostenido): La nota está más alta de 440 Hz. Debes bajar el tono.",
  },
  {
    temaId: 2,
    temaNombre: "Tema 2",
    subtitulo: "Nomenclatura y Tono",
    contenido:
      "La música tiene dos formas de nombrar las notas: el sistema universal (o anglosajón) con letras y el sistema latino (Do, Re, Mi...).\n\n" +
      "Hay siete notas básicas que se repiten en cada octava: **A, B, C, D, E, F, G**.\n\n" +
      "La Escala Mayor (la más común) sigue un patrón estricto de tonos y semitonos:\n" +
      "**Tono - Tono - Semitono - Tono - Tono - Tono - Semitono.**",
    imagen: imgNomenclatura,
    icon: iconTema2,
    consejo:
      "La distancia más pequeña entre dos notas es el **Semitono (medio paso)**.\n" +
      "Dos semitonos forman un **Tono (un paso completo)**.",
  },
  {
    temaId: 3,
    temaNombre: "Tema 3",
    subtitulo: "Postura Correcta",
    contenido:
      "Una postura correcta previene lesiones, mejora la resistencia al practicar y permite que los dedos/brazos se muevan con mayor libertad y precisión.\n\n" +
      "1. **Espalda:** Mantente erguido, pero relajado. Evita encorvarte.\n" +
      "2. **Pies:** Ambos pies deben estar planos sobre el suelo para dar estabilidad.\n" +
      "3. **Hombros:** Deben estar relajados y hacia abajo, nunca tensos o encogidos.\n\n" +
      "Mantén la muñeca en una posición neutra (recta) al tocar. Evita doblarla hacia arriba o hacia abajo, ya que eso crea tensión y puede causar dolor.",
    imagen: imgPostura,
    icon: iconTema3,
    consejo:
      "¡No olvides respirar! Mantener una respiración constante ayuda a relajar el cuerpo y a mantener el ritmo mientras tocas.",
  },
];

const renderTextWithMarkdown = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return (
    <Text style={styles.bodyText}>
      {parts.map((part, index) => {
        const isBold = part.startsWith("**") && part.endsWith("**");
        const content = isBold ? part.slice(2, -2) : part;

        return (
          <Text key={index} style={isBold ? styles.bodyTextBold : undefined}>
            {content}
          </Text>
        );
      })}
    </Text>
  );
};

const LessonDetailScreen: React.FC<LessonDetailProps> = ({
  navigation,
  route,
}) => {
  const { lessonName } = route.params;
  const [activeTema, setActiveTema] = useState<number>(1);

  // ------- TRACKING -------
  const startedAtMsRef = useRef<number | null>(null);
  const startedAtIsoRef = useRef<string | null>(null);
  const temaRef = useRef<number>(1);
  const hasFocusRef = useRef<boolean>(false);
  const flushingRef = useRef<boolean>(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const startSegment = useCallback(() => {
    if (!hasFocusRef.current) return;

    if (startedAtMsRef.current == null) {
      startedAtMsRef.current = Date.now();
      startedAtIsoRef.current = new Date().toISOString();
      temaRef.current = activeTema;
    }
  }, [activeTema]);

  const saveSegment = useCallback(
    async (reason: "blur" | "topic_change" | "background" | "finish") => {
      if (flushingRef.current) return;

      const startMs = startedAtMsRef.current;
      const startIso = startedAtIsoRef.current;
      const temaId = temaRef.current;

      if (!startMs || !startIso) return;

      const durationSeconds = Math.max(
        0,
        Math.floor((Date.now() - startMs) / 1000),
      );

      if (durationSeconds < 2) {
        startedAtMsRef.current = null;
        startedAtIsoRef.current = null;
        return;
      }

      flushingRef.current = true;

      try {
        await PracticeLocalService.addSession({
          type: "lesson",
          lessonName,
          temaId,
          durationSeconds,
          meta: { reason },
          createdAt: new Date(startIso),
        });
      } catch (e) {
        console.log("saveSegment error:", e);
      } finally {
        startedAtMsRef.current = null;
        startedAtIsoRef.current = null;
        flushingRef.current = false;
      }
    },
    [lessonName],
  );

  // ✅ Focus / blur real (no depende del botón)
  useFocusEffect(
    useCallback(() => {
      hasFocusRef.current = true;
      startSegment();

      return () => {
        hasFocusRef.current = false;
        saveSegment("blur");
      };
    }, [saveSegment, startSegment]),
  );

  // ✅ AppState (background)
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;

      if (prev === "active" && next !== "active") {
        await saveSegment("background");
      } else if (next === "active") {
        startSegment();
      }
    });

    return () => sub.remove();
  }, [saveSegment, startSegment]);

  // ✅ Cambio de tema: guardar el anterior y empezar el nuevo
  useEffect(() => {
    if (temaRef.current !== activeTema) {
      saveSegment("topic_change").finally(() => {
        temaRef.current = activeTema;
        startSegment();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTema]);

  const currentLesson = LESSON_DATA.find((item) => item.temaId === activeTema);

  if (!currentLesson) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ padding: 20 }}>
          Error: Contenido del tema no encontrado.
        </Text>
      </SafeAreaView>
    );
  }

  const handleNextTopic = async () => {
    if (activeTema < LESSON_DATA.length) {
      setActiveTema(activeTema + 1);
    } else {
      await saveSegment("finish");

      Alert.alert(
        "¡Genial!",
        "Has revisado todos los temas de esta lección. 😊",
        [
          { text: "Volver a Lecciones", onPress: () => navigation.goBack() },
          { text: "Cancelar", style: "cancel" },
        ],
      );
    }
  };

  const handleBack = async () => {
    await saveSegment("blur");
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#E860FF", "#60AFFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerTop}
      >
        <TouchableOpacity onPress={handleBack} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          <Text style={styles.headerTitle}>{lessonName}</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.tabsContainer}>
          {LESSON_DATA.map((tema) => (
            <TouchableOpacity
              key={tema.temaId}
              style={[
                styles.tabItem,
                activeTema === tema.temaId && styles.tabItemActive,
              ]}
              onPress={() => setActiveTema(tema.temaId)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTema === tema.temaId && styles.tabTextActive,
                ]}
              >
                Tema {tema.temaId}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.card}>
          <LinearGradient
            colors={["#E860FF", "#60AFFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cardHeader}
          >
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTemaLabel}>
                {currentLesson.temaNombre}
              </Text>
              <Text style={styles.cardTitle}>{currentLesson.subtitulo}</Text>
            </View>

            <View style={styles.cardIconCircle}>
              <Image
                source={currentLesson.icon}
                style={styles.cardIconImage}
                resizeMode="contain"
              />
            </View>
          </LinearGradient>

          <View style={styles.mainImageWrapper}>
            <Image
              source={currentLesson.imagen}
              style={styles.mainImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.bodyTextContainer}>
            {renderTextWithMarkdown(currentLesson.contenido)}
          </View>

          <View style={styles.consejoBox}>
            <Ionicons name="bulb-outline" size={20} color="#6A1B9A" />
            <Text style={styles.consejoText}>
              <Text style={{ fontWeight: "bold" }}>Consejo: </Text>
              {currentLesson.consejo}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.siguienteButton}
            onPress={handleNextTopic}
          >
            <LinearGradient
              colors={["#FF00FF", "#60AFFF"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.siguienteGradient}
            >
              <Text style={styles.siguienteButtonText}>
                {activeTema < LESSON_DATA.length
                  ? "Siguiente tema →"
                  : "Volver a Lecciones →"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default LessonDetailScreen;

// ---------------- ESTILOS ----------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FC" },
  headerTop: {
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
  scroll: { flex: 1, paddingHorizontal: 16, marginTop: 16 },
  tabsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
    backgroundColor: "#EDE7F6",
    borderRadius: 999,
    padding: 4,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: "center",
  },
  tabItemActive: { backgroundColor: "#FFFFFF", elevation: 2 },
  tabText: { fontSize: 13, color: "#6A1B9A" },
  tabTextActive: { fontWeight: "bold" },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardHeader: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardHeaderText: { flexShrink: 1, paddingRight: 8 },
  cardTemaLabel: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  cardTitle: { color: "#FFFFFF", fontSize: 18, marginTop: 2 },

  cardIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardIconImage: { width: 40, height: 40 },

  mainImageWrapper: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  mainImage: { width: "100%", height: 190 },

  bodyTextContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  bodyText: { fontSize: 16, lineHeight: 24, color: "#333333" },
  bodyTextBold: { fontWeight: "bold" },

  consejoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFDE7",
    borderLeftWidth: 5,
    borderLeftColor: "#FFC107",
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 10,
  },
  consejoText: { marginLeft: 10, fontSize: 14, color: "#5D4037", flex: 1 },

  siguienteButton: {
    marginHorizontal: 16,
    marginBottom: 18,
    borderRadius: 999,
    overflow: "hidden",
  },
  siguienteGradient: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  siguienteButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
});
