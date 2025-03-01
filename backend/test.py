import websockets
import asyncio

FASTAPI_SERVER = "ws://localhost:8000/create/123jhrtgefw4"

async def test_websocket():
    async with websockets.connect(FASTAPI_SERVER) as ws:
        print(f"Connected to WebSocket endpoint: {FASTAPI_SERVER}")

for i in range(1):
    asyncio.run(test_websocket())