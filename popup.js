document.querySelectorAll('button[data-mode]').forEach(button => {
    button.addEventListener('click', async () => {
      const mode = button.getAttribute('data-mode');
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (mode === 'cdn-only') {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content.js'] // load showToast if not already loaded
            });
          
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
                  .map(link => link.href)
                  .filter(Boolean)
                  .map(href => `<link rel="stylesheet" href="${new URL(href, location.href).href}">`)
                  .join('\n');
          
                if (!links) {
                  alert('⚠️ No CDN stylesheets found.');
                  return;
                }
          
                const textarea = document.createElement('textarea');
                textarea.value = links;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                textarea.remove();
          
                if (window.showToast) {
                  window.showToast('\u2705 CDN links copied to clipboard!');
                } else {
                  alert('\u2705 Copied, but toast function not available.');
                }
              }
            });
          
            window.close();
            return;
        }

        if (mode === 'js-only') {
            // Ensure showToast is available
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content.js']
            });
          
            // Collect and copy <script src="...">
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                try {
                  const scripts = Array.from(document.querySelectorAll('script[src]'))
                    .map(script => script.src)
                    .filter(Boolean)
                    .map(src => `<script src="${new URL(src, location.href).href}"></script>`)
                    .join('\n');
          
                  if (!scripts) {
                    alert('⚠️ No JS scripts found.');
                    return;
                  }
          
                  const textarea = document.createElement('textarea');
                  textarea.value = scripts;
                  textarea.style.position = 'fixed';
                  textarea.style.opacity = '0';
                  document.body.appendChild(textarea);
                  textarea.select();
                  document.execCommand('copy');
                  textarea.remove();
          
                  if (window.showToast) {
                    window.showToast('\u2705 JS links copied!');
                  }
                } catch (err) {
                  alert('❌ Failed to copy JS links.');
                  console.error(err);
                }
              }
            });
          
            window.close();
            return;
        }

        if (mode === 'page-full') {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content.js']
            });
          
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                try {
                  // 🧠 Collect all stylesheet links (converted to absolute URLs)
                  const cdns = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
                    .map(link => {
                      const href = link.href;
                      return href
                        ? `<link rel="stylesheet" href="${new URL(href, location.href).href}">`
                        : null;
                    })
                    .filter(Boolean)
                    .join('\n');
          
                  // 🎨 Collect all <style> tags
                  const styles = Array.from(document.querySelectorAll('style'))
                    .map(tag => tag.outerHTML)
                    .join('\n');
          
                  // 🧱 Get full HTML (head + body)
                  const docType = '<!DOCTYPE html>';
                  const htmlOpen = `<html lang="${document.documentElement.lang || 'en'}">`;
                  const head = document.head.innerHTML;
                  const body = document.body.innerHTML;
                  const fullPage = `${docType}\n${htmlOpen}\n<head>\n${cdns}\n${styles}\n</head>\n<body>\n${body}\n</body>\n</html>`;
          
                  // ✅ Format using <prettified> string (or just line breaks for now)
                  const textarea = document.createElement('textarea');
                  textarea.value = fullPage;
                  textarea.style.position = 'fixed';
                  textarea.style.opacity = '0';
                  document.body.appendChild(textarea);
                  textarea.select();
                  document.execCommand('copy');
                  textarea.remove();
          
                  // ✅ Toast
                  if (window.showToast) {
                    window.showToast('\u2705 Full page copied to clipboard!');
                  }
                } catch (err) {
                  alert('❌ Error copying full page.');
                  console.error(err);
                }
              }
            });
          
            window.close();
            return;
        }
          
          
      // Inject content script
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
  
      // Send activation event with selected mode
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (selectedMode) => {
          window.dispatchEvent(new CustomEvent('copykit-toggle', {
            detail: { activate: true, mode: selectedMode }
          }));
        },
        args: [mode]
      });
  
      window.close(); // Close popup immediately
    });
  });
  