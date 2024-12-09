from typing import List
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from . import xml_processor
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

@app.post("/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    try:
        # Processa os arquivos XML
        result = await xml_processor.process_xml_files(files)
        
        # Verifica se há dados processados
        if not result.get("processed_data"):
            raise ValueError("Nenhum dado foi processado dos arquivos")

        # Cria a estrutura da viagem mas não envia para API externa
        trip_data = xml_processor.create_trip_structure(result["processed_data"])
        
        return {
            "processed_data": result["processed_data"],
            "trip_structure": trip_data,
            "validation_errors": result.get("validation_errors", {})
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "API XML Processor está funcionando!"} 

