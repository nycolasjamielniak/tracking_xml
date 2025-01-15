from typing import Dict, Any
import httpx
from fastapi import HTTPException

class MatrixcargoTracking:
    def __init__(self, base_url: str, api_key: str, organization_id: str, workspace_id: str = None):
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "x-organization": organization_id,
            "X-Organization-Key": organization_id
        }
        if workspace_id:
            self.headers["X-Workspace-Key"] = workspace_id

    async def create_trip(self, trip_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Envia a viagem para o sistema Tracking Matrixcargo
        """
        async with httpx.AsyncClient() as client:
            try:
                print(f"Enviando requisição para: {self.base_url}")
                print(f"Headers: {self.headers}")
                
                response = await client.post(
                    self.base_url,
                    json=trip_data,
                    headers=self.headers
                )

                print(f"Status code: {response.status_code}")
                print(f"Response: {response.text}")

                if response.status_code in (200, 201):
                    return response.json()

                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Erro na integração: {response.text}"
                )

            except httpx.RequestError as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Erro de comunicação com sistema externo: {str(e)}"
                )

class MatrixcargoPainelLogistico:
    def __init__(self, base_url: str, api_key: str, organization_id: str, workspace_id: str):
        self.base_url = f"{base_url}/order/facilitator"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "x-organization": organization_id,
            "X-Organization-Key": organization_id,
            "X-Workspace-Key": workspace_id
        }

    async def create_order(self, order_data: dict) -> dict:
        async with httpx.AsyncClient(verify=True, timeout=30.0) as client:
            try:
                print(f"Enviando requisição para: {self.base_url}")
                print(f"Headers: {self.headers}")
                print(f"Payload: {order_data}")
                
                response = await client.post(
                    self.base_url,
                    json=order_data,
                    headers=self.headers
                )
                
                print(f"Status code: {response.status_code}")
                print(f"Response: {response.text}")
                
                if response.status_code not in (200, 201):
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"Erro na integração com Matrix Cargo: {response.text}"
                    )
                    
                return response.json()
            except httpx.RequestError as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Erro de comunicação com Matrix Cargo: {str(e)}"
                )