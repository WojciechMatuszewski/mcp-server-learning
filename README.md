# Learning about MCP

TODO:

- Implement sampling https://modelcontextprotocol.io/docs/concepts/sampling

- Implement roots.

## Learnings

- There are two transport methods:

  - Via _stdio_. Here, you have to provide a path to a server binary client can use.

  - Via _sse_. Here, you have to provide a network address for the server.

    - This transport method seems more universal to me. It allows the server to be deployed separately than the client.

- I _really_ wanted to use `fastify` for the server, but I could not make it work with the existing SDK.

  - This is a great opportunity to learn how to write such server using _only_ Node!

- **Core primitives that relate to MCP** are:

  - _Resources_ – You can think of these as data (like PDFs, database records and so on) that client can use to shape the correct response to the users query.

  - _Prompts_ – Think of those as pre-defined prompts you sometimes see under the text box in "prompt to x" flows.

  - _Tools_ – Those allow the LLM to perform actions on the user behalf. **It is the server that calls the tool and responds with the result to the client**. Clients job is to then pass the results to the LLM.

  - _Sampling_ – To be honest, I'm unsure what those are yet.

  - _Roots_ – Those define the "boundaries" of the server. For example, if your server exposes a tool that works with the file system, you could include specific directory in the "roots" so that the tool is "bounded" only to that directory.

  - _Transports_ – Already wrote about them above. There is the STDIO and SSE transport. As for the messages, they are formatted via [JSON-RPC 2.0](https://www.jsonrpc.org/).

- I **really** like the fact that the SDK has error-handling built-in.

  - I can throw an error in the server `tool` callback function, and the client SDK will handle that, and respond accordingly.
