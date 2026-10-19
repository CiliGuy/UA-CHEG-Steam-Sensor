"""
Application Entry Point.
Initializes FastAPI, binds CORS middleware for the React frontend,
manages startup/shutdown background lifespans, and includes API routers.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.mqtt_client import start_mqtt, stop_mqtt
from app.api.routes import router as reactor_router

# Ensure SQLite tables exist on boot
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Launch MQTT background listener
    start_mqtt()
    yield
    # Shutdown: Cleanly disconnect MQTT
    stop_mqtt()

app = FastAPI(
    title="Chemical Reactor CPS Backend",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS so the React app (JSX) can query this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust to ["http://localhost:3000", "http://localhost:5173"] in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reactor_router)

@app.get("/")
def health_check():
    return {"status": "healthy", "service": "Reactor CPS Ingestion Engine"}