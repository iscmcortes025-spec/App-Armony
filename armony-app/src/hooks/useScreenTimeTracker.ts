import { useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { saveLocalPracticeSession } from "../database/db";

type Options = {
  screenName: string; // "Metronome", "LessonDetail", etc.
  extra?: Record<string, any>; // ej: { lessonName: "Escala Mayor", bpmStart: 60 }
  minSecondsToSave?: number; // evita guardar si solo entró 1s
};

export function useScreenTimeTracker({
  screenName,
  extra,
  minSecondsToSave = 3,
}: Options) {
  const isFocused = useIsFocused();

  const startRef = useRef<number | null>(null);
  const accumRef = useRef<number>(0); // ms acumulados (por pausas)
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const [seconds, setSeconds] = useState(0);

  const tick = () => {
    const now = Date.now();
    const base = accumRef.current;
    const running = startRef.current ? now - startRef.current : 0;
    setSeconds(Math.floor((base + running) / 1000));
  };

  const start = () => {
    if (startRef.current == null) startRef.current = Date.now();
  };

  const pause = () => {
    if (startRef.current != null) {
      accumRef.current += Date.now() - startRef.current;
      startRef.current = null;
    }
  };

  const reset = () => {
    startRef.current = null;
    accumRef.current = 0;
    setSeconds(0);
  };

  const save = async () => {
    const totalMs =
      accumRef.current + (startRef.current ? Date.now() - startRef.current : 0);
    const totalSeconds = Math.floor(totalMs / 1000);

    if (totalSeconds < minSecondsToSave) return;

    try {
      // Mandamos a llamar a nuestra base de datos local SQLite
      await saveLocalPracticeSession(
        screenName, // El tipo (Metronome, Lesson, etc.)
        totalSeconds, // La duración
        extra?.lessonName ?? null,
        extra?.temaId ?? null,
        extra?.bpmStart ?? null,
        extra?.bpmEnd ?? null,
        extra, // Pasamos el objeto completo como "meta" por si hay datos extra
      );
    } catch (error) {
      console.error(
        "[useScreenTimeTracker] Error al guardar en SQLite:",
        error,
      );
    }
  };

  // Focus / blur
  useEffect(() => {
    let interval: any;

    if (isFocused) {
      start();
      interval = setInterval(tick, 1000);
    } else {
      pause();
      // guarda al salir de pantalla en SQLite
      save().catch(() => {});
      reset();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  // AppState foreground/background
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const prev = appState.current;
      appState.current = next;

      // si se va a background, pausa + guarda
      if (prev === "active" && next !== "active") {
        pause();
        save().catch(() => {});
      }

      // si regresa a active y la pantalla sigue enfocada, reanuda
      if (prev !== "active" && next === "active" && isFocused) {
        start();
      }
    });

    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  return { seconds };
}

export default useScreenTimeTracker;
