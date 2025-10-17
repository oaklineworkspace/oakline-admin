
import React from 'react';

export const StepIndicator = ({ currentStep, totalSteps, steps }) => {
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;
        
        return (
          <div key={index} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              isActive ? 'border-blue-500 bg-blue-500 text-white' :
              isCompleted ? 'border-green-500 bg-green-500 text-white' :
              'border-gray-300 bg-white text-gray-500'
            }`}>
              {isCompleted ? '✓' : stepNumber}
            </div>
            <span className={`ml-2 text-sm ${isActive ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
              {step.title}
            </span>
            {index < steps.length - 1 && (
              <div className={`mx-4 h-0.5 w-8 ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
};
