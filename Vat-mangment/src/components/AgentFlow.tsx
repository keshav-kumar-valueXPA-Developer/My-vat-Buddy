import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle2, XCircle, ArrowRight, Database, FileOutput, Search } from 'lucide-react';

interface AgentAction {
  id: string;
  agent: 'DataChecker' | 'Calculation' | 'Critique' | 'Query';
  action: string;
  status: 'pending' | 'success' | 'error';
  timestamp: Date;
  result?: string;
}

export function AgentFlow() {
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [inputData, setInputData] = useState({
    transactions: 0,
    documents: 0,
    lastUpdate: new Date()
  });

  // Simulate agent actions for demonstration
  useEffect(() => {
    const simulateAgentAction = (
      agent: AgentAction['agent'],
      action: string,
      delay: number
    ) => {
      setTimeout(() => {
        setActions(prev => [...prev, {
          id: crypto.randomUUID(),
          agent,
          action,
          status: 'pending',
          timestamp: new Date()
        }]);

        // Simulate completion after 2 seconds
        setTimeout(() => {
          setActions(prev => 
            prev.map(a => 
              a.action === action ? 
                { ...a, status: 'success', result: `Completed ${action}` } : 
                a
            )
          );
        }, 2000);
      }, delay);
    };

    // Simulate a sequence of actions
    simulateAgentAction('DataChecker', 'Validating transaction data', 0);
    simulateAgentAction('Calculation', 'Computing VAT amounts', 3000);
    simulateAgentAction('Query', 'Converting "Show VAT for January" to SQL', 6000);
    simulateAgentAction('Critique', 'Reviewing compliance', 9000);

    // Simulate input data
    setInputData({
      transactions: 156,
      documents: 12,
      lastUpdate: new Date()
    });
  }, []);

  // Get recent actions for a specific agent
  const getRecentActions = (agent: string) => {
    return actions
      .filter(a => a.agent === agent)
      .slice(-1); // Show only the most recent action
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-6">Agent Orchestration Flow</h2>
      
      {/* Agent Flow Diagram */}
      <div className="mb-8">
        {/* Input Data Box */}
        <div className="mb-8 p-4 rounded-lg border-2 border-[#92B6B1] bg-[#92B6B1]/10 w-64 mx-auto">
          <div className="text-center">
            <Database className="h-8 w-8 mx-auto mb-2 text-[#92B6B1]" />
            <h3 className="font-medium">Input Data</h3>
            <div className="mt-2 text-sm">
              <p>Transactions: {inputData.transactions}</p>
              <p>Documents: {inputData.documents}</p>
              <p className="text-xs text-gray-500 mt-1">
                Last updated: {inputData.lastUpdate.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>

        {/* Agents Flow */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="space-y-4">
            {/* Data Checker Agent */}
            <div 
              className={`p-4 rounded-lg border-2 ${
                activeAgent === 'DataChecker' 
                  ? 'border-[#6B8F71] bg-[#6B8F71]/10' 
                  : 'border-gray-200'
              }`}
            >
              <div className="text-center mb-4">
                <Activity className="h-8 w-8 mx-auto mb-2 text-[#6B8F71]" />
                <h3 className="font-medium">DataChecker Agent</h3>
                <p className="text-sm text-gray-500">Validates data integrity</p>
              </div>
              {getRecentActions('DataChecker').map(action => (
                <div 
                  key={action.id}
                  className="flex items-center gap-2 p-2 rounded bg-white/50 text-sm"
                >
                  {action.status === 'pending' && (
                    <Activity className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" />
                  )}
                  {action.status === 'success' && (
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  )}
                  {action.status === 'error' && (
                    <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{action.action}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Calculation Agent */}
            <div 
              className={`p-4 rounded-lg border-2 ${
                activeAgent === 'Calculation' 
                  ? 'border-[#6B8F71] bg-[#6B8F71]/10' 
                  : 'border-gray-200'
              }`}
            >
              <div className="text-center mb-4">
                <Activity className="h-8 w-8 mx-auto mb-2 text-[#6B8F71]" />
                <h3 className="font-medium">Calculation Agent</h3>
                <p className="text-sm text-gray-500">Processes VAT calculations</p>
              </div>
              {getRecentActions('Calculation').map(action => (
                <div 
                  key={action.id}
                  className="flex items-center gap-2 p-2 rounded bg-white/50 text-sm"
                >
                  {action.status === 'pending' && (
                    <Activity className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" />
                  )}
                  {action.status === 'success' && (
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  )}
                  {action.status === 'error' && (
                    <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{action.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {/* Query Agent */}
            <div 
              className={`p-4 rounded-lg border-2 ${
                activeAgent === 'Query' 
                  ? 'border-[#6B8F71] bg-[#6B8F71]/10' 
                  : 'border-gray-200'
              }`}
            >
              <div className="text-center mb-4">
                <Search className="h-8 w-8 mx-auto mb-2 text-[#6B8F71]" />
                <h3 className="font-medium">Query Agent</h3>
                <p className="text-sm text-gray-500">Converts natural language to SQL</p>
              </div>
              {getRecentActions('Query').map(action => (
                <div 
                  key={action.id}
                  className="flex items-center gap-2 p-2 rounded bg-white/50 text-sm"
                >
                  {action.status === 'pending' && (
                    <Activity className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" />
                  )}
                  {action.status === 'success' && (
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  )}
                  {action.status === 'error' && (
                    <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{action.action}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Critique Agent */}
            <div 
              className={`p-4 rounded-lg border-2 ${
                activeAgent === 'Critique' 
                  ? 'border-[#6B8F71] bg-[#6B8F71]/10' 
                  : 'border-gray-200'
              }`}
            >
              <div className="text-center mb-4">
                <Activity className="h-8 w-8 mx-auto mb-2 text-[#6B8F71]" />
                <h3 className="font-medium">Critique Agent</h3>
                <p className="text-sm text-gray-500">Ensures compliance</p>
              </div>
              {getRecentActions('Critique').map(action => (
                <div 
                  key={action.id}
                  className="flex items-center gap-2 p-2 rounded bg-white/50 text-sm"
                >
                  {action.status === 'pending' && (
                    <Activity className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" />
                  )}
                  {action.status === 'success' && (
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  )}
                  {action.status === 'error' && (
                    <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{action.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Output Box */}
        <div className="p-4 rounded-lg border-2 border-[#788AA3] bg-[#788AA3]/10 w-64 mx-auto">
          <div className="text-center">
            <FileOutput className="h-8 w-8 mx-auto mb-2 text-[#788AA3]" />
            <h3 className="font-medium">Output</h3>
            <div className="mt-2 text-sm">
              <p>Net VAT Payable: 12,500 AED</p>
              <p>Compliance Score: 98%</p>
              <p className="text-xs text-gray-500 mt-1">
                Updated: {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}