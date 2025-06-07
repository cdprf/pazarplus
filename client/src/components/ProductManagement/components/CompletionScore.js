import React from "react";
import { BarChart3 } from "lucide-react";

const CompletionScore = ({ score = 0, className = "" }) => {
  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600 bg-green-100";
    if (score >= 60) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return "Yüksek";
    if (score >= 60) return "Orta";
    return "Düşük";
  };

  return (
    <div
      className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(
        score
      )} ${className}`}
    >
      <span>{getScoreLabel(score)}</span>
      <BarChart3 className="h-3 w-3" />
    </div>
  );
};

export default CompletionScore;
