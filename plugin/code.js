/**
 * Figma CLI Bridge Plugin
 *
 * Safe Mode: Connects to CLI daemon via WebSocket
 * No debug port needed, no patching required.
 */

// Show minimal UI (needed for WebSocket connection)
const bridgeSessionId = `plugin:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
function emitEvent(type, data) {
  try { figma.ui.postMessage({ type: 'event', eventType: type, data }); } catch {}
}

figma.on('selectionchange', () => emitEvent('selection', {
  page: figma.currentPage.name,
  nodes: figma.currentPage.selection.map(n => ({ id: n.id, name: n.name, type: n.type }))
}));
figma.on('documentchange', event => emitEvent('document', {
  total: event.documentChanges.length,
  changes: event.documentChanges.slice(0, 50).map(c => ({ id: c.id, type: c.type, properties: (c.properties || []).slice(0, 20) }))
}));

for (const level of ['log', 'warn', 'error']) {
  const original = console[level].bind(console);
  console[level] = (...args) => {
    emitEvent('console', { type: level, message: args.map(a => {
      try { return typeof a === 'string' ? a : JSON.stringify(a); }
      catch { return String(a); }
    }).join(' ') });
    original(...args);
  };
}
figma.showUI(__html__, {
  width: 160,
  height: 72,
  position: { x: -9999, y: 9999 }  // Bottom-left (push to far left)
});

// Execute code with auto-return and timeout protection
async function executeCode(code, timeoutMs = 25000) {
  let trimmed = code.trim();

  // Don't add return if code already starts with return
  if (!trimmed.startsWith('return ')) {
    const isSimpleExpr = !trimmed.includes(';');
    const isIIFE = trimmed.startsWith('(function') || trimmed.startsWith('(async function');
    const isArrowIIFE = trimmed.startsWith('(() =>') || trimmed.startsWith('(async () =>');

    if (isSimpleExpr || isIIFE || isArrowIIFE) {
      trimmed = `return ${trimmed}`;
    } else {
      const lastSemicolon = trimmed.lastIndexOf(';');
      if (lastSemicolon !== -1) {
        const beforeLast = trimmed.substring(0, lastSemicolon + 1);
        const lastStmt = trimmed.substring(lastSemicolon + 1).trim();
        if (lastStmt && !lastStmt.startsWith('return ')) {
          trimmed = beforeLast + ' return ' + lastStmt;
        }
      }
    }
  }

  // Figma's QuickJS sandbox blocks `new Function` / `new AsyncFunction`.
  // eval() runs in the plugin's main scope where `figma` is already global.
  const execPromise = eval(`(async () => { ${trimmed} })()`);
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Execution timeout (${timeoutMs/1000}s)`)), timeoutMs)
  );

  return Promise.race([execPromise, timeoutPromise]);
}

// Handle messages from UI (WebSocket bridge)
figma.ui.onmessage = async (msg) => {
  // Single eval
  if (msg.type === 'eval') {
    try {
      const result = await executeCode(msg.code);
      figma.ui.postMessage({ type: 'result', id: msg.id, result: result });
    } catch (error) {
      figma.ui.postMessage({ type: 'result', id: msg.id, error: error.message });
    }
  }

  // Batch eval (execute multiple codes in sequence, return all results)
  if (msg.type === 'eval-batch') {
    const results = [];
    for (const code of msg.codes) {
      try {
        const result = await executeCode(code);
        results.push({ success: true, result });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }
    figma.ui.postMessage({ type: 'batch-result', id: msg.id, results: results });
  }

  if (msg.type === 'connected') {
    figma.ui.postMessage({ type: 'file-info', id: bridgeSessionId, fileKey: figma.fileKey || null, title: figma.root.name });
    figma.notify('✓ Figma DS CLI connected', { timeout: 2000 });
  }

  if (msg.type === 'disconnected') {
    figma.notify('Figma DS CLI disconnected', { timeout: 2000 });
  }

  if (msg.type === 'error') {
    figma.notify('Figma DS CLI: ' + msg.message, { error: true });
  }
};

// Keep plugin alive
figma.on('close', () => {
  // Plugin closed
});

console.log('Figma DS CLI plugin started');
