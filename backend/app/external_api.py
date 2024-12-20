from typing import Dict, Any
import httpx
from fastapi import HTTPException

class ExternalAPIClient:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.token = token
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

    async def create_trip(self, trip_data: dict) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.base_url,
                json=trip_data,
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()

    async def create_order(self, order_data: dict) -> dict:
        # Ajuste a URL base para a API de pedidos
        orders_url = self.base_url.replace('/trip', '/order')
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                orders_url,
                json=order_data,
                headers=self.headers
            )
            response.raise_for_status()
            return response.json() 