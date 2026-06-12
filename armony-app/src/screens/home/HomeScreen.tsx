import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ImageBackground,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { CommonActions } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/StackNavigator";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 🚀 Herramientas Offline y Base de Datos Local
import NetInfo from "@react-native-community/netinfo";
import { getLocalUser } from "../../database/db";

// Importamos tu ViewModel de sincronización
import { useSyncViewModel } from "../../hooks/useSyncViewModel";
import { useAuth } from "../../hooks/useAuth";

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

interface MenuOption {
  id: string;
  title: string;
  image: any;
}

// 🔹 Imágenes
const imgLecciones = require("../../../assets/img5.jpg");
const imgPractica = require("../../../assets/PracticaLibre.jpg");
const imgTeoria = require("../../../assets/TeoriaMus.jpg");
const imgMiAvance = require("../../../assets/MiAvanceGps.png");
const imgRetos = require("../../../assets/Retos.jpg");

// 🔹 Opciones del menú
const menuOptions: MenuOption[] = [
  { id: "lecciones", title: "Lecciones", image: imgLecciones },
  { id: "practica", title: "Práctica libre", image: imgPractica },
  { id: "teoria", title: "Teoría Musical", image: imgTeoria },
  { id: "mi_avance_gps", title: "Mi Avance (GPS)", image: imgMiAvance },
  { id: "retos", title: "Retos Diarios", image: imgRetos },
];

const API_URL = "https://app-armony.onrender.com";

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [username, setUsername] = useState<string>("");
  const { signOut } = useAuth();

  // Extraemos la función de tu ViewModel
  const { syncPendingData, isSyncing } = useSyncViewModel();

  // ✅ 1. Cargar perfil con estrategia Offline-First
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const localUser = await getLocalUser();

        if (localUser?.email) {
          setUsername(localUser.email.split("@")[0]);
        }

        const networkState = await NetInfo.fetch();
        if (networkState.isConnected) {
          const token = await AsyncStorage.getItem("userToken");
          if (!token) return;

          const response = await fetch(`${API_URL}/auth/users/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setUsername(data.nombre || data.email?.split("@")[0] || "Usuario");
          }
        }
      } catch (e) {
        console.log("loadProfile error:", e);
        if (!username) setUsername("Usuario");
      }
    };

    loadProfile();
  }, []);

  const greeting = useMemo(() => {
    if (!username) return "Hola 👋";
    return `Hola, ${username} 👋`;
  }, [username]);

  const handleNavigation = (option: MenuOption): void => {
    switch (option.id) {
      case "lecciones":
        navigation.navigate("LessonDetail", { lessonName: option.title });
        break;
      case "teoria":
        navigation.navigate("TheoryLessonDetail", { lessonName: option.title });
        break;
      case "practica":
        navigation.navigate("Metronome");
        break;
      case "mi_avance_gps":
        navigation.navigate("MiAvanceGps");
        break;
      case "retos":
        navigation.navigate("DailyChallenges");
        break;
      default:
        Alert.alert(
          "Próximamente",
          `La sección de ${option.title} no está disponible.`,
        );
        break;
    }
  };

  const handleBack = (): void => {
    Alert.alert(
      "Cerrar Sesión",
      "¿Estás seguro de que quieres cerrar sesión?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Aceptar",
          style: "destructive",
          onPress: async () => {
            await signOut(); // ✅ limpia token, SQLite y sync_pull_done
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: "Login" }],
              }),
            );
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={["#E860FF", "#60AFFF"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.headerContainer}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.headerLeft}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
            <View>
              <Text style={styles.headerTitle}>ARMONY</Text>
              <Text style={styles.headerSubtitle}>{greeting}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {isSyncing && (
          <Text style={styles.syncText}>Sincronizando progreso...</Text>
        )}

        <View style={styles.syncArea}>
          <TouchableOpacity
            style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
            onPress={syncPendingData}
            disabled={isSyncing}
          >
            <Ionicons name="sync-circle-outline" size={18} color="#FFFFFF" />
            <Text style={styles.syncButtonText}>
              {isSyncing ? "Sincronizando..." : "Sincronizar ahora"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.gridContainer}>
          {menuOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.card}
              onPress={() => handleNavigation(option)}
            >
              <ImageBackground
                source={option.image}
                style={styles.cardImage}
                imageStyle={styles.cardImageStyle}
              />
              <Text style={styles.cardTitle}>{option.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  headerContainer: {
    paddingTop: 40,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 5,
  },
  headerSubtitle: {
    color: "#FFFFFF",
    opacity: 0.9,
    fontSize: 12,
    marginLeft: 5,
    marginTop: 2,
  },
  scrollContainer: { padding: 20 },
  syncText: {
    color: "#888",
    textAlign: "center",
    marginBottom: 10,
    fontSize: 12,
    fontStyle: "italic",
  },
  syncArea: {
    width: "100%",
    alignItems: "center",
    marginBottom: 18,
  },
  syncButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6A4CFF",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  syncButtonDisabled: {
    opacity: 0.7,
  },
  syncButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    marginLeft: 8,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: { width: "48%", marginBottom: 20, alignItems: "center" },
  cardImage: {
    width: "100%",
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F2F1F7",
  },
  cardImageStyle: { borderRadius: 15, resizeMode: "cover" },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 10,
    textAlign: "center",
  },
});
