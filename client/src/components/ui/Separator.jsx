import React from "react";

const Separator = React.forwardRef(
  (
    { className = "", orientation = "horizontal", decorative = true, ...props },
    ref
  ) => (
    <div
      ref={ref}
      role={decorative ? "none" : "separator"}
      aria-orientation={orientation}
      className={`
        ${
          orientation === "horizontal"
            ? "h-px w-full bg-gray-200"
            : "w-px h-full bg-gray-200"
        }
        ${className}
      `.trim()}
      {...props}
    />
  )
);

Separator.displayName = "Separator";

export { Separator };
