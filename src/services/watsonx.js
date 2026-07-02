// ─── IBM watsonx.ai API service ───
// Model: ibm/granite-4-h-small (fixed — quality carried by system prompts)
// Region: us-south
//
// All requests are routed through the Vite dev-server proxy (/api/iam and
// /api/watsonx) to avoid browser CORS restrictions on the IBM endpoints.
// See vite.config.js for proxy configuration.

const IAM_TOKEN_PATH = '/api/iam/identity/token'
// Use 2024-05-01 which supports the chat completions endpoint for Granite models
const WATSONX_CHAT_PATH = '/api/watsonx/ml/v1/text/chat?version=2024-05-01'

let cachedToken = null
let tokenExpiry = 0

async function getIAMToken() {
  // Reuse token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < tokenExpiry - 60000) {
    return cachedToken
  }

  const apiKey = import.meta.env.VITE_WATSONX_API_KEY
  if (!apiKey) {
    throw new Error('VITE_WATSONX_API_KEY is not set in your .env file.')
  }

  const response = await fetch(IAM_TOKEN_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${encodeURIComponent(apiKey)}`,
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`IAM token exchange failed: ${response.status} — ${errText}`)
  }

  const data = await response.json()
  cachedToken = data.access_token
  // expires_in is in seconds
  tokenExpiry = Date.now() + data.expires_in * 1000
  return cachedToken
}

/**
 * Generate text using IBM watsonx.ai chat completions endpoint.
 * @param {string} systemPrompt - The mode-specific system prompt
 * @param {string} userPrompt - The user's input
 * @returns {Promise<string>} - The generated text
 */
/**
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {string|null} contextBlock - Optional project context prepended as a user message
 */
export async function generateText(systemPrompt, userPrompt, contextBlock = null) {
  const projectId = import.meta.env.VITE_WATSONX_PROJECT_ID
  if (!projectId) {
    throw new Error('VITE_WATSONX_PROJECT_ID is not set in your .env file.')
  }

  const token = await getIAMToken()

  const response = await fetch(WATSONX_CHAT_PATH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model_id: 'ibm/granite-4-h-small',
      project_id: projectId,
      messages: [
        { role: 'system', content: systemPrompt },
        ...(contextBlock ? [{ role: 'user', content: contextBlock }, { role: 'assistant', content: 'Understood. I have the project context.' }] : []),
        { role: 'user',   content: userPrompt },
      ],
      // max_tokens is the correct field name for the chat endpoint
      max_tokens: 800,
      temperature: 0,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`watsonx.ai API error: ${response.status} — ${err}`)
  }

  const data = await response.json()
  // Chat response shape: { choices: [{ message: { content: string } }] }
  // Also handle watsonx-specific shape: { results: [{ generated_text: string }] }
  const text =
    data.choices?.[0]?.message?.content?.trim() ||
    data.results?.[0]?.generated_text?.trim()
  if (!text) {
    console.error('[watsonx] Unexpected response shape:', JSON.stringify(data).slice(0, 400))
    throw new Error('watsonx.ai returned an empty response. Check the browser console for details.')
  }
  return text
}
