import axios from "axios";

/**
 * Simple script to test Ollama connection
 * Run with: node --experimental-modules scripts/test-ollama.js
 */
async function testOllamaConnection() {

  try {
    const response = await axios.post(
      "http://localhost:11434/api/generate",
      {
        model: "llama3",
        prompt:
          'Generate a simple JavaScript function that returns "Hello World"',
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 500,
        },
      },
      {
        timeout: 10000,
      }
    );


    return true;
  } catch (error) {
    console.error("❌ Failed to connect to Ollama");

    if (error.code === "ECONNREFUSED") {
      console.error("Ollama server is not running. Start it with:");
      console.error("ollama serve");
    } else if (error.response) {
      console.error("Error details:", error.response.data);
    } else {
      console.error("Error details:", error.message);
    }

    return false;
  }
}

// Run the test
testOllamaConnection();
