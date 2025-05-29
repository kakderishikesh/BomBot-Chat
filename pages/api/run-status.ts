import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY! 
});

interface RunStatusRequest {
  threadId: string;
  runId: string;
}

// Function to execute function calls
async function executeFunctionCall(functionName: string, args: any, baseUrl: string) {
  try {
    switch (functionName) {
      case 'query_package_vulnerabilities':
        const packageResponse = await fetch(`${baseUrl}/api/osv-query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: args.name,
            ecosystem: args.ecosystem,
            version: args.version
          })
        });
        
        if (!packageResponse.ok) {
          throw new Error(`Package query failed: ${packageResponse.status}`);
        }
        
        const packageData = await packageResponse.json();
        return JSON.stringify(packageData.result || packageData);

      case 'query_cve_details':
        const cveResponse = await fetch(`${baseUrl}/api/osv-query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cve: args.cve_id
          })
        });
        
        if (!cveResponse.ok) {
          throw new Error(`CVE query failed: ${cveResponse.status}`);
        }
        
        const cveData = await cveResponse.json();
        return JSON.stringify(cveData.result || cveData);

      case 'analyze_sbom_package':
        // This function analyzes data already in the conversation context
        // The Assistant will use this to focus on specific packages from uploaded SBOM
        return JSON.stringify({
          message: `Analyzing package '${args.package_name}' from the uploaded SBOM data. Please refer to the scan results in our conversation for detailed analysis.`,
          package_name: args.package_name,
          include_dependencies: args.include_dependencies || false,
          action: "analyze_uploaded_data"
        });

      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  } catch (error) {
    console.error(`Function execution error for ${functionName}:`, error);
    throw error;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { threadId, runId } = req.query as { threadId: string; runId: string };

  if (!threadId || !runId) {
    return res.status(400).json({ 
      error: 'Both threadId and runId are required' 
    });
  }

  try {
    // Get the run status
    const run = await openai.beta.threads.runs.retrieve(threadId, runId);

    if (run.status === 'requires_action' && run.required_action?.type === 'submit_tool_outputs') {
      // Handle function calls
      const toolCalls = run.required_action.submit_tool_outputs.tool_calls;
      const toolOutputs = [];

      // Get base URL for internal API calls
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers.host;
      const baseUrl = `${protocol}://${host}`;

      for (const toolCall of toolCalls) {
        try {
          const functionName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);
          
          console.log(`Executing function: ${functionName} with args:`, args);
          
          const result = await executeFunctionCall(functionName, args, baseUrl);
          
          toolOutputs.push({
            tool_call_id: toolCall.id,
            output: result
          });
        } catch (error) {
          console.error('Tool execution error:', error);
          toolOutputs.push({
            tool_call_id: toolCall.id,
            output: JSON.stringify({ 
              error: error instanceof Error ? error.message : 'Function execution failed',
              success: false 
            })
          });
        }
      }

      // Submit tool outputs
      await openai.beta.threads.runs.submitToolOutputs(threadId, runId, {
        tool_outputs: toolOutputs
      });

      return res.status(200).json({
        status: 'requires_action',
        completed: false,
        action: 'tool_outputs_submitted',
        tool_calls: toolCalls.length,
        run: {
          id: run.id,
          created_at: run.created_at
        }
      });
    }

    if (run.status === 'completed') {
      // If completed, get the messages from the thread
      const messages = await openai.beta.threads.messages.list(threadId, {
        order: 'desc',
        limit: 10
      });

      // Find the assistant's response (most recent message from assistant)
      const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
      
      let responseText = '';
      if (assistantMessage && assistantMessage.content[0].type === 'text') {
        responseText = assistantMessage.content[0].text.value;
      }

      return res.status(200).json({
        status: run.status,
        completed: true,
        response: responseText,
        run: {
          id: run.id,
          created_at: run.created_at,
          completed_at: run.completed_at,
          model: run.model,
          usage: run.usage
        }
      });
    } else if (run.status === 'failed') {
      return res.status(200).json({
        status: run.status,
        completed: true,
        error: run.last_error?.message || 'Run failed with unknown error',
        run: {
          id: run.id,
          created_at: run.created_at,
          failed_at: run.failed_at,
          last_error: run.last_error
        }
      });
    } else {
      // Still running or in queue
      return res.status(200).json({
        status: run.status,
        completed: false,
        run: {
          id: run.id,
          created_at: run.created_at,
          started_at: run.started_at
        }
      });
    }

  } catch (error) {
    console.error('Run status check error:', error);
    res.status(500).json({ 
      error: 'Failed to check run status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 