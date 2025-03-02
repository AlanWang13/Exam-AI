from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import Dict, List, Tuple
from query_data import query
from typing import Dict
from query_data import query  # Ensure query is now async
import uuid
from database_manager import DocumentProcessor, QueryEngine
import json
from pathlib import Path


app = FastAPI()

processor = DocumentProcessor("data")
query_engine = QueryEngine()

# Dictionary to store active WebSocket connections
conversations: Dict[str, Tuple[WebSocket, List[str]]] = {}

async def handle_websocket(conversation_id: str, websocket: WebSocket):
    conversations[conversation_id] = (websocket, [])  # Ensure history is stored 

    try:
        while True:
            data = await websocket.receive_text()
            print(f"Received message: {data}")

            # Retrieve the history for this conversation
            _, history = conversations[conversation_id]

            # Append user input to history
            history.append(f"User: {data}")

            # Construct full conversation context
            context = "This is the conversation so far:\n" + "\n".join(history) + "\nNow answer:\n" + data

            # Query the bot with the conversation context
            bot_response = query(context)

            # Append bot response to history
            history.append(f"Bot: {bot_response}")

            await websocket.send_text(bot_response)
            
    except WebSocketDisconnect:
        del conversations[conversation_id]
        print(f"Conversation {conversation_id} closed.")


@app.get("/conversation_history/{conversation_id}")
async def get_conversation_history(conversation_id: str):
    print("im getting called")
    """Retrieve the stored conversation history for a given conversation ID."""
    if conversation_id in conversations:
        _, history = conversations[conversation_id]
        return {"conversation_id": conversation_id, "history": history}
    return {"error": "Conversation not found"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    print("New WebSocket connection.")
    await websocket.accept()

    # Generate a unique conversation ID for the connection
    conversation_id = str(uuid.uuid4())
    print(f"Conversation ID generated: {conversation_id}")
    
    await handle_websocket(conversation_id, websocket)

@app.websocket("/create/{notebook_id}")
async def websocket_endpoint(websocket: WebSocket, notebook_id: str):
    print(f"New WebSocket connection for notebook: {notebook_id}")
    await websocket.accept()
    processor.create_new_notebook_folder_path(notebook_id)
    print(f"Conversation ID generated: {notebook_id}")
    
@app.websocket("/add_source/")
async def add_source(websocket: WebSocket):
    await websocket.accept()

    try:
        id_message = await websocket.receive_text()
        f_id = json.loads(id_message).get("data")
        print(f"Received data for {f_id}")

        # First message received should be the file path
        
        while True:
            # Receive data
            file_path_message = await websocket.receive_text()
            file_path = json.loads(file_path_message).get("file_path")
            print(f"Received file path: {file_path}")

            
            # Add source to the notebook
            processor.add_source(f_id, file_path)

            await websocket.send_text(f"Source added to {file_path}")
    except WebSocketDisconnect:
        print(f"Connection closed.")

@app.websocket("/query/")
async def query_websocket(websocket: WebSocket):
    await websocket.accept()

    try:
        id_message = await websocket.receive_text()
        f_id = json.loads(id_message).get("data")
        print(f"Received data for {f_id}")
        
        conversation_id = str(uuid.uuid4())
        conversations[conversation_id] = (websocket, [])  #

        while True:
            message = await websocket.receive_text()
            parsed_message = json.loads(message)
            

            file_path = f"data/{f_id}/chroma"
            
            _, history = conversations[conversation_id]

            user_message = parsed_message.get("message", "")
            history.append(f"User: {user_message}")
            
            context = "This is the conversation so far:\n" + "\n".join(history) + "\nNow answer:\n" + user_message
            
            if "type" in parsed_message and parsed_message["type"] == "generate_document":
                print(f"Generating document: {parsed_message['document_type']}")
                response = query_engine.query(parsed_message, file_path)
            else:
                print(f"Received query: {user_message}")
                response = query_engine.query(context, file_path)

            history.append(f"Bot: {response}")

            print("Response:", response)

            await websocket.send_text(response)
    except WebSocketDisconnect:
        print(f"Connection closed.")
        del conversations[conversation_id]  # Clean up the conversation history
    except Exception as e:
        print(f"Error in websocket: {e}")
        try:
            error_response = json.dumps({
                "error": f"An error occurred: {str(e)}"
            })
            await websocket.send_text(error_response)
        except:
            pass

@app.get("/active_conversations")
async def get_active_conversations():
    return {"active_conversations": list(conversations.keys())}

@app.get("/")  # ✅ Keep this here, but don't reassign `app`
async def root():
    return {"message": "FastAPI WebSocket Server Running"}
