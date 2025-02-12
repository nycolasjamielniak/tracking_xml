from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from . import xml_processor
from pydantic import BaseModel
import os
from datetime import datetime, timezone, timedelta
from .models import Trip
from .external_api import MatrixcargoTracking
from .external_api import MatrixcargoPainelLogistico
from sqlalchemy.orm import Session
from fastapi import Depends
from .database import get_db, IntegratedTrip
import json
import random
from sqlalchemy.orm.decl_api import DeclarativeMeta
from typing import Any
import csv
import io
import pytz
import httpx

app = FastAPI(
    title="Matrix Cargo Integration API",
    description="API para integração com Matrix Cargo",
    version="1.0.0"
)

# Configuração do CORS
app.add_middleware(
    CORSMiddleware,
    #allow_origins=["http://localhost:5173"],
    allow_origins=["https://facilitador.matrixcargo.com.br"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add environment variables for Matrix Cargo API
MATRIXCARGO_TRACKING_API_URL = os.getenv('MATRIXCARGO_TRACKING_API_URL', 'https://tracking-api.matrixcargo.com.br/api/v1/external')
MATRIXCARGO_PAINEL_LOGISTICO_API_URL = os.getenv('MATRIXCARGO_PAINEL_LOGISTICO_API_URL', 'https://painel-logistico-api.matrixcargo.com.br/api/v1')
# Adicione este modelo para a resposta paginada
class PaginatedTrips(BaseModel):
    items: List[dict]
    total: int
    page: int
    size: int
    pages: int

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
async def create_matrix_cargo_trip(
    trip: Trip, 
    db: Session = Depends(get_db),
    authorization: str = Header(None),
    organization_id: str = Header(None, alias="Organization-Id"),
    workspace_id: str = Header(None, alias="Workspace-Id")
):
    if not authorization:
        raise HTTPException(status_code=401, detail="Token não fornecido")
    
    if not organization_id:
        raise HTTPException(status_code=401, detail="Organization ID não fornecido")

    if not workspace_id:
        raise HTTPException(status_code=401, detail="Workspace ID não fornecido")

    try:
        # Generate a unique externalId in the specific format
        timestamp = datetime.now()
        generated_external_id = f"{timestamp.strftime('%Y%m%d%H%M%S')}{random.randint(1000,9999)}"

        # Transform trip data to Matrix Cargo format
        matrix_cargo_data = {
            "externalId": generated_external_id,
            "licensePlates": [trip.vehicle.plate],
            "estimatedStart": datetime.now(timezone.utc).isoformat(),
            "tripDetails": {},
            "transporter": {
                "cnpj": "29551997000150",
                "name": "Regler",
                "abbreviation": "RGL",
                "email": "contact2@matrixcargo.com"
            },
            "workspace": {
                "id": workspace_id,
                "name": "Operação"
            },
            "customer": {
                "cnpj": "29551997000150",
                "name": "Regler"
            },
            "driver": {
                "name": trip.driver.name,
                "cpf": trip.driver.document,
                "email": f"driver{random.randint(1000,99999)}@matrixcargo.com",
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
                            "type": "CANHOTO_NOTA_FISCAL",
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

        print(f"Dados preparados para envio: {json.dumps(matrix_cargo_data, indent=2)}")

        try:
            # Inicializar o client com o token recebido do frontend

            token = authorization.replace('Bearer ', '')

            matrix_cargo_client = MatrixcargoTracking(
                MATRIXCARGO_TRACKING_API_URL, 
                token, 
                organization_id,
                workspace_id
            )

            # Primeiro tenta enviar para a Matrix Cargo
            result = await matrix_cargo_client.create_trip(matrix_cargo_data)
            print(f"Resposta da Matrix Cargo: {result}")
            
            # Se chegou aqui, deu sucesso. Agora salva no banco
            integrated_trip = IntegratedTrip(
                external_id=generated_external_id,
                trip_data=json.loads(trip.json()),
                matrix_cargo_response=result,
                status='success'
            )
            db.add(integrated_trip)
            db.commit()
            
            return {
                "externalId": generated_external_id,
                "matrix_cargo_response": result
            }

        except HTTPException as api_error:
            error_detail = str(api_error.detail)
            print(f"Erro na API da Matrix Cargo: {error_detail}")
            
            # Se falhou na Matrix Cargo, salva o erro no banco
            integrated_trip = IntegratedTrip(
                external_id=generated_external_id,
                trip_data=json.loads(trip.json()),
                status='error',
                error_message=error_detail
            )
            db.add(integrated_trip)
            db.commit()
            
            raise HTTPException(
                status_code=api_error.status_code,
                detail=f"Erro na integração com Matrix Cargo: {error_detail}"
            )

    except Exception as e:
        import traceback
        error_msg = f"{str(e)}\n{traceback.format_exc()}"
        print(f"Erro não tratado: {error_msg}")
        
        # Erro geral - tenta salvar no banco, mas não falha se não conseguir
        try:
            integrated_trip = IntegratedTrip(
                external_id=generated_external_id,
                trip_data=json.loads(trip.json()),
                status='error',
                error_message=error_msg
            )
            db.add(integrated_trip)
            db.commit()
        except Exception as db_error:
            print(f"Failed to store error in database: {str(db_error)}")
        
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao processar viagem: {error_msg}"
        )

def serialize_sqlalchemy(obj: Any) -> Any:
    """Serializa objetos SQLAlchemy e tipos Python complexos para JSON."""
    if hasattr(obj, '__dict__'):
        obj_dict = obj.__dict__.copy()
        # Remove o atributo interno do SQLAlchemy
        obj_dict.pop('_sa_instance_state', None)
        
        # Serializa cada valor do dicionário
        for key, value in obj_dict.items():
            if isinstance(value, datetime):
                obj_dict[key] = value.isoformat()
            elif hasattr(value, '__dict__'):
                obj_dict[key] = serialize_sqlalchemy(value)
        return obj_dict
    elif isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, list):
        return [serialize_sqlalchemy(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: serialize_sqlalchemy(value) for key, value in obj.items()}
    return obj

@app.get("/trips/integration-history", response_model=PaginatedTrips)
async def get_integration_history(
    db: Session = Depends(get_db),
    page: int = 1,
    size: int = 10
):
    offset = (page - 1) * size
    total = db.query(IntegratedTrip).count()
    total_pages = (total + size - 1) // size
    
    trips = db.query(IntegratedTrip)\
        .order_by(IntegratedTrip.created_at.desc())\
        .offset(offset)\
        .limit(size)\
        .all()
    
    # Serializa os objetos SQLAlchemy
    trips_dict = [serialize_sqlalchemy(trip) for trip in trips]
    
    return {
        "items": trips_dict,
        "total": total,
        "page": page,
        "size": size,
        "pages": total_pages
    }

@app.post("/orders/upload")
async def upload_orders(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        decoded_file = contents.decode('utf-8-sig').splitlines()
        reader = csv.DictReader(decoded_file)
        
        orders = []
        validation_errors = {}
        
        for row in reader:
            try:
                def parse_date(date_str: str) -> str:
                    try:
                        # Converte data do formato brasileiro para ISO
                        parsed_date = datetime.strptime(date_str, '%d/%m/%Y %H:%M')
                        # Create a timezone-aware datetime by localizing to UTC
                        utc_date = parsed_date.replace(tzinfo=timezone.utc)
                        return utc_date.isoformat()
                    except ValueError as e:
                        raise ValueError(f"Formato de data inválido. Use o formato DD/MM/YYYY HH:MM")

                order = {
                    "id": row['id'],
                    "customerCNPJ": row['customer_cnpj'],
                    "customerName": row['customer_name'],
                    "originCNPJ": row['origin_cnpj'],
                    "originName": row['origin_name'],
                    "pickupDate": parse_date(row['pickup_date']),
                    "destinationCNPJ": row['destination_cnpj'],
                    "destinationName": row['destination_name'],
                    "deliveryDate": parse_date(row['delivery_date']),
                    "itemCode": row['item_code'],
                    "itemDescription": row['item_description'],
                    "itemVolume": float(row['item_volume']),
                    "itemWeight": float(row['item_weight']),
                    "itemQuantity": int(row['item_quantity']),
                    "itemUnit": row['item_unit'],
                    "itemUnitPrice": float(row['item_unit_price']),
                    "merchandiseType": row['merchandise_type'],
                    "isDangerous": row['is_dangerous'].lower() == 'true',
                    "needsEscort": row['needs_escort'].lower() == 'true'
                }
                orders.append(order)
            except Exception as e:
                validation_errors[row['id']] = [str(e)]
        
        if validation_errors:
            return {
                "orders": [],
                "validation_errors": validation_errors
            }
            
        return {"orders": orders}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

def transform_order_to_matrix_cargo_format(order: dict) -> dict:
    """Transforma o pedido para o formato esperado pela API do Matrixcargo Painel Logistico"""
    return {
        "externalId": order["id"],
        "cliente": {
            "cnpj": order["customerCNPJ"],
            "nome": order["customerName"]
        },
        "pontoServicoOrigem": {
            "cnpj": order["originCNPJ"],
            "nome": order["originName"]
        },
        "dataColeta": order["pickupDate"],
        "pontoServicoDestino": {
            "cnpj": order["destinationCNPJ"],
            "nome": order["destinationName"]
        },
        "dataEntrega": order["deliveryDate"],
        "mercadoriaPerigosa": order["isDangerous"],
        "precisaDeEscolta": order["needsEscort"],
        "itens": [
            {
                "codigo": order["itemCode"],
                "descricao": order["itemDescription"],
                "m3": order["itemVolume"],
                "peso": order["itemWeight"],
                "quantidade": order["itemQuantity"],
                "unidade": order["itemUnit"],
                "valorUnitario": order["itemUnitPrice"]
            }
        ],
        "tipoMercadoria": {
            "ativo": True,
            "descricao": order["merchandiseType"]
        }
    }

class Workspace(BaseModel):
    id: str
    name: str

class Organization(BaseModel):
    id: str
    name: str
    workspaces: List[Workspace]

class OrganizationResponse(BaseModel):
    data: List[Organization]

# Add new models for order validation
class OrderRequest(BaseModel):
    id: str
    uniqueId: str
    customerCNPJ: str
    customerName: str
    originCNPJ: str
    originName: str
    pickupDate: str
    destinationCNPJ: str
    destinationName: str
    deliveryDate: str
    itemCode: str
    itemDescription: str
    itemVolume: float
    itemWeight: float
    itemQuantity: int
    itemUnit: str
    itemUnitPrice: float
    merchandiseType: str
    isDangerous: bool
    needsEscort: bool

@app.post("/orders/matrix-cargo")
async def create_matrix_cargo_orders(
    orders: List[OrderRequest],
    authorization: str = Header(None),
    organization_id: str = Header(None, alias="Organization-Id"),
    workspace_id: str = Header(None, alias="Workspace-Id")
):
    if not authorization:
        raise HTTPException(status_code=401, detail="Token não fornecido")
    if not organization_id:
        raise HTTPException(status_code=400, detail="Organization-Id header é obrigatório")
    if not workspace_id:
        raise HTTPException(status_code=400, detail="Workspace-Id header é obrigatório")

    try:
        token = authorization.replace('Bearer ', '')
        
        matrix_cargo_client = MatrixcargoPainelLogistico(
            MATRIXCARGO_PAINEL_LOGISTICO_API_URL,
            token,
            organization_id,
            workspace_id
        )
        
        results = []
        errors = []
        
        for order in orders:
            try:
                matrix_cargo_order = transform_order_to_matrix_cargo_format(order.dict())
                result = await matrix_cargo_client.create_order(matrix_cargo_order)
                results.append({
                    "id": order.id,
                    "uniqueId": order.uniqueId,
                    "status": "success",
                    "result": result
                })
            except HTTPException as e:
                error_detail = e.detail
                # Tenta extrair a mensagem de erro da Matrix Cargo
                if isinstance(error_detail, str):
                    try:
                        error_json = json.loads(error_detail)
                        if isinstance(error_json.get('message'), list):
                            error_message = '; '.join(error_json['message'])
                        else:
                            error_message = str(error_json.get('message', error_detail))
                    except:
                        error_message = error_detail
                else:
                    error_message = str(error_detail)

                print(f"Erro ao processar pedido {order.id} (uniqueId: {order.uniqueId}): {error_message}")
                errors.append({
                    "id": order.id,
                    "uniqueId": order.uniqueId,
                    "status": "error",
                    "error": error_message
                })
            except Exception as e:
                error_message = str(e)
                print(f"Erro ao processar pedido {order.id} (uniqueId: {order.uniqueId}): {error_message}")
                errors.append({
                    "id": order.id,
                    "uniqueId": order.uniqueId,
                    "status": "error",
                    "error": error_message
                })
        
        return {
            "results": results,
            "errors": errors,
            "total": len(orders),
            "success": len(results),
            "failed": len(errors)
        }
        
    except Exception as e:
        print(f"Erro geral na integração: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao criar pedidos no Matrix Cargo: {str(e)}"
        )

@app.get(
    "/organizations",
    response_model=OrganizationResponse,
    tags=["Organizations"]
)
async def get_organizations(
    authorization: str = Header(
        None,
        description="Token de autenticação no formato 'Bearer {token}'"
    )
):
    if not authorization:
        raise HTTPException(status_code=401, detail="Token não fornecido")
    
    token = authorization.replace('Bearer ', '')
    
    try:
        async with httpx.AsyncClient(
            verify=True,
            timeout=30.0
        ) as client:
            headers = {
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive'
            }
            
            url = "https://painel-logistico-api.matrixcargo.com.br/api/v1/organization"
            
            response = await client.get(
                url,
                headers=headers,
                follow_redirects=True
            )
            
            if response.status_code == 401:
                raise HTTPException(status_code=401, detail="Token inválido ou expirado")
            elif response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Erro na requisição: {response.text}"
                )

            # Filtrar apenas os campos necessários da resposta
            raw_data = response.json()
            filtered_data = {
                "data": [
                    {
                        "id": org["id"],
                        "name": org["name"],
                        "workspaces": [
                            {
                                "id": ws["id"],
                                "name": ws["name"]
                            }
                            for ws in org["workspaces"]
                        ]
                    }
                    for org in raw_data["data"]
                ]
            }
            
            return filtered_data
            
    except httpx.HTTPError as e:
        print(f"Erro HTTP: {str(e)}")
        if hasattr(e, 'response'):
            print(f"Status code: {e.response.status_code}")
            print(f"Response body: {e.response.text}")
        raise HTTPException(
            status_code=getattr(e, 'response', httpx.Response(status_code=500)).status_code,
            detail=f"Erro ao buscar organizações: {str(e)}"
        )
    except Exception as e:
        print(f"Erro inesperado: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro interno do servidor: {str(e)}"
        )


