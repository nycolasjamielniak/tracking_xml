from typing import List
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from . import xml_processor
from pydantic import BaseModel
import os
from datetime import datetime, timezone, timedelta
from .models import Trip
from .external_api import ExternalAPIClient
from sqlalchemy.orm import Session
from fastapi import Depends
from .database import get_db, IntegratedTrip
import json

app = FastAPI()

# Configuração do CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add environment variables for Matrix Cargo API
MATRIX_CARGO_API_URL = os.getenv('MATRIX_CARGO_API_URL', 'https://tracking-api-homol.matrixcargo.com.br/api/v1/external/trip')
MATRIX_CARGO_API_KEY = os.getenv('MATRIX_CARGO_API_KEY', 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJHUWNDZ0tyY0tBSlZrTW93S0FiZU1NU2paYkxSN21vQVhkV0JBZlhvaDFBIn0.eyJleHAiOjE3MzUwNDkxMTEsImlhdCI6MTczNDIwMTMxOSwiYXV0aF90aW1lIjoxNzM0MTg1MTExLCJqdGkiOiJhOTc5NmNkNy0wMDY1LTQ4NjgtOTFkZS0zYTYwZjU2ZTE1Y2QiLCJpc3MiOiJodHRwczovL2F1dGgtaG9tb2wubWF0cml4Y2FyZ28uY29tLmJyL3JlYWxtcy9wYWluZWwiLCJhdWQiOiJwYWluZWwtYXBpIiwic3ViIjoiYTY0NzNlMzMtYTQxMy00YWY5LTk0Y2MtMWZmOTQ5NmEyZWNiIiwidHlwIjoiQmVhcmVyIiwiYXpwIjoicGFpbmVsLXYyIiwibm9uY2UiOiJjZDk1OTI1NC1kMTUzLTQxMzAtODdlMS1lOWEwOWUxM2VlNGUiLCJzZXNzaW9uX3N0YXRlIjoiYzg5ODkyMTEtNzM0Ny00YmM3LWIzOTEtNzVkYjJhMjkzNmVlIiwiYWNyIjoiMCIsInJlYWxtX2FjY2VzcyI6eyJyb2xlcyI6WyJBVVRIX3RyYW5zcG9ydC1vcmRlcl9QVVQiLCJBVVRIX2hpc3RvcmljYWwtZXZlbnRfUFVUIiwiQVVUSF93b3Jrc3BhY2VfUE9TVCIsIkFVVEhfdXNlcl9HRVQiLCJBVVRIX2RyaXZlci1vcmdhbml6YXRpb24tcmVsYXRpb25fR0VUIiwiQVVUSF9hZGRyZXNzX0dFVCIsIkFVVEhfb3JkZXItaW52b2ljZS1yZWxhdGlvbl9ERUxFVEUiLCJBVVRIX2ludGVncmF0aW9uLWZvcmxvZ19QT1NUIiwiQVVUSF9kcml2ZXJfR0VUIiwiQVVUSF9vcmRlci1pbnZvaWNlLXJlbGF0aW9uX1BVVCIsIkFVVEhfc2VydmljZS1wb2ludF9QT1NUIiwiQVVUSF90cmFuc3BvcnQtb3JkZXJfREVMRVRFIiwiQVVUSF9mcmVpZ2h0LXZlaGljbGUtcmVsYXRpb25fREVMRVRFIiwiQVVUSF9vcmdhbml6YXRpb25fUFVUIiwiQVVUSF9mcmVpZ2h0LW9mZmVyX0RFTEVURSIsIkFVVEhfcm91dGUtcGxhbm5pbmdfR0VUIiwidW1hX2F1dGhvcml6YXRpb24iLCJBVVRIX3RhZ19QT1NUIiwiQVVUSF93b3Jrc3BhY2VfUFVUIiwiQVVUSF9pbnZvaWNlX0dFVCIsIkFVVEhfd29ya3NwYWNlX0RFTEVURSIsIkFVVEhfc2VydmljZS1wb2ludF9ERUxFVEUiLCJBVVRIX29yZGVyLWl0ZW1fREVMRVRFIiwiQVVUSF91c2VyX0RFTEVURSIsIkFVVEhfb3JkZXItaXRlbV9QVVQiLCJBVVRIX29yZGVyX2ZhY2lsaXRhdG9yX1BPU1QiLCJBVVRIX3JvdXRlLXBsYW5uaW5nX1BPU1QiLCJkZWZhdWx0LXJvbGVzLXBhaW5lbCIsIkFVVEhfaW50ZWdyYXRpb24tZm9ybG9nX0RFTEVURSIsIkFVVEhfdmVoaWNsZS10eXBlX1BPU1QiLCJBVVRIX2N1c3RvbS1maWVsZF9HRVQiLCJBVVRIX3NlcnZpY2UtcG9pbnQtYWRkcmVzcy1yZWxhdGlvbl9QVVQiLCJBVVRIX2ludGVncmF0aW9uLXRyYWNraW5nX1BPU1QiLCJBVVRIX29yZGVyX0RFTEVURSIsIkFVVEhfcm91dGVfREVMRVRFIiwiQVVUSF9vcmdhbml6YXRpb25fUE9TVCIsIkFVVEhfZnJlaWdodC1zdG9wX1BPU1QiLCJNT0RVTEVfcGFpbmVsIiwiQVVUSF9jYXJyaWVyX0RFTEVURSIsIkFVVEhfdXNlcl9QVVQiLCJBVVRIX3ZlaGljbGVfUFVUIiwiQVVUSF9yb3V0ZV9QT1NUIiwiQVVUSF9hZGRyZXNzX1BVVCIsIm9yZ2FuaXphY2FvX0dFVCIsIkFVVEhfYWRkcmVzc19ERUxFVEUiLCJBVVRIX2RyaXZlcl9QT1NUIiwiQVVUSF9zZXJ2aWNlLXBvaW50X1BVVCIsIkFVVEhfc2VydmljZS1wb2ludC1hZGRyZXNzLXJlbGF0aW9uX1BPU1QiLCJBVVRIX29yZGVyLWl0ZW1fUE9TVCIsIkFVVEhfcm91dGUtcGxhbm5pbmdfUFVUIiwiQVVUSF9nb29kcy10eXBlX0RFTEVURSIsIkFVVEhfcm91dGUtcGxhbm5pbmdfREVMRVRFIiwiQVVUSF9mcmVpZ2h0X0dFVCIsIkFVVEhfY3VzdG9tLWZpZWxkX0RFTEVURSIsIkFVVEhfdXNlcl9QT1NUIiwiUFBfcGFpbmVsX2FkbWluIiwiQVVUSF9vcmdhbml6YXRpb25fR0VUIiwiQVVUSF9zZXJ2aWNlLXBvaW50LWFkZHJlc3MtcmVsYXRpb25fR0VUIiwiQVVUSF9jdXN0b21lcl9QT1NUIiwiUFBfcGFpbmVsX2ZhY2lsaXRhdG9yIiwiQVVUSF9zZXJ2aWNlLXBvaW50LWxlZ2FsLWVudGl0eV9QVVQiLCJBVVRIX2N1c3RvbWVyX1BVVCIsIkFVVEhfZ29vZHMtdHlwZV9QVVQiLCJBVVRIX2FkZHJlc3NfUE9TVCIsIkFVVEhfaW52b2ljZV9ERUxFVEUiLCJBVVRIX2ZyZWlnaHQtaW50ZWdyYXRlX1BPU1QiLCJQUF9wYWluZWxfc3Vwb3J0ZSIsIkFVVEhfY3VzdG9tLWZpZWxkX1BVVCIsIkFVVEhfdmVoaWNsZV9HRVQiLCJBVVRIX2N1c3RvbS1maWVsZF9QT1NUIiwiQVVUSF90YWdfREVMRVRFIiwiQVVUSF9zZXJ2aWNlLXBvaW50LXZlaGljbGUtcmVzdHJpY3Rpb25fUFVUIiwiQVVUSF92ZWhpY2xlLXR5cGVfREVMRVRFIiwiQVVUSF9pYW0tcHJvZmlsZV9HRVQiLCJBVVRIX3NlcnZpY2UtcG9pbnQtbmF0dXJhbC1wZXJzb25fUE9TVCIsIkFVVEhfY3VzdG9tLWZpZWxkLXdvcmtzcGFjZS1jdXN0b21lci1yZWxhdGlvbl9QT1NUIiwiQVVUSF92ZWhpY2xlX1BPU1QiLCJBVVRIX3NlcnZpY2UtcG9pbnQtdmVoaWNsZS1yZXN0cmljdGlvbl9QT1NUIiwiQVVUSF9kcml2ZXItb3JnYW5pemF0aW9uLXJlbGF0aW9uX0RFTEVURSIsImFsbF9lbmRwb2ludHNfcGFpbmVsIiwiQVVUSF9jdXN0b21lcl9ERUxFVEUiLCJBVVRIX2hpc3RvcmljYWwtZXZlbnRfUE9TVCIsIkFVVEhfY2Fycmllcl9QT1NUIiwiQVVUSF90YWdfUFVUIiwiQVVUSF9vcmRlci1jdXN0b20tZmllbGQtcmVsYXRpb25fUFVUIiwiTU9EVUxFX3RyYWtpbmciLCJBVVRIX3JvdXRlX1BVVCIsIkFVVEhfc2VydmljZS1wb2ludF9HRVQiLCJBVVRIX3NlcnZpY2UtcG9pbnQtbmF0dXJhbC1wZXJzb25fUFVUIiwiQVVUSF9mcmVpZ2h0LW9mZmVyX0dFVCIsIkFVVEhfZnJlaWdodC12ZWhpY2xlLXJlbGF0aW9uX1BVVCIsIkFVVEhfY3VzdG9tLWZpZWxkLXdvcmtzcGFjZS1jdXN0b21lci1yZWxhdGlvbl9QVVQiLCJBVVRIX2ZyZWlnaHRfUFVUIiwiQVVUSF9mcmVpZ2h0LXZlaGljbGUtcmVsYXRpb25fUE9TVCIsIkFVVEhfaW50ZWdyYXRpb24tZm9ybG9nX0dFVCIsIkFVVEhfZnJlaWdodC1vZmZlcl9QT1NUIiwiQVVUSF9rZXljbG9ha19QT1NUIiwiQVVUSF9nb29kcy10eXBlX1BPU1QiLCJBVVRIX2ludGVncmF0aW9uLWVzbF9QT1NUIiwiQVVUSF9pYW0tbW9kdWxlX0dFVCIsIkFVVEhfY3VzdG9tZXJfR0VUIiwiQVVUSF9vcmRlcl9HRVQiLCJBVVRIX3JvdXRlLWFwcGxpZWRfR0VUIiwiUFBfcGFpbmVsX2dlcmVudGUiLCJBVVRIX3ZlaGljbGUtdHlwZV9QVVQiLCJBVVRIX2RyaXZlcl9ERUxFVEUiLCJBVVRIX2dvb2RzLXR5cGVfR0VUIiwiQVVUSF9oaXN0b3JpY2FsLWV2ZW50X0dFVCIsIkFVVEhfZnJlaWdodC1zdG9wX1BVVCIsIkFVVEhfY2Fycmllcl9QVVQiLCJBVVRIX2ZyZWlnaHQtb2ZmZXJfUFVUIiwiQVVUSF9mcmVpZ2h0LXZlaGljbGUtcmVsYXRpb25fR0VUIiwiUFBfdHJhY2tpbmdfYWxsIiwiQVVUSF9jdXN0b20tZmllbGQtd29ya3NwYWNlLWN1c3RvbWVyLXJlbGF0aW9uX0dFVCIsIkFVVEhfZHJpdmVyLW9yZ2FuaXphdGlvbi1yZWxhdGlvbl9QVVQiLCJBVVRIX3dvcmtzcGFjZV9HRVQiLCJBVVRIX29yZGVyLWludm9pY2UtcmVsYXRpb25fR0VUIiwiQVVUSF90cmFuc3BvcnQtb3JkZXJfR0VUIiwib3JnYW5pemFjYW9fREVMRVRFIiwiZGVsZXRlX2FjdGl2aXR5X2xvZyIsIkFVVEhfZHJpdmVyX1BVVCIsIkFVVEhfc2VydmljZS1wb2ludC1sZWdhbC1lbnRpdHlfUE9TVCIsIkFVVEhfb3JkZXItaXRlbV9HRVQiLCJBVVRIX2ludm9pY2VfUFVUIiwiQVVUSF9mcmVpZ2h0X0RFTEVURSIsIm9mZmxpbmVfYWNjZXNzIiwiQVVUSF9yb3V0ZV9HRVQiLCJBVVRIX3ZlaGljbGVfREVMRVRFIiwiQVVUSF90YWdfR0VUIiwiQVVUSF9yb3V0ZS1hcHBsaWVkX0RFTEVURSIsIkFVVEhfb3JkZXItY3VzdG9tLWZpZWxkLXJlbGF0aW9uX0dFVCIsIkFVVEhfc2VydmljZS1wb2ludC12ZWhpY2xlLXJlc3RyaWN0aW9uX0dFVCIsIkFVVEhfb3JkZXJfUE9TVCIsIkFVVEhfb3JkZXItY3VzdG9tLWZpZWxkLXJlbGF0aW9uX1BPU1QiLCJvcmdhbml6YXRpb25fYWRtaW4iLCJBVVRIX2lhbS13b3Jrc3BhY2VfR0VUIiwiQVVUSF9pbnRlZ3JhdGlvbi1mb3Jsb2dfUFVUIiwiQVVUSF90cmFuc3BvcnQtb3JkZXJfUE9TVCIsIkFVVEhfc2VydmljZS1wb2ludC12ZWhpY2xlLXJlc3RyaWN0aW9uX0RFTEVURSIsIkFVVEhfZHJpdmVyLW9yZ2FuaXphdGlvbi1yZWxhdGlvbl9QT1NUIiwiQVVUSF92ZWhpY2xlLWJsYWNrbGlzdF9QVVQiLCJBVVRIX2ZyZWlnaHQtc3RvcF9HRVQiLCJQUF9pbnRlZ3JhdGlvbi1mcmVpZ2h0cyIsIkFVVEhfY2Fycmllcl9HRVQiLCJQUF9wYWluZWxfb3BlcmFkb3IiLCJBVVRIX29yZGVyLWludm9pY2UtcmVsYXRpb25fUE9TVCIsIkFVVEhfb3JkZXJfUFVUIiwiQVVUSF9mcmVpZ2h0LXN0b3BfREVMRVRFIiwiQVVUSF92ZWhpY2xlLXR5cGVfR0VUIiwiQVVUSF9pbnZvaWNlX1BPU1QiLCJBVVRIX2ZyZWlnaHRfUE9TVCJdfSwic2NvcGUiOiJvcGVuaWQgcGhvbmUgZW1haWwiLCJzaWQiOiJjODk4OTIxMS03MzQ3LTRiYzctYjM5MS03NWRiMmEyOTM2ZWUiLCJmaXJzdE5hbWUiOiJOeWNvbGFzIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm9yZ3MiOlsiL0NTTSIsIi9TVEQiLCIvQ0dML1dTX0N1cml0aWJhIiwiL1NURC9XU19HZW5lcmFsIiwiL01YQy9XU19UZXN0ZXNfSW50ZXJub3MiLCIvQ1NNL1dTX2dlcmFsIiwiL0NHTC9XU19zYW9fam9zZV9kb3NfcGluaGFpcyIsIi9NWEMvV1NfdGVzdGVfZ2VyYWwiLCIvTVhDL1dTX3Rlc3Rlc19wbyIsIi9DR0wvV1NfdmluaGVkbyIsIi9DR0wvb3BlcmFkb3IiXSwicHJlZmVycmVkX3VzZXJuYW1lIjoibnljb2xhc0BtYXRyaXhjYXJnby5jb20uYnIiLCJlbWFpbCI6Im55Y29sYXNAbWF0cml4Y2FyZ28uY29tLmJyIn0.DjCfRw5ggIeWzmcIy-7sMPeds9bOAmxXG4zKJRYv_pSjM5CUvZEPJPqe_Xap_xBHNE5rb-m_yhbmzGoS-iueoFeXVLMkxZl9ObzwyOZnTY7SM5urHrBu3BpnwyaWx5lXFldOgWuChwV3EBtei0WfxND8kp_-SJfjCROn5nDz8tuhKB8epY4KkeAWQX2Wb9OELFNDdh2KoRBppKL7GDfeC62ryvRghG9rw1hSbskcjGvKgsWH6jELl6-iv9Sy5V4hXALVWS9l7g8CNquhuUN4Bz3DEHtmy6N9yBGFJWDhBxVFyWjaeTiHaA921OIkdrBBol75P5CAlezQV-bNq6ucBw')

# Initialize Matrix Cargo client
matrix_cargo_client = ExternalAPIClient(MATRIX_CARGO_API_URL, MATRIX_CARGO_API_KEY)

@app.post("/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    try:
        # Processa os arquivos XML
        result = await xml_processor.process_xml_files(files)
        
        # Verifica se há dados processados
        if not result.get("processed_data"):
            raise ValueError("Nenhum dado foi processado dos arquivos")
        
        return {
            "processed_data": result["processed_data"],
            "validation_errors": result.get("validation_errors", {})
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "API XML Processor está funcionando!"} 

@app.post("/trips")
async def create_trip(trip: Trip):
    try:
        # Aqui você pode adicionar lógica para salvar no banco de dados
        # Por enquanto, vamos apenas retornar a viagem com um ID
        trip.id = f"trip_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        return trip
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/trips/matrix-cargo")
async def create_matrix_cargo_trip(trip: Trip, db: Session = Depends(get_db)):
    try:
        # Check if trip already exists in our database
        existing_trip = db.query(IntegratedTrip).filter(
            IntegratedTrip.external_id == trip.externalId
        ).first()
        
        if existing_trip:
            if existing_trip.status == 'success':
                return existing_trip.matrix_cargo_response
            # If previous attempt failed, update the existing record
            db.delete(existing_trip)
            db.commit()

        # Transform trip data to Matrix Cargo format
        matrix_cargo_data = {
            "externalId": trip.externalId,
            "licensePlates": [trip.vehicle.plate],
            "estimatedStart": datetime.now(timezone.utc).isoformat(),
            "tripDetails": {},
            "transporter": {
                "cnpj": "12345678901231",
                "name": "Matrixcargo",
                "abbreviation": "MXC",
                "email": "contact@matrixcargo.com"
            },
            "workspace": {
                "name": "CURITIBA"
            },
            "customer": {
                "cnpj": "01862389000400",
                "name": "GENERAL MOTORS DO BRASIL LTDA"
            },
            "driver": {
                "name": trip.driver.name,
                "cpf": trip.driver.document,
                "email": "drive2r@matrixcargo.com",
                "phone": "+5500000000000"
            },
            "tags": [
                {
                    "name": "INTEGRATION"
                }
            ],
            "tripStops": [
                {
                    "type": "PICKUP" if stop.type == "COLETA" else "DELIVERY",
                    "sequence": idx,
                    "weightInGrams": int(sum(note.transporte.pesoBruto * 1000 for note in stop.notes)),
                    "volumeInCubicMillimeters": int(sum(note.transporte.volume * 1000000000 for note in stop.notes)),
                    "timeWindowStart": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
                    "timeWindowEnd": (datetime.now(timezone.utc) + timedelta(days=1, hours=2)).isoformat(),
                    "requiresPickupInvoice": False,
                    "requiresProofOfDelivery": stop.type == "ENTREGA",
                    "proofOfDeliveryDetails": [
                        {
                            "type": "CTE",
                            "quantity": 1,
                            "identifier": note.chaveAcesso
                        } for note in stop.notes
                    ] if stop.type == "ENTREGA" else [],
                    "servicePoint": {
                        "name": stop.companyName,
                        "cnpj": stop.cnpj,
                        "address": {
                            "street": stop.address.logradouro,
                            "number": stop.address.numero,
                            "neighborhood": stop.address.bairro,
                            "complement": "",
                            "country": "BRASIL",
                            "city": stop.address.municipio,
                            "state": stop.address.uf,
                            "zipCode": stop.address.cep,
                            "latitude": "0",
                            "longitude": "0"
                        }
                    },
                    "orders": [
                        {
                            "externalId": note.chaveAcesso,
                            "items": [
                                {
                                    "code": note.numeroNF,
                                    "description": "NF",
                                    "weightInGrams": int(note.transporte.pesoBruto * 1000),
                                    "volumeInCubicMillimeters": int(note.transporte.volume * 1000000000),
                                    "unitOfMeasure": "UN",
                                    "quantity": 1,
                                    "unitPriceInCents": 0,
                                    "totalPriceInCents": 0
                                }
                            ]
                        } for note in stop.notes
                    ]
                } for idx, stop in enumerate(trip.stops)
            ]
        }

        try:
            # Send to Matrix Cargo API
            result = await matrix_cargo_client.create_trip(matrix_cargo_data)
            
            # Store the integration result
            integrated_trip = IntegratedTrip(
                external_id=trip.externalId,
                trip_data=json.loads(trip.json()),
                matrix_cargo_response=result,
                status='success'
            )
            db.add(integrated_trip)
            db.commit()
            
            return result

        except HTTPException as api_error:
            # Check if the error is due to duplicate trip
            error_msg = str(api_error.detail)
            if "Unique constraint failed" in error_msg and existing_trip:
                # If it's a duplicate and we have a successful previous integration
                return existing_trip.matrix_cargo_response
            
            # For other API errors, store the failure and re-raise
            integrated_trip = IntegratedTrip(
                external_id=trip.externalId,
                trip_data=json.loads(trip.json()),
                status='error',
                error_message=error_msg
            )
            db.add(integrated_trip)
            db.commit()
            
            raise

    except Exception as e:
        # Store failed integration attempt if not already stored
        try:
            error_msg = str(e)
            integrated_trip = IntegratedTrip(
                external_id=trip.externalId,
                trip_data=json.loads(trip.json()),
                status='error',
                error_message=error_msg
            )
            db.add(integrated_trip)
            db.commit()
        except Exception as db_error:
            # If we can't store the error, log it but raise the original error
            print(f"Failed to store error in database: {str(db_error)}")
        
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao criar viagem no Matrix Cargo: {error_msg}"
        )

# Add new endpoint to get integration history
@app.get("/trips/integration-history")
async def get_integration_history(db: Session = Depends(get_db)):
    trips = db.query(IntegratedTrip).order_by(IntegratedTrip.created_at.desc()).all()
    return trips

