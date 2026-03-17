# DebateAI

AI-powered debate chatbot that generates arguments **for and against any topic**. It can also analyze **uploaded PDF documents** and generate debate points grounded in the document using **Retrieval Augmented Generation (RAG)**.

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
└── README.md
```

---

## Author

Achintya Srivastawa

BTech Electronics and Communication Engineering
