import readline from 'readline/promises';
import { MCPService } from './services/MCPService.js';
import { LLMService } from './services/LLMService.js';
import { ToolService } from './services/ToolService.js';
import { formatToolResult } from './utils/formatters.js';
import { config } from './config/config.js';
import http from 'http';
import { EventEmitter } from 'events';
import { glob } from 'glob';
import fs from 'fs';

class MCPClient {
  private mcpService: MCPService;
  private llmService: LLMService;
  private toolService: ToolService;
  private httpServer: http.Server | null = null;
  private eventEmitter: EventEmitter;
  private lastResponse: string = '';
  private serverPort: number = 3000;

  constructor() {
    this.mcpService = new MCPService();
    this.llmService = new LLMService(() => this.mcpService.tools);
    this.toolService = new ToolService();
    this.eventEmitter = new EventEmitter();
  }

  async initialize(
    scriptPathOrFolder: string,
    port: number = 3000
  ): Promise<void> {
    this.serverPort = port;

    const isDirectory =
      fs.existsSync(scriptPathOrFolder) &&
      fs.lstatSync(scriptPathOrFolder).isDirectory();
    let toolPaths: string[] = [];

    if (isDirectory) {
      // Match one level down like packages/labs/build/index.js
      toolPaths = glob.sync(`${scriptPathOrFolder}/*/build/index.js`);
    } else {
      toolPaths = [scriptPathOrFolder];
    }

    for (const toolPath of toolPaths) {
      console.log(`Connecting to tool server: ${toolPath}`);
      await this.mcpService.connectToServer(toolPath);
    }

    this.llmService.initializeSystemPrompt();

    console.log(
      'Connected to server with tools:',
      this.mcpService.tools.map(({ name }) => name)
    );

    this.setupHttpServer();
  }

  private setupHttpServer(): void {
    this.httpServer = http.createServer(async (req, res) => {
      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        // Handle preflight requests
        res.writeHead(204);
        res.end();
        return;
      }

      // GET endpoint for fetching the latest response
      if (req.url === '/response' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ response: this.lastResponse }));
        return;
      }

      // POST endpoint for submitting queries
      if (req.url === '/query' && req.method === 'POST') {
        let body = '';

        // Collect request data
        req.on('data', (chunk) => {
          body += chunk.toString();
        });

        // Process the query when request is complete
        req.on('end', async () => {
          try {
            const { query } = JSON.parse(body);

            if (!query) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Query is required' }));
              return;
            }

            console.log(`Received query from frontend: ${query}`);

            // Process the query and get the response
            const response = await this.processQuery(query);

            // Send the response back to frontend
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                success: true,
                response: response,
              })
            );
          } catch (error) {
            console.error('Error processing query:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                error: 'Failed to process query',
                details: error instanceof Error ? error.message : String(error),
              })
            );
          }
        });
        return;
      }

      // Handle 404 for other routes
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    });

    this.httpServer.listen(this.serverPort, () => {
      console.log(`HTTP server running on port ${this.serverPort}`);
      console.log(
        `Access the latest response at http://localhost:${this.serverPort}/response`
      );
      console.log(
        `Submit queries at http://localhost:${this.serverPort}/query (POST)`
      );
    });
  }

  async processQuery(query: string): Promise<string> {
    try {
      const ollamaResponse = await this.llmService.callModelAPI(query);
      const responseContent = ollamaResponse.message?.content || 'No response';

      const toolCalls = this.toolService.parseToolCalls(ollamaResponse);
      console.log('Parsed tool calls:', toolCalls);

      if (!toolCalls) {
        this.updateLastResponse(responseContent);
        return responseContent;
      }

      let finalResponse = `${responseContent}\n\n`;

      // Process each tool call
      for (const toolCall of toolCalls) {
        const toolName = toolCall.name;
        const toolArgs = this.toolService.normalizeToolArguments(
          toolCall.arguments
        );

        finalResponse += `[Calling tool ${toolName} with args ${JSON.stringify(
          toolArgs
        )}]\n`;

        // Call the tool and get the result
        const result = await this.mcpService.callTool(toolName, toolArgs);
        const formattedResult = formatToolResult(result);

        finalResponse += `\nTool result:\n${formattedResult}\n`;

        // Add the tool result to conversation history
        this.llmService.addSystemMessage(
          `Tool result from ${toolName}: ${formattedResult}`
        );

        const analysisPrompt = `Analyze the following data and provide insights:\n${formattedResult}`;
        const analysisResponse = await this.llmService.callModelAPI(
          analysisPrompt
        );
        const analysisContent =
          analysisResponse.message?.content || 'No analysis provided.';

        finalResponse += `\nAnalysis:\n${analysisContent}`;
      }

      this.updateLastResponse(finalResponse);
      return finalResponse;
    } catch (error) {
      const errorMessage = `An error occurred while processing your query: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.updateLastResponse(errorMessage);
      return errorMessage;
    }
  }

  private updateLastResponse(response: string): void {
    this.lastResponse = response;
    this.eventEmitter.emit('response', response);
  }

  // Subscribe to response events
  onResponse(callback: (response: string) => void): void {
    this.eventEmitter.on('response', callback);
  }

  async chatLoop(): Promise<void> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      console.log('\nMCP Client with Ollama Started!');
      console.log(`Using Ollama model: ${config.ollama.model}`);
      console.log("Type your queries or 'quit' to exit.");

      while (true) {
        const message = await rl.question('\nQuery: ');
        if (message.toLowerCase() === 'quit') {
          break;
        }
        const response = await this.processQuery(message);
        console.log('\n' + response);
      }
    } finally {
      rl.close();
    }
  }

  async cleanup(): Promise<void> {
    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer?.close(() => resolve());
      });
    }
    await this.mcpService.cleanup();
  }
}

async function main(): Promise<void> {
  if (process.argv.length < 3) {
    console.log('Usage: node index.ts <path_to_server_script> [port]');
    return;
  }

  const mcpClient = new MCPClient();
  const port = process.argv[3] ? parseInt(process.argv[3]) : 3000;

  try {
    await mcpClient.initialize(process.argv[2], port);

    // Example of subscribing to response events
    mcpClient.onResponse((response) => {
      console.log('[Event] Response updated');
    });

    await mcpClient.chatLoop();
  } finally {
    await mcpClient.cleanup();
    process.exit(0);
  }
}

main();
