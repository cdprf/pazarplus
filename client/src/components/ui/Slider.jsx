import React from "react";
import { cn } from "../../utils/cn";

const Slider = React.forwardRef(
  (
    {
      className,
      min = 0,
      max = 100,
      step = 1,
      value = 50,
      onValueChange,
      disabled = false,
      ...props
    },
    ref
  ) => {
    const handleChange = (event) => {
      const newValue = parseInt(event.target.value, 10);
      if (onValueChange) {
        onValueChange([newValue]);
      }
    };

    return (
      <div className="relative flex items-center w-full">
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={Array.isArray(value) ? value[0] : value}
          onChange={handleChange}
          disabled={disabled}
          className={cn(
            "w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider",
            "dark:bg-gray-700",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className
          )}
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${
              (((Array.isArray(value) ? value[0] : value) - min) /
                (max - min)) *
              100
            }%, #e5e7eb ${
              (((Array.isArray(value) ? value[0] : value) - min) /
                (max - min)) *
              100
            }%, #e5e7eb 100%)`,
          }}
          {...props}
        />
        <style jsx>{`
          .slider::-webkit-slider-thumb {
            appearance: none;
            height: 20px;
            width: 20px;
            background: #3b82f6;
            border-radius: 50%;
            cursor: pointer;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }

          .slider::-webkit-slider-thumb:hover {
            background: #2563eb;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          }

          .slider::-moz-range-thumb {
            height: 20px;
            width: 20px;
            background: #3b82f6;
            border-radius: 50%;
            cursor: pointer;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }

          .slider::-moz-range-thumb:hover {
            background: #2563eb;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          }

          .slider:disabled::-webkit-slider-thumb {
            background: #9ca3af;
            cursor: not-allowed;
          }

          .slider:disabled::-moz-range-thumb {
            background: #9ca3af;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    );
  }
);

Slider.displayName = "Slider";

export { Slider };
