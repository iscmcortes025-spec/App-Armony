/**
 * Archivo central para todos los tipos TypeScript de la aplicación
 * Aquí definimos las interfaces y tipos que se usarán en toda la app
 */
// ==========================================
// TIPOS BÁSICOS DE LA APLICACIÓN
// ==========================================
/**
 * Tipo para identificadores únicos
 */
export type ID = number;

// NUEVO: Tipos específicos para la app de música
export type Dificultad = "Principiante" | "Intermedio" | "Avanzado";
export type TipoRecurso = "Teoria" | "Auditivo" | "Practico" | "Desafío";

// ==========================================
// INTERFACES DE ENTIDADES PRINCIPALES (MÚSICA)
// ==========================================
/**
 * Interfaz base para entidades que tienen ID
 */
export interface BaseEntity {
  id: ID;
}
/**
 * Interfaz para el Usuario/Aprendiz
 */
export interface Usuario extends BaseEntity {
  nombre: string;
  email: string;
  nivel: number;
  xp: number; // Puntos de experiencia
}
/**
 * Interfaz para un Módulo o Ruta de Aprendizaje (Ej: Lecciones)
 */
export interface Modulo extends BaseEntity {
  nombre: string;
  descripcion: string;
  dificultad: Dificultad;
  progreso: number; // Porcentaje de 0 a 100
  imagenUrl?: string;
}
/**
 * Interfaz para una Lección o Tema específico (Ej: Tema 1: Escalas Mayores)
 */
export interface Leccion extends BaseEntity {
  moduloId: ID;
  titulo: string;
  tipo: TipoRecurso;
  contenido?: string;
  duracionMinutos: number;
}
/**
 * Interfaz para un Desafío o Reto Diario
 */
export interface Desafio extends BaseEntity {
  nombre: string;
  fecha: string; // YYYY-MM-DD
  puntosXP: number;
  completado: boolean;
}
// ==========================================
// TIPOS PARA COMPONENTES UI (Se mantienen genéricos)
// ==========================================
/**
 * Props para componentes de Card/Tarjeta
 */
export interface CardProps {
  titulo: string;
  subtitulo?: string;
  onPress?: () => void;
  icono?: string;
  imagen?: any; // Para require() de imágenes
}
/**
 * Props para componentes de Modal
 */
export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  titulo?: string;
  children?: React.ReactNode;
}
/**
 * Props para componentes de Lista
 */
export interface ListItemProps<T> {
  item: T;
  onPress?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
}
// ==========================================
// TIPOS PARA FORMULARIOS
// ==========================================
/**
 * Datos del formulario de Login
 */
export interface LoginFormData {
  email: string; // Cambiado de username a email
  password: string;
}
/**
 * Datos del formulario de Perfil de Usuario (Reemplaza AlumnoFormData)
 */
export interface PerfilFormData {
  nombre: string;
  email?: string;
}

// Los demás FormData específicos (Profesor, Alumno) fueron eliminados ya que no aplican.

// ==========================================
// TIPOS PARA GESTIÓN DE ESTADOS (Se mantienen)
// ==========================================
/**
 * Estados de carga para operaciones asíncronas
 */
export type LoadingState = "idle" | "loading" | "success" | "error";
/**
 * Estructura para manejo de errores
 */
export interface ErrorState {
  hasError: boolean;
  message?: string;
  code?: string;
}
/**
 * Estado general de una pantalla con datos
 */
export interface ScreenState<T> {
  data: T[];
  loading: LoadingState;
  error: ErrorState;
}
// ==========================================
// TIPOS PARA NAVEGACIÓN (Se mantienen)
// ==========================================
/**
 * Props que reciben las pantallas de navegación
 */
export interface ScreenProps<T = any> {
  navigation: any; // Tipo básico, se puede mejorar después
  route: {
    params?: T;
  };
}
/**
 * Parámetros específicos para pantallas de detalle (Se mantiene, pero se usa para Lecciones)
 */
export interface DetailScreenParams {
  id: ID;
  nombre: string;
}
// ==========================================
// TIPOS UTILITARIOS (Se mantienen)
// ==========================================
/**
 * Hace todas las propiedades opcionales excepto el ID
 */
export type PartialExceptId<T extends BaseEntity> = {
  id: ID;
} & Partial<Omit<T, "id">>;
/**
 * Omite el ID para crear nuevos elementos
 */
export type CreateEntity<T extends BaseEntity> = Omit<T, "id">;
/**
 * Para operaciones CRUD
 */
export type CRUDOperation = "create" | "read" | "update" | "delete";
// ==========================================
// CONSTANTES DE TIPO (Nuevos Colores de Armony)
// ==========================================
/**
 * Colores principales de la aplicación (Actualizados a la paleta de Armony)
 */
export const COLORS = {
  primary: "#6A1B9A", // Morado principal (similar al figma)
  secondary: "#00ACC1", // Cian/Turquesa
  background: "#F7F8FC", // Fondo casi blanco
  surface: "#FFFFFF", // Para tarjetas
  error: "#D32F2F", // Rojo estándar
  text: "#212121", // Texto principal
  textSecondary: "#757575", // Texto secundario
};
/**
 * Tamaños de fuente estándar (Se mantienen)
 */
export const FONT_SIZES = {
  small: 14,
  medium: 16,
  large: 18,
  xlarge: 22,
  xxlarge: 24,
};
