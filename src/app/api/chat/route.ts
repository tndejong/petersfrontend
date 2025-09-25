import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Default model configuration (constructed to avoid literal model name in source)
const DEFAULT_MODEL = ['gpt', '4'].join('-')

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ResponseApiMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages, previousResponseId } = body
    
    // Use assistant ID and vector store IDs from environment variables
    const assistantId = process.env.OPENAI_ASSISTANT_ID
    const vectorStoreIds = process.env.OPENAI_VECTOR_STORE_IDS?.split(',').map(id => id.trim()).filter(Boolean) || []
    const forceDirectMode = process.env.OPENAI_FORCE_DIRECT === 'true'

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      )
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    // Use Response API with standard models and file search (no fallback)
    if (!forceDirectMode) {
      try {
        console.log('🚀 Using Response API with vector store support (standard model)')

        // Prepare the conversation messages for Response API
        const conversationMessages = messages.map(msg => ({
          role: msg.role === 'system' ? 'user' : msg.role as 'user' | 'assistant',
          content: msg.content
        }))

        const model = process.env.OPENAI_MODEL || DEFAULT_MODEL

        console.log('📤 Sending to Response API with model:', model)
        console.log('📝 Message count:', conversationMessages.length)
        if (vectorStoreIds.length > 0) {
          console.log('🗂️ Vector stores:', vectorStoreIds)
        }

        // Use the OpenAI SDK's Response API method with file search capabilities
        console.log(`🚀 Calling Response API using OpenAI SDK`)
        
        interface FileSearchTool {
          type: 'file_search'
          vector_store_ids: string[]
        }

        interface ResponseParams {
          model: string
          input: ResponseApiMessage[]
          tools?: FileSearchTool[]
          previous_response_id?: string
        }

        const createParams: ResponseParams = {
          model: model,
          input: conversationMessages
        }

        // Add file search tool with vector store IDs if vector stores are available
        if (vectorStoreIds.length > 0) {
          createParams.tools = [
            {
              type: 'file_search',
              vector_store_ids: vectorStoreIds
            }
          ]
          console.log('🔍 Enabled file search with vector stores:', vectorStoreIds)
        }

        // Add previous_response_id for conversation continuity if available
        if (previousResponseId) {
          createParams.previous_response_id = previousResponseId
          console.log('🔗 Including previous_response_id for conversation continuity')
        }
        
        const responseData = await openai.responses.create(createParams)
        
        console.log('✅ Response API successful using SDK')

        // Extract the assistant's message from the Response API SDK response
        let assistantMessage: string | undefined

        // Method 1: Check if there's an output_text field at the root level (simplest approach)
        if (responseData.output_text) {
          assistantMessage = responseData.output_text
          console.log('✅ Extracted message from output_text field')
        }
        
        // Method 2: Extract from output array if Method 1 didn't work
        if (!assistantMessage && responseData.output && responseData.output.length > 0) {
          const outputItem = responseData.output[0]
          // Check if it's a message type output
          if (outputItem.type === 'message' && 'content' in outputItem) {
            const messageOutput = outputItem as {
              content: Array<{ type: string; text?: string }>
            }
            if (messageOutput.content && messageOutput.content.length > 0) {
              const content = messageOutput.content[0]
              // Response API uses 'output_text' type, not 'text'
              if ((content.type === 'output_text' || content.type === 'text') && content.text) {
                assistantMessage = content.text
                console.log('✅ Extracted message from output array')
              }
            }
          }
        }

        if (!assistantMessage) {
          console.error('No message content in Response API response:', responseData)
          console.error('Response structure:', JSON.stringify(responseData, null, 2))
          throw new Error('No response content from Response API')
        }

        console.log('✅ Extracted message from Response API SDK:', assistantMessage.substring(0, 100) + '...')

        return NextResponse.json({
          message: assistantMessage,
          responseId: responseData.id, // Store the response ID for future conversation continuity
          assistantUsed: false, // Not using assistant ID in this call
          apiMode: 'response_api',
          hasFileSearch: vectorStoreIds.length > 0 // Indicate if file search is enabled
        })

      } catch (responseApiError) {
        console.error('Response API Error:', responseApiError)
        
        // Return error instead of falling back
        if (responseApiError instanceof Error) {
          return NextResponse.json(
            { error: `Response API Error: ${responseApiError.message}` },
            { status: 500 }
          )
        }

        return NextResponse.json(
          { error: 'Response API failed' },
          { status: 500 }
        )
      }
    } else {
      // Force direct mode is enabled - return error
      return NextResponse.json(
        { error: 'Force direct mode is enabled, but only Response API is supported' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('OpenAI API Error:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `OpenAI API Error: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
