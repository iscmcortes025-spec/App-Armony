import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearLocalUser, getLocalUser, setLocalUser } from "../database/db";
import NetInfo from "@react-native-community/netinfo";

type User = {
  email?: string;
  backend_id?: string | null;
  session_token?: string | null;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const API_URL = "https://app-armony.onrender.com";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const local: any = await getLocalUser();

        if (local) {
          setUser({
            email: local.email,
            backend_id: local.backend_id || null,
            session_token: local.session_token || null,
          });
          if (local.session_token) {
            await AsyncStorage.setItem("userToken", local.session_token);
          }
        }
      } catch (err) {
        console.warn("useAuth init error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = async (email: string, password: string) => {
    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      throw new Error(
        "No hay conexión. Para iniciar sesión por primera vez necesitas internet.",
      );
    }

    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Error al iniciar sesión");

    const token = data.access_token;

    // persist token in AsyncStorage and SQLite
    await AsyncStorage.setItem("userToken", token);
    await setLocalUser(data.user_id || null, email, token);

    setUser({ email, backend_id: data.user_id || null, session_token: token });
  };

  const signOut = async () => {
    try {
      await AsyncStorage.removeItem("userToken");
      await AsyncStorage.removeItem("sync_pull_done"); // 👈 agrega esta línea
      await clearLocalUser();
      setUser(null);
    } catch (err) {
      console.warn("signOut error:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export default useAuth;
