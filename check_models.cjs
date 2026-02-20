const { prebuiltAppConfig } = require('@mlc-ai/web-llm'); console.log(JSON.stringify(prebuiltAppConfig.model_list.map(m => m.model_id).filter(id => id.includes('Qwen3')), null, 2))
