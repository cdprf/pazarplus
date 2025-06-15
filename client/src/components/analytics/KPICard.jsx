import React from "react";
import { Card } from "react-bootstrap";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from "@heroicons/react/24/outline";

const KPICard = ({
  title,
  value,
  change,
  icon: IconComponent,
  color = "primary",
}) => {
  const getTrendIcon = () => {
    if (change > 0)
      return <ArrowTrendingUpIcon className="h-4 w-4 text-success" />;
    if (change < 0)
      return <ArrowTrendingDownIcon className="h-4 w-4 text-danger" />;
    return null;
  };

  const getTrendColor = () => {
    if (change > 0) return "text-success";
    if (change < 0) return "text-danger";
    return "text-muted";
  };

  return (
    <Card className="mb-3">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h6 className="card-subtitle mb-2 text-muted">{title}</h6>
            <h4 className="card-title mb-1">{value}</h4>
            {change !== undefined && change !== null && (
              <div className={`d-flex align-items-center ${getTrendColor()}`}>
                {getTrendIcon()}
                <small className="ms-1">
                  {change > 0 ? "+" : ""}
                  {change.toFixed(1)}%
                </small>
              </div>
            )}
          </div>
          {IconComponent && (
            <div className={`text-${color}`}>
              <IconComponent className="h-8 w-8" />
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default KPICard;
