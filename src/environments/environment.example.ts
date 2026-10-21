export const environment = {
  production: false,
  gemini: {
    apiKey: 'YOUR_GEMINI_API_KEY_HERE',
    primaryModel: 'gemini-3.6-flash',
    fallbackModel: 'gemini-3.5-flash-lite',
    apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta'
  },
  openai: {
    apiKeys: [
      'YOUR_OPENAI_API_KEY_1'
    ],
    primaryModel: 'gpt-4o-mini',
    visionModel: 'gpt-4o-mini',
    apiBaseUrl: 'https://api.openai.com/v1'
  }
};
