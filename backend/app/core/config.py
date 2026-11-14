from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    access_token_minutes: int = 30
    frontend_url: str = "http://localhost:5173"

    # Local development defaults (for example, MailHog).
    # Set production SMTP values in Railway Variables.
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_starttls: bool = False
    smtp_use_ssl: bool = False
    smtp_from_email: str = "noreply@acms.org"

    invite_valid_days: int = 7

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()