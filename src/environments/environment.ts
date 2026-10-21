export const environment = {
  production: false,
  gemini: {
    apiKey: '',
    primaryModel: 'gemini-3.6-flash',
    fallbackModel: 'gemini-3.5-flash-lite',
    apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta'
  },
  openai: {
    apiKeys: [],
    primaryModel: 'gpt-4o-mini',
    visionModel: 'gpt-4o-mini',
    apiBaseUrl: 'https://api.openai.com/v1'
  }
};

