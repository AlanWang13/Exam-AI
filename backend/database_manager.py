from langchain_community.document_loaders import DirectoryLoader, TextLoader, UnstructuredMarkdownLoader, CSVLoader, JSONLoader, PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_groq import ChatGroq
import os
import shutil
from dotenv import load_dotenv
from typing import List, Dict, Callable
import numpy as np
from pathlib import Path

# Load environment variables
load_dotenv()

# Constants
# CHROMA_PATH = "AllDocsDB/chroma"
# DATA_PATH = "aptos-core-pdf-md-mdx-files"
MAX_BATCH_SIZE = 160

class DocumentProcessor:
    SUPPORTED_FORMATS = {
        '.txt': TextLoader,
        '.md': UnstructuredMarkdownLoader,
        '.mdx': TextLoader,
        '.csv': CSVLoader,
        '.json': JSONLoader,
        '.pdf': PyPDFLoader
    }

    def __init__(self, data_path: str):
        self.data_path = data_path
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )

    def get_loader_for_file(self, file_path: Path) -> Callable:
        """Returns appropriate loader for the file type."""
        file_extension = file_path.suffix.lower()
        if file_extension not in self.SUPPORTED_FORMATS:
            raise ValueError(f"Unsupported file format: {file_extension}")
        return self.SUPPORTED_FORMATS[file_extension]

    def load_single_document(self, file_path: Path) -> List[Document]:
        """Loads a single document using the appropriate loader."""
        file_path = Path(file_path)
        try:
            loader_class = self.get_loader_for_file(file_path)
            
            if file_path.suffix.lower() == '.json':
                loader = loader_class(file_path=str(file_path), jq_schema='.', text_content=False)
            elif file_path.suffix.lower() == '.pdf':
                loader = loader_class(str(file_path))
                # Extract all pages from the PDF
                documents = []
                for page in loader.load_and_split():
                    # Ensure proper metadata is preserved
                    documents.append(Document(
                        page_content=page.page_content,
                        metadata={
                            **page.metadata,
                            'source': str(file_path),
                            'page': page.metadata.get('page', 1)
                        }
                    ))
                print(f"Loaded PDF: {file_path} - {len(documents)} pages")
                return documents
            else:
                loader = loader_class(str(file_path))
            
            if file_path.suffix.lower() != '.pdf':
                documents = loader.load()
                print(f"Loaded: {file_path}")
                return documents
                
        except Exception as e:
            print(f"Error loading {file_path}: {str(e)}")
            return []

    def load_documents(self) -> List[Document]:
        """Loads all supported documents from the data directory."""
        documents = []
        for file_format in self.SUPPORTED_FORMATS.keys():
            path_pattern = f"{self.data_path}/**/*{file_format}"
            for file_path in Path().glob(path_pattern):
                loaded_docs = self.load_single_document(file_path)
                if loaded_docs:
                    documents.extend(loaded_docs)
                    if file_path.suffix.lower() == '.pdf':
                        print(f"Successfully loaded PDF {file_path} with {len(loaded_docs)} pages")
        
        print(f"Successfully loaded {len(documents)} documents total.")
        return documents

    def split_text(self, documents: List[Document]) -> List[Document]:
        """Splits documents into smaller chunks."""
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=100,
            chunk_overlap=30,
            length_function=len,
            add_start_index=True,
        )
        chunks = text_splitter.split_documents(documents)
        print(f"Split {len(documents)} documents into {len(chunks)} chunks.")
        return chunks

    # def split_text(self, documents: List[Document]) -> List[Document]:
    #     """Splits documents into smaller chunks dynamically based on total size."""
    #     total_text_length = sum(len(doc.page_content) for doc in documents)
    #     target_chunks = 10  # You want around 1/10th of total chunks
        
    #     Avoid division by zero
    #     if target_chunks == 0 or total_text_length == 0:
    #         return []

    #     chunk_size = max(1, total_text_length // target_chunks)  # Ensure chunk_size is at least 1
    #     print(total_text_length)
    #     print(chunk_size)
    #     chunk_overlap = chunk_size // 6  # Keep overlap proportional

    #     text_splitter = RecursiveCharacterTextSplitter(
    #         chunk_size=chunk_size,
    #         chunk_overlap=chunk_overlap,
    #         length_function=len,
    #         add_start_index=True,
    #     )

    def process_in_batches(self, chunks: List[Document], batch_size: int):
        """Generator function to process documents in batches."""
        for i in range(0, len(chunks), batch_size):
            yield chunks[i:i + batch_size]

    def save_to_chroma(self, chunks: List[Document], persist_directory: str):
        """Saves document embeddings to ChromaDB with batch processing."""
        if os.path.exists(persist_directory):
            shutil.rmtree(persist_directory)

        db = None
        total_processed = 0

        for batch in self.process_in_batches(chunks, MAX_BATCH_SIZE):
            if db is None:
                db = Chroma.from_documents(
                    batch,
                    self.embeddings,
                    persist_directory=persist_directory
                )
            else:
                db.add_documents(batch)
            
            total_processed += len(batch)
            print(f"Processed {total_processed}/{len(chunks)} chunks...")

        if db:
            db.persist()
            print(f"Successfully saved {len(chunks)} chunks to {persist_directory}.")

    def create_new_notebook_folder_path(self, folder_name: str):
        data_folder = Path(self.data_path)
        new_folder_path = data_folder / folder_name
        new_folder_path.mkdir(parents=True, exist_ok=True)
        db_folder_path = new_folder_path / "chroma"
        db_folder_path.mkdir(parents=True, exist_ok=True)
        # return str(new_folder_path)

    def add_source(self, notebook_id, path):
        new_file_path = f"../frontend/public/{path}"
        new_folder_path = f"data/{notebook_id}/chroma"
        documents = self.load_single_document(new_file_path)
        chunks = self.split_text(documents)
        self.save_to_chroma(chunks, new_folder_path)

