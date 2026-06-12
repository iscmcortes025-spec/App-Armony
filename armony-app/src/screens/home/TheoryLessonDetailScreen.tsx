// src/screens/home/TheoryLessonDetailScreen.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  AppState,
  AppStateStatus,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../navigation/StackNavigator";
import { LinearGradient } from "expo-linear-gradient";
import { PracticeLocalService } from "../../services/PracticeLocalService";

// --- Tipos de Navegación ---
type TheoryLessonRouteProp = RouteProp<
  RootStackParamList,
  "TheoryLessonDetail"
>;
type TheoryLessonNavigationProp = StackNavigationProp<
  RootStackParamList,
  "TheoryLessonDetail"
>;

interface TheoryLessonProps {
  route: TheoryLessonRouteProp;
  navigation: TheoryLessonNavigationProp;
}

// 🔹 Imágenes de contenido
const imgEscalaMusical = require("../../../assets/escala_musical.png");
const imgAcordesTriada = require("../../../assets/acordes_triada.png");
const imgRitmoCompas = require("../../../assets/ritmo_compas.png");

// 🔹 Iconos redondos del header de cada Tema
const iconTema1 = require("../../../assets/icon_tema1.png");
const iconTema2 = require("../../../assets/icon_tema2.png");
const iconTema3 = require("../../../assets/icon_tema3.png");

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
    temaNombre: "Escalas Mayores",
    subtitulo: "Escala Musical",
    contenido:
      "Las escalas mayores suenan alegres y se usan en la mayoría de las canciones populares.\n\n" +
      "La Escala Mayor más común sigue un patrón estricto de tonos y semitonos:\n" +
      "Tono - Tono - Semitono - Tono - Tono - Tono - Semitono.\n\n" +
      "Por ejemplo, la escala de **Do Mayor** está formada por:\n" +
      "C - D - E - F - G - A - B.",
    imagen: imgEscalaMusical,
    icon: iconTema1,
    consejo:
      "La escala de Do Mayor no tiene sostenidos ni bemoles. Es un excelente punto de partida para aprender escalas.",
  },
  {
    temaId: 2,
    temaNombre: "Acordes Tríada",
    subtitulo: "Acordes Tríada",
    contenido:
      "Un acorde tríada está formado por **tres notas**:\n\n" +
      "👉 la **raíz**, la **tercera** y la **quinta**.\n\n" +
      "La **raíz** establece la nota fundamental del acorde.\n" +
      "La **tercera** y la **quinta** son las notas que crean la armonía.\n\n" +
      "Por ejemplo, el acorde de **Do mayor (C)** se forma con:\n" +
      "C - E - G.",
    imagen: imgAcordesTriada,
    icon: iconTema2,
    consejo:
      "Las tríadas son la base de la mayoría de los acordes en la música. Aprender a identificarlas y construirlas te ayudará a entender mejor las progresiones armónicas.",
  },
  {
    temaId: 3,
    temaNombre: "Ritmo y Compás",
    subtitulo: "Ritmo y Compás",
    contenido:
      "El **ritmo** hace referencia a cómo se organiza la **duración de los sonidos** en el tiempo. Es lo que da movimiento y “pulso” a la música.\n\n" +
      "El **compás** indica cuántos **tiempos** hay en cada medida, así como la **unidad de tiempo** que se utiliza para contar.\n\n" +
      "Por ejemplo, el **compás de 4/4** es el más común en la música moderna. Significa que cada compás tiene 4 tiempos y cada tiempo equivale a una **negra**.\n\n" +
      "En un compás de 4/4, el pulso suele sentirse como una secuencia de “1, 2, 3, 4”, repitiéndose de forma constante.",
    imagen: imgRitmoCompas,
    icon: iconTema3,
    consejo:
      "Puedes practicar dando palmadas o pisadas marcando el 1, 2, 3 y 4 para interiorizar el pulso del compás de 4/4.",
  },
];

/**
 * Renderiza texto con soporte simple para **negritas**
 */
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

