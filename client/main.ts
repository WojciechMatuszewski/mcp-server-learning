import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { createInterface } from "node:readline/promises";
import { OpenAI } from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall
} from "openai/resources/index.mjs";

class MCPClient {
  private mcp: Client;
  private transport: SSEClientTransport;
  private openai: OpenAI;

  private tools: Array<Tool> = [];

  constructor() {
    this.mcp = new Client({
      name: "example-client",
      version: "1.0"
    });

    this.transport = new SSEClientTransport(
      new URL("/sse", "http://localhost:3001")
    );

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_KEY
    });
  }

  async connect() {
    console.log("Connecting to the server");

    await this.mcp.connect(this.transport);

    const { tools } = await this.mcp.listTools();
    this.tools = tools;

    console.log("Connected to the server ");
  }

  async processQuery(query: string) {
    const recursiveCallLLM = async (messages: ChatCompletionMessageParam[]) => {
      const output = await this.openai.chat.completions.create({
        messages: messages,
        model: "gpt-4o-2024-11-20",
        tools: this.tools.map((tool) => {
          return {
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.inputSchema
            },
            type: "function"
          };
        })
      });

      const { messages: retrievedMessages, toolCalls } = output.choices.reduce<{
        messages: Array<ChatCompletionMessageParam>;
        toolCalls: Array<ChatCompletionMessageToolCall>;
      }>(
        (acc, { message }) => {
          acc.messages.push(message);

          const toolCalls = message.tool_calls ?? [];
          acc.toolCalls.push(...toolCalls);

          return acc;
        },
        { toolCalls: [], messages: [] }
      );
      if (toolCalls.length === 0) {
        return retrievedMessages.map((message) => message.content).join("");
      }

      const pendingToolCallMessages = toolCalls.map((requestedToolCall) => {
        console.log(`Calling tool: ${requestedToolCall.function.name}`);

        return this.mcp
          .callTool({
            name: requestedToolCall.function.name,
            arguments: JSON.parse(requestedToolCall.function.arguments)
          })
          .then((toolCallResult) => {
            const toolCallResultContent = toolCallResult.content[0].text;
            console.log(
              `Calling tool: ${requestedToolCall.function.name}. Result: ${toolCallResultContent}`
            );

            return {
              role: "tool",
              content: toolCallResultContent,
              tool_call_id: requestedToolCall.id
            } satisfies ChatCompletionMessageParam;
          });
      });

      const toolCallMessages = await Promise.all(pendingToolCallMessages);
      const newMessages = [
        ...messages,
        ...retrievedMessages,
        ...toolCallMessages
      ];
      console.log(newMessages);

      return recursiveCallLLM(newMessages);
    };

    const initialMessages: Array<ChatCompletionMessageParam> = [
      {
        role: "user",
        content: query
      }
    ];

    console.log("Processing query");

    const output = await recursiveCallLLM(initialMessages);

    console.log(output);

    console.log("Query processed");
  }
}

const client = new MCPClient();

await client.connect();

const rl = createInterface({ input: process.stdin, output: process.stdout });

async function promptUser() {
  const query = await rl.question("Query: ");

  await client.processQuery(query);

  await promptUser();
}

await promptUser();
