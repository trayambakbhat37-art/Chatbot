# Forma

A minimal, responsive AI chatbot with a private server-side API proxy. It uses only Node.js built-ins, so there are no dependencies to install.

## Run locally

1. Install Node.js 18 or newer.
2. Set your OpenAI API key in the environment. On PowerShell:

   ```powershell
   $env:OPENAI_API_KEY = "your_api_key_here"
   npm start
   ```

3. Open [http://localhost:3000](http://localhost:3000).

Optionally set `OPENAI_MODEL` and `PORT`. The default model is `gpt-4o-mini`. The API key is read by the server and is never sent to the browser. Chat history is stored locally in the browser's local storage.

## Features

- Responsive chat interface with prompt starters, theme toggle, and recent conversations
- Conversation history saved locally per browser
- Server-side OpenAI API proxy with input checks and helpful error messages
- No framework or package dependencies
