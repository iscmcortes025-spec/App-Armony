from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Importamos la base de datos y los modelos para la creación automática
from .database import engine
from . import models

# Importamos los routers (el de auth y tu nuevo router de sync)
from .routers import auth, sync  # Asegúrate de que auth.py exista en esa carpeta

# Creamos las tablas en la base de datos de PostgreSQL si no existen
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Armony API",
    description="Backend centralizado para sincronización offline-first",
    version="1.0.0"
)

# 🔒 CONFIGURACIÓN DE CORS (Crucial para que tu celular/emulador React Native pueda conectarse)
origins = [
    "*", # En desarrollo puedes dejarlo así para evitar dolores de cabeza con IPs dinámicas
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🚀 REGISTRO DE ROUTERS
app.include_router(auth.router)  # Rutas de /auth (Login, Registro)
app.include_router(sync.router)  # Tus nuevas rutas de /sync (Push, Challenges, Streak)

@app.get("/")
def read_root():
    return {"message": "¡Backend de Armony corriendo exitosamente!"}