from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Le damos un valor por defecto (el mismo de tu .env) para que VS Code sepa que siempre será un String
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://admin:secretpassword@db:5432/armony_offline"
)

# Crear el motor de la base de datos
engine = create_engine(DATABASE_URL)

# Crear la fábrica de sesiones (para hablar con la BD en cada petición)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Clase base de la que heredarán todos nuestros modelos
Base = declarative_base()

# Función que usaremos en nuestros endpoints para obtener una conexión a la BD
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()