import React from 'react';
import { Button, TextInput } from '@patternfly/react-core';

const QueryForm = ({ userInput, setUserInput, onSubmit }) => {
  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <>
      <div className="mb-4">
        <TextInput
          type="text"
          aria-label="Ask a question"
          placeholder="Ask a question..."
          value={userInput}
          onChange={(_event, value) => setUserInput(value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      <div className="flex items-center justify-center mb-4">
        <Button variant="primary" onClick={onSubmit}>
          Submit
        </Button>
      </div>
    </>
  );
};

export default QueryForm;
