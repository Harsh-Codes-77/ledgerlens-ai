import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic import BaseModel

# Locate project root and load .env file
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent
env_path = BASE_DIR / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

DEFAULT_DB_PATH = (BASE_DIR / "data" / "ledgerlens.db").as_posix()

class Settings(BaseModel):
    PROJECT_NAME: str = "LedgerLens AI"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}"
    )
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "mock")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

settings = Settings()
