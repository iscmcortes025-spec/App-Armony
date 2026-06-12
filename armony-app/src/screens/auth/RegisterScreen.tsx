import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../navigation/StackNavigator";
import { LinearGradient } from "expo-linear-gradient";
import NetInfo from "@react-native-community/netinfo";

type RegisterNavProp = StackNavigationProp<RootStackParamList, "Register">;

interface RegisterScreenProps {
  navigation: RegisterNavProp;
}

const headerImage = require("../../../assets/armony_login.jpg");

// 📌 IP para el Emulador de Android apuntando al localhost de tu PC
const API_URL = "https://app-armony.onrender.com";

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validatePassword = (password: string): string | null => {
    if (!password || password.trim().length === 0)
      return "La contraseña es obligatoria.";
    if (password.length < 6) return "Mínimo 6 caracteres.";
    return null;
  };

  const handleRegister = async () => {
    const newErrors = {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    };
    let isValid = true;

    if (!form.username.trim()) {
      newErrors.username = "El nombre de usuario es obligatorio.";
      isValid = false;
    }

    if (!form.email.trim()) {
      newErrors.email = "El correo electrónico es obligatorio.";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = "Ingresa un correo válido.";
      isValid = false;
    }

    const passError = validatePassword(form.password);
    if (passError) {
      newErrors.password = passError;
      isValid = false;
    }

    if (!form.confirmPassword.trim()) {
      newErrors.confirmPassword = "Confirma tu contraseña.";
      isValid = false;
    } else if (form.confirmPassword !== form.password) {
      newErrors.confirmPassword = "Las contraseñas no coinciden.";
      isValid = false;
    }

    setErrors(newErrors);

    if (!isValid) {
      Alert.alert("Revisa los campos", "Corrige los errores marcados.");
      return;
    }

    // 🚀 1. REVISAR CONEXIÓN A INTERNET
    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) {
      Alert.alert(
        "Sin conexión",
        "Necesitas acceso a internet para crear una cuenta nueva.",
      );
      return;
    }

    try {
      setIsLoading(true);

      const email = form.email.trim();
      const password = form.password;
      const nombre = form.username.trim();

      // 🚀 2) Llamada a tu API de FastAPI para Registrar
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          nombre,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Error al registrar usuario");
      }

      // El backend retorna el usuario recién creado, no el token.
      // Por eso pedimos iniciar sesión después de registrarse.
      Alert.alert(
        "Registro exitoso",
        "Tu cuenta ha sido creada. Por favor inicia sesión.",
        [
          {
            text: "Ir al login",
            onPress: () => navigation.replace("Login"),
          },
        ],
      );
    } catch (err: any) {
      const message = err?.message || "No se pudo conectar con el servidor.";
      Alert.alert("Registro", message);
      console.log("Register error:", JSON.stringify(err, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  const goToLogin = () => {
    navigation.replace("Login");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Image source={headerImage} style={styles.headerImage} />

          <View style={styles.inner}>
            <Text style={styles.title}>Registrarse</Text>
            <Text style={styles.subtitle}>
              Únete a Armony y comienza a practicar
            </Text>

            {/* Username */}
            <Text style={styles.label}>Nombre de Usuario</Text>
            <View
              style={[
                styles.inputWrapper,
                errors.username && styles.inputWrapperError,
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="Introduce tu nombre"
                placeholderTextColor="#B0AEC4"
                value={form.username}
                onChangeText={(t) => updateField("username", t)}
                editable={!isLoading}
              />
            </View>
            {errors.username ? (
              <Text style={styles.errorText}>{errors.username}</Text>
            ) : null}

            {/* Email */}
            <Text style={styles.label}>Correo electrónico</Text>
            <View
              style={[
                styles.inputWrapper,
                errors.email && styles.inputWrapperError,
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="nombre@tucorreo.com"
                placeholderTextColor="#B0AEC4"
                keyboardType="email-address"
                autoCapitalize="none"
                value={form.email}
                onChangeText={(t) => updateField("email", t)}
                editable={!isLoading}
              />
            </View>
            {errors.email ? (
              <Text style={styles.errorText}>{errors.email}</Text>
            ) : null}

            {/* Password */}
            <Text style={styles.label}>Contraseña</Text>
            <View
              style={[
                styles.inputWrapper,
                errors.password && styles.inputWrapperError,
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#B0AEC4"
                secureTextEntry
                autoCapitalize="none"
                value={form.password}
                onChangeText={(t) => updateField("password", t)}
                editable={!isLoading}
              />
            </View>
            {errors.password ? (
              <Text style={styles.errorText}>{errors.password}</Text>
            ) : null}

            {/* Confirm */}
            <Text style={styles.label}>Confirmar Contraseña</Text>
            <View
              style={[
                styles.inputWrapper,
                errors.confirmPassword && styles.inputWrapperError,
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="Repite tu contraseña"
                placeholderTextColor="#B0AEC4"
                secureTextEntry
                autoCapitalize="none"
                value={form.confirmPassword}
                onChangeText={(t) => updateField("confirmPassword", t)}
                editable={!isLoading}
              />
            </View>
            {errors.confirmPassword ? (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            ) : null}

            {/* Button */}
            <TouchableOpacity
              style={styles.buttonWrapper}
              onPress={handleRegister}
              disabled={isLoading}
            >
              <LinearGradient
                colors={["#E860FF", "#60AFFF"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={[styles.button, { opacity: isLoading ? 0.7 : 1 }]}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? "Creando..." : "Registrarse"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
              <TouchableOpacity onPress={goToLogin} disabled={isLoading}>
                <Text style={styles.footerLink}>Inicia sesión aquí.</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E5E6F0",
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  headerImage: {
    width: "100%",
    height: 180,
    resizeMode: "cover",
  },
  inner: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 26,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: "#777",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  inputWrapper: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E4B5FF",
    backgroundColor: "#F9F3FF",
    marginBottom: 12,
  },
  inputWrapperError: {
    borderColor: "#D32F2F",
  },
  input: {
    height: 48,
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#333",
  },
  errorText: {
    fontSize: 12,
    color: "#D32F2F",
    marginTop: -6,
    marginBottom: 8,
  },
  buttonWrapper: {
    marginTop: 8,
    borderRadius: 999,
    overflow: "hidden",
    shadowColor: "#E860FF",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  button: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 18,
  },
  footerText: {
    fontSize: 13,
    color: "#777",
  },
  footerLink: {
    fontSize: 13,
    color: "#000",
    fontWeight: "700",
  },
});

export default RegisterScreen;
