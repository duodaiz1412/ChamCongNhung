const websocketService = require('../services/websocketService');

function getDeviceStatusSSE(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendStatusUpdate = () => {
    const clientCount = websocketService.getClientCount();
    const data = {
      isConnected: clientCount > 0,
      clientCount: clientCount,
      lastUpdate: new Date().toISOString(),
    };
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  console.log("SSE client connected for device status.");
  sendStatusUpdate();

  const statusChangeListener = () => {
    sendStatusUpdate();
  };

  websocketService.on('statusChange', statusChangeListener);

  const keepAliveInterval = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 20000);

  req.on('close', () => {
    console.log("SSE client disconnected.");
    websocketService.off('statusChange', statusChangeListener);
    clearInterval(keepAliveInterval);
    res.end();
  });

   res.on('error', (err) => {
        console.error("Error on SSE response stream:", err);
        websocketService.off('statusChange', statusChangeListener);
        clearInterval(keepAliveInterval);
        res.end();
    });
}

module.exports = {
  getDeviceStatusSSE,
};