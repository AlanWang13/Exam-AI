import websockets
import asyncio
import json

async def send_file_path_and_data():
    uri = "ws://localhost:8000/add_source/"
    async with websockets.connect(uri) as websocket:
    
        # Send the source data
        data = "1234"
        await websocket.send(json.dumps({"data": data}))

        # Send file path as JSON
        file_path = "uploads/CS_360_Testing_Handout.pdf"
        await websocket.send(json.dumps({"file_path": file_path}))
        

async def send_message():
    uri = "ws://localhost:8000/query/"
    async with websockets.connect(uri) as websocket:
    
        # Send the source data
        data = "a13d1537-163e-40e2-a1f2-562e284890e5"
        await websocket.send(json.dumps({"data": data}))

        # Send file path as JSON
        message = "Khan academy"
        await websocket.send(json.dumps({"message": message}))


# asyncio.run(send_file_path_and_data())
asyncio.run(send_message())