// Debug middleware to trace middleware execution
export function debugMiddleware(name) {
  return (req, res, next) => {
    console.log(`[DEBUG] Entering middleware: ${name} - ${req.method} ${req.path}`);
    const originalSend = res.send;
    res.send = function(data) {
      console.log(`[DEBUG] Response sent from: ${name} - ${req.method} ${req.path}`);
      return originalSend.call(this, data);
    };
    next();
  };
}

export function timeoutMiddleware(name, timeout = 5000) {
  return (req, res, next) => {
    console.log(`[DEBUG] Starting timeout middleware: ${name}`);
    const timer = setTimeout(() => {
      console.log(`[DEBUG] TIMEOUT in middleware: ${name} - ${req.method} ${req.path}`);
    }, timeout);
    
    res.on('finish', () => {
      clearTimeout(timer);
      console.log(`[DEBUG] Request completed in: ${name}`);
    });
    
    next();
  };
}
