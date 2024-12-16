from typing import Dict, Any
import httpx
from fastapi import HTTPException

class ExternalAPIClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "x-organization": "18256896-08b6-4ab4-8665-f861f8c70a87",
            "x-organization-key": "18256896-08b6-4ab4-8665-f861f8c70a87"
        }

    async def create_trip(self, trip_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Envia a viagem para o sistema externo
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.base_url,
                    json=trip_data,
                    headers=self.headers
                )
                
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