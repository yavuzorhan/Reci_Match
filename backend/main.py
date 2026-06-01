import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.routers import auth, ingredients, recipes, users

app = FastAPI(
    title="Akıllı Tarif ve Beslenme Sistemi API",
    description="Malzeme bazlı tarif öneri, kişisel beslenme profili ve günlük kalori takibi.",
    version="1.0.0",
)

class UTF8Middleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if 'content-type' in response.headers:
            ct = response.headers['content-type']
            if 'application/json' in ct and 'charset' not in ct:
                response.headers['content-type'] = 'application/json; charset=utf-8'
        return response

app.add_middleware(UTF8Middleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(ingredients.router)
app.include_router(recipes.router)
app.include_router(users.router)

app.mount("/uploads", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "uploads")), name="uploads")

@app.get("/")
def read_root():
    return {"message": "Welcome to Bitirme Backend API"}
