
import React from 'react';

export const AccountTypeCard = ({ accountType, isSelected, onSelect }) => {
  return (
    <div
      onClick={() => onSelect(accountType.id)}
      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <h3 className="font-semibold text-lg">{accountType.name}</h3>
      <p className="text-gray-600 text-sm mt-1">{accountType.description}</p>
      {accountType.features && (
        <ul className="mt-2 space-y-1">
          {accountType.features.map((feature, index) => (
            <li key={index} className="text-xs text-gray-500">• {feature}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
