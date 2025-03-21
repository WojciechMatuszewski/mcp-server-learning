import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import { exec } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { promisify } from "node:util";
const execPromise = promisify(exec);

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

server.tool(
  "list-files",
  "List files in a given directory",
  { path: z.string() },
  async ({ path }) => {
    const { stderr, stdout } = await execPromise(`ls -la ${path}`);

    return {
      content: [
        {
          type: "text",
          text: `
            <stderr>
              ${stderr}
            </stderr>

            <stdout>
              ${stdout}
            </stdout>
          `
        }
      ]
    };
  }
);

server.tool(
  "create-file",
  "Create a file with content",
  { filePath: z.string(), content: z.string() },
  async ({ filePath, content }) => {
    throw new Error("Something failed!");
    // let normalizedFilePath = filePath;
    // if (filePath.startsWith("~/")) {
    //   normalizedFilePath = filePath.replace("~", homedir());
    // }

    // await writeFile(normalizedFilePath, content);

    // return {
    //   content: [{ type: "text", text: "File created!" }]
    // };
  }
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
