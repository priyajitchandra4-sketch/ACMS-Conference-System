from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    access_token_minutes: int = 30
    frontend_url: str = "http://localhost:5173"

    # Brevo HTTPS API. Set BREVO_API_KEY in Railway Variables.
    brevo_api_key: str | None = None

    # Must be a sender address verified in Brevo.
    smtp_from_email: str = "noreply@acms.org"

    invite_valid_days: int = 7

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()