import React, { useEffect, useRef, useState, useCallback } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { AppState, AppStateStatus } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { SafeAreaProvider } from "react-native-safe-area-context";

import StackNavigator from "./src/navigation/StackNavigator";
// Use the local sync view model (SQLite -> backend)
import { useSyncViewModel } from "./src/hooks/useSyncViewModel";

const App: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  const lastSyncAtRef = useRef<number>(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const { isSyncing, syncPendingData } = useSyncViewModel();

  const runSync = useCallback(async () => {
    if (!isOnline) return;

    const now = Date.now();
    if (isSyncing) return;
    if (now - lastSyncAtRef.current < 4000) return;

    try {
      await syncPendingData();
      lastSyncAtRef.current = Date.now();
    } catch (e) {
      console.log("❌ Sync error:", e);
    }
  }, [isOnline, isSyncing, syncPendingData]);

  // 2) Escuchar internet
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && !!state.isInternetReachable;
      setIsOnline(online);

      // si volvio internet, intentamos sync
      if (online) runSync();
    });

    return () => unsub();
  }, [runSync]);

  // 3) Cuando la app vuelve a active (regresas del background)
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;

      if (prev !== "active" && next === "active") {
        runSync();
      }
    });

    return () => sub.remove();
  }, [runSync]);

  // 4) Primer sync al abrir app (si ya hay uid + internet)
  useEffect(() => {
    runSync();
  }, [runSync]);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StackNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;
