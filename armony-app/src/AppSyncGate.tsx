import React, { useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocalUser, initDB } from "./database/db";
import { SyncService } from "./services/SyncService";

const PULL_DONE_KEY = "sync_pull_done";

export const AppSyncGate = () => {
  useEffect(() => {
    let unsubNet: any;

    const runSync = async () => {
      const localUser = await getLocalUser();
      if (!localUser?.session_token) return;

      const net = await NetInfo.fetch();
      if (!net.isConnected) return;

      const token = localUser.session_token;

      // Pull solo la primera vez por sesión de login
      const pullDone = await AsyncStorage.getItem(PULL_DONE_KEY);
      if (!pullDone) {
        try {
          await SyncService.pullFromServer(token);
          await AsyncStorage.setItem(PULL_DONE_KEY, "1");
        } catch (e) {
          console.warn("Pull falló, se reintentará:", e);
        }
      }

      // Push siempre (manda lo pendiente)
      await SyncService.syncPracticeSessions(token);
      await SyncService.syncDailyChallenges(token);
      await SyncService.syncPracticePlaces(token);
    };

    (async () => {
      await initDB();
      runSync().catch(console.warn);
    })();

    unsubNet = NetInfo.addEventListener((state) => {
      if (state.isConnected) runSync().catch(console.warn);
    });

    const subApp = AppState.addEventListener("change", (s) => {
      if (s === "active") runSync().catch(console.warn);
    });

    return () => {
      if (unsubNet) unsubNet();
      subApp.remove();
    };
  }, []);

  return null;
};
