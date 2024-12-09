from typing import List
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from . import xml_processor
from .external_api import ExternalAPIClient
from pydantic import BaseModel
import os

app = FastAPI()

# Configuração do CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializa o cliente da API externa
external_api = ExternalAPIClient(
    base_url=os.getenv("EXTERNAL_API_URL", "https://api.exemplo.com"),
    api_key=os.getenv("EXTERNAL_API_KEY", "sua-chave-aqui")
)

class TripCreationResponse(BaseModel):
    trip_id: str
    status: str
    message: str

@app.post("/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    try:
        # Processa os arquivos XML
        processed_data = await xml_processor.process_xml_files(files)
        
        # Cria a estrutura da viagem
        trip_data = xml_processor.create_trip_structure(processed_data)
        
        # Integra com sistema externo
        integration_result = await external_api.create_trip(trip_data)
        
        return TripCreationResponse(
            trip_id=integration_result.get("id"),
            status="success",
            message="Viagem criada com sucesso"
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "API XML Processor está funcionando"} 

