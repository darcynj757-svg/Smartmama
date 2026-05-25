from aiogram.types import (
    ReplyKeyboardMarkup, KeyboardButton,
    InlineKeyboardMarkup, InlineKeyboardButton,
    WebAppInfo
)
from bot.config import WEBAPP_URL


def open_app_kb() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[
            KeyboardButton(
                text="✨ Открыть Smart Mama",
                web_app=WebAppInfo(url=WEBAPP_URL) if WEBAPP_URL else None
            )
        ]],
        resize_keyboard=True,
        one_time_keyboard=False
    )


def gender_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="👦 Мальчик", callback_data="ob:gender:boy"),
        InlineKeyboardButton(text="👧 Девочка", callback_data="ob:gender:girl"),
    ]])
