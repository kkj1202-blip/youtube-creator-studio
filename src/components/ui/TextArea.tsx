'use client';

import React from 'react';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-muted-foreground mb-1.5">
          {label}
        </label>
      )}
      <textarea
        className={`
          w-full bg-card border rounded-lg px-4 py-3 text-foreground 
          placeholder:text-muted focus:outline-none focus:ring-1 transition-all resize-none
          ${error 
            ? 'border-error focus:border-error focus:ring-error' 
            : 'border-border focus:border-primary focus:ring-primary'
          }
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-error">{error}</p>
      )}
    </div>
  );
};

export default TextArea;