class QueryEngine:
    def __init__(self):
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
        self.llm = ChatGroq(
            model_name="llama-3.3-70b-versatile",
            groq_api_key=os.getenv("GROQ_API_KEY")
        )

    def query(self, query: str,persist_directory: str, collection_name: str = None):
        """Queries GroqCloud's LLM with context from the vector store."""
        try:
            db = Chroma(
                persist_directory=persist_directory,
                embedding_function=self.embeddings
            )
            
            # docs = db.similarity_search(query, k=3)
            docs = db.similarity_search_with_relevance_scores(query, k=3, score_threshold=0.5)
        
            if not docs:
                print("No documents found with the given relevance score threshold.")
                return
            
            context = "\n\n".join([doc.page_content for doc, score in docs])
            sources = [f"{doc.metadata.get('source', 'Unknown')} (Page {doc.metadata.get('page', 1) + 1})" for doc, score in docs]            
            print("DOCS")
            print(docs)
            # print(docs.page_content)
            print("\n\n\n\n\n")

            # context = "\n\n".join([doc.page_content for doc in docs])
            # sources = [f"{doc.metadata.get('source', 'Unknown')} (Page {doc.metadata.get('page', 1) + 1})" for doc in docs]
            
            prompt = f"""Based on the following context, please answer the question.
            
Context:
{context}

Question: {query}

Answer:"""
            
            response = self.llm.invoke(prompt)
            print("\nLLM Response:")
            print(response)
            print("\nSources:")
            print(sources)
            print("\nContext")
            print(context)

        except Exception as e:
            print(f"Error while querying: {e}")

def main():
    # Initialize document processor
    processor = DocumentProcessor("data")
    processor.create_new_notebook_folder_path("chroma")
    # documents = processor.load_documents()
    # chunks = processor.split_text(documents)
    # processor.save_to_chroma(chunks, "chroma")

    
    # #Example query
    # query_engine = QueryEngine()
    # query_engine.query("What is adaptor pattern","chroma")

if __name__ == "__main__":
    main()

##SCALE CHUNK W/ SIZE OF FILE CHUNK/7?


