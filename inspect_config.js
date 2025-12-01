import { prebuiltAppConfig } from '@mlc-ai/web-llm';

const modelId = 'Phi-3.5-vision-instruct-q4f16_1-MLC';
const modelConfig = prebuiltAppConfig.model_list.find(m => m.model_id === modelId);

if (modelConfig) {
    console.log(JSON.stringify(modelConfig, null, 2));
} else {
    console.log(`Model ${modelId} not found in prebuiltAppConfig`);
    console.log('Available models:', prebuiltAppConfig.model_list.map(m => m.model_id));
}
