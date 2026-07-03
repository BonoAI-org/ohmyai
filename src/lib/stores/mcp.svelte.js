/**
 * Store MCP (Model Context Protocol) pour gérer les serveurs et outils externes
 * MCP Store to manage external servers and tools
 */

class MCPStore {
	// Liste des serveurs MCP configurés / Configured MCP servers
	// { id, name, url, apiKey?, enabled, status: 'disconnected'|'connected'|'error' }
	servers = $state([]);

	// Outils agrégés de tous les serveurs connectés / Aggregated tools from all connected servers
	// { name, description, inputSchema, serverId }
	availableTools = $state([]);

	// État de découverte des outils / Tool discovery state
	isDiscovering = $state(false);

	// Erreur / Error
	error = $state(null);

	/**
	 * Charge les serveurs depuis localStorage / Load servers from localStorage
	 */
	loadServers() {
		try {
			const saved = localStorage.getItem('mcpServers');
			if (saved) {
				this.servers = JSON.parse(saved);
				// Reset status on load
				this.servers = this.servers.map(s => ({ ...s, status: 'disconnected' }));
			}
		} catch (err) {
			console.error('Erreur chargement serveurs MCP:', err);
			this.servers = [];
		}
	}

	/**
	 * Sauvegarde les serveurs dans localStorage / Save servers to localStorage
	 */
	saveServers() {
		try {
			const toSave = this.servers.map(({ status, ...rest }) => rest);
			localStorage.setItem('mcpServers', JSON.stringify(toSave));
		} catch (err) {
			console.error('Erreur sauvegarde serveurs MCP:', err);
		}
	}

	/**
	 * Ajoute un serveur MCP / Add an MCP server
	 * @param {{ name: string, url: string, apiKey?: string }} config
	 */
	addServer(config) {
		const server = {
			id: `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
			name: config.name,
			url: config.url,
			apiKey: config.apiKey || null,
			enabled: true,
			status: 'disconnected'
		};
		this.servers = [...this.servers, server];
		this.saveServers();
		return server;
	}

	/**
	 * Supprime un serveur MCP / Remove an MCP server
	 * @param {string} id
	 */
	removeServer(id) {
		this.servers = this.servers.filter(s => s.id !== id);
		this.availableTools = this.availableTools.filter(t => t.serverId !== id);
		this.saveServers();
	}

	/**
	 * Active/désactive un serveur / Toggle server enabled state
	 * @param {string} id
	 */
	toggleServer(id) {
		this.servers = this.servers.map(s =>
			s.id === id ? { ...s, enabled: !s.enabled } : s
		);
		this.saveServers();
		// Re-discover tools after toggle
		this.discoverTools();
	}

	/**
	 * Découvre les outils de tous les serveurs actifs / Discover tools from all enabled servers
	 */
	async discoverTools() {
		this.isDiscovering = true;
		this.error = null;
		const allTools = [];

		for (const server of this.servers) {
			if (!server.enabled) continue;

			try {
				const response = await fetch('/api/mcp/tools/list', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						serverUrl: server.url,
						apiKey: server.apiKey
					})
				});

				const data = await response.json();

				if (response.ok && data.tools) {
					this.servers = this.servers.map(s =>
						s.id === server.id ? { ...s, status: 'connected' } : s
					);
					for (const tool of data.tools) {
						allTools.push({
							name: tool.name,
							description: tool.description || '',
							inputSchema: tool.inputSchema || { type: 'object', properties: {} },
							serverId: server.id
						});
					}
				} else {
					this.servers = this.servers.map(s =>
						s.id === server.id ? { ...s, status: 'error' } : s
					);
					console.warn(`MCP server ${server.name} error:`, data.error);
				}
			} catch (err) {
				this.servers = this.servers.map(s =>
					s.id === server.id ? { ...s, status: 'error' } : s
				);
				console.warn(`MCP server ${server.name} unreachable:`, err.message);
			}
		}

		this.availableTools = allTools;
		this.isDiscovering = false;
	}

	/**
	 * Exécute un outil via le proxy / Execute a tool via the proxy
	 * @param {string} serverId
	 * @param {string} toolName
	 * @param {object} args
	 * @returns {Promise<any>}
	 */
	async callTool(serverId, toolName, args) {
		const server = this.servers.find(s => s.id === serverId);
		if (!server) throw new Error(`Server ${serverId} not found`);

		const response = await fetch('/api/mcp/tools/call', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				serverUrl: server.url,
				apiKey: server.apiKey,
				toolName,
				arguments: args
			})
		});

		const data = await response.json();

		if (!response.ok || data.error) {
			throw new Error(data.error || `Tool call failed with status ${response.status}`);
		}

		return data.result;
	}

	/**
	 * Convertit les outils disponibles en format OpenAI pour WebLLM
	 * Convert available tools to OpenAI format for WebLLM
	 * @returns {Array}
	 */
	getToolsForLLM() {
		return this.availableTools.map(t => ({
			type: 'function',
			function: {
				name: t.name,
				description: t.description,
				parameters: t.inputSchema
			}
		}));
	}

	/**
	 * Trouve le serverId associé à un nom d'outil / Find serverId for a tool name
	 * @param {string} toolName
	 * @returns {string|null}
	 */
	getServerIdForTool(toolName) {
		const tool = this.availableTools.find(t => t.name === toolName);
		return tool ? tool.serverId : null;
	}
}

export const mcpStore = new MCPStore();
