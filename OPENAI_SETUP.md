# OpenAI Integration Setup

This guide will help you set up OpenAI integration for your chat assistant.

## Required Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# Required: Your OpenAI API key
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Specific OpenAI model (defaults to gpt-4)
OPENAI_MODEL=gpt-4

# Optional: If you want to use a custom OpenAI Assistant
OPENAI_ASSISTANT_ID=your_assistant_id_here

# Optional: Organization ID (only if you have one)
OPENAI_ORGANIZATION_ID=your_organization_id_here
```

## How to Get Your Credentials

### 1. OpenAI API Key (Required)
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign in or create an account
3. Navigate to API Keys section
4. Click "Create new secret key"
5. Copy the key and paste it as `OPENAI_API_KEY` in your `.env.local` file

### 2. OpenAI Assistant ID (Optional)
If you want to use a custom assistant instead of the default chat completion:

1. Go to [OpenAI Assistants](https://platform.openai.com/assistants)
2. Create a new assistant or use an existing one
3. Configure your assistant with:
   - **Instructions**: How the assistant should behave
   - **Model**: Choose GPT-4, GPT-3.5-turbo, etc.
   - **Tools**: Code interpreter, retrieval, functions
   - **Files**: Upload knowledge base files
4. Copy the Assistant ID (starts with `asst_`) from the assistant page
5. Add it as `OPENAI_ASSISTANT_ID` in your `.env.local` file

**Example Assistant Setup:**
```
Name: Peter's Coding Assistant
Instructions: You are a helpful coding assistant specialized in Next.js, React, and TypeScript. Always provide practical, working code examples.
Model: gpt-4
Tools: Code Interpreter
```

### 3. Organization ID (Optional)
Only needed if you're part of an OpenAI organization:

1. Go to [OpenAI Organization Settings](https://platform.openai.com/account/organization)
2. Copy your Organization ID
3. Add it as `OPENAI_ORGANIZATION_ID` in your `.env.local` file

## API Usage

The chat interface intelligently chooses the API based on your configuration:

### **Scenario 1: No Assistant ID (Default)**
- Uses **Chat Completions API** (GPT-4/3.5-turbo)
- Fast, simple responses
- Generic AI assistant behavior

### **Scenario 2: Assistant ID Provided**
- **First tries**: Your custom **Assistants API**
- Uses your trained assistant with custom instructions/knowledge
- **Falls back to**: Chat Completions API if assistant fails
- You'll see logs in browser console showing which API was used

### **How the System Decides:**
1. **If `OPENAI_ASSISTANT_ID` is set** → Tries your custom assistant first
2. **If assistant fails/times out** → Automatically falls back to Chat Completions
3. **If no assistant ID** → Uses Chat Completions directly

## Cost Considerations

- Chat Completions API: Pay per token
- Assistants API: Pay per token + additional costs for assistant features
- Monitor your usage at [OpenAI Usage Dashboard](https://platform.openai.com/usage)

## Troubleshooting

### Common Issues:
1. **"OpenAI API key is not configured"** - Make sure `.env.local` exists and contains `OPENAI_API_KEY`
2. **Rate limit errors** - You might need to upgrade your OpenAI plan
3. **Model not found** - Ensure you have access to the specified model (gpt-4, gpt-3.5-turbo, etc.)
4. **"Failed to create assistant run - no run ID returned"** - Your assistant ID might be invalid:
   - Check that `OPENAI_ASSISTANT_ID` starts with `asst_`
   - Verify the assistant exists in your OpenAI account
   - Ensure you have access to the Assistants API
5. **Assistant API falls back to Chat Completions** - Normal behavior if:
   - Assistant is busy or timing out (waits 3 seconds)
   - Assistant ID is invalid
   - You don't have access to the assistant
   - OpenAI SDK compatibility issues

### Environment Variables Loading:
- Restart your development server after adding environment variables
- Ensure `.env.local` is in your project root (same level as `package.json`)
- Never commit your `.env.local` file to version control

## Example .env.local File

```env
OPENAI_API_KEY=sk-proj-abc123xyz789...
OPENAI_MODEL=gpt-4
```

## 🧪 Testing Your Setup

### **Test 1: Basic API Connection**
```env
# .env.local - Just API key
OPENAI_API_KEY=sk-proj-...
```
- Send a message in chat
- Check browser console: Should see `💬 Response from Chat Completions API`

### **Test 2: Custom Assistant**
```env
# .env.local - With assistant
OPENAI_API_KEY=sk-proj-...
OPENAI_ASSISTANT_ID=asst_...
```
- Send a message in chat
- Check browser console for:
  - `✅ Response from custom OpenAI Assistant` (success)
  - `⚠️ Fell back to Chat Completions API` (fallback)

### **Monitoring Console Logs**
Open browser dev tools (F12) → Console tab to see:
- Which API is being used
- Any errors or fallbacks
- Assistant performance info

### **Debugging Assistant Issues**
If your assistant isn't working, check the console for:
- `Using Assistant API with ID: asst_...` - Confirms assistant ID is detected
- `Thread created: thread_...` - Thread creation successful
- `Message added to thread` - Message was added
- `Assistant run created successfully: run_...` - Run started
- `✅ Response from custom OpenAI Assistant` - Success!

**Common Error Messages:**
- `Invalid assistant ID format` → Check your assistant ID starts with `asst_`
- `Failed to create assistant run` → Assistant doesn't exist or you lack access
- `⚠️ Fell back to Chat Completions API` → Assistant failed, using backup

That's it! Your chat assistant should now be powered by OpenAI's API with smart fallback support!
