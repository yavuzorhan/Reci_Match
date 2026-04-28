"""
Akıllı Tarif ve Beslenme Sistemi — Ana Uygulama Giriş Noktası

Bu dosya yalnızca FastAPI uygulamasını oluşturur, middleware'i ekler
ve router'ları dahil eder. İş mantığı service katmanındadır.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, ingredients, recipes, users

# ─── Uygulama Oluşturma ─────────────────────────────────────────────────────

app = FastAPI(
    title="Akıllı Tarif ve Beslenme Sistemi API",
    description="Malzeme bazlı tarif öneri, kişisel beslenme profili ve günlük kalori takibi.",
    version="1.0.0",
)

# ─── CORS Middleware ─────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Router'ları Dahil Et ───────────────────────────────────────────────────

app.include_router(auth.router)
app.include_router(ingredients.router)
app.include_router(recipes.router)
app.include_router(users.router)


# ─── Root Endpoint ──────────────────────────────────────────────────────────

@app.get("/")
def read_root():
    return {"message": "Welcome to Bitirme Backend API"}
