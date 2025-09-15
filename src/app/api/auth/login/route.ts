import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    // Get credentials from environment variables
    const validUsername = process.env.LOGIN_USERNAME
    const validPassword = process.env.LOGIN_PASSWORD

    // Check if credentials are configured
    if (!validUsername || !validPassword) {
      console.error('Login credentials not configured in environment variables')
      return NextResponse.json(
        { success: false, error: 'Authentication not configured' },
        { status: 500 }
      )
    }

    // Validate credentials
    if (username === validUsername && password === validPassword) {
      return NextResponse.json({ 
        success: true, 
        message: 'Login successful' 
      })
    } else {
      // Log failed attempts (without exposing actual credentials)
      console.log(`Failed login attempt for username: ${username}`)
      
      return NextResponse.json(
        { success: false, error: 'Invalid username or password' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
