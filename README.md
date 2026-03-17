# DebateAI

AI-powered debate assistant that generates arguments **for and against any topic**. It can also analyze **uploaded PDF documents** and generate debate points grounded in the document using **Retrieval Augmented Generation (RAG)**.

---

## Features

* Debate generation in **Favour and Against** of any topic
* **PDF grounded debates** using RAG
* Clean **modern chat interface**
* Upload PDF and debate based on document context
* Fast inference using **Groq LLM API**
* Vector search using **ChromaDB embeddings**

---

## Demo Behaviour

User can:

1. Enter a debate topic
2. Upload a PDF document
3. Ask questions based on the PDF
4. Get arguments **for and against** the topic

The system switches between:

* **General Mode** → Uses LLM knowledge
* **RAG Mode** → Uses uploaded PDF as source

---

## Tech Stack

### Backend

* Flask
* LangChain
* Groq LLM
* HuggingFace Embeddings
* Chroma Vector Database

### Frontend

* HTML
* CSS
* JavaScript

---

## Architecture

User Query
↓
Flask API
↓
Check if PDF uploaded
↓
If No → Direct LLM response
If Yes → RAG Pipeline

RAG Pipeline
↓
PDF Loader
↓
Text Chunking
↓
Embeddings
↓
Vector Search
↓
LLM Response

---

## Project Structure

```
DebateAI/
│
├── app.py
├── model.ipynb
│
├── templates/
│   └── index.html
│
├── static/
│   ├── script.js
│   └── style.css
│
├── .env
└── README.md
```

---

## Installation

### 1. Clone Repository

```
git clone https://github.com/yourusername/DebateAI.git
cd DebateAI
```

### 2. Install Dependencies

```
pip install flask langchain chromadb sentence-transformers python-dotenv
```

### 3. Setup Environment Variables

Create `.env` file

```
GROQ_API_KEY=your_api_key_here
```

---

## Run The Application

```
python app.py
```

Open browser:

```
http://127.0.0.1:5000
```

---

## API Endpoints

### Upload PDF

```
POST /upload
```

Uploads and processes PDF into vector database.

---

### Chat

```
POST /chat
```

Send debate topic or question.

---

### Clear Source

```
POST /clear
```

Removes loaded PDF and returns to general mode.

---

## How RAG Works

1. User uploads PDF
2. PDF is split into chunks
3. Chunks converted to embeddings
4. Stored in Chroma vector database
5. User query retrieves relevant chunks
6. LLM generates debate arguments using retrieved context

---

## Example Prompt

```
Topic: Artificial Intelligence in Education
```

Output:

**In Favour**

* Improves accessibility
* Personalized learning

**Against**

* Reduces human interaction
* Risk of over-dependence on technology

---

## Future Improvements

* Multi document support
* Debate scoring system
* Argument ranking
* User accounts
* Conversation history

---

## Author

Achintya Srivastawa

BTech Electronics and Communication Engineering

---

## License

MIT License
