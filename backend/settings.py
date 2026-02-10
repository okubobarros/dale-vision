# backend/settings.py
import os
from pathlib import Path
from urllib.parse import urlparse, parse_qs, unquote
from dotenv import load_dotenv
from datetime import timedelta

# Carrega variáveis do .env
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'django-insecure-change-me-in-production!')

# SECURITY WARNING: don't run with debug turned on in production!
def _env_csv(name: str, default: list[str]) -> list[str]:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    items = [item.strip() for item in raw.split(",")]
    return [item for item in items if item]

DEBUG = os.getenv("DEBUG", "0") in ("1", "true", "True")

# Hardened settings for production
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    CSRF_COOKIE_SECURE = True
    SESSION_COOKIE_SECURE = True

ALLOWED_HOSTS = _env_csv(
    "ALLOWED_HOSTS",
    ["localhost", "127.0.0.1"],
)

# ⭐ APPLICATION DEFINITION - APENAS ESSENCIAIS INICIALMENTE
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',      # ⭐ NÃO CRIAR 'apps.auth' - ESTE É O OFICIAL
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party
    'rest_framework',
    'corsheaders',
    'knox',
    'django_filters',
    'drf_yasg',
    
    # ⭐ LOCAL APPS - VAMOS CRIAR AGORA
    'apps.accounts',
    'apps.core',
    'apps.stores',
    'apps.cameras', 
    'apps.analytics',
    'apps.alerts',
    'apps.billing',
    "apps.edge",
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'

# ⭐ DATABASE - Supabase Postgres (prod e dev)
_database_url = os.getenv("DATABASE_URL")
if _database_url:
    parsed = urlparse(_database_url)
    scheme = (parsed.scheme or "").split("+", 1)[0]
    if scheme in {"postgres", "postgresql"}:
        query = parse_qs(parsed.query)
        sslmode = (query.get("sslmode") or ["require"])[0]
        DATABASES = {
            "default": {
                "ENGINE": "django.db.backends.postgresql",
                "NAME": unquote(parsed.path.lstrip("/")),
                "USER": unquote(parsed.username or ""),
                "PASSWORD": unquote(parsed.password or ""),
                "HOST": parsed.hostname or "",
                "PORT": str(parsed.port or "5432"),
                "OPTIONS": {"sslmode": sslmode},
            }
        }
    else:
        DATABASES = None
else:
    DATABASES = None

if DATABASES is None:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('DB_NAME', 'postgres'),
            'USER': os.getenv('DB_USER', 'postgres'),
            'PASSWORD': os.getenv('DB_PASSWORD', ''),
            'HOST': os.getenv('DB_HOST', ''),
            'PORT': os.getenv('DB_PORT', '5432'),
            'OPTIONS': {
                'sslmode': os.getenv('DB_SSLMODE', 'require'),
            }
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'pt-br'
TIME_ZONE = 'America/Sao_Paulo'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ⭐ REST FRAMEWORK CONFIG
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'apps.accounts.auth_supabase.SupabaseJWTAuthentication',
        'knox.auth.TokenAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': ('rest_framework.permissions.IsAuthenticatedOrReadOnly',),
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend'],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
}

# ⭐ CORS CONFIG
CORS_ALLOWED_ORIGINS = _env_csv(
    "CORS_ALLOWED_ORIGINS",
    [
        "https://app.dalevision.com",
        "https://dalevision.com",
        "https://www.dalevision.com",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
)
CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]
# ⭐ CSRF CONFIG
CSRF_TRUSTED_ORIGINS = _env_csv(
    "CSRF_TRUSTED_ORIGINS",
    [
        "https://app.dalevision.com",
        "https://dalevision.com",
        "https://www.dalevision.com",
        "https://api.dalevision.com",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
)
# ⭐ KNOX CONFIG
REST_KNOX = {
    'TOKEN_TTL': timedelta(days=30),
    'AUTO_REFRESH': True,
}

# ⭐ SUPABASE CONFIG (SEUS DADOS)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
N8N_EVENTS_WEBHOOK = os.getenv("N8N_EVENTS_WEBHOOK")
STATUS_STALE_AFTER_SECONDS = int(os.getenv("STATUS_STALE_AFTER_SECONDS", "120"))
STATUS_EXPIRED_AFTER_SECONDS = int(os.getenv("STATUS_EXPIRED_AFTER_SECONDS", "300"))

STATUS_COOLDOWN_DEGRADED_SECONDS = int(os.getenv("STATUS_COOLDOWN_DEGRADED_SECONDS", "600"))
STATUS_COOLDOWN_OFFLINE_SECONDS = int(os.getenv("STATUS_COOLDOWN_OFFLINE_SECONDS", "1800"))
# ⭐ WHITENOISE (para arquivos estáticos)
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

EDGE_SERVICE_USERNAME = os.getenv("EDGE_SERVICE_USERNAME", "edge-agent")
EDGE_AGENT_TOKEN = os.getenv("EDGE_AGENT_TOKEN", "")
EDGE_SHARED_TOKEN = os.getenv("EDGE_SHARED_TOKEN", "")
