# Exam AI
## RAG-based AI Chatbot For Students

---
## Get Started
### Clone the repository:  
   ```sh
   git clone https://github.com/AlanWang13/Exam-AI
   ```
## Backend Setup

### Install Dependencies
1. Install **Python 3.10.0**  or **create** and **activate** a virtual environment of your choice (Conda is recommended)
   - [Download Python 3.10.0](https://www.python.org/downloads/release/python-3100/)
    - [Conda download](https://anaconda.org/anaconda/conda)

2. Change directories
    ```
    cd backend
    ```
3. Install dependencies:  
   ```sh
   pip install -r requirements.txt
   ```

   - If you encounter issues with `langchain`, remove version constraints in `requirements.txt` and reinstall.
   - Ensure your Python environment is **3.10.0**.

## Run the API
1. Make sure you are in the backend directory
1. Rename the `.env_template` file to `.env` file and add GROQ API key:  
   ```
   GROQ_API_KEY=
   ```

2. Start FastAPI:  
   ```
   uvicorn main:app --reload
   ```

---


## Frontend Setup

### Install Dependencies
1. Install **Node.js**  
   - [Download Node.js](https://nodejs.org/en/download)

2. Set up the frontend:  
   ```sh
   cd frontend
   npm install
   npm run dev
   ```


## Backend & Frontend Communication
- The **frontend** sends a websocket connection request to the **FastAPI backend**.
- The **backend** processes websocket messages as queries using **LangChain** and a **vector database** (Chroma DB).
- Results are returned through the websocket to the **frontend** and are displayed.
