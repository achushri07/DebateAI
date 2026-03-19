import os
import tempfile
from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv

load_dotenv()

os.environ["GROQ_API_KEY"] = os.getenv("GROQ_API_KEY")

from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain

app = Flask(__name__)

# Global state for the RAG chain (per-session in production you'd use session IDs)
rag_state = {
    "retrieval_chain": None,
    "file_name": None
}

# Initialize the LLM model once
model = init_chat_model("groq:openai/gpt-oss-120b")
embeds = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

SYSTEM_PROMPT = (
    "You are a helpful debate assistant. Whatever topic you are asked about, you gotta tell in Favour and in Against of that. You specialize in debates and discussions. Also keep your responses quite short."
)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/upload", methods=["POST"])
def upload_file():
    """Handle PDF upload, chunk it, embed it, store in vector DB."""
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Only PDF files are supported"}), 400

    try:
        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            file.save(tmp.name)
            tmp_path = tmp.name

        # Load PDF
        loader = PyPDFLoader(tmp_path)
        docs = loader.load()

        # Split
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=600, chunk_overlap=100)
        documents = text_splitter.split_documents(docs)

        # Embed + Vector Store
        import re
        safe_name = re.sub(r'[^a-zA-Z0-9._-]', '_', file.filename)
        db = Chroma.from_documents(documents,embeds,collection_name=f"pdf_{safe_name}_{os.urandom(4).hex()}")
        retriever = db.as_retriever()

        # Build RAG chain
        prompt = ChatPromptTemplate.from_template("""
            You are a helpful debate assistant. Whatever topic you are asked about you gotta tell in Favour and in against of that. You specializes in debate and discussions. Also keep your responses quite short.
            <context>
            {context}
            </context>
            Question: {input}
        """)
        document_chain = create_stuff_documents_chain(model, prompt)
        retrieval_chain = create_retrieval_chain(retriever, document_chain)

        # Store globally
        rag_state["retrieval_chain"] = retrieval_chain
        rag_state["file_name"] = file.filename

        os.unlink(tmp_path)

        return jsonify({
            "success": True,
            "message": f"File '{file.filename}' processed successfully.",
            "chunks": len(documents)
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/chat", methods=["POST"])
def chat():
    """Handle chat — with or without a PDF source."""
    data = request.get_json()
    user_input = data.get("message", "").strip()

    if not user_input:
        return jsonify({"error": "Empty message"}), 400

    try:
        if rag_state["retrieval_chain"]:
            # RAG mode — PDF is loaded
            response = rag_state["retrieval_chain"].invoke({"input": user_input})
            answer = response["answer"]
            source = rag_state["file_name"]
        else:
            # No source — plain LLM chat
            messages = [
                SystemMessage(SYSTEM_PROMPT),
                HumanMessage(user_input)
            ]
            response = model.invoke(messages)
            answer = response.content
            source = None

        return jsonify({
            "answer": answer,
            "source": source
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/clear", methods=["POST"])
def clear_source():
    """Clear the loaded PDF/RAG chain."""
    rag_state["retrieval_chain"] = None
    rag_state["file_name"] = None
    return jsonify({"success": True, "message": "Source cleared."})


if __name__ == "__main__":
    app.run(debug=True)