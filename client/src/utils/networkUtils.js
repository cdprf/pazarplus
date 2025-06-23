/**
 * Network utilities for handling cross-device PDF access
 * Provides robust URL construction and PDF access methods
 */

/**
 * Get the proper base URL for API calls that works across devices
 * @returns {string} The base URL that should work from any device
 */
export function getNetworkAccessibleBaseURL() {
  // In production, use the current origin
  if (process.env.NODE_ENV === 'production') {
    return window.location.origin;
  }

  // In development, try to determine the network-accessible URL
  const hostname = window.location.hostname;
  
  // If already accessing via IP address, use that
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `${window.location.protocol}//${hostname}:5001`;
  }

  // Check if we have a SERVER_HOST environment variable
  if (process.env.REACT_APP_SERVER_HOST) {
    return `http://${process.env.REACT_APP_SERVER_HOST}:5001`;
  }

  // Try to get the server's network IP from local storage (if previously detected)
  const savedServerIP = localStorage.getItem('server_network_ip');
  if (savedServerIP) {
    return `http://${savedServerIP}:5001`;
  }

  // Fallback to localhost (will only work on the same device)
  return 'http://localhost:5001';
}

/**
 * Detect and save the server's network-accessible IP address
 * This should be called when the app loads successfully
 */
export async function detectAndSaveServerIP() {
  try {
    // If we're already accessing via IP, save it
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '') {
      localStorage.setItem('server_network_ip', hostname);
      return hostname;
    }

    // Try to detect the server's IP via a health check from known network ranges
    const commonIPRanges = [
      '192.168.1.',
      '192.168.0.',
      '10.0.0.',
      '172.16.',
    ];

    for (const range of commonIPRanges) {
      for (let i = 1; i < 255; i++) {
        const ip = `${range}${i}`;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1000);
          
          const response = await fetch(`http://${ip}:5001/api/health`, {
            signal: controller.signal,
            method: 'GET',
            mode: 'cors',
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            localStorage.setItem('server_network_ip', ip);
            console.log(`✅ Detected server IP: ${ip}`);
            return ip;
          }
        } catch (error) {
          // Continue to next IP
          continue;
        }
      }
    }
  } catch (error) {
    console.warn('Could not detect server IP:', error);
  }
  
  return null;
}

/**
 * Construct a proper PDF URL that works across devices
 * @param {string} pdfPath - The PDF path from server response
 * @returns {string} The network-accessible PDF URL
 */
export function constructPDFURL(pdfPath) {
  if (!pdfPath) return null;
  
  // If it's already a full URL, return as-is
  if (pdfPath.startsWith('http')) {
    return pdfPath;
  }
  
  // Get the network-accessible base URL
  const baseURL = getNetworkAccessibleBaseURL();
  
  // Ensure path starts with /
  const normalizedPath = pdfPath.startsWith('/') ? pdfPath : `/${pdfPath}`;
  
  return `${baseURL}${normalizedPath}`;
}

/**
 * Enhanced PDF opening with multiple fallback methods
 * @param {string} pdfUrl - The PDF URL to open
 * @param {string} filename - Optional filename for download fallback
 * @returns {Promise<boolean>} Success status
 */
export async function openPDFWithFallbacks(pdfUrl, filename = 'document.pdf') {
  if (!pdfUrl) {
    throw new Error('PDF URL is required');
  }

  console.log(`🖨️ Attempting to open PDF: ${pdfUrl}`);

  // Method 1: Try standard window.open
  try {
    const pdfWindow = window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    
    if (pdfWindow && !pdfWindow.closed) {
      console.log('✅ PDF opened successfully with window.open');
      
      // Check if window loaded successfully after a delay
      setTimeout(() => {
        try {
          if (pdfWindow.location.href === 'about:blank') {
            console.warn('⚠️ PDF window blank, possible network issue');
            pdfWindow.close();
            // Trigger download fallback
            downloadPDFDirect(pdfUrl, filename);
          }
        } catch (e) {
          // Cross-origin error is expected for successful loads
          console.log('✅ PDF loaded successfully (cross-origin error is normal)');
        }
      }, 2000);
      
      return true;
    }
  } catch (error) {
    console.warn('window.open failed:', error);
  }

  // Method 2: Create invisible link and click
  try {
    console.log('🖨️ Trying alternative link click method');
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('✅ PDF opened with link click method');
    return true;
  } catch (error) {
    console.warn('Link click method failed:', error);
  }

  // Method 3: Direct download fallback
  try {
    console.log('🖨️ Using direct download fallback');
    await downloadPDFDirect(pdfUrl, filename);
    return true;
  } catch (error) {
    console.error('All PDF opening methods failed:', error);
    throw new Error('Failed to open PDF with all available methods');
  }
}

/**
 * Download PDF directly to device
 * @param {string} pdfUrl - The PDF URL
 * @param {string} filename - The filename
 */
async function downloadPDFDirect(pdfUrl, filename) {
  try {
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    
    console.log('✅ PDF downloaded successfully');
  } catch (error) {
    console.error('Direct download failed:', error);
    throw error;
  }
}

/**
 * Test PDF URL accessibility
 * @param {string} pdfUrl - The PDF URL to test
 * @returns {Promise<boolean>} Whether the URL is accessible
 */
export async function testPDFAccessibility(pdfUrl) {
  try {
    const response = await fetch(pdfUrl, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
}
