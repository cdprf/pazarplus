
    // Wait for Swagger UI to load
    window.onload = function() {
      // Check periodically for button
      let checkInterval = setInterval(function() {
        const authorizeBtn = document.querySelector('.swagger-ui .auth-wrapper .authorize');
        if (authorizeBtn) {
          enhanceAuthorizeButton(authorizeBtn);
          clearInterval(checkInterval);
        }
      }, 100);
      
      // Maximum wait time (5 seconds)
      setTimeout(function() {
        clearInterval(checkInterval);
      }, 5000);
    };
    
    // Function to enhance the authorize button
    function enhanceAuthorizeButton(button) {
      // Replace original click handler
      button.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Change button state to loading
        button.classList.add('loading');
        button.innerText = 'Authorizing...';
        
        // Show toast
        showToast('Applying authentication...', 'info');
        
        // Simulate authentication process
        setTimeout(function() {
          // Auto-fill and apply token silently
          if (window.ui) {
            try {
              window.ui.preauthorizeApiKey("bearerAuth", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NDc1NTM2MDgsImV4cCI6MTc0ODE1ODQwOH0.bShRJp3v6QbNZhw4hRlb4nMEQNrAFaPOv-g4cNfXc1U");
              
              // Change button state to success
              button.classList.remove('loading');
              button.classList.add('success');
              button.innerText = 'Authorized';
              
              // Show success toast
              showToast('Successfully authenticated!', 'success');
              
              // Collect and hide any modal that might appear
              const modals = document.querySelectorAll('.swagger-ui .dialog-ux');
              modals.forEach(modal => {
                modal.style.display = 'none';
              });
            } catch (err) {
              // Error handling
              button.classList.remove('loading');
              button.innerText = 'Authorize';
              
              // Show error toast
              showToast('Authentication failed. Try again.', 'error');
              console.error('Auth error:', err);
            }
          } else {
            // Swagger UI instance not found
            button.classList.remove('loading');
            button.innerText = 'Authorize';
            
            // Show error toast
            showToast('Authentication system not initialized', 'error');
          }
        }, 1200);
        
        return false;
      }, { capture: true });
    }
    
    // Toast notification function
    function showToast(message, type) {
      // Remove any existing toast
      const existingToast = document.querySelector('.auth-toast');
      if (existingToast) {
        existingToast.remove();
      }
      
      // Create toast element
      const toast = document.createElement('div');
      toast.className = 'auth-toast ' + type;
      toast.innerText = message;
      document.body.appendChild(toast);
      
      // Show toast
      setTimeout(() => toast.classList.add('show'), 50);
      
      // Hide toast after 3 seconds
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }
  