const TheoryLessonDetailScreen: React.FC<TheoryLessonProps> = ({
  route,
  navigation,
}) => {
  const { lessonName } = route.params;
  const [activeTema, setActiveTema] = useState<number>(1);

  // ---- TRACKING REFS ----
  const startedAtMsRef = useRef<number | null>(null);
  const startedAtIsoRef = useRef<string | null>(null);
  const activeTemaRef = useRef<number>(activeTema);
  const hasFocusRef = useRef<boolean>(false);
  const flushingRef = useRef<boolean>(false);

  const currentLesson = LESSON_DATA.find((item) => item.temaId === activeTema);

  const startTracking = useCallback(() => {
    if (!hasFocusRef.current) return;

    if (startedAtMsRef.current == null) {
      startedAtMsRef.current = Date.now();
      startedAtIsoRef.current = new Date().toISOString();
      activeTemaRef.current = activeTema;
    }
  }, [activeTema]);

  const flushTracking = useCallback(
    async (reason: "blur" | "topic_change" | "background" | "unmount") => {
      if (flushingRef.current) return;

      const startedAtMs = startedAtMsRef.current;
      const startedAtIso = startedAtIsoRef.current;
      const temaId = activeTemaRef.current;

      if (!startedAtMs || !startedAtIso) return;

      const now = Date.now();
      const durationSeconds = Math.max(
        0,
        Math.floor((now - startedAtMs) / 1000),
      );

      if (durationSeconds < 2) {
        startedAtMsRef.current = null;
        startedAtIsoRef.current = null;
        return;
      }

      flushingRef.current = true;

      try {
        const lesson = LESSON_DATA.find((x) => x.temaId === temaId);

        await PracticeLocalService.addSession({
          type: "theory",
          lessonName: lessonName ?? "Teoría Musical",
          temaId,
          durationSeconds,
          meta: {
            reason,
            temaNombre: lesson?.temaNombre ?? `Tema ${temaId}`,
          },
          createdAt: new Date(startedAtIso),
        });
      } catch (e) {
        console.log("flushTracking error:", e);
      } finally {
        startedAtMsRef.current = null;
        startedAtIsoRef.current = null;
        flushingRef.current = false;
      }
    },
    [lessonName],
  );

  // ✅ Cuando entras/sales de la pantalla (focus/blur)
  useFocusEffect(
    useCallback(() => {
      hasFocusRef.current = true;
      startTracking();

      return () => {
        hasFocusRef.current = false;
        flushTracking("blur");
      };
    }, [flushTracking, startTracking]),
  );

  // ✅ Si la app se va a background, guardamos
  useEffect(() => {
    const onAppStateChange = (state: AppStateStatus) => {
      if (state !== "active") {
        // background / inactive
        flushTracking("background");
      } else {
        // vuelve a active
        startTracking();
      }
    };

    const sub = AppState.addEventListener("change", onAppStateChange);
    return () => {
      sub.remove();
      flushTracking("unmount");
    };
  }, [flushTracking, startTracking]);

  // ✅ Si cambias de tema, guarda el anterior y empieza el nuevo
  useEffect(() => {
    // si ya había un tema corriendo y cambió:
    if (activeTemaRef.current !== activeTema) {
      flushTracking("topic_change").finally(() => {
        activeTemaRef.current = activeTema;
        startTracking();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTema]);

  if (!currentLesson) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ padding: 20 }}>
          Error: Contenido del tema no encontrado.
        </Text>
      </SafeAreaView>
    );
  }

  const handleNextTopic = () => {
    if (activeTema < LESSON_DATA.length) {
      setActiveTema(activeTema + 1);
    } else {
      Alert.alert(
        "¡Felicidades!",
        "Has completado todas las lecciones de este módulo.",
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER SUPERIOR */}
      <LinearGradient
        colors={["#E860FF", "#60AFFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerTop}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBack}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          <Text style={styles.headerTitle}>{lessonName}</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* TABS DE TEMAS */}
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

        {/* CARD PRINCIPAL DEL TEMA */}
        <View style={styles.card}>
          <LinearGradient
            colors={["#E860FF", "#60AFFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cardHeader}
          >
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTemaLabel}>
                Tema {currentLesson.temaId}
              </Text>
              <Text style={styles.cardTitle}>{currentLesson.temaNombre}</Text>
              <Text style={styles.cardSubtitle}>{currentLesson.subtitulo}</Text>
            </View>

            <View style={styles.cardIconCircle}>
              <Image
                source={currentLesson.icon}
                style={styles.cardIconImage}
                resizeMode="contain"
              />
            </View>
          </LinearGradient>

          {/* IMAGEN PRINCIPAL */}
          <View style={styles.mainImageWrapper}>
            <Image
              source={currentLesson.imagen}
              style={styles.mainImage}
              resizeMode="contain"
            />
          </View>

          {/* TEXTO */}
          <View style={styles.bodyTextContainer}>
            {renderTextWithMarkdown(currentLesson.contenido)}
          </View>

          {/* CONSEJO */}
          <View style={styles.consejoBox}>
            <Ionicons name="bulb-outline" size={20} color="#6A1B9A" />
            <Text style={styles.consejoText}>
              <Text style={{ fontWeight: "bold" }}>Consejo: </Text>
              {currentLesson.consejo}
            </Text>
          </View>

          {/* BOTÓN SIGUIENTE */}
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
              <Text style={styles.siguienteButtonText}>Siguiente tema →</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

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
  cardTemaLabel: { color: "#FFFFFF", fontSize: 13, opacity: 0.9 },
  cardTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "bold" },
  cardSubtitle: { marginTop: 4, color: "#F3E5F5", fontSize: 13 },

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

export default TheoryLessonDetailScreen;
