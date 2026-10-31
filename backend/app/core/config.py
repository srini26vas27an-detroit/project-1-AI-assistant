
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    DATABASE_URL: str = 'sqlite:///./data/kirana.db'
    GEMINI_API_KEY: str = 'your_google_api_key_here'
    GEMINI_MODEL: str = 'gemini-3.5-flash-lite'
    CORS_ORIGINS: str = 'http://localhost:3000,http://127.0.0.1:3000'
    SEED_DEMO_DATA: bool = True
    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

settings = Settings()