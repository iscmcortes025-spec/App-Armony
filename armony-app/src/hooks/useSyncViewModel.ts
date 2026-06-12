import { useState } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocalUser } from "../database/db";
import { SyncService } from "../services/SyncService";

export const useSyncViewModel = () => {
  const [isSyncing, setIsSyncing] = useState(false);

  const syncPendingData = async () => {
    setIsSyncing(true);

    try {
      const localUser = await getLocalUser();
      const token =
        localUser?.session_token || (await AsyncStorage.getItem("userToken"));

      if (!token) {
        // No login yet: skip sync until the user authenticates.
        return { uploaded: 0, failed: 0 };
      }

      const practiceResult = await SyncService.syncPracticeSessions(token);
      const dailyResult = await SyncService.syncDailyChallenges(token);
      const placeResult = await SyncService.syncPracticePlaces(token);

      const messages = [];
      if (practiceResult.uploaded || practiceResult.failed) {
        messages.push(
          `Sesiones: ${practiceResult.uploaded} sincronizadas, ${practiceResult.failed} fallidas`,
        );
      }
      if (dailyResult.uploaded || dailyResult.failed) {
        messages.push(
          `Retos diarios: ${dailyResult.uploaded} sincronizados, ${dailyResult.failed} fallidos`,
        );
      }
      if (placeResult.uploaded || placeResult.failed) {
        messages.push(
          `Lugares GPS: ${placeResult.uploaded} sincronizados, ${placeResult.failed} fallidos`,
        );
      }
      if (messages.length === 0) {
        messages.push("No hay elementos pendientes de sincronizar.");
      }

      Alert.alert("Sincronización completada", messages.join("\n"));
    } catch (error: any) {
      console.error("Error en sync:", error);
      Alert.alert(
        "Error de Sincronización",
        error.message || "Hubo un problema de conexión.",
      );
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    isSyncing,
    syncPendingData,
  };
};
