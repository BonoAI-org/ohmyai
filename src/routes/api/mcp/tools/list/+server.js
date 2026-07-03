import { json } from '@sveltejs/kit';

/**
 * POST /api/mcp/tools/list
 * Proxy pour lister les outils d'un serveur MCP distant
 * Proxy to list tools from a remote MCP server
 */
export async function POST({ request }) {
	try {
		const { serverUrl, apiKey } = await request.json();

		if (!serverUrl) {
			return json({ error: 'serverUrl is required' }, { status: 400 });
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
				method: 'tools/list',
				params: {}
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
			return json({ error: data.error.message || 'MCP server error' }, { status: 502 });
		}

		return json({ tools: data.result?.tools || [] });
	} catch (err) {
		if (err.name === 'AbortError') {
			return json({ error: 'MCP server timeout (30s)' }, { status: 504 });
		}
		return json({ error: err.message }, { status: 500 });
	}
}
