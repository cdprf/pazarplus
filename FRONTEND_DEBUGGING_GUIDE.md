# Frontend Debugging Guide

## Why Frontend Debugging is Different

**Server Code (Node.js)**:
- Runs in Node.js runtime
- Uses `--inspect` flag for debugging
- Direct breakpoints in VS Code

**Frontend Code (React)**:
- Runs in browser environment
- Requires browser debugging tools
- Uses Chrome DevTools Protocol

## Available Debugging Methods

### 1. **VS Code + Chrome Integration** (Recommended)

#### Method A: Launch Configuration
1. Go to Run and Debug (⌘⇧D)
2. Select "Debug React Client (Chrome)"
3. This will:
   - Start React dev server
   - Launch Chrome with debugging enabled
   - Connect VS Code to Chrome

#### Method B: Attach to Running App
1. Start your React app: `npm start` in client folder
2. Open Chrome with debugging: 
   ```bash
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
   ```
3. Navigate to `http://localhost:3000`
4. In VS Code: Run "Attach to Chrome (React)"

### 2. **Browser DevTools** (Always Available)
- Press F12 or ⌘⌥I in Chrome
- Go to Sources tab
- Find your React files under `webpack://`
- Set breakpoints directly in browser

### 3. **Full Stack Debugging**
Use compound configurations:
- "Debug Full Stack Application" - Debugs both server AND client
- "Debug Orders End-to-End" - Debugs order-related server + client code

## Setting Breakpoints in React Code

### In VS Code (when connected to Chrome):
1. Open any React component file
2. Click in the gutter to set breakpoint
3. Interact with your app to trigger the code

### Common Files to Debug:
```
client/src/
├── components/
│   ├── orders/
│   ├── platforms/
│   └── dashboard/
├── pages/
├── services/
└── hooks/
```

## Debugging Tips

### 1. **Enable Source Maps**
✅ Already configured in your `package.json`:
```json
"start": "GENERATE_SOURCEMAP=true react-scripts start"
```

### 2. **Use Console Methods**
```javascript
// In your React components
console.log('Debug data:', data);
console.table(orders);
console.trace('Call stack');
```

### 3. **React Developer Tools**
Install Chrome extension: "React Developer Tools"
- View component tree
- Inspect props and state
- Performance profiling

### 4. **Network Debugging**
- Chrome DevTools → Network tab
- Monitor API calls to your server
- Check request/response data

## Debugging Specific Scenarios

### 1. **Order Management Issues**
```javascript
// In order components, add:
console.log('Orders received:', orders);
console.log('Filter state:', filterState);

// Set breakpoints in:
// - client/src/components/orders/OrderList.js
// - client/src/services/orderService.js
```

### 2. **Platform Connection Issues**
```javascript
// In platform components:
console.log('Platform data:', platformData);

// Debug API calls:
// - client/src/services/platformService.js
```

### 3. **Authentication Issues**
```javascript
// Check auth state:
console.log('User:', user);
console.log('Token:', localStorage.getItem('token'));
```

## VS Code Launch Configurations Available

1. **Debug React Client (Chrome)** - Basic React debugging
2. **Debug Full Stack Application** - Server + Client together
3. **Debug Orders End-to-End** - Order-specific debugging
4. **Debug Platform Integration** - Platform service debugging

## Troubleshooting

### Breakpoints Not Hitting?
1. Ensure source maps are enabled
2. Check Chrome is launched with debugging port
3. Verify VS Code is connected (check debug console)

### Can't Connect to Chrome?
1. Close all Chrome instances
2. Launch Chrome with debugging flag:
   ```bash
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
   ```

### Source Maps Not Working?
1. Clear browser cache
2. Restart React dev server
3. Check `GENERATE_SOURCEMAP=true` is set

## Quick Start Commands

```bash
# Terminal 1: Start server with debugging
cd server && npm run debug

# Terminal 2: Start client with source maps
cd client && npm start

# Then use VS Code "Debug Full Stack Application"
```
