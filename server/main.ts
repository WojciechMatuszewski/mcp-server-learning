import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";

import { z } from "zod";

const server = new McpServer({
  name: "example-server",
  version: "1.0.0"
});

server.tool(
  "echo",
  "Repeats given message",
  { message: z.string() },
  async ({ message }) => ({
    content: [{ type: "text", text: `Tool echo: ${message}` }]
  })
);

server.prompt("echo", { message: z.string() }, ({ message }) => ({
  messages: [
    {
      role: "user",
      content: {
        type: "text",
        text: `Please process this message: ${message}`
      }
    }
  ]
}));

let transport: SSEServerTransport | undefined = undefined;

const app = express();

app.get("/sse", async (req, res) => {
  transport = new SSEServerTransport("/messages", res);
  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  await transport?.handlePostMessage(req, res);
});

app.listen(3001);
