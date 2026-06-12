import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { COLORS } from "../../types/index";
import { AuthProvider } from "../hooks/useAuth";
import { AppSyncGate } from "../AppSyncGate";

// Pantallas Auth
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";

// Home
import HomeScreen from "../screens/home/HomeScreen";

// Detalles de lección
import LessonDetailScreen from "../screens/home/LessonDetailScreen";
import TheoryLessonDetailScreen from "../screens/home/TheoryLessonDetailScreen"; // NUEVA TEORÍA

import MiAvanceGpsScreen from "../screens/home/MiAvanceGpsScreen";
import MetronomeScreen from "../screens/home/MetronomeScreen";
import ProgressScreen from "../screens/home/ProgressScreen";
import DailyChallengesScreen from "../screens/home/DailyChallengesScreen";

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;

  LessonDetail: { lessonName: string };

  TheoryLessonDetail: { lessonName: string };
  MiAvanceGps: undefined;
  Metronome: undefined;
  Progress: undefined;
  DailyChallenges: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const StackNavigator: React.FC = () => {
  return (
    <AuthProvider>
      <AppSyncGate />
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.primary },
          headerTintColor: "#ffffff",
          headerTitleStyle: { fontWeight: "bold" },
        }}
      >
        {/* LOGIN */}
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />

        {/* REGISTER */}
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ headerShown: false }}
        />

        {/* HOME */}
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />

        {/* ⭐ DETALLE ORIGINAL DE LECCIONES */}
        <Stack.Screen
          name="LessonDetail"
          component={LessonDetailScreen}
          options={({ route }) => ({
            title: route.params.lessonName,
            headerShown: false,
          })}
        />

        {/* ⭐ NUEVA PANTALLA DE TEORÍA MUSICAL */}
        <Stack.Screen
          name="TheoryLessonDetail"
          component={TheoryLessonDetailScreen}
          options={({ route }) => ({
            title: route.params.lessonName,
            headerShown: false,
          })}
        />

        {/* METRÓNOMO */}
        <Stack.Screen
          name="Metronome"
          component={MetronomeScreen}
          options={{ headerShown: false }}
        />

        {/* PROGRESO */}
        <Stack.Screen
          name="Progress"
          component={ProgressScreen}
          options={{ headerShown: false }}
        />

        {/* RETOS DIARIOS */}
        <Stack.Screen
          name="DailyChallenges"
          component={DailyChallengesScreen}
          options={{ headerShown: false }}
        />
        {/*Gps*/}
        <Stack.Screen
          name="MiAvanceGps"
          component={MiAvanceGpsScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </AuthProvider>
  );
};

export default StackNavigator;
