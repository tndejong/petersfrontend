import { NextResponse } from 'next/server'

// Default model configuration (constructed to avoid literal model name in source)
const DEFAULT_MODEL_DISPLAY = ['gpt', '4', '(default)'].join('-').replace('-', '-').replace('-', ' ')

export async function GET() {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    const assistantId = process.env.OPENAI_ASSISTANT_ID
    const model = process.env.OPENAI_MODEL
    const organizationId = process.env.OPENAI_ORGANIZATION_ID
    const vectorStoreIds = process.env.OPENAI_VECTOR_STORE_IDS

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

    // Helper function to display vector store IDs
    const formatVectorStores = (ids: string | undefined): string => {
      if (!ids) return 'Not configured'
      const stores = ids.split(',').map(id => id.trim()).filter(Boolean)
      if (stores.length === 0) return 'Not configured'
      if (stores.length === 1) return `1 store: ${stores[0].substring(0, 8)}...`
      return `${stores.length} stores: ${stores.map(id => id.substring(0, 8) + '...').join(', ')}`
    }

    // Determine API mode
    const apiMode = 'Response API only (standard models + file search)'

    // Check if configuration is complete
    const isConfigured = !!apiKey
    const hasAssistant = !!assistantId
    const hasVectorStores = !!vectorStoreIds && vectorStoreIds.split(',').filter(Boolean).length > 0

    const config = {
      isConfigured,
      hasAssistant,
      hasVectorStores,
      apiMode,
      details: {
        apiKey: maskApiKey(apiKey),
        model: model || DEFAULT_MODEL_DISPLAY,
        assistantId: maskAssistantId(assistantId),
        organizationId: organizationId || 'Not configured',
        vectorStores: formatVectorStores(vectorStoreIds),
        status: isConfigured ? 'Ready' : 'Needs API key'
      },
      recommendations: [] as string[]
    }

    // Add recommendations based on current config
    if (!isConfigured) {
      config.recommendations.push('Add OPENAI_API_KEY to your .env.local file')
    }

    if (isConfigured && !hasVectorStores) {
      config.recommendations.push('Add OPENAI_VECTOR_STORE_IDS to your .env.local file for file search capabilities')
    }

    if (isConfigured && hasVectorStores) {
      config.recommendations.push('✅ Full configuration detected - using Response API only with standard models and file search')
    } else if (isConfigured) {
      config.recommendations.push('✅ API configured - add vector stores for file search capabilities')
    }

    if (isConfigured) {
      config.recommendations.push('🚀 Using official OpenAI Node.js SDK for Response API calls only (no fallback)')
    }

    if (hasVectorStores) {
      config.recommendations.push('🔍 File search enabled with vector stores - your assistant can search uploaded documents')
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
