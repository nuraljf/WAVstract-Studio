# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# Reading designs from Figma

This project's UI is designed in Figma. To read a design, ALWAYS use the **official Figma MCP**
(tools named `mcp__<id>__get_*`, e.g. `get_metadata`, `get_design_context`, `get_screenshot`,
`get_variable_defs`). The community `figma-mcp-go` bridge has been removed — do not look for it.

Given a Figma node link `https://www.figma.com/design/<fileKey>/<name>?node-id=<a>-<b>`, extract
`fileKey` and pass `nodeId` as `<a>:<b>`. Standard flow:

1. `get_metadata` — node tree (ids, names, sizes, positions) to understand structure.
2. `get_design_context` — reference code + asset URLs for implementation (adapt to RN/Expo, not the
   raw React+Tailwind it emits).
3. `get_screenshot` — returns a short-lived PNG URL; `curl` it to a temp file and Read it to see the
   design. Prefer the URL+curl path over inline base64.
4. `get_variable_defs` — bound design tokens/variables for the node (often `{}` if none are bound).

The main WAVstract design file key is `w5JZnDnTXRCFNTiaDgtpk8`. If the official Figma tools are not
loaded in the session, they live behind ToolSearch (query `figma`) and require a session started
after the connector was authorized.
