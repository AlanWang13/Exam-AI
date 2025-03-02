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
import json

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
            print(f"Loading existing ChromaDB from {persist_directory}")
            db = Chroma(
                persist_directory=persist_directory,
                embedding_function=self.embeddings
            )
        else:
            db = None

        total_processed = 0

        # Process documents in batches
        for batch in self.process_in_batches(chunks, MAX_BATCH_SIZE):
            if db is None:
                # Create a new database if it doesn't exist
                db = Chroma.from_documents(
                    batch,
                    self.embeddings,
                    persist_directory=persist_directory
                )
            else:
                # Add documents to the existing database
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

    def extract_json_from_text(self, text):
        """Extract JSON from text, even if it's within markdown code blocks"""
        # Try to find JSON inside ```json ... ``` blocks first
        json_block_pattern = r"```(?:json)?\s*([\s\S]*?)\s*```"
        json_matches = re.findall(json_block_pattern, text)
        
        if json_matches:
            for json_str in json_matches:
                try:
                    return json.loads(json_str)
                except json.JSONDecodeError:
                    continue
        
        # If no valid JSON in code blocks, try to extract JSON objects directly
        json_pattern = r"\{[\s\S]*?\}"
        json_matches = re.findall(json_pattern, text)
        
        for json_str in json_matches:
            try:
                return json.loads(json_str)
            except json.JSONDecodeError:
                continue
        
        # If we still don't have valid JSON, create a fallback
        return self.create_fallback_json(text)

    def create_fallback_json(self, text):
        """Create a fallback JSON structure when extraction fails"""
        # Extract potential answer (first paragraph)
        paragraphs = re.split(r'\n\s*\n', text)
        response = paragraphs[0] if paragraphs else "Unable to parse response"
        
        # Look for potential questions (lines starting with numbers, dashes, or question phrases)
        question_patterns = [
            r'\d+\.\s*(.*?)\s*(?:\n|$)',  # "1. Question"
            r'[-*]\s*(.*?)\s*(?:\n|$)',   # "- Question" or "* Question"
            r'"([^"]*\?)"',               # "Question?"
            r'(?:What|How|Why|When|Where|Who|Can|Could|Does|Do|Is|Are)\s+.*?\?'  # Question words
        ]
        
        questions = []
        for pattern in question_patterns:
            matches = re.findall(pattern, text)
            for match in matches:
                if isinstance(match, tuple):
                    match = match[0]
                if match and match not in questions and '?' in match:
                    questions.append(match)
                    if len(questions) >= 3:
                        break
            if len(questions) >= 3:
                break
        
        # If we couldn't find enough questions, generate placeholder ones
        while len(questions) < 3:
            questions.append(f"Can you explain more about this topic?")
        
        return {
            "response": response,
            "questions": questions[:3]  # Limit to exactly 3 questions
        }

    def query(self, query: str, persist_directory: str, collection_name: str = None):
        """Queries GroqCloud's LLM with context from the vector store."""
        try:
            db = Chroma(
                persist_directory=persist_directory,
                embedding_function=self.embeddings
            )

            def normalize_scores(results):
                docs_with_scores = []
                for doc, score in results:
                    # Convert negative cosine similarity to 0-1 range
                    normalized_score = (score + 1) / 2
                    docs_with_scores.append((doc, normalized_score))
                return docs_with_scores
            
            raw_results = db.similarity_search_with_relevance_scores(query, k=3)
            docs = normalize_scores(raw_results)
        
            if not docs:
                print("No documents found with the given relevance score threshold.")
                # Return a default JSON response when no context is found
                return json.dumps({
                    "response": "I couldn't find specific information to answer your question. Could you please provide more details or ask a different question?",
                    "questions": [
                        "Can you rephrase your question?",
                        "What specific aspect are you interested in learning about?",
                        "Would you like information on a related topic instead?"
                    ]
                }, ensure_ascii=False, indent=2)
            
            context = "\n\n".join([doc.page_content for doc, score in docs])
            sources = [f"{doc.metadata.get('source', 'Unknown')} (Page {doc.metadata.get('page', 1) + 1})" for doc, score in docs]            
            print("DOCS")
            print(docs)
            print("\n\n\n\n\n")
            
            prompt = f"""You are a chatbot to answer questions to help students learn.
            Based on the following context, please answer the question.
            
Context:
{context}

Question: {query}

Answer:"""
            prompt += '''Generate a response to the following user query in clear and concise language.

Then, create exactly three follow-up questions that help the user can ask the bot again to better understand the topic.

Your response **must** be formatted as **valid JSON** with the **exact** structure shown below and don't add any additional fields:

```json
{
  "response": "<your_answer_here>",
  "questions": [
    "<follow_up_question_1>",
    "<follow_up_question_2>",
    "<follow_up_question_3>"
  ]
}
```

IMPORTANT: Do not include any text, explanations, or content outside of the JSON structure.'''

            llm_response = self.llm.invoke(prompt)
            
            # Extract and validate JSON from the response
            try:
                # First try direct JSON parsing
                response_json = json.loads(llm_response.content)
            except json.JSONDecodeError:
                # If that fails, use our extraction function
                response_json = self.extract_json_from_text(llm_response.content)
            
            # Ensure the JSON has the expected structure
            if not isinstance(response_json, dict):
                response_json = {
                    "response": "Error parsing response. Please try asking your question again.",
                    "questions": [
                        "Could you rephrase your question?",
                        "What specific information are you looking for?",
                        "Would you like to explore a different topic?"
                    ]
                }
            
            # Check for response key (note the field is "response" not "answer" in this case)
            if "response" not in response_json:
                response_json["response"] = "The system generated an incomplete response. Please try again."
            
            # Check for questions key
            if "questions" not in response_json or not isinstance(response_json["questions"], list) or len(response_json["questions"]) != 3:
                response_json["questions"] = [
                    "Can you tell me more about this topic?",
                    "What are the key concepts related to this?",
                    "How can I apply this information?"
                ]
            
            # Add sources if you want to include them in the response
            # response_json["sources"] = sources
            
            # Log information for debugging
            print("\nLLM Response:")
            print(llm_response.content)
            print("\nParsed JSON:")
            print(response_json)
            print("\nSources:")
            print(sources)
            print("\nContext")
            print(context)
            
            # Return the guaranteed valid JSON as a string
            return json.dumps(response_json, ensure_ascii=False, indent=2)

        except Exception as e:
            print(f"Error while querying: {e}")
            # Return a fallback JSON response in case of any error
            return json.dumps({
                "response": f"I encountered an error while processing your question. Please try again later.",
                "questions": [
                    "Can you try asking another question?",
                    "Would you like to know about something else?",
                    "Can you provide more details about what you're looking for?"
                ]
            }, ensure_ascii=False, indent=2)