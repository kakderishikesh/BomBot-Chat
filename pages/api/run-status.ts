import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import { supabaseServer } from '@/lib/supabase-server';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY! 
});

interface RunStatusRequest {
  threadId: string;
  runId: string;
  sessionId?: string;
  messageIndex?: number;
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

      case 'query_package_dependencies':
        // This function queries dependency data already in the conversation context
        // The Assistant will use this to focus on dependency relationships from uploaded SBOM
        return JSON.stringify({
          message: `Querying ${args.direction || 'dependencies'} for package '${args.package_name}' from the uploaded SBOM data. Please refer to the package dependency information in our conversation.`,
          package_name: args.package_name,
          direction: args.direction || 'dependencies',
          action: "query_dependency_data"
        });

      case 'query_supply_chain_graph':
        try {
          const supplyChainResponse = await fetch(`${baseUrl}/api/guac-query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              queryType: args.queryType || 'packages',
              filters: args.filters || {},
              returnFormat: 'simplified'
            })
          });
          
          if (!supplyChainResponse.ok) {
            const errorData = await supplyChainResponse.json();
            if (errorData.fallback) {
              return JSON.stringify({
                error: 'Supply chain graph features are not available',
                message: 'GUAC infrastructure is required for supply chain analysis. The system is running in fallback mode with standard SBOM analysis only.',
                fallback: true
              });
            }
            throw new Error(`Supply chain query failed: ${supplyChainResponse.status}`);
          }
          
          const supplyChainData = await supplyChainResponse.json();
          return JSON.stringify(supplyChainData.data || supplyChainData);
        } catch (error) {
          return JSON.stringify({
            error: 'Failed to query supply chain graph',
            message: 'Supply chain features may not be available. Using standard SBOM analysis instead.',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }

      case 'analyze_supply_chain_relationships':
        try {
          const relationshipResponse = await fetch(`${baseUrl}/api/guac-relationships`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              queryType: args.queryType || 'dependencies',
              subject: args.subject,
              options: args.options || {}
            })
          });
          
          if (!relationshipResponse.ok) {
            const errorData = await relationshipResponse.json();
            if (errorData.fallback) {
              return JSON.stringify({
                error: 'Supply chain relationship analysis not available',
                message: 'GUAC infrastructure is required for advanced relationship analysis. Standard dependency analysis from SBOM data is still available.',
                fallback: true
              });
            }
            throw new Error(`Relationship analysis failed: ${relationshipResponse.status}`);
          }
          
          const relationshipData = await relationshipResponse.json();
          return JSON.stringify(relationshipData.summary || relationshipData.data || relationshipData);
        } catch (error) {
          return JSON.stringify({
            error: 'Failed to analyze supply chain relationships',
            message: 'Advanced relationship analysis may not be available. Using SBOM-based dependency analysis instead.',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }

      case 'check_supply_chain_policy':
        // For policy checks, we'll query GUAC for attestations and compliance data
        const policyResponse = await fetch(`${baseUrl}/api/guac-relationships`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            queryType: 'attestations',
            subject: {
              name: args.package_name,
              version: args.package_version,
              type: 'package'
            }
          })
        });
        
        if (!policyResponse.ok) {
          throw new Error(`Policy check failed: ${policyResponse.status}`);
        }
        
        const policyData = await policyResponse.json();
        
        // Enhance with policy analysis
        const policyResult = {
          ...policyData,
          policyCheck: {
            type: args.policy_type,
            package: args.package_name,
            version: args.package_version,
            requirements: {
              minSlsaLevel: args.min_slsa_level || 1,
              requireSignatures: args.require_signatures || false
            },
            // Simple policy evaluation based on GUAC data
            compliance: {
              hasAttestations: policyData.data?.certifyGood?.length > 0,
              hasScorecard: policyData.data?.scorecards?.length > 0,
              hasNegativeFindings: policyData.data?.certifyBad?.length > 0
            }
          }
        };
        
        return JSON.stringify(policyResult);

      case 'compare_sbom_versions':
        // For SBOM comparison, we need to query GUAC for historical data
        const comparisonResponse = await fetch(`${baseUrl}/api/guac-query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            queryType: 'relationships',
            filters: {
              packageName: args.package_filter
            }
          })
        });
        
        if (!comparisonResponse.ok) {
          throw new Error(`SBOM comparison failed: ${comparisonResponse.status}`);
        }
        
        const comparisonData = await comparisonResponse.json();
        
        // Enhance with comparison analysis
        const comparisonResult = {
          ...comparisonData,
          comparison: {
            type: args.comparison_type,
            packageFilter: args.package_filter,
            includeFixed: args.include_fixed !== false,
            showAdditionsOnly: args.show_additions_only || false,
            analysisNote: `Comparison of ${args.comparison_type} based on current GUAC supply chain graph data. Historical comparison requires multiple SBOM ingestions over time.`
          }
        };
        
        return JSON.stringify(comparisonResult);

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

  const { threadId, runId, sessionId, messageIndex } = req.query as { 
    threadId: string; 
    runId: string; 
    sessionId?: string; 
    messageIndex?: string; 
  };

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

      // Log AI response to Supabase if sessionId and messageIndex are provided
      if (sessionId && messageIndex && responseText) {
        try {
          await supabaseServer
            .from('chat_logs')
            .update({
              ai_response: responseText,
              updated_at: new Date().toISOString(),
            })
            .eq('session_id', sessionId)
            .eq('message_index', parseInt(messageIndex));
        } catch (logError) {
          console.error('Error logging AI response:', logError);
          // Continue even if logging fails
        }
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