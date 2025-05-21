import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Card,
  CardBody,
  CardTitle,
  Alert,
  Skeleton,
} from '@patternfly/react-core';
import '@patternfly/react-core/dist/styles/base.css';
import './index.css';

import QueryForm from './components/QueryForm';
import LoadingIndicator from './components/LoadingIndicator';
import AnalysisSection from './components/AnalysisSection';

const SkeletonLoader = () => (
  <div>
    <Skeleton width="25%" screenreaderText="Loading percentage width content" />
    <br />
    <Skeleton width="33%" />
    <br />
    <Skeleton width="50%" />
    <br />
    <Skeleton width="66%" />
    <br />
    <Skeleton width="75%" />
    <br />
    <Skeleton />
  </div>
);
// MCP Client configuration
const MCP_CLIENT_URL = 'http://localhost:3000'; // Update with your MCP client port

export default function App() {
  const [userInput, setUserInput] = useState('');
  const [enableAnalysis, setEnableAnalysis] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);

  // Function to parse MCP response
  const parseResponse = (response) => {
    if (!response) return null;

    return {
      // Extract tool calls
      toolCalls: (
        response.match(/\[Calling tool (.*?) with args (.*?)\]/g) || []
      )
        .map((call) => {
          const match = call.match(/\[Calling tool (.*?) with args (.*?)\]/);
          return match ? { tool: match[1], args: match[2] } : null;
        })
        .filter(Boolean),

      // Extract tool results and analysis sections
      toolResults: response
        .split('Tool result:')
        .slice(1)
        .map((result) => {
          const parts = result.split('Analysis:');
          return {
            result: parts[0].trim(),
            analysis: parts[1]?.trim() || '',
          };
        }),

      // Store the full response
      rawResponse: response,
    };
  };

  // Function to send query to MCP client
  const sendQuery = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${MCP_CLIENT_URL}/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: userInput,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch data');
        }

        const responseData = await response.json();

        // Add the new interaction to conversation history
        setConversationHistory((prevHistory) => [
          ...prevHistory,
          {
            query: userInput,
            response: responseData.response,
            timestamp: new Date().toISOString(),
            parsedResponse: parseResponse(responseData.response),
          },
        ]);

        return responseData;
      } catch (error) {
        setError(
          error.message || 'An error occurred while processing your query'
        );
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
  });

  const handleFormSubmit = () => {
    if (!userInput.trim()) {
      setError('Please enter a query');
      return;
    }

    sendQuery.mutate();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-100">
      <div className="w-full max-w-[756px]">
        {/* Conversation History Display */}
        <div className="space-y-4">
          {conversationHistory.map((interaction, index) => (
            <div key={index} className="mb-6">
              {/* User Query */}
              <Card className="mb-2 border-l-4 border-blue-500">
                <CardBody>
                  <div className="flex items-start">
                    <div className="bg-blue-500 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center mr-3">
                      <span>Q</span>
                    </div>
                    <div className="flex-1">
                      <p className="whitespace-pre-wrap">{interaction.query}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(interaction.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Assistant Response */}
              <Card className="border-l-4 border-green-500">
                <CardBody>
                  <div className="flex items-start">
                    <div className="bg-green-500 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center mr-3">
                      <span>A</span>
                    </div>
                    <div className="flex-1">
                      {/* Display raw response if no structured data found */}
                      {!interaction.parsedResponse?.toolCalls.length &&
                        !interaction.parsedResponse?.toolResults.length && (
                          <div className="bg-gray-50 p-4 rounded whitespace-pre-wrap">
                            {interaction.response}
                          </div>
                        )}

                      {/* Display structured tool calls if found */}
                      {interaction.parsedResponse?.toolCalls.length > 0 && (
                        <div className="mb-6">
                          <h3 className="font-bold text-lg mb-2">
                            Tool Calls:
                          </h3>
                          <div className="space-y-2">
                            {interaction.parsedResponse.toolCalls.map(
                              (call, callIndex) => (
                                <div
                                  key={callIndex}
                                  className="bg-gray-50 p-3 rounded"
                                >
                                  <p className="font-medium">
                                    Tool:{' '}
                                    <span className="text-blue-600">
                                      {call.tool}
                                    </span>
                                  </p>
                                  <p className="mt-1">
                                    Arguments:{' '}
                                    <span className="font-mono">
                                      {call.args}
                                    </span>
                                  </p>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {/* Display tool results and analysis if found */}
                      {interaction.parsedResponse?.toolResults.map(
                        (item, resultIndex) => (
                          <div key={resultIndex}>
                            {item.analysis && (
                              <div className="mt-4">
                                <AnalysisSection
                                  analysisContent={item.analysis}
                                />
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          ))}
        </div>

        {/* Current Loading State */}
        {isLoading && (
          <div className="mt-4">
            <Card className="border-l-4 border-green-500">
              <CardBody>
                <div className="flex items-start">
                  <div className="bg-green-500 text-white p-2 rounded-full h-8 w-8 flex items-center justify-center mr-3">
                    <span>A</span>
                  </div>
                  <div className="flex-1">
                    <SkeletonLoader></SkeletonLoader>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        )}
        {/* Query Form */}
        <div className="flex items-center justify-center my-8">
          <Card className="w-full">
            <CardTitle>Scarlet-Mesh Assistant</CardTitle>
            <CardBody>
              <QueryForm
                userInput={userInput}
                setUserInput={setUserInput}
                enableAnalysis={enableAnalysis}
                setEnableAnalysis={setEnableAnalysis}
                onSubmit={handleFormSubmit}
              />

              {error && (
                <Alert variant="danger" title="Error" className="mt-4">
                  {error}
                </Alert>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
