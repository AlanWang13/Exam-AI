from langchain_community.document_loaders import DirectoryLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_groq import ChatGroq
import os
import shutil
from dotenv import load_dotenv
from typing import List
import numpy as np
from pathlib import Path

# Load environment variables
load_dotenv()

# Constants
# CHROMA_PATH = "chroma"
# DATA_PATH = "data/dev-docs-mdx"
MAX_BATCH_SIZE = 160

def load_file(file_path: str) -> Document:
    with open(file_path, 'r', encoding='utf-8') as file:
        content = file.read()
        metadata = {"source": file_path}
        return Document(page_content=content, metadata=metadata)

def load_pdf_file(file_path: str) -> Document:
    with open(file_path, 'rb') as file:
        reader = PyPDF2.PdfFileReader(file)
        content = ""
        for page_num in range(reader.numPages):
            page = reader.getPage(page_num)
            content += page.extract_text()
        metadata = {"source": file_path}
        return Document(page_content=content, metadata=metadata)

def load_documents(data_directory: str):
    documents = []
    valid_extensions = ["*.pdf", "*.md", "*.mdx"]
    print(f"Checking for documents in: {os.path.abspath(data_directory)}")

    # Loop through each file type
    for ext in valid_extensions:
        for file_path in Path(data_directory).glob(ext):
            print(f"Found file: {file_path}")
            try:
                doc = load_file(str(file_path))
                documents.append(doc)
            except Exception as e:
                print(f"Error loading {file_path}: {e}")

    print(f"Successfully loaded {len(documents)} documents.")
    return documents


def split_text(documents: List[Document]):
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=300,
        chunk_overlap=100,
        length_function=len,
        add_start_index=True,
    )
    chunks = text_splitter.split_documents(documents)
    print(f"Split {len(documents)} documents into {len(chunks)} chunks.")
    return chunks

def process_in_batches(chunks: List[Document], batch_size: int):
    """Generator function to process documents in batches."""
    for i in range(0, len(chunks), batch_size):
        yield chunks[i:i + batch_size]

def save_to_chroma(chunks: List[Document], persist_directory: str):
    """Saves document embeddings to ChromaDB with batch processing."""
    if os.path.exists(persist_directory):
        shutil.rmtree(persist_directory)

    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )

    db = None
    total_processed = 0

    for batch in process_in_batches(chunks, MAX_BATCH_SIZE):
        if db is None:
            db = Chroma.from_documents(
                batch,
                embeddings,
                persist_directory= persist_directory
            )
        else:
            db.add_documents(batch)
        
        total_processed += len(batch)
        print(f"Processed {total_processed}/{len(chunks)} chunks...")

    db.persist()
    print(f"Successfully saved {len(chunks)} chunks to {persist_directory}.")

def query_llm(query: str, collection_name: str = None):
    """Queries GroqCloud's LLM with context from the vector store."""
    try:
        # Initialize Chroma client
        embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
        db = Chroma(persist_directory=CHROMA_PATH, embedding_function=embeddings)
        
        # Get relevant documents
        docs = db.similarity_search(query, k=3)
        context = "\n\n".join([doc.page_content for doc in docs])
        
        # Construct prompt with context
        prompt = f"""Based on the following context, please answer the question.
        
Context:
{context}

Question: {query}

Answer:"""
        
        # Query LLM
        llm = ChatGroq(
            model_name="llama-3.3-70b-versatile",
            groq_api_key=os.getenv("GROQ_API_KEY")
        )
        response = llm.invoke(prompt)
        print("\nLLM Response:")
        print(response)
        
    except Exception as e:
        print(f"Error while querying: {e}")

def main():
    generate_data_store()

def generate_data_store():
    documents = load_documents("data")
    chunks = split_text(documents)
    save_to_chroma(chunks,"chroma")

if __name__ == "__main__":
    main()