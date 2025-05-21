import React from 'react';
import { Table, Card, Button } from 'react-bootstrap';
import PropTypes from 'prop-types';

/**
 * AccessibleTable - A responsive and accessible table component
 * following Mozilla and WCAG accessibility guidelines
 */
const AccessibleTable = ({
  columns,
  data,
  isLoading,
  emptyMessage = 'No data available',
  caption,
  variant = 'default',
  responsive = true,
  actions,
  onRowClick,
  selectedRowId,
  tableSummary,
  isSelectable = false
}) => {
  // Generate a unique ID for accessibility attributes
  const tableId = React.useId();

  return (
    <Card className="shadow-sm mb-4">
      {caption && <Card.Header><h3 className="h5 mb-0">{caption}</h3></Card.Header>}
      <div className={responsive ? 'table-responsive' : ''}>
        <Table 
          hover={!!onRowClick || isSelectable} 
          striped={variant === 'striped'} 
          bordered={variant === 'bordered'}
          className="mb-0"
          id={tableId}
          aria-busy={isLoading}
          aria-describedby={tableSummary ? `${tableId}-summary` : undefined}
        >
          {caption && <caption className="visually-hidden">{caption}</caption>}
          {tableSummary && (
            <div id={`${tableId}-summary`} className="visually-hidden" role="note">
              {tableSummary}
            </div>
          )}
          <thead>
            <tr>
              {columns.map((column) => (
                <th 
                  key={column.key} 
                  scope="col" 
                  style={column.width ? { width: column.width } : undefined}
                  className={column.className || ''}
                  aria-sort={column.sortable ? 'none' : undefined}
                >
                  {column.header}
                </th>
              ))}
              {actions && <th scope="col" className="text-end">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((row, rowIndex) => (
                <tr 
                  key={row.id || rowIndex}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={onRowClick ? 'cursor-pointer' : ''}
                  aria-selected={isSelectable && selectedRowId === row.id}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={onRowClick ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onRowClick(row);
                    }
                  } : undefined}
                >
                  {columns.map((column) => (
                    <td key={`${row.id || rowIndex}-${column.key}`} data-label={column.header}>
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                  {actions && (
                    <td className="text-end">
                      {actions.map((action, index) => (
                        <Button
                          key={index}
                          variant={action.variant || 'light'}
                          size="sm"
                          className="me-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            action.onClick(row);
                          }}
                          aria-label={`${action.label} ${row.id || ''}`}
                        >
                          {action.icon && <span className="me-1">{action.icon}</span>}
                          {action.text}
                        </Button>
                      ))}
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-3">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </Card>
  );
};

AccessibleTable.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      header: PropTypes.node.isRequired,
      render: PropTypes.func,
      width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      className: PropTypes.string,
      sortable: PropTypes.bool
    })
  ).isRequired,
  data: PropTypes.array.isRequired,
  isLoading: PropTypes.bool,
  emptyMessage: PropTypes.node,
  caption: PropTypes.node,
  variant: PropTypes.oneOf(['default', 'striped', 'bordered']),
  responsive: PropTypes.bool,
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      text: PropTypes.node,
      icon: PropTypes.node,
      onClick: PropTypes.func.isRequired,
      variant: PropTypes.string,
      label: PropTypes.string.isRequired
    })
  ),
  onRowClick: PropTypes.func,
  selectedRowId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  tableSummary: PropTypes.string,
  isSelectable: PropTypes.bool
};

export default AccessibleTable;