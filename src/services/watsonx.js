// ─── IBM watsonx.ai API service ───
// Model: ibm/granite-3-2b-instruct (fixed — quality carried by system prompts)
// Region: us-south

const IAM_TOKEN_URL = 'https://iam.cloud.ibm.com/identity/token'
const WATSONX_URL = 'https://us-south.ml.cloud.ibm.com/ml/v1/text/generation?version=2023-05-29'

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

  const response = await fetch(IAM_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${encodeURIComponent(apiKey)}`,
  })

  if (!response.ok) {
    throw new Error(`IAM token exchange failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  cachedToken = data.access_token
  // expires_in is in seconds
  tokenExpiry = Date.now() + data.expires_in * 1000
  return cachedToken
}

/**
 * Generate text using IBM watsonx.ai
 * @param {string} systemPrompt - The mode-specific system prompt
 * @param {string} userPrompt - The user's input
 * @returns {Promise<string>} - The generated text
 */
export async function generateText(systemPrompt, userPrompt) {
  const projectId = import.meta.env.VITE_WATSONX_PROJECT_ID
  if (!projectId) {
    throw new Error('VITE_WATSONX_PROJECT_ID is not set in your .env file.')
  }

  const token = await getIAMToken()

  const response = await fetch(WATSONX_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model_id: 'ibm/granite-3-2b-instruct',
      project_id: projectId,
      input: userPrompt,
      parameters: {
        decoding_method: 'greedy',
        max_new_tokens: 800,
        repetition_penalty: 1.1,
      },
      system_prompt: systemPrompt,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`watsonx.ai API error: ${response.status} — ${err}`)
  }

  const data = await response.json()
  // Response shape: { results: [{ generated_text: string }] }
  return data.results?.[0]?.generated_text?.trim() || ''
}
