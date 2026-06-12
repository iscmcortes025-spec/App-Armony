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
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../navigation/StackNavigator";
import { useFocusEffect } from "@react-navigation/native";

// ✅ Ubicación (Expo)
import * as Location from "expo-location";

// ✅ Mapa real
import MapView, { Marker, Region } from "react-native-maps";
import { PracticeLocalService } from "../../services/PracticeLocalService";

type NavProp = StackNavigationProp<RootStackParamList, "MiAvanceGps">;

interface Props {
  navigation: NavProp;
}

type PracticePlace = {
  id: string;
  lat: number;
  lng: number;
  createdAt?: any;
  address?: string | null;
};

const pad2 = (n: number) => String(n).padStart(2, "0");
const dayKeyLocal = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const MiAvanceGpsScreen: React.FC<Props> = ({ navigation }) => {
  const mapRef = useRef<MapView>(null as any);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const [lat, setLat] = useState<number>(19.9852);
  const [lng, setLng] = useState<number>(-102.2858);

  const [lastPlaces, setLastPlaces] = useState<PracticePlace[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);

  // ✅ Progreso real
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [streakDays, setStreakDays] = useState(0);

  const region: Region = useMemo(
    () => ({
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }),
    [lat, lng],
  );

  const centerMap = (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);

    mapRef.current?.animateToRegion(
      {
        latitude: newLat,
        longitude: newLng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      600,
    );
  };

  const loadLastPlaces = async () => {
    try {
      setLoadingPlaces(true);

      const items = await PracticeLocalService.getLastPlaces(5);
      setLastPlaces(items);

      if (items.length > 0) {
        centerMap(items[0].lat, items[0].lng);
      }
    } catch (e) {
      console.log("loadLastPlaces error:", e);
    } finally {
      setLoadingPlaces(false);
    }
  };

  const loadProgress = async () => {
    try {
      setLoadingProgress(true);
      const progress = await PracticeLocalService.getProgress(5 * 60);
      setTotalSeconds(progress.totalSeconds);
      setStreakDays(progress.streakDays);
    } catch (e) {
      console.log("loadProgress error:", e);
    } finally {
      setLoadingProgress(false);
    }
  };

  const registerCurrentPlace = async () => {
    try {
      setIsLocating(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setHasPermission(false);
        Alert.alert(
          "Permiso denegado",
          "Activa el permiso de ubicación para registrar tu práctica.",
        );
        return;
      }
      setHasPermission(true);

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newLat = pos.coords.latitude;
      const newLng = pos.coords.longitude;

      centerMap(newLat, newLng);

      let address: string | null = null;
      try {
        const rev = await Location.reverseGeocodeAsync({
          latitude: newLat,
          longitude: newLng,
        });
        if (rev?.[0]) {
          const r = rev[0];
          const text = [r.street, r.city, r.region].filter(Boolean).join(", ");
          address = text || null;
        }
      } catch {}

      await PracticeLocalService.addPlace({
        lat: newLat,
        lng: newLng,
        address,
      });

      await loadLastPlaces();
    } catch (e: any) {
      console.log("registerCurrentPlace error:", e);
      Alert.alert("GPS", "No se pudo obtener tu ubicación.");
    } finally {
      setIsLocating(false);
    }
  };

  // ✅ primera carga
  useEffect(() => {
    loadLastPlaces();
    loadProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ cada vez que vuelves a la pantalla, refresca progreso (y lugares)
  useFocusEffect(
    useCallback(() => {
      loadProgress();
      loadLastPlaces();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const lastPracticeText = useMemo(() => {
    if (!lastPlaces.length) return "Aún no has registrado prácticas con GPS.";
    const a = lastPlaces[0].address;
    if (a) return `Tu última práctica fue registrada desde\n${a}`;
    return `Tu última práctica fue registrada en\n(${lastPlaces[0].lat.toFixed(
      4,
    )}, ${lastPlaces[0].lng.toFixed(4)})`;
  }, [lastPlaces]);

  const hoursPracticed = useMemo(() => {
    const h = totalSeconds / 3600;
    return Math.round(h * 10) / 10;
  }, [totalSeconds]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#E860FF", "#60AFFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backRow}
          >
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>

          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Mi avance{"\n"}(GPS)</Text>
          </View>

          <TouchableOpacity
            onPress={registerCurrentPlace}
            style={styles.headerEllipse}
            activeOpacity={0.85}
          >
            <View style={styles.ellipseInner}>
              {isLocating ? (
                <ActivityIndicator />
              ) : (
                <Ionicons name="location" size={26} color="#2D2D2D" />
              )}
            </View>
          </TouchableOpacity>
        </LinearGradient>

        {/* MAPA */}
        <View style={styles.mapCard}>
          <View style={styles.mapWrapper}>
            <MapView
              ref={mapRef}
              style={styles.map}
              region={region}
              showsUserLocation={hasPermission === true}
              showsMyLocationButton={false}
            >
              <Marker coordinate={{ latitude: lat, longitude: lng }} />

              {lastPlaces.map((p) => (
                <Marker
                  key={p.id}
                  coordinate={{ latitude: p.lat, longitude: p.lng }}
                  title={p.address ?? "Práctica"}
                />
              ))}
            </MapView>
          </View>

          {/* ✅ Refresh */}
          <View style={styles.mapFloatingTopRight}>
            <TouchableOpacity
              style={styles.floatBtn}
              onPress={loadProgress}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh-outline" size={18} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.mapFloatingBottomRight}>
            <TouchableOpacity
              style={styles.floatBtn}
              onPress={registerCurrentPlace}
              activeOpacity={0.85}
            >
              <Ionicons name="navigate-outline" size={18} color="#333" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Últimos lugares de práctica registrados
        </Text>

        <View style={styles.tipRow}>
          <View style={styles.tipChip}>
            <Ionicons name="bulb-outline" size={16} color="#111" />
            <Text style={styles.tipChipText}>Consejo</Text>
          </View>
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>¡Estás mejorando tu ritmo!</Text>
          <Text style={styles.tipBody}>{lastPracticeText}</Text>
        </View>

        <View style={styles.listCard}>
          {loadingPlaces ? (
            <View style={{ paddingVertical: 10 }}>
              <ActivityIndicator />
            </View>
          ) : lastPlaces.length === 0 ? (
            <Text style={styles.listEmpty}>
              Registra tu primera práctica tocando el ícono de ubicación arriba.
            </Text>
          ) : (
            lastPlaces.map((p, idx) => (
              <TouchableOpacity
                key={p.id}
                style={styles.listItem}
                activeOpacity={0.85}
                onPress={() => centerMap(p.lat, p.lng)}
              >
                <View style={styles.listDot} />
                <Text style={styles.listText} numberOfLines={2}>
                  {idx === 0 ? "Última: " : ""}
                  {p.address
                    ? p.address
                    : `(${p.lat.toFixed(4)}, ${p.lng.toFixed(4)})`}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        <Text style={styles.sectionTitle}>Progreso total</Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            {loadingProgress ? (
              <ActivityIndicator />
            ) : (
              <>
                <Text style={styles.statValue}>{hoursPracticed}</Text>
                <Text style={styles.statLabel}>Horas practicadas</Text>
              </>
            )}
          </View>

          <View style={styles.statCard}>
            {loadingProgress ? (
              <ActivityIndicator />
            ) : (
              <>
                <Text style={styles.statValue}>{streakDays}</Text>
                <Text style={styles.statLabel}>Días de racha</Text>
              </>
            )}
          </View>
        </View>

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
      </ScrollView>
    </SafeAreaView>
  );
};

export default MiAvanceGpsScreen;

// ✅ styles igual que los tuyos
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E9E9E9" },
  scroll: { padding: 14, paddingBottom: 22 },

  header: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backRow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: { flex: 1, paddingHorizontal: 10 },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
    lineHeight: 24,
  },
  headerEllipse: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(255,255,255,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  ellipseInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },

  mapCard: {
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: "#FFF",
    overflow: "hidden",
  },
  mapWrapper: { height: 260, width: "100%", backgroundColor: "#F3F3F3" },
  map: { flex: 1 },

  mapFloatingTopRight: { position: "absolute", top: 10, right: 10 },
  mapFloatingBottomRight: { position: "absolute", bottom: 10, right: 10 },
  floatBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      android: { elevation: 3 },
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
    }),
  },

  sectionTitle: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "700",
    color: "#1C1C1C",
  },

  tipRow: { marginTop: 10, flexDirection: "row", alignItems: "center" },
  tipChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#DADADA",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  tipChipText: { fontSize: 13, fontWeight: "700", color: "#111" },

  tipCard: {
    marginTop: 10,
    backgroundColor: "#EFEAFE",
    borderRadius: 16,
    padding: 14,
  },
  tipTitle: { fontSize: 15, fontWeight: "800", color: "#111", marginBottom: 6 },
  tipBody: { fontSize: 13, color: "#333", lineHeight: 18 },

  listCard: {
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
  },
  listEmpty: { color: "#555", fontSize: 13, lineHeight: 18 },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  listDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#8A5CFF" },
  listText: { flex: 1, fontSize: 13, color: "#222" },

  statsRow: { marginTop: 10, flexDirection: "row", gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: "#F1F1F1",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#444",
    fontWeight: "600",
    textAlign: "center",
  },

  ctaWrap: { marginTop: 14, borderRadius: 14, overflow: "hidden" },
  cta: { paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#FFF", fontWeight: "800", fontSize: 14 },
});
