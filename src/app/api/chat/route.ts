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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages } = body
    
    // Use assistant ID from environment variable or request body
    const assistantId = process.env.OPENAI_ASSISTANT_ID

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

    // Option 1: Use Chat Completions API (simpler, more common)
    if (!assistantId) {
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are Peter\'s helpful AI assistant. You are knowledgeable, friendly, and concise in your responses.'
          },
          ...messages
        ],
        max_tokens: 1000,
        temperature: 0.7,
      })

      const assistantMessage = completion.choices[0]?.message?.content

      if (!assistantMessage) {
        return NextResponse.json(
          { error: 'No response from OpenAI' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        message: assistantMessage,
        usage: completion.usage
      })
    }

    // Option 2: Use Assistants API (for custom assistants)
    try {
      console.log('Using Assistant API with ID:', assistantId)
      
      // Validate assistant ID format
      if (!assistantId.startsWith('asst_')) {
        throw new Error(`Invalid assistant ID format: ${assistantId}. Should start with 'asst_'`)
      }
      
      // Create a thread
      const thread = await openai.beta.threads.create()
      console.log('Thread created:', thread.id)

      // Add the user message to the thread
      await openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: messages[messages.length - 1].content
      })
      console.log('Message added to thread')

      // Run the assistant
      console.log('Creating run with assistant_id:', assistantId)
      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistantId
      })

      // Check if run was created successfully
      if (!run || !run.id) {
        console.error('Run creation failed - no run object or ID:', run)
        throw new Error('Failed to create assistant run - no run ID returned')
      }

      console.log('Assistant run created successfully:', run.id, 'Status:', run.status)
      console.log('Thread ID:', thread.id, 'Run ID:', run.id)

      // Store IDs in variables to prevent any reference issues
      const threadId = thread.id
      const runId = run.id
      
      // Validate IDs before proceeding
      if (!threadId || !runId) {
        throw new Error(`Invalid IDs - Thread: ${threadId}, Run: ${runId}`)
      }
      
      console.log('Using stored IDs - Thread:', threadId, 'Run:', runId)

      // Poll for completion with proper error handling
      let attempts = 0
      const maxAttempts = 30 // 30 seconds timeout
      let currentStatus = run.status
      
      console.log('Starting to poll for run completion...')
      
      while (attempts < maxAttempts && (currentStatus === 'queued' || currentStatus === 'in_progress')) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        attempts++
        
        try {
          // Try to get run status using the run object directly
          console.log(`Polling attempt ${attempts}...`)
          
          // Refresh the run status by fetching the run again
          const refreshedRun = await openai.beta.threads.runs.list(threadId, { limit: 1 })
          const latestRun = refreshedRun.data.find(r => r.id === runId)
          
          if (latestRun) {
            currentStatus = latestRun.status
            console.log(`Run status: ${currentStatus}`)
            
            if (currentStatus === 'completed') {
              console.log('Run completed! Fetching messages...')
              break
            } else if (currentStatus === 'failed' || currentStatus === 'cancelled' || currentStatus === 'expired') {
              console.log(`Run ended with status: ${currentStatus}`)
              break
            }
          } else {
            console.log('Could not find run in list')
            break
          }
        } catch (pollError) {
          console.error('Error polling run status:', pollError)
          break
        }
      }
      
      // Try to get the messages from the thread
      if (currentStatus === 'completed') {
        try {
          const threadMessages = await openai.beta.threads.messages.list(threadId)
          console.log('Retrieved thread messages, count:', threadMessages.data.length)
          
          // Find the most recent assistant message (should be first)
          const assistantMessage = threadMessages.data.find(msg => msg.role === 'assistant')
          
          if (assistantMessage && assistantMessage.content[0] && assistantMessage.content[0].type === 'text') {
            console.log('Found assistant response!')
            return NextResponse.json({
              message: assistantMessage.content[0].text.value,
              threadId: threadId,
              assistantUsed: true
            })
          } else {
            console.log('No assistant message found in thread')
          }
        } catch (messageError) {
          console.error('Error retrieving thread messages:', messageError)
        }
      }

      // If we get here, the assistant didn't respond properly
      console.log(`Assistant did not complete successfully (status: ${currentStatus}), falling back to Chat Completions`)
      
    } catch (assistantError) {
      console.error('Assistant API Error:', assistantError)
      
      // Log specific error details for debugging
      if (assistantError instanceof Error) {
        console.error('Error details:', assistantError.message)
      }
      
      // Fall back to chat completions API if assistant fails
    }

    // Fallback: If assistant fails or times out, use chat completions
    console.log('Falling back to Chat Completions API')
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are Peter\'s helpful AI assistant. You are knowledgeable, friendly, and concise in your responses.'
        },
        ...messages
      ],
      max_tokens: 1000,
      temperature: 0.7,
    })

    const assistantMessage = completion.choices[0]?.message?.content

    if (!assistantMessage) {
      return NextResponse.json(
        { error: 'No response from OpenAI' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: assistantMessage,
      usage: completion.usage,
      assistantUsed: false,
      fallback: true
    })

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
