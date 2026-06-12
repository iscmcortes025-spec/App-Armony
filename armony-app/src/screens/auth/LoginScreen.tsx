import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../navigation/StackNavigator";
import { LinearGradient } from "expo-linear-gradient";

// ✅ Importamos AsyncStorage para guardar el Token
import { useAuth } from "../../hooks/useAuth";

type LoginScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Login"
>;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
}

const loginImage = require("../../../assets/armony_login.jpg");

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState({ email: "", password: "" });

  const { user: authUser, loading: authLoading, signIn } = useAuth();

  useEffect(() => {
    if (!authLoading && authUser) navigation.replace("Home");
  }, [authLoading, authUser]);

  const updateFormData = (field: "email" | "password", value: string): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateLogin = () => {
    const newErrors = { email: "", password: "" };
    let isValid = true;

    const email = formData.email.trim();
    const password = formData.password;

    if (!email) {
      newErrors.email = "El correo electrónico es obligatorio.";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Ingresa un formato de correo válido.";
      isValid = false;
    }

    if (!password || password.trim().length === 0) {
      newErrors.password = "La contraseña es obligatoria.";
      isValid = false;
    }

    setErrors(newErrors);
    return { isValid, email, password };
  };

  const handleLogin = async () => {
    const { isValid, email, password } = validateLogin();

    if (!isValid) {
      Alert.alert("Error de Validación", "Por favor, corrige los campos.");
      return;
    }

    try {
      setIsLoading(true);
      await signIn(email, password);
      // navigation to Home is handled by effect when authUser updates
    } catch (err: any) {
      Alert.alert(
        "Login",
        err.message || "No se pudo conectar con el servidor.",
      );
      console.log("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = () => {
    navigation.navigate("Register");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Image source={loginImage} style={styles.headerImage} />

        <View style={styles.formContainer}>
          <Text style={styles.title}>Inicio de sesión</Text>
          <Text style={styles.subtitle}>
            Inicia sesión con tu cuenta de Armony
          </Text>

          <Text style={styles.label}>Correo electrónico</Text>
          <View
            style={[
              styles.inputContainer,
              errors.email && styles.inputErrorBorder,
            ]}
          >
            <TextInput
              style={styles.input}
              placeholder="nombre@tucorreo.com"
              placeholderTextColor="#B0AEC4"
              value={formData.email}
              onChangeText={(text) => updateFormData("email", text)}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!isLoading}
            />
          </View>
          {errors.email ? (
            <Text style={styles.errorText}>{errors.email}</Text>
          ) : null}

          <Text style={styles.label}>Contraseña</Text>
          <View
            style={[
              styles.inputContainer,
              errors.password && styles.inputErrorBorder,
            ]}
          >
            <TextInput
              style={styles.input}
              placeholder="Introduce tu contraseña"
              placeholderTextColor="#B0AEC4"
              value={formData.password}
              onChangeText={(text) => updateFormData("password", text)}
              secureTextEntry
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>
          {errors.password ? (
            <Text style={styles.errorText}>{errors.password}</Text>
          ) : null}

          <TouchableOpacity
            style={styles.loginButtonWrapper}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <LinearGradient
              colors={["#E860FF", "#60AFFF"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.loginButton, { opacity: isLoading ? 0.7 : 1 }]}
            >
              <Text style={styles.loginButtonText}>
                {isLoading ? "Iniciando..." : "Inicia sesión"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>¿No tienes cuenta? </Text>
            <TouchableOpacity onPress={handleRegister} disabled={isLoading}>
              <Text style={styles.registerLink}>Regístrate</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContainer: { flexGrow: 1, alignItems: "stretch" },
  headerImage: { width: "100%", height: 300, resizeMode: "cover" },
  formContainer: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 30,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    marginBottom: 30,
  },
  label: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 8 },
  inputContainer: {
    backgroundColor: "#F2F1F7",
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "transparent",
  },
  inputErrorBorder: { borderColor: "#D32F2F" },
  input: { height: 55, paddingHorizontal: 20, fontSize: 16, color: "#333" },
  errorText: {
    color: "#D32F2F",
    fontSize: 13,
    marginTop: -15,
    marginBottom: 15,
    paddingLeft: 5,
  },
  loginButtonWrapper: {
    borderRadius: 12,
    marginTop: 10,
    shadowColor: "#E860FF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  loginButton: {
    height: 55,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  loginButtonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
  },
  registerText: { color: "#888", fontSize: 14 },
  registerLink: { color: "#E860FF", fontSize: 14, fontWeight: "bold" },
});

export default LoginScreen;
