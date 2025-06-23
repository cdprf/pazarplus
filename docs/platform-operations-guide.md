# Platform Operations

The Platform Operations page provides a comprehensive interface for managing background tasks and automated order fetching from e-commerce platforms.

## Features

### 🚀 Background Order Fetching

- **Auto Mode**: Automatically fetches orders until reaching the first orders listed on the platform
- **Duration Mode**: Fetches orders for a specific number of days (1-365 days)
- **Smart Stopping**: Option to stop when reaching first orders on platform
- **Rate Limiting**: Built-in delays to respect platform API limits

### 📊 Real-time Monitoring

- Live task progress tracking
- Order processing statistics
- Error reporting and handling
- Platform connection status

### 🎛️ Task Management

- Start/stop background tasks
- View task history and status
- Monitor active tasks
- Detailed progress information

## How to Use

### Starting Background Order Fetching

1. **Navigate to Platform Operations**
   - Go to the sidebar and click "Platform Operations"

2. **Click "Start Order Fetching"**
   - Select a platform connection from the dropdown
   - Choose your fetch mode:
     - **Auto**: Fetches until no more orders are found
     - **Duration**: Fetches for a specific number of days

3. **Configure Options**
   - Set duration (for duration mode)
   - Enable/disable "Stop at first orders" option

4. **Monitor Progress**
   - Watch real-time progress in the tasks table
   - View orders processed and current month being fetched
   - Check for any errors in the task details

### Understanding Fetch Modes

#### Auto Mode (Recommended)

- Starts from the current date and goes backwards month by month
- Stops automatically when no orders are found in a month
- Ideal for initial setup or catching up on historical data
- Platform limitation: Most platforms only provide 1 month of data per API call

#### Duration Mode

- Fetches orders for a specified number of days
- Useful when you know exactly how far back you want to go
- Still respects the 1-month API limitation by making multiple calls

### Platform Limitations

Most e-commerce platforms have the following limitations:

- **1 Month Data Window**: Each API call can only retrieve 1 month of orders
- **Rate Limiting**: APIs have request limits (handled automatically with delays)
- **Historical Data**: Some platforms limit how far back you can fetch orders

### Background Task Process

The system automatically:

1. **Chunks Requests**: Breaks down large date ranges into 1-month chunks
2. **Handles Pagination**: Fetches all orders within each month
3. **Normalizes Data**: Converts platform-specific data to standard format
4. **Stores Orders**: Saves normalized orders to the database
5. **Tracks Progress**: Updates progress and handles errors gracefully
6. **Respects Limits**: Adds delays between requests to avoid rate limiting

### Error Handling

The system provides robust error handling:

- **Connection Errors**: Retries failed API calls
- **Data Validation**: Skips invalid orders with logging
- **Rate Limiting**: Automatically handles rate limit responses
- **Progress Tracking**: Continues processing even if some months fail

### Monitoring and Statistics

#### Task Overview Cards

- **Active Tasks**: Number of currently running tasks
- **Completed**: Number of successfully completed tasks
- **Connections**: Number of active platform connections
- **Total Tasks**: All tasks (active, completed, failed, stopped)

#### Task Table

- **Task Type**: Type of background operation
- **Platform**: Which platform connection is being used
- **Status**: Current status (running, completed, failed, stopped)
- **Progress**: Real-time progress with percentage and details
- **Actions**: Stop running tasks

#### Order Statistics

- **Platform Breakdown**: Orders count by platform
- **Date Ranges**: Oldest and newest orders in system
- **Total Counts**: Overall order statistics

## API Endpoints

The Platform Operations uses the following API endpoints:

### GET `/api/platform-operations/tasks`

Get all background tasks for the authenticated user.

**Query Parameters:**

- `status` - Filter by task status
- `platform` - Filter by platform type
- `limit` - Number of results (default: 50)
- `offset` - Pagination offset (default: 0)

### POST `/api/platform-operations/tasks/order-fetching`

Start a new background order fetching task.

**Request Body:**

```json
{
  "platformConnectionId": "connection-id",
  "mode": "auto|duration",
  "duration": 30,
  "stopAtFirst": true
}
```

### POST `/api/platform-operations/tasks/:taskId/stop`

Stop a running background task.

### GET `/api/platform-operations/connections`

Get all active platform connections for the user.

### GET `/api/platform-operations/stats/orders`

Get order statistics by platform.

## Technical Implementation

### Backend Components

- **PlatformOperationsController**: Handles API endpoints and task management
- **BackgroundTask Model**: Database model for tracking tasks
- **Platform Services**: Integration with platform-specific APIs
- **Task Execution**: Background processing with progress tracking

### Frontend Components

- **PlatformOperations.jsx**: Main React component
- **Real-time Updates**: Automatic refresh every 10 seconds
- **Material-UI Components**: Modern, responsive interface
- **Error Handling**: User-friendly error messages and alerts

### Database Schema

The `background_tasks` table stores:

- Task configuration and status
- Progress tracking data
- Error logs and timestamps
- User and platform association

## Best Practices

1. **Start Small**: Begin with auto mode for initial data import
2. **Monitor Progress**: Keep an eye on tasks during execution
3. **Check Connections**: Ensure platform connections are active before starting
4. **Avoid Duplicates**: Don't start multiple tasks for the same platform simultaneously
5. **Plan Timing**: Run large imports during off-peak hours

## Troubleshooting

### Common Issues

**Task Fails to Start**

- Check if platform connection is active
- Verify no other task is running for the same platform
- Check server logs for detailed error messages

**Slow Progress**

- Normal behavior due to API rate limiting
- Each month requires separate API calls
- Built-in delays prevent exceeding rate limits

**Missing Orders**

- Some platforms have historical data limitations
- Check platform connection credentials
- Verify platform API permissions

**Task Stops Unexpectedly**

- Check for API authentication issues
- Review error logs in task progress
- Platform may have changed API endpoints

### Getting Help

Check the server logs for detailed error information:

```bash
tail -f server/logs/app-$(date +%Y-%m-%d).log
```

The system provides comprehensive logging for debugging and monitoring task execution.
