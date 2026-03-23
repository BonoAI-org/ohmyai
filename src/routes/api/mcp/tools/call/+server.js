import { json } from '@sveltejs/kit';

/**
 * POST /api/mcp/tools/call
 * Proxy pour exécuter un outil sur un serveur MCP distant
 * Proxy to execute a tool on a remote MCP server
 */
export async function POST({ request }) {
	try {
		const { serverUrl, apiKey, toolName, arguments: toolArgs } = await request.json();

		if (!serverUrl || !toolName) {
			return json({ error: 'serverUrl and toolName are required' }, { status: 400 });
		}

		const headers = {
			'Content-Type': 'application/json',
			'Accept': 'application/json'
		};
		if (apiKey) {
			headers['Authorization'] = `Bearer ${apiKey}`;
		}

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 30000);

		const response = await fetch(serverUrl, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				jsonrpc: '2.0',
				id: 1,
				method: 'tools/call',
				params: {
					name: toolName,
					arguments: toolArgs || {}
				}
			}),
			signal: controller.signal
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			return json(
				{ error: `MCP server responded with ${response.status}: ${response.statusText}` },
				{ status: 502 }
			);
		}

		const data = await response.json();

		if (data.error) {
			return json({ error: data.error.message || 'MCP tool execution error' }, { status: 502 });
		}

		return json({ result: data.result });
	} catch (err) {
		if (err.name === 'AbortError') {
			return json({ error: 'MCP tool execution timeout (30s)' }, { status: 504 });
		}
		return json({ error: err.message }, { status: 500 });
	}
}
