import React, { useState } from 'react';
import {
  CodeBlock,
  CodeBlockCode,
  CodeBlockAction,
  ClipboardCopyButton,
} from '@patternfly/react-core';

const AnalysisSection = ({ analysisContent }) => {
  const [copiedStates, setCopiedStates] = useState({});

  const handleCopyToClipboard = (text, blockId) => {
    navigator.clipboard.writeText(text);
    setCopiedStates((prev) => ({ ...prev, [blockId]: true }));

    // Auto-reset copied state after 2 seconds
    setTimeout(() => {
      setCopiedStates((prev) => ({ ...prev, [blockId]: false }));
    }, 2000);
  };

  const handleTooltipHidden = (blockId) => {
    setCopiedStates((prev) => ({ ...prev, [blockId]: false }));
  };

  // Helper function to properly escape HTML for dangerouslySetInnerHTML
  const escapeHTML = (unsafe) => {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // Process special markdown patterns within text
  const processMarkdown = (text) => {
    let processed = escapeHTML(text);

    // Bold: **text**
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic: *text* or _text_
    processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
    processed = processed.replace(/_(.*?)_/g, '<em>$1</em>');

    // Inline code: `code`
    processed = processed.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Markdown link: [text](url)
    processed = processed.replace(
      /\[(.*?)\]\((https?:\/\/[^\s]+?)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    // Raw URLs (not inside quotes or tags)
    processed = processed.replace(
      /(?<!(href="|src="|>|"|'))(https?:\/\/[^\s<>"']+)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>'
    );

    return processed;
  };

  const formatAnalysisContent = (content) => {
    if (!content) return null;

    // Remove <think> block if present
    const thinkPattern = /<think>([\s\S]*?)<\/think>/;
    const thinkMatch = content.match(thinkPattern);
    let processedContent = content;

    if (thinkMatch) {
      processedContent = content.replace(thinkPattern, thinkMatch[1]);
    }

    // Split by code blocks (```), preserving the delimiters
    const parts = [];
    const codeBlockRegex = /(```[\s\S]*?```)/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(processedContent)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push(processedContent.substring(lastIndex, match.index));
      }

      // Add code block
      parts.push(match[0]);
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < processedContent.length) {
      parts.push(processedContent.substring(lastIndex));
    }

    return parts.map((part, index) => {
      // Code block
      if (part.startsWith('```') && part.endsWith('```')) {
        const withoutDelimiters = part.substring(3, part.length - 3);
        const firstLineEnd = withoutDelimiters.indexOf('\n');

        // Extract language and code
        let language = '';
        let code = withoutDelimiters;

        if (firstLineEnd > 0) {
          // eslint-disable-next-line no-unused-vars
          language = withoutDelimiters.substring(0, firstLineEnd).trim();
          code = withoutDelimiters.substring(firstLineEnd + 1);
        }

        const blockId = `code-block-${index}`;
        const isCopied = copiedStates[blockId] || false;

        const codeBlockActions = (
          <CodeBlockAction>
            <ClipboardCopyButton
              id={`copy-button-${blockId}`}
              textId={blockId}
              aria-label="Copy to clipboard"
              onClick={() => handleCopyToClipboard(code, blockId)}
              exitDelay={isCopied ? 1500 : 600}
              maxWidth="110px"
              variant="plain"
              onTooltipHidden={() => handleTooltipHidden(blockId)}
            >
              {isCopied
                ? 'Successfully copied to clipboard!'
                : 'Copy to clipboard'}
            </ClipboardCopyButton>
          </CodeBlockAction>
        );

        return (
          <div key={`code-${index}`} className="my-4">
            <CodeBlock actions={codeBlockActions}>
              <CodeBlockCode id={blockId}>{code}</CodeBlockCode>
            </CodeBlock>
          </div>
        );
      }

      // Text block
      const lines = part.split('\n');
      const elements = [];
      let listItems = [];
      let currentListType = null;
      // eslint-disable-next-line no-unused-vars
      let listCounter = 1;

      lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) {
          // Empty line - close any open list
          if (listItems.length > 0) {
            elements.push(
              React.createElement(
                currentListType,
                { key: `list-${index}-${i}`, className: 'ml-5 my-2' },
                listItems
              )
            );
            listItems = [];
            currentListType = null;
          }
          // Add an empty paragraph for spacing
          if (i > 0 && i < lines.length - 1) {
            elements.push(
              <div key={`space-${index}-${i}`} className="my-2"></div>
            );
          }
          return;
        }

        // Heading patterns
        const h1Match = trimmed.match(/^#\s+(.+)$/);
        const h2Match = trimmed.match(/^##\s+(.+)$/);
        const h3Match = trimmed.match(/^###\s+(.+)$/);

        if (h1Match) {
          // Close any open list
          if (listItems.length) {
            elements.push(
              React.createElement(
                currentListType,
                { key: `list-${index}-${i}`, className: 'ml-5 my-2' },
                listItems
              )
            );
            listItems = [];
            currentListType = null;
          }

          elements.push(
            <h1
              key={`h1-${index}-${i}`}
              className="text-2xl font-bold my-3"
              dangerouslySetInnerHTML={{ __html: processMarkdown(h1Match[1]) }}
            />
          );
          return;
        }

        if (h2Match) {
          // Close any open list
          if (listItems.length) {
            elements.push(
              React.createElement(
                currentListType,
                { key: `list-${index}-${i}`, className: 'ml-5 my-2' },
                listItems
              )
            );
            listItems = [];
            currentListType = null;
          }

          elements.push(
            <h2
              key={`h2-${index}-${i}`}
              className="text-xl font-bold my-2"
              dangerouslySetInnerHTML={{ __html: processMarkdown(h2Match[1]) }}
            />
          );
          return;
        }

        if (h3Match) {
          // Close any open list
          if (listItems.length) {
            elements.push(
              React.createElement(
                currentListType,
                { key: `list-${index}-${i}`, className: 'ml-5 my-2' },
                listItems
              )
            );
            listItems = [];
            currentListType = null;
          }

          elements.push(
            <h3
              key={`h3-${index}-${i}`}
              className="text-lg font-bold my-2"
              dangerouslySetInnerHTML={{ __html: processMarkdown(h3Match[1]) }}
            />
          );
          return;
        }

        // Numbered list - support different formats like 1. 1) etc.
        const numberedMatch = trimmed.match(/^(\d+)[.\\)]\s+(.+)$/);
        if (numberedMatch) {
          if (currentListType !== 'ol') {
            // End any open list
            if (listItems.length) {
              elements.push(
                React.createElement(
                  currentListType,
                  { key: `list-${index}-${i}`, className: 'ml-5 my-2' },
                  listItems
                )
              );
              listItems = [];
            }
            currentListType = 'ol';
            // Reset counter based on the first number in the list
            listCounter = parseInt(numberedMatch[1], 10);
          }

          listItems.push(
            <li
              key={`li-${index}-${i}`}
              dangerouslySetInnerHTML={{
                __html: processMarkdown(numberedMatch[2]),
              }}
            />
          );
          listCounter++;
          return;
        }

        // Bulleted list - support * - + as bullet markers
        const bulletMatch = trimmed.match(/^([*\-+])\s+(.+)$/);
        if (bulletMatch) {
          if (currentListType !== 'ul') {
            // End any open list
            if (listItems.length) {
              elements.push(
                React.createElement(
                  currentListType,
                  { key: `list-${index}-${i}`, className: 'ml-5 my-2' },
                  listItems
                )
              );
              listItems = [];
            }
            currentListType = 'ul';
          }

          listItems.push(
            <li
              key={`li-${index}-${i}`}
              dangerouslySetInnerHTML={{
                __html: processMarkdown(bulletMatch[2]),
              }}
            />
          );
          return;
        }

        // If we were in a list, close it
        if (listItems.length > 0) {
          elements.push(
            React.createElement(
              currentListType,
              { key: `list-${index}-${i}`, className: 'ml-5 my-2' },
              listItems
            )
          );
          listItems = [];
          currentListType = null;
        }

        // Handle blockquotes
        if (trimmed.startsWith('> ')) {
          elements.push(
            <blockquote
              key={`quote-${index}-${i}`}
              className="border-l-4 border-gray-300 pl-4 py-1 my-2 italic"
              dangerouslySetInnerHTML={{
                __html: processMarkdown(trimmed.substring(2)),
              }}
            />
          );
          return;
        }

        // Regular paragraph
        elements.push(
          <p key={`p-${index}-${i}`} className="my-2">
            <span
              dangerouslySetInnerHTML={{ __html: processMarkdown(trimmed) }}
            />
          </p>
        );
      });

      // Flush remaining list items
      if (listItems.length > 0) {
        elements.push(
          React.createElement(
            currentListType,
            { key: `list-final-${index}`, className: 'ml-5 my-2' },
            listItems
          )
        );
      }

      return (
        <div key={`text-${index}`} className="my-2">
          {elements}
        </div>
      );
    });
  };

  return (
    <div className="analysis-content">
      {formatAnalysisContent(analysisContent)}
    </div>
  );
};

export default AnalysisSection;
