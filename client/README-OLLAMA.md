# Ollama Integration

This project now uses Ollama as a locally-run LLM for generating game challenges instead of OpenAI's API.

## Setup Instructions

1. Download and install Ollama from [ollama.com](https://ollama.com)

2. Pull the Llama 3 model (or another model of your choice):

   ```
   ollama pull llama3
   ```

3. Create a `.env` file in the `client` directory with the following content:

   ```
   # API Configuration
   VITE_API_URL=http://localhost:3000/api

   # Ollama Configuration
    VITE_OLLAMA_AVAILABLE=true
    VITE_OLLAMA_MODEL=llama3

   # Disable OpenAI integration
   # VITE_OPENAI_API_KEY=
   ```

4. Start the Ollama server by running `ollama serve` in a terminal

   - By default, Ollama runs on http://localhost:11434

5. Test the Ollama connection:

   ```
   cd client/scripts
   npm install
   node test-ollama.js
   ```

6. Run the application as usual

## Troubleshooting

- If you experience issues with the Ollama integration, check the browser console for error messages
- Make sure the Ollama server is running by visiting http://localhost:11434 in your browser
- If Ollama is unavailable, the application will fall back to using generated sample data

## Configuration Options

- `VITE_OLLAMA_AVAILABLE`: Set to "true" to enable Ollama integration
- `VITE_OLLAMA_MODEL`: The Ollama model to use (default: "llama3")
  - Other options: "llama3:8b", "mistral", "codellama", etc.
  - Check available models with `ollama list`

## Switching Back to OpenAI

If you prefer to use OpenAI again:

1. Update your `.env` file:

   ```
   # API Configuration
   VITE_API_URL=http://localhost:3000/api

   # Disable Ollama
   VITE_OLLAMA_AVAILABLE=false

   # Enable OpenAI
   VITE_OPENAI_API_KEY=your_openai_api_key
   ```
