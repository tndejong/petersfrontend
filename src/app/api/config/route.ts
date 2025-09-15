import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    const assistantId = process.env.OPENAI_ASSISTANT_ID
    const model = process.env.OPENAI_MODEL
    const organizationId = process.env.OPENAI_ORGANIZATION_ID

    // Helper function to safely display API key
    const maskApiKey = (key: string | undefined): string => {
      if (!key) return 'Not configured'
      if (key.length < 10) return 'Invalid key format'
      return `${key.substring(0, 7)}...${key.substring(key.length - 4)}`
    }

    // Helper function to safely display assistant ID
    const maskAssistantId = (id: string | undefined): string => {
      if (!id) return 'Not configured'
      if (!id.startsWith('asst_')) return 'Invalid format'
      return `${id.substring(0, 10)}...${id.substring(id.length - 4)}`
    }

    // Determine API mode
    const apiMode = assistantId ? 'Assistants API (with fallback)' : 'Chat Completions API'

    // Check if configuration is complete
    const isConfigured = !!apiKey
    const hasAssistant = !!assistantId

    const config = {
      isConfigured,
      hasAssistant,
      apiMode,
      details: {
        apiKey: maskApiKey(apiKey),
        model: model || 'gpt-4 (default)',
        assistantId: maskAssistantId(assistantId),
        organizationId: organizationId || 'Not configured',
        status: isConfigured ? 'Ready' : 'Needs API key'
      },
      recommendations: []
    }

    // Add recommendations based on current config
    if (!isConfigured) {
      config.recommendations.push('Add OPENAI_API_KEY to your .env.local file')
    }

    if (isConfigured && !hasAssistant) {
      config.recommendations.push('Consider adding OPENAI_ASSISTANT_ID for custom assistant features')
    }

    if (isConfigured && hasAssistant) {
      config.recommendations.push('✅ Full configuration detected - using custom assistant with fallback')
    }

    return NextResponse.json(config)

  } catch (error) {
    console.error('Config API Error:', error)
    
    return NextResponse.json({
      isConfigured: false,
      hasAssistant: false,
      apiMode: 'Unknown',
      details: {
        apiKey: 'Error checking configuration',
        model: 'Unknown',
        assistantId: 'Unknown',
        organizationId: 'Unknown',
        status: 'Configuration check failed'
      },
      recommendations: ['Check server logs for configuration errors']
    }, { status: 500 })
  }
}
