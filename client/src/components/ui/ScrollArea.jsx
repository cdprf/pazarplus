import React from "react";

const ScrollArea = React.forwardRef(
  ({ className = "", children, ...props }, ref) => (
    <div
      ref={ref}
      className={`
        relative overflow-hidden
        ${className}
      `.trim()}
      {...props}
    >
      <div className="h-full w-full overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {children}
      </div>
    </div>
  )
);

ScrollArea.displayName = "ScrollArea";

export { ScrollArea };
