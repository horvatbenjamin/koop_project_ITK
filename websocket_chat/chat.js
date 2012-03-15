  var secureCb;
  var secureCbLabel;
  var wsUri;
  var consoleLog;
  var connectBut;
  var disconnectBut;
  var sendMessage;
  var sendBut;
  var clearLogBut;

  function echoHandlePageLoad()
  {
    if (window.WebSocket)
    {
      document.getElementById("webSocketSupp").style.display = "block";
    }
    else
    {
      document.getElementById("noWebSocketSupp").style.display = "block";
    }

    secureCb = document.getElementById("secureCb");
    secureCb.checked = false;
    secureCb.onclick = toggleTls;

    secureCbLabel = document.getElementById("secureCbLabel")

    wsUri = document.getElementById("wsUri");
    toggleTls();

    connectBut = document.getElementById("connect");
    connectBut.onclick = doConnect;

    disconnectBut = document.getElementById("disconnect");
    disconnectBut.onclick = doDisconnect;

    sendMessage = document.getElementById("sendMessage");

    sendBut = document.getElementById("send");
    sendBut.onclick = doSend;

    consoleLog = document.getElementById("consoleLog");

    clearLogBut = document.getElementById("clearLogBut");
    clearLogBut.onclick = clearLog;

    setGuiConnected(false);

    document.getElementById("disconnect").onclick = doDisconnect;
    document.getElementById("send").onclick = doSend;

  }

  function toggleTls()
  {
    if (secureCb.checked)
    {
      wsUri.value = "wss://localhost:8787";
    }
    else
    {
      wsUri.value = "ws://localhost:8787";
    }
  }

  function doConnect()
  {
    if (window.MozWebSocket)
    {
        logToConsole('<span style="color: red;"><strong>Info:</strong> This browser supports WebSocket using the MozWebSocket constructor</span>');
        window.WebSocket = window.MozWebSocket;
    }
    else if (!window.WebSocket)
    {
        logToConsole('<span style="color: red;"><strong>Error:</strong> This browser does not have support for WebSocket</span>');
        return;
    }

    var uri = wsUri.value;
    if (uri.indexOf("?") == -1) {
        uri += "?encoding=text";
    } else {
        uri += "&encoding=text";
    }
    websocket = new WebSocket(uri);
    websocket.onopen = function(evt) { onOpen(evt) };
    websocket.onclose = function(evt) { onClose(evt) };
    websocket.onmessage = function(evt) { onMessage(evt) };
    websocket.onerror = function(evt) { onError(evt) };
  }

  function doDisconnect()
  {
    websocket.close()
  }

  function doSend()
  {
    var m = {
        sender: "Lilchat",
        type: 1000, //chat message
        message: sendMessage.value
    };
    logToConsole('<span style="color: green;">SENT: ' + sendMessage.value + '</span>');
    websocket.send(JSON.stringify(m));
  }

  function logToConsole(message)
  {
    var pre = document.createElement("p");
    pre.style.wordWrap = "break-word";
    pre.innerHTML = getSecureTag()+message;
    consoleLog.appendChild(pre);

    while (consoleLog.childNodes.length > 50)
    {
      consoleLog.removeChild(consoleLog.firstChild);
    }

    consoleLog.scrollTop = consoleLog.scrollHeight;
  }

  function onOpen(evt)
  {
    logToConsole("CONNECTED");
    setGuiConnected(true);
  }

  function onClose(evt)
  {
    logToConsole("DISCONNECTED");
    setGuiConnected(false);
  }

  function onMessage(evt)
  {
    var message=JSON.parse(evt.data);

    if(message.type == 'welcome') {
      logToConsole("The server welcomes you!");
    }
    else if(message.message) {
      logToConsole('<span style="color: blue;">GOT: ' + message.message + '<br /> FROM: ' + message.sender +' </span>');
    }
  }

  function onError(evt)
  {
    logToConsole('<span style="color: red;">ERROR:</span> ' + evt.data);
  }

  function setGuiConnected(isConnected)
  {
    wsUri.disabled = isConnected;
    connectBut.disabled = isConnected;
    disconnectBut.disabled = !isConnected;
    sendMessage.disabled = !isConnected;
    sendBut.disabled = !isConnected;
    secureCb.disabled = isConnected;
    var labelColor = "black";
    if (isConnected)
    {
      labelColor = "#999999";
    }
     secureCbLabel.style.color = labelColor;
  }

  function clearLog()
  {
    while (consoleLog.childNodes.length > 0)
    {
      consoleLog.removeChild(consoleLog.lastChild);
    }
  }

  function getSecureTag()
  {
    if (secureCb.checked)
    {
      return '<img src="img/tls-lock.png" width="6px" height="9px"> ';
    }
    else
    {
      return '';
    }
  }

  window.addEventListener("load", echoHandlePageLoad, false);
