from pydantic import BaseModel
from typing import List, Optional

class Address(BaseModel):
    logradouro: str
    numero: str
    bairro: str
    municipio: str
    uf: str
    cep: str

class Driver(BaseModel):
    name: str
    document: str  # CPF

class Vehicle(BaseModel):
    plate: str

class Note(BaseModel):
    id: str
    numeroNF: str

class Stop(BaseModel):
    type: str  # 'COLETA' ou 'ENTREGA'
    address: Address
    notes: List[Note]
    sequence: int

class Trip(BaseModel):
    id: Optional[str] = None
    externalId: str
    driver: Driver
    vehicle: Vehicle
    stops: List[Stop] 