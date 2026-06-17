import os

BOT_TOKEN = os.environ.get("BOT_TOKEN", "")
if not BOT_TOKEN:
    raise RuntimeError("BOT_TOKEN env var is required")

PORT = os.environ.get("PORT")
ADMIN_USER_IDS_RAW = os.environ.get("ADMIN_USER_ID", "")
ADMIN_USER_IDS = [int(x.strip()) for x in ADMIN_USER_IDS_RAW.split(",") if x.strip().isdigit()]
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "")

REPLIT_DOMAINS = os.environ.get("REPLIT_DOMAINS", "")
first_domain = REPLIT_DOMAINS.split(",")[0].strip() if REPLIT_DOMAINS else ""
_replit_url = f"https://{first_domain}" if first_domain else ""

PUBLIC_BASE_URL = os.environ.get("PUBLIC_URL", _replit_url)

REPLIT_DEPLOYMENT = os.environ.get("REPLIT_DEPLOYMENT")
RENDER = os.environ.get("RENDER")
if REPLIT_DEPLOYMENT or RENDER:
    WEBAPP_PATH = "/"
else:
    WEBAPP_PATH = "/webapp/"

WEBAPP_URL = PUBLIC_BASE_URL + WEBAPP_PATH if PUBLIC_BASE_URL else ""

BRAND_PRIMARY = "#F8C1CC"
BRAND_ACCENT = "#A8DADC"
BRAND_BG = "#FAF3E7"

PRICE_MONTHLY = 490
PRICE_YEARLY = 3900
PRICE_STARTER = 290
PRICE_NEUROPHOTO = 199
PRICE_BENEFITS_GUIDE = 149

FREE_LIMIT_PER_DAY = 10
