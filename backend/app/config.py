"""
Core Configuration Module.
Loads and validates environment variables from .env using Pydantic Settings.
Manages broker endpoints, port numbers, topic paths, and database URLs.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # ------------------------------------------------------------------
    # MQTT BROKER SETTINGS
    # Defaults are fallbacks to the public test broker.
    # Production values should be supplied via the .env file once the
    # broker is deployed on the local network.
    # ------------------------------------------------------------------
    MQTT_BROKER: str = "broker.hivemq.com"
    MQTT_PORT: int = 1883
    TOPIC_TELEMETRY: str = "esp32/telemetry"
    TOPIC_COMMAND: str = "esp32/cmd/servo"
    DATABASE_URL: str = "sqlite:///./reactor_telemetry.db"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()