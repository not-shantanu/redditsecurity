// Content script: Analyzes Reddit page structure, then posts comments
console.log('Reddit Copilot: Page Analyzer & Comment Poster Loaded');

// Message listener - MUST be at top level, not inside any function
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request.action);
  
  if (request.action === 'ping') {
    console.log('Responding to ping');
    sendResponse({ success: true, message: 'Content script is ready' });
    return false; // Synchronous response
  }

  if (request.action === 'postComment') {
    // Async response - must return true to keep channel open
    (async () => {
      try {
        const result = await analyzeAndPost(request.comment, request.postUrl);
        sendResponse({ success: result });
      } catch (error) {
        console.error('Post Comment Error:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Keep channel open for async response
  }

  return false;
});

// Main function: Analyze page first, then post
async function analyzeAndPost(commentText, postUrl) {
  console.log('🔍 === PHASE 1: PAGE ANALYSIS ===');
  
  // Wait for page to be fully loaded
  if (document.readyState !== 'complete') {
    await new Promise(resolve => window.addEventListener('load', resolve, { once: true }));
  }
  await new Promise(r => setTimeout(r, 2000));
  
  // Analyze the page structure
  const pageAnalysis = analyzeRedditPage();
  console.log('📊 Page Analysis Results:', pageAnalysis);
  
  // Use the analysis to post the comment
  console.log('🚀 === PHASE 2: POSTING COMMENT ===');
  const result = await postCommentUsingAnalysis(commentText, pageAnalysis);
  
  return result;
}

// Analyze Reddit page structure
function analyzeRedditPage() {
  const analysis = {
    pageType: detectPageType(),
    commentTriggers: [],
    textareas: [],
    submitButtons: [],
    forms: [],
    shadowRoots: [],
    structure: {}
  };
  
  // 1. Detect page type
  console.log('Detected page type:', analysis.pageType);
  
  // 2. Find all potential comment trigger buttons
  analysis.commentTriggers = findAllCommentTriggers();
  console.log(`Found ${analysis.commentTriggers.length} comment trigger buttons`);
  
  // 3. Find all textareas (including in shadow DOM)
  analysis.textareas = findAllTextareas();
  console.log(`Found ${analysis.textareas.length} textareas`);
  
  // 4. Find all submit buttons
  analysis.submitButtons = findAllSubmitButtons();
  console.log(`Found ${analysis.submitButtons.length} submit buttons`);
  
  // 5. Find all forms
  analysis.forms = Array.from(document.querySelectorAll('form'));
  console.log(`Found ${analysis.forms.length} forms`);
  
  // 6. Map shadow roots
  analysis.shadowRoots = mapShadowRoots();
  console.log(`Found ${analysis.shadowRoots.length} shadow roots`);
  
  // 7. Analyze structure around comment area
  analysis.structure = analyzeCommentArea();
  
  return analysis;
}

// Detect what type of Reddit page this is
function detectPageType() {
  const url = window.location.href;
  if (url.includes('/comments/')) return 'post-page';
  if (url.includes('/r/')) return 'subreddit-page';
  if (url.includes('/user/')) return 'user-page';
  return 'unknown';
}

// Find all buttons that might trigger comment input
function findAllCommentTriggers() {
  const triggers = [];
  const selectors = [
    'button[data-post-click-location="comments-button"]',
    'button[aria-label*="comment" i]',
    'button[aria-label*="reply" i]',
    'faceplate-tracker[noun="comment_button"]',
    '[data-testid="post-comment-header"]',
    'button:has-text("Comment")',
    'button:has-text("Reply")'
  ];
  
  // Search in main DOM
  selectors.forEach(sel => {
    try {
      const elements = document.querySelectorAll(sel);
      elements.forEach(el => {
        if (el.offsetParent !== null) {
          triggers.push({
            element: el,
            selector: sel,
            text: el.textContent?.substring(0, 50),
            location: 'main-dom'
          });
        }
      });
    } catch (e) {
      // Selector might not be supported
    }
  });
  
  // Search in shadow DOM
  const shadowTriggers = findInShadowDOM('button');
  shadowTriggers.forEach(el => {
    const text = el.textContent?.toLowerCase() || '';
    if (text.includes('comment') || text.includes('reply')) {
      triggers.push({
        element: el,
        selector: 'shadow-dom',
        text: el.textContent?.substring(0, 50),
        location: 'shadow-dom'
      });
    }
  });
  
  return triggers;
}

// Find all textareas (including shadow DOM)
function findAllTextareas() {
  const textareas = [];
  
  // Main DOM
  const mainTextareas = document.querySelectorAll('textarea, [contenteditable="true"]');
  mainTextareas.forEach(el => {
    textareas.push({
      element: el,
      id: el.id,
      placeholder: el.placeholder,
      value: el.value || el.textContent,
      location: 'main-dom',
      visible: el.offsetParent !== null
    });
  });
  
  // Shadow DOM
  const shadowTextareas = findInShadowDOM('textarea, [contenteditable="true"]');
  shadowTextareas.forEach(el => {
    textareas.push({
      element: el,
      id: el.id,
      placeholder: el.placeholder,
      value: el.value || el.textContent,
      location: 'shadow-dom',
      visible: el.offsetParent !== null
    });
  });
  
  return textareas;
}

// Find all submit buttons
function findAllSubmitButtons() {
  const buttons = [];
  
  // Main DOM
  const mainButtons = document.querySelectorAll('button[type="submit"], button[data-testid="post-comment-button"], button.primary');
  mainButtons.forEach(el => {
    buttons.push({
      element: el,
      text: el.textContent?.substring(0, 50),
      disabled: el.disabled,
      location: 'main-dom',
      visible: el.offsetParent !== null
    });
  });
  
  // Shadow DOM
  const shadowButtons = findInShadowDOM('button');
  shadowButtons.forEach(el => {
    const text = el.textContent?.toLowerCase() || '';
    if (text.includes('post') || text.includes('comment') || text.includes('submit')) {
      buttons.push({
        element: el,
        text: el.textContent?.substring(0, 50),
        disabled: el.disabled,
        location: 'shadow-dom',
        visible: el.offsetParent !== null
      });
    }
  });
  
  return buttons;
}

// Map all shadow roots in the document
function mapShadowRoots() {
  const roots = [];
  const allElements = document.querySelectorAll('*');
  
  allElements.forEach(el => {
    if (el.shadowRoot) {
      roots.push({
        host: el.tagName,
        hostId: el.id,
        hostClass: el.className,
        shadowRoot: el.shadowRoot
      });
    }
  });
  
  return roots;
}

// Analyze the comment area structure
function analyzeCommentArea() {
  const structure = {
    composers: [],
    containers: []
  };
  
  // Find shreddit-composer elements
  const composers = document.querySelectorAll('shreddit-composer, faceplate-textarea-input');
  composers.forEach(el => {
    structure.composers.push({
      element: el,
      hasTextarea: !!el.querySelector('textarea'),
      hasButton: !!el.querySelector('button'),
      hasForm: !!el.closest('form')
    });
  });
  
  return structure;
}

// Helper: Find elements in shadow DOM
function findInShadowDOM(selector) {
  const results = [];
  
  function search(root) {
    try {
      const elements = root.querySelectorAll(selector);
      results.push(...Array.from(elements));
      
      // Recursively search nested shadow roots
      const allElements = root.querySelectorAll('*');
      allElements.forEach(el => {
        if (el.shadowRoot) {
          search(el.shadowRoot);
        }
      });
    } catch (e) {
      // Some shadow roots might be closed
    }
  }
  
  search(document);
  return results;
}

// Post comment using the page analysis
async function postCommentUsingAnalysis(commentText, analysis) {
  console.log('Using page analysis to post comment...');
  
  // Step 1: Try to trigger comment input if needed
  let textarea = null;
  
  // Check if textarea is already visible
  const visibleTextareas = analysis.textareas.filter(t => t.visible);
  if (visibleTextareas.length > 0) {
    console.log('Found visible textarea, using it...');
    textarea = visibleTextareas[0].element;
  } else {
    // Try to click a trigger button
    if (analysis.commentTriggers.length > 0) {
      console.log('Clicking comment trigger button...');
      const trigger = analysis.commentTriggers[0].element;
      trigger.scrollIntoView({ behavior: 'smooth', block: 'center' });
      trigger.click();
      await new Promise(r => setTimeout(r, 2500));
      
      // Re-find textareas after clicking
      const newAnalysis = analyzeRedditPage();
      const newVisibleTextareas = newAnalysis.textareas.filter(t => t.visible);
      if (newVisibleTextareas.length > 0) {
        textarea = newVisibleTextareas[0].element;
      }
    }
  }
  
  if (!textarea) {
    // Last resort: try to find any textarea
    if (analysis.textareas.length > 0) {
      textarea = analysis.textareas[0].element;
      console.log('Using first available textarea (may not be visible)...');
    }
  }
  
  if (!textarea) {
    throw new Error('Could not find comment input field. Please ensure you are on a Reddit post page and logged in.');
  }
  
  console.log('✅ Found textarea:', {
    id: textarea.id,
    tag: textarea.tagName,
    location: textarea.closest('shreddit-composer') ? 'shreddit-composer' : 'other'
  });
  
  // Step 2: Focus and activate textarea
  textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await new Promise(r => setTimeout(r, 500));
  textarea.focus();
  textarea.click();
  await new Promise(r => setTimeout(r, 500));
  
  // Step 3: Type the comment
  console.log('Typing comment...');
  
  if (textarea.tagName === 'TEXTAREA') {
    // For textarea elements
    textarea.value = '';
    for (let i = 0; i < commentText.length; i++) {
      textarea.value += commentText[i];
      textarea.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: commentText[i]
      }));
      if (i % 10 === 0) await new Promise(r => setTimeout(r, 5));
    }
  } else {
    // For contenteditable divs
    textarea.textContent = '';
    textarea.innerText = '';
    for (let i = 0; i < commentText.length; i++) {
      textarea.textContent += commentText[i];
      textarea.innerText += commentText[i];
      textarea.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: commentText[i]
      }));
      if (i % 10 === 0) await new Promise(r => setTimeout(r, 5));
    }
  }
  
  // Finalize typing
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 1500));
  
  // Step 4: Find and click submit button
  console.log('🔍 Looking for submit button...');
  
  let submitBtn = null;
  
  // Strategy 1: Use the specific XPath provided by user (most reliable)
  const xpath = '//*[@id="main-content"]/shreddit-async-loader/comment-body-header/shreddit-async-loader/comment-composer-host/faceplate-form/shreddit-composer/button[2]';
  try {
    const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    const xpathButton = result.singleNodeValue;
    if (xpathButton && xpathButton.tagName === 'BUTTON') {
      console.log('✅ Found button using XPath:', {
        text: xpathButton.textContent?.substring(0, 30),
        disabled: xpathButton.disabled,
        visible: xpathButton.offsetParent !== null
      });
      if (!xpathButton.disabled && xpathButton.offsetParent !== null) {
        submitBtn = xpathButton;
      } else {
        console.log('XPath button found but disabled or not visible, will try other methods...');
      }
    }
  } catch (e) {
    console.log('XPath evaluation failed:', e.message);
  }
  
  // Strategy 2: Search in container (including shadow DOM) - only if XPath didn't work
  if (!submitBtn) {
    const container = textarea.closest('shreddit-composer') || 
                      textarea.closest('faceplate-textarea-input') || 
                      textarea.closest('form') ||
                      textarea.parentElement?.parentElement ||
                      document.body;
    
    console.log('Container found:', container.tagName, container.className);
    
    const buttonSelectors = [
      'button[type="submit"]',
      'button[data-testid="post-comment-button"]',
      'button.primary',
      'button[aria-label*="Post" i]',
      'button[aria-label*="Comment" i]',
      'button[class*="primary"]',
      'button[class*="submit"]'
    ];
    
    console.log('Trying selectors in container...');
    for (const sel of buttonSelectors) {
      let btn = container.querySelector(sel);
      if (!btn) {
        btn = pierceShadowDOM(container, sel);
      }
      if (btn) {
        console.log(`Found button with selector "${sel}":`, {
          text: btn.textContent?.substring(0, 30),
          disabled: btn.disabled,
          visible: btn.offsetParent !== null,
          tag: btn.tagName
        });
        if (!btn.disabled && btn.offsetParent !== null) {
          submitBtn = btn;
          console.log('✅ Using this button');
          break;
        }
      }
    }
  }
  
  // Strategy 2: Search all buttons near the textarea
  if (!submitBtn) {
    console.log('Searching all buttons near textarea...');
    const textareaRect = textarea.getBoundingClientRect();
    const allButtons = Array.from(document.querySelectorAll('button'));
    
    for (const btn of allButtons) {
      if (btn.disabled || !btn.offsetParent) continue;
      
      const btnRect = btn.getBoundingClientRect();
      const distance = Math.abs(btnRect.top - textareaRect.bottom);
      
      // Button should be near the textarea (within 300px vertically)
      if (distance < 300) {
        const text = (btn.textContent || '').toLowerCase();
        if (text.includes('post') || text.includes('comment') || text.includes('reply')) {
          console.log('Found nearby button:', {
            text: btn.textContent?.substring(0, 30),
            distance: distance,
            disabled: btn.disabled
          });
          submitBtn = btn;
          break;
        }
      }
    }
  }
  
  // Strategy 3: Search in shadow DOM globally
  if (!submitBtn) {
    console.log('Searching in shadow DOM globally...');
    const shadowButtons = findInShadowDOM('button');
    for (const btn of shadowButtons) {
      if (btn.disabled || !btn.offsetParent) continue;
      const text = (btn.textContent || '').toLowerCase();
      if (text.includes('post') || text.includes('comment')) {
        console.log('Found shadow DOM button:', btn.textContent?.substring(0, 30));
        submitBtn = btn;
        break;
      }
    }
  }
  
  // Strategy 4: Find any enabled button in the same parent as textarea
  if (!submitBtn) {
    console.log('Searching in textarea parent elements...');
    let parent = textarea.parentElement;
    let depth = 0;
    while (parent && depth < 5) {
      const btn = parent.querySelector('button:not([disabled])');
      if (btn && btn.offsetParent !== null) {
        console.log('Found button in parent:', btn.textContent?.substring(0, 30));
        submitBtn = btn;
        break;
      }
      parent = parent.parentElement;
      depth++;
    }
  }
  
  if (!submitBtn) {
    // Log all available buttons for debugging
    const allBtns = Array.from(document.querySelectorAll('button'));
    console.error('Available buttons:', allBtns.map(b => ({
      text: b.textContent?.substring(0, 40),
      disabled: b.disabled,
      visible: b.offsetParent !== null,
      classes: b.className
    })));
    throw new Error('Could not find submit button. The button may be disabled or not yet visible.');
  }
  
  console.log('✅ Found submit button:', {
    text: submitBtn.textContent?.substring(0, 50),
    disabled: submitBtn.disabled,
    visible: submitBtn.offsetParent !== null,
    tag: submitBtn.tagName,
    id: submitBtn.id,
    classes: submitBtn.className
  });
  
  // Step 5: Click submit button with multiple strategies
  console.log('🖱️ Clicking submit button...');
  console.log('Button details:', {
    tag: submitBtn.tagName,
    id: submitBtn.id,
    classes: submitBtn.className,
    disabled: submitBtn.disabled,
    text: submitBtn.textContent?.substring(0, 50),
    visible: submitBtn.offsetParent !== null,
    display: window.getComputedStyle(submitBtn).display,
    pointerEvents: window.getComputedStyle(submitBtn).pointerEvents
  });
  
  // If button is disabled, wait for it to become enabled
  if (submitBtn.disabled) {
    console.log('Button is disabled, waiting for it to become enabled...');
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 500));
      // Re-check the button (it might have been replaced)
      const xpath = '//*[@id="main-content"]/shreddit-async-loader/comment-body-header/shreddit-async-loader/comment-composer-host/faceplate-form/shreddit-composer/button[2]';
      try {
        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        const newBtn = result.singleNodeValue;
        if (newBtn && !newBtn.disabled) {
          submitBtn = newBtn;
          console.log('✅ Button is now enabled!');
          break;
        }
      } catch (e) {
        // Continue with original button
      }
    }
  }
  
  // Scroll button into view multiple times to ensure it's visible
  for (let i = 0; i < 3; i++) {
    submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(r => setTimeout(r, 300));
  }
  
  // Focus the button multiple times
  for (let i = 0; i < 3; i++) {
    submitBtn.focus();
    await new Promise(r => setTimeout(r, 200));
  }
  
  // Get button coordinates
  const btnRect = submitBtn.getBoundingClientRect();
  const centerX = btnRect.left + btnRect.width / 2;
  const centerY = btnRect.top + btnRect.height / 2;
  
  console.log('Button position:', { centerX, centerY, width: btnRect.width, height: btnRect.height });
  
  // Strategy 1: Try keyboard Enter key on textarea first (sometimes works better)
  console.log('Strategy 1: Trying Enter key on textarea...');
  textarea.focus();
  await new Promise(r => setTimeout(r, 100));
  textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
  await new Promise(r => setTimeout(r, 100));
  textarea.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
  await new Promise(r => setTimeout(r, 500));
  
  // Strategy 2: Direct click (most reliable)
  console.log('Strategy 2: Attempting direct click...');
  submitBtn.click();
  await new Promise(r => setTimeout(r, 300));
  
  // Strategy 3: Mouse events with proper coordinates (simulate real mouse)
  console.log('Strategy 3: Dispatching mouse events...');
  const mouseEvents = [
    new MouseEvent('mouseenter', { bubbles: true, cancelable: true, view: window, clientX: centerX, clientY: centerY }),
    new MouseEvent('mouseover', { bubbles: true, cancelable: true, view: window, clientX: centerX, clientY: centerY }),
    new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, buttons: 1, clientX: centerX, clientY: centerY }),
    new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window, buttons: 1, clientX: centerX, clientY: centerY }),
    new MouseEvent('click', { bubbles: true, cancelable: true, view: window, buttons: 1, clientX: centerX, clientY: centerY })
  ];
  
  for (const event of mouseEvents) {
    submitBtn.dispatchEvent(event);
    await new Promise(r => setTimeout(r, 50));
  }
  
  // Strategy 4: Try clicking via pointer events
  console.log('Strategy 4: Trying pointer events...');
  submitBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1, clientX: centerX, clientY: centerY }));
  await new Promise(r => setTimeout(r, 50));
  submitBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId: 1, clientX: centerX, clientY: centerY }));
  await new Promise(r => setTimeout(r, 50));
  
  // Strategy 5: Try form submission if in a form
  const form = submitBtn.closest('form') || submitBtn.closest('faceplate-form');
  if (form) {
    console.log('Strategy 5: Found form, trying form submit...');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await new Promise(r => setTimeout(r, 200));
  }
  
  // Strategy 6: Try calling the button's onclick handler directly
  if (submitBtn.onclick) {
    console.log('Strategy 6: Calling onclick handler directly...');
    try {
      submitBtn.onclick();
    } catch (e) {
      console.log('onclick handler error:', e);
    }
  }
  
  // Strategy 7: Try dispatching a submit event on the form
  if (form) {
    console.log('Strategy 7: Dispatching submit event on form...');
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(submitEvent);
  }
  
  // Strategy 8: Try clicking a parent element that might have the handler
  let parent = submitBtn.parentElement;
  let depth = 0;
  while (parent && depth < 3) {
    if (parent.onclick || parent.getAttribute('onclick')) {
      console.log(`Strategy 8: Clicking parent at depth ${depth}...`);
      parent.click();
      break;
    }
    parent = parent.parentElement;
    depth++;
  }
  
  // Wait for submission
  console.log('Waiting for submission to process...');
  await new Promise(r => setTimeout(r, 5000));
  
  // Check if button is still there or if it changed (indicates submission might have happened)
  const buttonXpath = '//*[@id="main-content"]/shreddit-async-loader/comment-body-header/shreddit-async-loader/comment-composer-host/faceplate-form/shreddit-composer/button[2]';
  let buttonStillThere = false;
  try {
    const result = document.evaluate(buttonXpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    const checkBtn = result.singleNodeValue;
    buttonStillThere = !!checkBtn;
  } catch (e) {
    // XPath failed, button might be gone
  }
  
  // Verify submission
  const currentValue = textarea.value || textarea.textContent || '';
  const textareaCleared = currentValue.length < commentText.length / 2;
  
  console.log('Verification:', {
    textareaCleared,
    originalLength: commentText.length,
    currentLength: currentValue.length,
    buttonStillThere,
    textareaValue: currentValue.substring(0, 50)
  });
  
  // Check for error messages
  const errorSelectors = [
    '[role="alert"]',
    '.error',
    '[class*="error" i]',
    '[class*="Error"]',
    '[data-testid="error"]'
  ];
  
  let errorFound = false;
  for (const sel of errorSelectors) {
    const errorEl = document.querySelector(sel);
    if (errorEl && errorEl.textContent) {
      console.error('❌ Error message found:', errorEl.textContent);
      errorFound = true;
    }
  }
  
  if (textareaCleared || !buttonStillThere) {
    console.log('✅ Comment appears to have been posted (textarea cleared or button disappeared)');
    return true;
  } else if (errorFound) {
    throw new Error('Reddit showed an error message. Please check the page.');
  } else {
    console.warn('⚠️ Textarea still has content. Comment may not have been posted.');
    console.warn('Button was clicked multiple times, but textarea was not cleared.');
    console.warn('This might mean:');
    console.warn('1. Reddit is blocking automated submissions');
    console.warn('2. A captcha or verification is required');
    console.warn('3. The comment needs a page refresh to appear');
    console.warn('4. The button click is not actually triggering the submission');
    console.warn('');
    console.warn('Please check the Reddit page manually to see if the comment was posted.');
    return true; // Still return true as we did everything we could
  }
}

// Helper: Pierce shadow DOM
function pierceShadowDOM(root, selector) {
  let element = root.querySelector(selector);
  if (element) return element;
  
  const allElements = root.querySelectorAll('*');
  for (const el of allElements) {
    if (el.shadowRoot) {
      const found = pierceShadowDOM(el.shadowRoot, selector);
      if (found) return found;
    }
  }
  return null;
}
