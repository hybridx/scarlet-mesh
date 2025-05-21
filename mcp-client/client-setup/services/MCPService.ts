import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Tool, ToolResult } from '../types/interfaces.js';
import { config } from '../config/config.js';

export class MCPService {
  private clients: Client[] = [];
  private toolsMap: Map<string, Client> = new Map();
  private _tools: Tool[] = [];

  get tools(): Tool[] {
    return this._tools;
  }

  async connectToServer(serverScriptPath: string): Promise<void> {
    const isJs = serverScriptPath.endsWith('.js');
    const isPy = serverScriptPath.endsWith('.py');

    if (!isJs && !isPy) {
      throw new Error('Server script must be a .js or .py file');
    }

    const command = isPy
      ? process.platform === 'win32'
        ? 'python'
        : 'python3'
      : process.execPath;

    const transport = new StdioClientTransport({
      command,
      args: [serverScriptPath],
    });

    const client = new Client({
      name: config.mcp.clientName,
      version: config.mcp.version,
    });

    await client.connect(transport);
    this.clients.push(client);

    const { tools } = await client.listTools();

    for (const tool of tools) {
      const formattedTool: Tool = {
        name: tool.name,
        description: tool.description ?? '',
        inputSchema: tool.inputSchema,
        input_schema: tool.inputSchema,
      };

      this._tools.push(formattedTool);
      this.toolsMap.set(tool.name, client);
    }

    console.log(
      `✅ Loaded tools from ${serverScriptPath}:`,
      tools.map((t) => t.name)
    );
  }

  async callTool(name: string, args: Record<string, any>): Promise<ToolResult> {
    const client = this.toolsMap.get(name);
    if (!client) {
      const errorMsg = `Tool "${name}" not found.`;
      console.error(errorMsg);
      return { content: errorMsg, isError: true };
    }

    try {
      const result = await client.callTool({
        name,
        arguments: args,
      });

      if (!result) {
        return { content: 'No result returned from tool.', isError: true };
      }

      return {
        content: result,
        isError: false,
      };
    } catch (error) {
      const errorMsg = `Error calling tool "${name}": ${error}`;
      console.error(errorMsg);
      return { content: errorMsg, isError: true };
    }
  }

  async cleanup(): Promise<void> {
    for (const client of this.clients) {
      await client.close();
    }
    this.clients = [];
    this._tools = [];
    this.toolsMap.clear();
  }
}
