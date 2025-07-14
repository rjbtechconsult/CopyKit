(() => {
    let overlay = null;
    let currentElement = null;
    let active = false;
    let copyMode = 'all'; // default

  
    function createOverlay() {
        // Safety: remove any leftover overlays (shouldn't happen, but just in case)
        document.querySelectorAll('#copykit-overlay').forEach(el => el.remove());

        // If it already exists, do nothing
        if (document.getElementById('copykit-overlay')) return;
      
        overlay = document.createElement('div');
        overlay.id = 'copykit-overlay';
      
        Object.assign(overlay.style, {
          position: 'absolute',
          pointerEvents: 'none',
          backgroundColor: 'rgba(0, 123, 255, 0.3)',
          border: '2px dashed #007bff',
          zIndex: '999999',
          boxSizing: 'border-box',
          transition: 'all 0.1s ease',
        });
      
        document.body.appendChild(overlay);
    }      
      
    function removeOverlay() {
        const existing = document.getElementById('copykit-overlay');
        if (existing) {
          existing.remove();
          overlay = null;
        }
    }      
  
    function updateOverlay(el) {
        if (!overlay || !el) return;
      
        const rect = el.getBoundingClientRect();
      
        overlay.style.top = `${window.scrollY + rect.top}px`;
        overlay.style.left = `${window.scrollX + rect.left}px`;
        overlay.style.width = `${rect.width}px`;
        overlay.style.height = `${rect.height}px`;
        overlay.style.display = 'block';
    }      
      
    function getCDNLinks() {
        const origin = location.origin;
      
        return [...document.querySelectorAll('link[rel="stylesheet"]')]
          .map(link => {
            let href = link.getAttribute('href');
            if (!href) return null;
      
            // Convert relative URL to absolute
            if (href.startsWith('/')) {
              href = origin + href;
            } else if (!href.startsWith('http')) {
              href = origin + '/' + href;
            }
      
            return `<link rel="stylesheet" href="${href}">`;
          })
          .filter(Boolean)
          .join('\n');
      }         

    function getAuthorCSSRules(el) {
        const selectors = new Set([...el.classList].map(cls => `.${cls}`));
        if (el.id) selectors.add(`#${el.id}`);
      
        const matchedRules = [];
      
        for (const styleSheet of document.styleSheets) {
          let rules;
          try {
            rules = styleSheet.cssRules;
          } catch (e) {
            continue; // Skip cross-origin stylesheets
          }
      
          for (const rule of rules) {
            if (
              rule.selectorText &&
              [...selectors].some(sel =>
                rule.selectorText.split(',').map(s => s.trim()).includes(sel)
              )
            ) {
              const selector = rule.selectorText;
              const style = rule.style;
              let formatted = `${selector} {\n`;
      
              for (let i = 0; i < style.length; i++) {
                const prop = style[i];
                const val = style.getPropertyValue(prop);
                if (val && val.trim() !== '') {
                  formatted += `  ${prop}: ${val};\n`;
                }
              }
      
              formatted += `}\n`;
              matchedRules.push(formatted);
            }
          }
        }
      
        return matchedRules.join('\n');
    }
  
    window.showToast = function(message) {
        const existing = document.getElementById('copykit-alert');
        if (existing) existing.remove(); // Remove existing toast if present
      
        const toast = document.createElement('div');
        toast.id = 'copykit-alert';
        toast.innerText = message;
        document.body.appendChild(toast);
      
        setTimeout(() => {
          toast.classList.add('fade-out');
          toast.addEventListener('transitionend', () => toast.remove());
        }, 2000); // show for 2s
    };      

    function copyBlock(el) {
        const html = el.outerHTML;
        const css = getAuthorCSSRules(el);
        const cdns = getCDNLinks();
      
        let result = '';
      
        switch (copyMode) {
            case 'html':
                result = html;
                break;
            case 'css':
                result = `<style>\n${css}</style>`;
                break;
            case 'css+cdn':
                result = `${cdns}\n\n<style>\n${css}</style>`;
                break;
            case 'cdn':
                result = cdns;
                break;
            case 'all':
            default:
            result = `<style>\n${css}</style>\n\n${html}`;
        }
      
        navigator.clipboard.writeText(result).then(() => {
          showToast('✅ Copied successfully!');
          deactivate();
          chrome.runtime.sendMessage({ action: 'deactivate' });
        });
      }
  
    function onMouseMove(e) {
      if (!active) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el && el !== overlay && el !== currentElement) {
        currentElement = el;
        updateOverlay(el);
      }
    }
  
    function onClick(e) {
      if (!active) return;
      e.preventDefault();
      e.stopPropagation();
      if (currentElement) {
        copyBlock(currentElement);
      }
    }
  
    function activate() {   
        if (active) return;
        active = true;
        createOverlay();
        document.body.style.cursor = 'copy';
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('click', onClick, true);
    }
  
    function deactivate() {
        active = false;
        removeOverlay();
        document.body.style.cursor = '';
        const opts = document.getElementById('copykit-options');
        if (opts) opts.remove();
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('click', onClick, true);
      }

    
      
  
    window.addEventListener('copykit-toggle', (e) => {
        if (e.detail?.activate) {
            copyMode = e.detail.mode || 'all';
            activate();
          } else {
            deactivate();
          }
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && active) {
          console.log('Deactivating copykit via ESC key');
          deactivate();
          chrome.runtime.sendMessage({ action: 'deactivate' });        }
    });
})();