import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as cheerio from 'cheerio';

// Custom scraper requires Node.js runtime
export const runtime = 'nodejs';

function normalizeUrl(url: string): string {
  // Remove whitespace
  url = url.trim();
  
  // Remove trailing slashes
  url = url.replace(/\/+$/, '');
  
  // Add https:// if no protocol is specified
  if (!url.match(/^https?:\/\//i)) {
    url = 'https://' + url;
  }
  
  // Ensure the URL is properly formatted
  try {
    const urlObj = new URL(url);
    return urlObj.href;
  } catch (error) {
    // If URL construction fails, return the normalized string anyway
    // The caller will validate it
    return url;
  }
}

async function scrapeWebsite(url: string): Promise<string> {
  console.log('\n🚀 ========================================');
  console.log('🚀 Starting Custom Website Scraper');
  console.log('🚀 ========================================\n');
  
  const allContent: string[] = [];
  const visitedUrls = new Set<string>();
  const urlsToCrawl: string[] = [];
  const maxPages = 500; // Safety limit
  
  // Validate and normalize base URL
  let baseUrl: URL;
  try {
    baseUrl = new URL(url);
    console.log('📍 Base URL:', baseUrl.href);
    console.log('🌐 Domain:', baseUrl.hostname);
    console.log('📊 Max pages limit:', maxPages);
    console.log('');
  } catch (error: any) {
    console.error('❌ Invalid URL:', url, error);
    throw new Error(`Invalid URL: ${url}. ${error.message}`);
  }
  
  // Normalize URL (remove fragment, trailing slash, etc.)
  function normalizeUrlForCrawl(urlString: string): string {
    try {
      const urlObj = new URL(urlString);
      urlObj.hash = ''; // Remove fragment
      urlObj.search = ''; // Remove query params for now (can add back if needed)
      let path = urlObj.pathname;
      // Remove trailing slash except for root
      if (path.length > 1 && path.endsWith('/')) {
        path = path.slice(0, -1);
      }
      urlObj.pathname = path;
      return urlObj.href;
    } catch (e) {
      return urlString;
    }
  }
  
  // Check if URL should be crawled
  function shouldCrawlUrl(urlString: string): boolean {
    try {
      const urlObj = new URL(urlString);
      
      // Must be same domain
      if (urlObj.hostname !== baseUrl.hostname) {
        console.log(`       ❌ Different hostname: ${urlObj.hostname} vs ${baseUrl.hostname}`);
        return false;
      }
      
      // Skip common non-content paths (but be more lenient)
      const skipPatterns = [
        '/api/', '/ajax/', '/_next/', '/static/', '/assets/', '/cdn/',
        '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.css', '.js',
        '.zip', '.exe', '.dmg', '.mp4', '.mp3', '.avi', '.woff', '.ttf'
      ];
      
      const lowerPath = urlObj.pathname.toLowerCase();
      const lowerHref = urlString.toLowerCase();
      
      // Only skip if it's clearly a file or API endpoint
      const shouldSkip = skipPatterns.some(pattern => 
        lowerPath.includes(pattern) || lowerHref.includes(pattern)
      );
      
      if (shouldSkip) {
        console.log(`       ❌ Matches skip pattern: ${urlString}`);
        return false;
      }
      
      // Allow HTML pages, root paths, and most content paths
      return true;
    } catch (e: any) {
      console.log(`       ❌ URL validation error: ${e.message}`);
      return false;
    }
  }
  
  // Custom page scraper
  async function scrapePage(pageUrl: string): Promise<void> {
    const normalizedUrl = normalizeUrlForCrawl(pageUrl);
    
    // Check if already visited
    if (visitedUrls.has(normalizedUrl)) {
      return;
    }
    
    // Check page limit
    if (visitedUrls.size >= maxPages) {
      console.log(`\n⚠️  Reached max pages limit (${maxPages}), stopping crawl`);
      return;
    }
    
    // Mark as visited
    visitedUrls.add(normalizedUrl);
    const pageNum = visitedUrls.size;
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📄 [${pageNum}] Scraping: ${normalizedUrl}`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      console.log(`  🔍 Fetching page...`);
      const response = await fetch(pageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (!response.ok) {
        console.warn(`  ⚠️  Failed to fetch ${pageUrl}: HTTP ${response.status}`);
        return;
      }

      console.log(`  ✅ Page fetched successfully (${response.status})`);
      const html = await response.text();
      console.log(`  📝 HTML length: ${html.length} characters`);
      const $ = cheerio.load(html);
      console.log(`  🔧 Parsing HTML with Cheerio...`);
      
      // Extract comprehensive page content
      const pageContent: string[] = [];
      console.log(`  📦 Extracting content...`);
      
      // 1. Meta tags and titles (comprehensive)
      const title = $('title').text().trim();
      if (title) {
        pageContent.push(`Page Title (${pageUrl}): ${title}`);
        console.log(`  📌 Title: ${title.substring(0, 60)}...`);
      }
      
      const metaDesc = $('meta[name="description"]').attr('content');
      if (metaDesc) {
        pageContent.push(`Meta Description: ${metaDesc}`);
        console.log(`  📝 Meta Description found`);
      }
      
      const ogDesc = $('meta[property="og:description"]').attr('content');
      if (ogDesc) {
        pageContent.push(`OG Description: ${ogDesc}`);
        console.log(`  📝 OG Description found`);
      }
      
      const ogTitle = $('meta[property="og:title"]').attr('content');
      if (ogTitle) {
        pageContent.push(`OG Title: ${ogTitle}`);
        console.log(`  📝 OG Title found`);
      }
      
      // Extract all meta tags with useful content
      let metaCount = 0;
      $('meta[property^="og:"], meta[name^="twitter:"]').each((_, el) => {
        const content = $(el).attr('content');
        const property = $(el).attr('property') || $(el).attr('name');
        if (content && content.length > 10) {
          pageContent.push(`Meta ${property}: ${content}`);
          metaCount++;
        }
      });
      if (metaCount > 0) console.log(`  🏷️  Found ${metaCount} additional meta tags`);
      
      // 2. Extract main content areas (more comprehensive)
      const mainContent = $('main, article, [role="main"], .main-content, .content, #content').text().trim();
      if (mainContent && mainContent.length > 50) {
        pageContent.push(`Main Content: ${mainContent.substring(0, 5000)}`);
        console.log(`  📄 Main content: ${mainContent.length} chars`);
      }
      
      // Extract body content if main content is small
      if (mainContent.length < 200) {
        const bodyContent = $('body').text().trim();
        if (bodyContent && bodyContent.length > 200) {
          pageContent.push(`Body Content: ${bodyContent.substring(0, 5000)}`);
          console.log(`  📄 Body content: ${bodyContent.length} chars`);
        }
      }
      
      // 3. Extract all headings (h1-h6)
      const headings: string[] = [];
      $('h1, h2, h3, h4, h5, h6').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 0 && text.length < 300) {
          headings.push(text);
        }
      });
      if (headings.length > 0) {
        pageContent.push(`All Headings: ${headings.slice(0, 50).join(' | ')}`);
        console.log(`  📑 Found ${headings.length} headings`);
      }
      
      // 4. Extract paragraphs (more comprehensive)
      const paragraphs: string[] = [];
      $('p').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 30 && text.length < 1000) {
          paragraphs.push(text);
        }
      });
      if (paragraphs.length > 0) {
        pageContent.push(`Paragraphs: ${paragraphs.slice(0, 50).join(' | ')}`);
        console.log(`  📝 Found ${paragraphs.length} paragraphs`);
      }
      
      // 5. Extract list items (more comprehensive)
      const listItems: string[] = [];
      $('li').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 10 && text.length < 500) {
          listItems.push(text);
        }
      });
      if (listItems.length > 0) {
        pageContent.push(`List Items: ${listItems.slice(0, 50).join(' | ')}`);
        console.log(`  📋 Found ${listItems.length} list items`);
      }
      
      // 6. Extract from common sections (expanded list)
      const sections = [
        'hero', 'features', 'about', 'product', 'solution', 'benefits', 
        'pricing', 'testimonials', 'faq', 'services', 'portfolio', 
        'team', 'contact', 'blog', 'news', 'case-studies', 'resources',
        'how-it-works', 'why-us', 'comparison', 'integrations', 'security'
      ];
      let sectionsFound = 0;
      for (const sectionClass of sections) {
        const sectionText = $(`.${sectionClass}, [class*="${sectionClass}"], [id*="${sectionClass}"]`).text().trim();
        if (sectionText && sectionText.length > 100) {
          pageContent.push(`${sectionClass.charAt(0).toUpperCase() + sectionClass.slice(1)} Section: ${sectionText.substring(0, 3000)}`);
          sectionsFound++;
        }
      }
      if (sectionsFound > 0) console.log(`  🎯 Found ${sectionsFound} special sections`);
      
      // 7. Extract from divs with common class patterns
      let featureCount = 0;
      $('[class*="feature"], [class*="benefit"], [class*="value"], [class*="advantage"]').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 50 && text.length < 1000) {
          pageContent.push(`Feature/Benefit: ${text}`);
          featureCount++;
        }
      });
      if (featureCount > 0) console.log(`  ⭐ Found ${featureCount} feature/benefit elements`);
      
      // 8. Extract button and link text (often contains key value props)
      const ctaTexts: string[] = [];
      $('button, a.btn, a[class*="button"], .cta, [class*="cta"]').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 5 && text.length < 100) {
          ctaTexts.push(text);
        }
      });
      if (ctaTexts.length > 0) {
        pageContent.push(`Call-to-Actions: ${ctaTexts.slice(0, 30).join(' | ')}`);
        console.log(`  🔘 Found ${ctaTexts.length} CTAs`);
      }
      
      // 9. Extract from data attributes and structured data
      let dataAttrCount = 0;
      $('[data-content], [data-text], [data-description]').each((_, el) => {
        const content = $(el).attr('data-content') || $(el).attr('data-text') || $(el).attr('data-description');
        if (content && content.length > 20) {
          pageContent.push(`Data Content: ${content.substring(0, 500)}`);
          dataAttrCount++;
        }
      });
      if (dataAttrCount > 0) console.log(`  💾 Found ${dataAttrCount} data attributes`);
      
      // 10. Extract JSON-LD structured data
      let jsonLdCount = 0;
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const jsonContent = $(el).html();
          if (jsonContent) {
            const structuredData = JSON.parse(jsonContent);
            pageContent.push(`Structured Data: ${JSON.stringify(structuredData).substring(0, 2000)}`);
            jsonLdCount++;
          }
        } catch (e) {
          // Invalid JSON, skip
        }
      });
      if (jsonLdCount > 0) console.log(`  📊 Found ${jsonLdCount} JSON-LD structured data blocks`);
      
      if (pageContent.length > 0) {
        allContent.push(`\n=== Page: ${pageUrl} ===\n${pageContent.join('\n\n')}`);
        console.log(`  ✅ Extracted ${pageContent.length} content sections from this page`);
      } else {
        console.log(`  ⚠️  No content extracted from this page`);
      }
      
      // Discover and collect all links from this page
      const discoveredLinks = new Set<string>();
      const rejectedLinks: string[] = [];
      
      console.log(`  🔍 Discovering links on page...`);
      
      // Get raw HTML for advanced parsing
      const rawHtml = $.html();
      
      // Debug: Check if we can find any anchor tags at all
      const allAnchors = $('a');
      console.log(`  🔍 Found ${allAnchors.length} total <a> tags on page`);
      
      // Find all links - try multiple approaches
      const links: Array<{ href: string; text: string }> = [];
      
      // Method 1: Standard href attributes
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim();
        if (href) {
          links.push({ href, text });
        }
      });
      
      // Method 2: Next.js Link components (data attributes)
      $('[data-href], [href], a').each((_, el) => {
        const href = $(el).attr('href') || $(el).attr('data-href') || $(el).attr('data-url');
        const text = $(el).text().trim();
        if (href && href !== '#' && !href.startsWith('javascript:')) {
          links.push({ href, text });
        }
      });
      
      // Method 3: Look for links in script tags (Next.js router data)
      $('script').each((_, el) => {
        const scriptContent = $(el).html() || '';
        // Look for URL patterns in scripts
        const urlMatches = scriptContent.matchAll(/(["'])(\/[^"']+)\1/g);
        for (const match of urlMatches) {
          const path = match[2];
          if (path.length > 1 && !path.includes('_next') && !path.includes('static')) {
            links.push({ href: path, text: '' });
          }
        }
      });
      
      // Method 4: Look for common Next.js navigation patterns
      $('[class*="nav"], [class*="menu"], [class*="link"], nav, header').find('a, [href], [data-href]').each((_, el) => {
        const href = $(el).attr('href') || $(el).attr('data-href');
        const text = $(el).text().trim();
        if (href && href !== '#' && !href.startsWith('javascript:')) {
          links.push({ href, text });
        }
      });
      
      console.log(`  🔍 Found ${links.length} links using standard methods`);
      
      // Method 5: Try to find sitemap or common paths
      const commonPaths = [
        '/about', '/about-us', '/features', '/pricing', '/product', '/products',
        '/solutions', '/services', '/blog', '/contact', '/team', '/careers',
        '/faq', '/help', '/support', '/docs', '/documentation', '/resources',
        '/case-studies', '/testimonials', '/reviews', '/integrations', '/api'
      ];
      
      // Check if these common paths might exist (we'll try them)
      commonPaths.forEach(path => {
        const fullUrl = baseUrl.origin + path;
        const normalized = normalizeUrlForCrawl(fullUrl);
        if (shouldCrawlUrl(normalized) && !visitedUrls.has(normalized)) {
          discoveredLinks.add(normalized);
          console.log(`    ➕ Added common path: ${normalized}`);
        }
      });
      
      let linksFound = 0;
      links.forEach(({ href, text }) => {
        if (href) {
          linksFound++;
          const originalHref = href.trim();
          const linkText = text.substring(0, 30);
          
          console.log(`    🔗 Link ${linksFound}: "${originalHref}" (text: "${linkText}")`);
          
          try {
            // Skip non-HTTP links
            if (originalHref.startsWith('javascript:') || 
                originalHref.startsWith('mailto:') || 
                originalHref.startsWith('tel:') || 
                originalHref.startsWith('#') ||
                originalHref.trim() === '' ||
                originalHref === '/') {
              rejectedLinks.push(`${originalHref} (non-HTTP)`);
              console.log(`       ⏭️  Skipped: Non-HTTP link`);
              return;
            }
            
            // Convert to absolute URL
            let absoluteUrl: string;
            try {
              absoluteUrl = new URL(originalHref, pageUrl).href;
            } catch {
              // If URL constructor fails, try manual construction
              if (originalHref.startsWith('http://') || originalHref.startsWith('https://')) {
                absoluteUrl = originalHref;
              } else if (originalHref.startsWith('//')) {
                absoluteUrl = baseUrl.protocol + originalHref;
              } else if (originalHref.startsWith('/')) {
                absoluteUrl = baseUrl.origin + originalHref;
              } else {
                // Relative URL
                const basePath = pageUrl.substring(0, pageUrl.lastIndexOf('/') + 1);
                absoluteUrl = basePath + originalHref;
              }
            }
            
            console.log(`    🔗 Link ${linksFound}: "${originalHref}" -> "${absoluteUrl}"`);
            
            const normalized = normalizeUrlForCrawl(absoluteUrl);
            console.log(`       Normalized: "${normalized}"`);
            
            // Check domain match
            try {
              const urlObj = new URL(normalized);
              if (urlObj.hostname !== baseUrl.hostname) {
                rejectedLinks.push(`${normalized} (external domain: ${urlObj.hostname})`);
                console.log(`       ❌ Rejected: Different domain`);
                return;
              }
            } catch (e) {
              rejectedLinks.push(`${normalized} (invalid URL)`);
              console.log(`       ❌ Rejected: Invalid URL`);
              return;
            }
            
            // Check if should crawl (skip patterns)
            if (!shouldCrawlUrl(normalized)) {
              rejectedLinks.push(`${normalized} (filtered by skip patterns)`);
              console.log(`       ❌ Rejected: Matches skip pattern`);
              return;
            }
            
            // Add to discovered links
            discoveredLinks.add(normalized);
            console.log(`       ✅ Added to discovered links`);
          } catch (e: any) {
            rejectedLinks.push(`${originalHref} (error: ${e.message})`);
            console.log(`       ❌ Error processing link: ${e.message}`);
          }
        }
      });
      
      // Method 6: Try to find links in the raw HTML with regex (fallback)
      if (links.length === 0) {
        console.log(`  ⚠️  No links found with Cheerio, trying regex on raw HTML...`);
        const htmlContent = rawHtml;
        
        // Look for href attributes
        const hrefRegex = /href\s*=\s*["']([^"']+)["']/gi;
        const matches = Array.from(htmlContent.matchAll(hrefRegex));
        let regexLinks = 0;
        
        for (const match of matches) {
          const href = match[1].trim();
          if (href && 
              !href.startsWith('javascript:') && 
              !href.startsWith('mailto:') && 
              !href.startsWith('tel:') && 
              !href.startsWith('#') &&
              href !== '/' &&
              href.length > 1) {
            regexLinks++;
            console.log(`    🔗 Found via regex: "${href}"`);
            
            // Process this link
            try {
              let absoluteUrl: string;
              try {
                absoluteUrl = new URL(href, pageUrl).href;
              } catch {
                if (href.startsWith('http://') || href.startsWith('https://')) {
                  absoluteUrl = href;
                } else if (href.startsWith('//')) {
                  absoluteUrl = baseUrl.protocol + href;
                } else if (href.startsWith('/')) {
                  absoluteUrl = baseUrl.origin + href;
                } else {
                  const basePath = pageUrl.substring(0, pageUrl.lastIndexOf('/') + 1);
                  absoluteUrl = basePath + href;
                }
              }
              
              const normalized = normalizeUrlForCrawl(absoluteUrl);
              try {
                const urlObj = new URL(normalized);
                if (urlObj.hostname === baseUrl.hostname && shouldCrawlUrl(normalized)) {
                  discoveredLinks.add(normalized);
                  console.log(`       ✅ Added to discovered links: ${normalized}`);
                } else {
                  console.log(`       ❌ Rejected: ${urlObj.hostname !== baseUrl.hostname ? 'Different domain' : 'Skip pattern'}`);
                }
              } catch (e) {
                console.log(`       ❌ Rejected: Invalid URL`);
              }
            } catch (e: any) {
              console.log(`       ❌ Error: ${e.message}`);
            }
          }
        }
        console.log(`  📊 Found ${regexLinks} links via regex`);
      }
      
      // Method 7: Try to fetch sitemap.xml (only on first page)
      if (visitedUrls.size === 1) {
        try {
          console.log(`  🗺️  Attempting to fetch sitemap...`);
          const sitemapUrl = baseUrl.origin + '/sitemap.xml';
          const sitemapResponse = await fetch(sitemapUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          });
          
          if (sitemapResponse.ok) {
            const sitemapText = await sitemapResponse.text();
            const urlMatches = Array.from(sitemapText.matchAll(/<loc>([^<]+)<\/loc>/gi));
            let sitemapLinks = 0;
            for (const match of urlMatches) {
              const sitemapUrl = match[1].trim();
              const normalized = normalizeUrlForCrawl(sitemapUrl);
              try {
                const urlObj = new URL(normalized);
                if (urlObj.hostname === baseUrl.hostname && shouldCrawlUrl(normalized) && !visitedUrls.has(normalized)) {
                  discoveredLinks.add(normalized);
                  sitemapLinks++;
                  console.log(`    ➕ Added from sitemap: ${normalized}`);
                }
              } catch (e) {
                // Skip invalid URLs
              }
            }
            if (sitemapLinks > 0) {
              console.log(`  ✅ Found ${sitemapLinks} URLs from sitemap.xml`);
            } else {
              console.log(`  ℹ️  Sitemap found but no crawlable URLs`);
            }
          } else {
            console.log(`  ℹ️  No sitemap.xml found (${sitemapResponse.status})`);
          }
        } catch (e: any) {
          console.log(`  ℹ️  Could not fetch sitemap.xml: ${e.message}`);
        }
        
        // Method 8: Try common paths if no links found
        if (discoveredLinks.size === 0) {
          console.log(`  🔍 No links found, trying common website paths...`);
          const commonPaths = [
            '/about', '/about-us', '/features', '/pricing', '/product', '/products',
            '/solutions', '/services', '/blog', '/contact', '/team', '/careers',
            '/faq', '/help', '/support', '/docs', '/documentation', '/resources',
            '/case-studies', '/testimonials', '/reviews', '/integrations', '/api',
            '/how-it-works', '/why-us', '/comparison', '/security', '/privacy',
            '/terms', '/legal', '/news', '/press', '/media', '/home', '/index'
          ];
          
          commonPaths.forEach(path => {
            const fullUrl = baseUrl.origin + path;
            const normalized = normalizeUrlForCrawl(fullUrl);
            try {
              const urlObj = new URL(normalized);
              if (urlObj.hostname === baseUrl.hostname && shouldCrawlUrl(normalized) && !visitedUrls.has(normalized) && !discoveredLinks.has(normalized)) {
                discoveredLinks.add(normalized);
                console.log(`    ➕ Added common path: ${normalized}`);
              }
            } catch (e) {
              // Skip invalid URLs
            }
          });
        }
      }
      
      console.log(`\n  📋 Link Discovery Summary:`);
      console.log(`     - Total links found: ${linksFound}`);
      console.log(`     - Unique crawlable URLs: ${discoveredLinks.size}`);
      console.log(`     - Rejected: ${rejectedLinks.length}`);
      
      if (rejectedLinks.length > 0 && rejectedLinks.length <= 10) {
        console.log(`     - Rejected links: ${rejectedLinks.join(', ')}`);
      }
      
      // Add discovered links to queue
      let linksAdded = 0;
      let linksAlreadyVisited = 0;
      let linksInQueue = 0;
      const importantPaths = ['/about', '/features', '/pricing', '/product', '/solutions', '/services', '/how-it-works', '/why-us', '/blog', '/contact', '/team'];
      
      discoveredLinks.forEach(link => {
        if (visitedUrls.has(link)) {
          linksAlreadyVisited++;
          console.log(`    ⏭️  Already visited: ${link}`);
        } else if (urlsToCrawl.includes(link)) {
          linksInQueue++;
          console.log(`    ⏭️  Already in queue: ${link}`);
        } else if (urlsToCrawl.length >= maxPages) {
          console.log(`    ⏭️  Queue full, skipping: ${link}`);
        } else {
          const isImportant = importantPaths.some(path => link.includes(path));
          if (isImportant) {
            urlsToCrawl.unshift(link); // Important pages first
            console.log(`    ➕ Added important page: ${link}`);
          } else {
            urlsToCrawl.push(link);
            console.log(`    ➕ Added to queue: ${link}`);
          }
          linksAdded++;
        }
      });
      
      console.log(`\n  🔗 Final Link Status:`);
      console.log(`     - Added to queue: ${linksAdded}`);
      console.log(`     - Already visited: ${linksAlreadyVisited}`);
      console.log(`     - Already in queue: ${linksInQueue}`);
      console.log(`     - Queue size: ${urlsToCrawl.length}`);
      console.log(`     - Visited count: ${visitedUrls.size}`);
    } catch (error: any) {
      console.error(`  ❌ Error scraping ${pageUrl}:`, error.message);
    }
  }
  
  try {
    console.log('\n🎬 Starting crawl process...\n');
    
    // Add initial URL to queue
    urlsToCrawl.push(normalizeUrlForCrawl(url));
    
    // Process queue until empty or limit reached
    let processedCount = 0;
    
    while (urlsToCrawl.length > 0 && visitedUrls.size < maxPages) {
      // Get next URL from queue
      const currentUrl = urlsToCrawl.shift()!; // Remove from front
      
      if (!currentUrl) break;
      
      // Scrape the page (this will also discover new links and add them to queue)
      await scrapePage(currentUrl);
      processedCount++;
      
      // Progress logging
      if (processedCount % 5 === 0) {
        console.log(`\n📊 Progress Update:`);
        console.log(`   - Pages processed: ${processedCount}`);
        console.log(`   - Pages visited: ${visitedUrls.size}`);
        console.log(`   - URLs in queue: ${urlsToCrawl.length}`);
        console.log(`   - Content sections: ${allContent.length}\n`);
      }
      
      // Small delay to be respectful (optional, can remove if too slow)
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (urlsToCrawl.length === 0 && visitedUrls.size < maxPages) {
      console.log(`\n✅ All discoverable pages have been crawled!`);
    }
    
    console.log(`\n✅ Scraping complete!`);
    console.log(`📈 Statistics:`);
    console.log(`   - Pages visited: ${visitedUrls.size}`);
    console.log(`   - Content sections extracted: ${allContent.length}`);
    console.log(`   - Total content length: ${allContent.join('\n\n').length} characters`);
    
    return allContent.join('\n\n');
  } catch (error) {
    console.error('Scraping error:', error);
    throw error;
  }
}

async function extractTextContent(html: string): Promise<string> {
  // Remove script and style tags
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  html = html.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
  html = html.replace(/<!--[\s\S]*?-->/g, ''); // Remove comments
  
  // Extract key content areas (comprehensive extraction)
  const contentSections: string[] = [];
  
  // 1. Meta tags and titles
  const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  if (metaDesc?.[1]) contentSections.push(`Meta Description: ${metaDesc[1]}`);
  
  const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
  if (ogDesc?.[1]) contentSections.push(`OG Description: ${ogDesc[1]}`);
  
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (title?.[1]) contentSections.push(`Page Title: ${title[1]}`);
  
  const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  if (ogTitle?.[1]) contentSections.push(`OG Title: ${ogTitle[1]}`);
  
  // 2. Extract from semantic HTML sections
  const sections = [
    { tag: 'main', name: 'Main Content' },
    { tag: 'article', name: 'Article Content' },
    { tag: 'section', name: 'Section Content' },
    { tag: 'header', name: 'Header Content' },
  ];
  
  for (const { tag, name } of sections) {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
    let match;
    let count = 0;
    while ((match = regex.exec(html)) !== null && count < 3) {
      let text = match[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (text.length > 100) {
        contentSections.push(`${name} ${count + 1}: ${text.substring(0, 1500)}`);
        count++;
      }
    }
  }
  
  // 3. Extract from common class names (hero, features, about, etc.)
  const importantClasses = ['hero', 'features', 'about', 'product', 'solution', 'benefits', 'pricing', 'testimonials', 'faq'];
  for (const className of importantClasses) {
    const regex = new RegExp(`<[^>]*class=["'][^"']*${className}[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'gi');
    let match;
    let count = 0;
    while ((match = regex.exec(html)) !== null && count < 2) {
      let text = match[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (text.length > 100) {
        contentSections.push(`${className.charAt(0).toUpperCase() + className.slice(1)} Section: ${text.substring(0, 1500)}`);
        count++;
      }
    }
  }
  
  // 4. Extract headings (h1, h2, h3) which often contain key information
  const headings = html.match(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/gi);
  if (headings && headings.length > 0) {
    const headingTexts = headings
      .map(h => h.replace(/<[^>]+>/g, '').trim())
      .filter(h => h.length > 0)
      .slice(0, 20);
    if (headingTexts.length > 0) {
      contentSections.push(`Headings: ${headingTexts.join(' | ')}`);
    }
  }
  
  // 5. Extract list items (often contain features, benefits, etc.)
  const listItems = html.match(/<li[^>]*>([^<]+)<\/li>/gi);
  if (listItems && listItems.length > 0) {
    const itemTexts = listItems
      .map(li => li.replace(/<[^>]+>/g, '').trim())
      .filter(li => li.length > 10 && li.length < 200)
      .slice(0, 30);
    if (itemTexts.length > 0) {
      contentSections.push(`List Items: ${itemTexts.join(' | ')}`);
    }
  }
  
  // 6. Fallback: extract from body if we don't have enough content
  if (contentSections.length < 5) {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch?.[1]) {
      let bodyText = bodyMatch[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (bodyText.length > 0) {
        contentSections.push(`Body Content: ${bodyText.substring(0, 3000)}`);
      }
    }
  }
  
  // Combine all sections
  const combinedText = contentSections.join('\n\n');
  
  // Limit to first 15000 characters for comprehensive AI processing
  return combinedText.substring(0, 15000);
}

async function analyzeWithAI(scrapedContent: string, url: string, apiKey: string) {
  // Use the comprehensive scraped content from custom scraper
  // Gemini has input token limits (~1M tokens), but we'll keep content as large as possible
  // Rough estimate: 1 token ≈ 4 characters, so ~4M characters max
  // We'll use up to 500K characters to be safe and allow room for the prompt
  const MAX_CONTENT_LENGTH = 500000; // ~125K tokens, leaving room for prompt
  
  let textContent = scrapedContent;
  const originalLength = textContent.length;
  const pageCount = (textContent.match(/=== Page:/g) || []).length;
  
  // If content is very large, truncate but keep as much as possible
  if (textContent.length > MAX_CONTENT_LENGTH) {
    console.log(`⚠️  Content is very large (${originalLength} chars), truncating to ${MAX_CONTENT_LENGTH} chars for AI processing`);
    // Try to keep complete pages - truncate at page boundaries if possible
    const pages = textContent.split(/=== Page:/);
    let truncated = '';
    for (const page of pages) {
      if ((truncated + '=== Page:' + page).length > MAX_CONTENT_LENGTH) {
        break;
      }
      truncated += (truncated ? '=== Page:' : '') + page;
    }
    textContent = truncated || textContent.substring(0, MAX_CONTENT_LENGTH);
    console.log(`📊 Using ${textContent.length} characters (${Math.round(textContent.length / originalLength * 100)}% of original)`);
  }
  
  // Calculate content statistics for the prompt
  const contentLength = textContent.length;
  
  const prompt = `You are an expert brand analyst with deep expertise in extracting comprehensive brand intelligence from website content. Your task is to perform a THOROUGH, DETAILED analysis of ALL provided website content and extract EXHAUSTIVE brand information.

CRITICAL INSTRUCTIONS:
1. You have been provided with ${pageCount} page(s) of scraped content (${contentLength} characters total)
2. You MUST read and analyze EVERY section of the content - do not skip any pages or sections
3. Synthesize information across ALL pages to build a complete picture
4. Extract information that is:
   - Explicitly stated anywhere in the content
   - Clearly implied from context and descriptions
   - Reasonably inferable from patterns, examples, or use cases
   - Deduced from product capabilities, features, and benefits mentioned

Website URL: ${url}
Website Content (${pageCount} pages, ${contentLength} characters):
${textContent}

DETAILED EXTRACTION GUIDELINES FOR EACH FIELD:

1. productName:
   - Look for the main product name in titles, headers, meta tags, hero sections
   - Check all pages for product name variations
   - Extract the most prominent/primary product name
   - If multiple products, identify the main flagship product

2. brandName:
   - Find the company/brand name from about pages, footer, header, meta tags
   - May be different from product name
   - Look for "by [Company]", "from [Brand]", copyright notices

3. description:
   - Create a COMPREHENSIVE 4-6 sentence description (not just 2-3)
   - Synthesize information from hero sections, about pages, product pages
   - Include: what the product does, who it's for, main value proposition, key differentiators
   - Be specific and detailed - use actual information from the content
   - Example format: "[Product] is a [type] that helps [audience] [achieve goal]. It enables [capability 1], [capability 2], and [capability 3]. The platform is designed for [use case] and helps users [benefit]. Key differentiators include [unique aspect 1] and [unique aspect 2]."

4. mission:
   - Extract from mission statements, vision statements, "why we exist" sections
   - Look for company values, purpose statements, "our mission" pages
   - Should be 2-4 sentences explaining the brand's core purpose and values
   - If not explicitly stated, infer from overall messaging and value propositions

5. categories:
   - Extract 5-10 specific categories (not just 3)
   - Look for industry mentions, product types, tool categories
   - Examples: ["SaaS", "Marketing Automation", "AI-Powered Tools", "B2B Software", "Content Marketing"]
   - Be specific - avoid generic categories like "Software" or "Tools"

6. tags:
   - Create 8-12 relevant tags (not just 5-8)
   - Based on content themes, keywords, product attributes
   - Include technology tags, industry tags, use-case tags
   - Examples: ["AI-powered", "Marketing", "Automation", "B2B", "Cloud-based", "Analytics", "Integration"]

7. keywords:
   - Extract 15-25 important keywords (not just 10-15)
   - Include product names, feature names, industry terms, search-relevant phrases
   - Look for terms used repeatedly across pages
   - Include both single words and phrases (2-3 word combinations)

8. targetAudience:
   - Create a DETAILED 3-5 sentence description (not just 1-2)
   - Look for: "for [audience]", "designed for", "perfect for", user personas, customer stories
   - Include: job titles, company sizes, industries, use cases, skill levels
   - Synthesize from multiple pages (homepage, about, features, case studies)
   - Example: "The product is designed for [primary audience] who [need/do]. It's particularly suited for [specific roles] at [company types] who [specific use case]. Secondary audiences include [other groups] who [other needs]."

9. keyFeatures:
   - Extract 10-15 key features (not just 5-10)
   - Look in: feature lists, "what we offer", benefits sections, capabilities pages, product pages
   - Include both explicit features and implied capabilities
   - Be specific - use actual feature names and descriptions from the content
   - Format: ["Feature Name: Description", "Another Feature: What it does"]

10. problemSolved:
    - Create a DETAILED 3-4 sentence explanation (not just 1-2)
    - Synthesize from: "we solve", "problem", "challenge", "pain point" sections
    - Include: what problems exist, why they matter, how the product addresses them
    - Look across all pages for problem statements
    - Example: "The product solves [primary problem] faced by [audience]. Specifically, it addresses [problem 1], [problem 2], and [problem 3]. Before [product], users struggled with [challenge], but now they can [solution benefit]."

11. painPoints:
    - Extract 5-8 specific pain points (not just 3-5)
    - Look for explicit pain point lists, problem descriptions, "challenges" sections
    - Include both stated and implied pain points
    - Be specific - use actual pain point descriptions from content
    - Format: ["Specific pain point 1", "Specific pain point 2", ...]

12. useCases:
    - Extract 5-8 detailed use cases (not just 3-5)
    - Look for: "use cases", "how to use", examples, scenarios, case studies, customer stories
    - Include both explicit use cases and scenarios described in content
    - Be specific - describe actual use cases mentioned, not generic ones
    - Format: ["Use case 1: Detailed description", "Use case 2: Detailed description"]

13. competitors:
    - Extract 3-8 competitors if mentioned (not just 3-5)
    - Look for: comparison pages, "vs [competitor]", "alternatives to", "better than"
    - Include both direct competitors and alternatives mentioned
    - If not explicitly mentioned, leave as empty array

QUALITY REQUIREMENTS:
- Be THOROUGH: Extract every piece of relevant information from the content
- Be DETAILED: Provide comprehensive, explanatory descriptions (not brief summaries)
- Be SPECIFIC: Use actual information from the content, not generic descriptions
- Be COMPLETE: Fill in as many fields as possible with detailed information
- SYNTHESIZE: Combine information from multiple pages to create complete profiles
- PRIORITIZE: If content is extensive, prioritize the most important/relevant information

Return a JSON object with ALL fields filled with detailed, comprehensive information:
{
  "productName": "Detailed product name",
  "brandName": "Company/brand name",
  "description": "Comprehensive 4-6 sentence description synthesizing all content",
  "mission": "Detailed 2-4 sentence mission statement",
  "categories": ["category1", "category2", ...] - 5-10 specific categories,
  "tags": ["tag1", "tag2", ...] - 8-12 relevant tags,
  "keywords": ["keyword1", "keyword2", ...] - 15-25 important keywords,
  "targetAudience": "Detailed 3-5 sentence description of target users",
  "keyFeatures": ["feature1", "feature2", ...] - 10-15 specific features,
  "problemSolved": "Detailed 3-4 sentence explanation of problems solved",
  "painPoints": ["pain1", "pain2", ...] - 5-8 specific pain points,
  "useCases": ["use case 1", "use case 2", ...] - 5-8 detailed use cases,
  "competitors": ["competitor1", "competitor2", ...] - 3-8 if mentioned
}

Return ONLY valid JSON, no markdown formatting, no explanations outside the JSON structure.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: 'application/json',
            maxOutputTokens: 8192, // Increased for detailed responses
            topP: 0.95,
            topK: 40,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Google API error:', response.status, errorData);
      throw new Error(`AI analysis failed: ${errorData.error?.message || errorData.error || 'Unknown error'}`);
    }

    const data = await response.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (!aiText) {
      console.error('No text in AI response:', data);
      throw new Error('AI returned empty response');
    }
    
    // Try to parse as JSON first (if responseMimeType is application/json)
    try {
      const parsed = JSON.parse(aiText);
      return {
        productName: parsed.productName || '',
        brandName: parsed.brandName || '',
        description: parsed.description || '',
        mission: parsed.mission || '',
        categories: parsed.categories || [],
        tags: parsed.tags || [],
        keywords: parsed.keywords || [],
        targetAudience: parsed.targetAudience || '',
        keyFeatures: parsed.keyFeatures || [],
        problemSolved: parsed.problemSolved || '',
        painPoints: parsed.painPoints || [],
        useCases: parsed.useCases || [],
        competitors: parsed.competitors || [],
      };
    } catch (parseError) {
      // If direct JSON parse fails, try to extract JSON from text
      console.log('Direct JSON parse failed, trying to extract from text');
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            productName: parsed.productName || '',
            brandName: parsed.brandName || '',
            description: parsed.description || '',
            mission: parsed.mission || '',
            categories: parsed.categories || [],
            tags: parsed.tags || [],
            keywords: parsed.keywords || [],
            targetAudience: parsed.targetAudience || '',
            keyFeatures: parsed.keyFeatures || [],
            problemSolved: parsed.problemSolved || '',
            painPoints: parsed.painPoints || [],
            useCases: parsed.useCases || [],
            competitors: parsed.competitors || [],
          };
        } catch (e) {
          console.error('Failed to parse extracted JSON:', e);
        }
      }
    }
    
    // Fallback: return structured data from text
    console.warn('Using fallback - could not parse JSON from AI response');
    return {
      productName: '',
      brandName: '',
      description: aiText.substring(0, 500),
      mission: '',
      categories: [],
      tags: [],
      keywords: [],
      targetAudience: '',
      keyFeatures: [],
      problemSolved: '',
      painPoints: [],
      useCases: [],
      competitors: [],
    };
  } catch (error: any) {
    console.error('AI analysis error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = body.url;

    if (!url) {
      return NextResponse.json({ error: 'URL required' }, { status: 400 });
    }

    // Ensure url is a string
    let urlString: string;
    if (typeof url === 'string') {
      urlString = url.trim();
    } else if (url && typeof url === 'object') {
      // If it's an object, try to extract a URL property or stringify
      urlString = (url as any).url || (url as any).href || String(url);
      urlString = urlString.trim();
    } else {
      urlString = String(url || '').trim();
    }
    
    // More lenient URL validation
    if (!urlString || urlString === '' || urlString === '[object Object]') {
      return NextResponse.json({ error: 'Invalid URL provided. Please enter a valid website URL.' }, { status: 400 });
    }

    // Check if URL is too short (less than 3 chars after trimming)
    const trimmedUrl = urlString.trim();
    if (trimmedUrl.length < 3) {
      return NextResponse.json({ error: 'URL is too short. Please enter a valid website URL.' }, { status: 400 });
    }

    // Try to normalize the URL
    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeUrl(trimmedUrl);
      console.log('Normalized URL:', normalizedUrl, 'from input:', trimmedUrl);
      
      // Validate the normalized URL is actually a valid URL
      const urlObj = new URL(normalizedUrl);
      console.log('URL validation passed:', urlObj.href);
    } catch (error: any) {
      console.error('URL normalization/validation error:', error);
      console.error('Input URL:', trimmedUrl);
      return NextResponse.json({ 
        error: `Invalid URL format: "${trimmedUrl}". Please enter a valid website URL (e.g., charmup.website or https://charmup.website). Error: ${error.message}` 
      }, { status: 400 });
    }
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      console.warn('GOOGLE_API_KEY not configured, skipping AI analysis');
    }

    // Scrape the entire website using custom scraper
    let scrapedContent: string;
    try {
      console.log('Starting website crawl...');
      scrapedContent = await scrapeWebsite(normalizedUrl);
      const pageCount = scrapedContent.split('=== Page:').length - 1;
      console.log(`Successfully scraped ${pageCount} pages`);
    } catch (error: any) {
      console.error('Website scraping failed, falling back to basic fetch:', error);
      
      // Fallback to basic fetch if Crawlee fails
      const response = await fetch(normalizedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch website. Please check the URL and try again.' },
          { status: 400 }
        );
      }

      const html = await response.text();
      scrapedContent = await extractTextContent(html);
    }
    
    // Initialize brand data with empty values
    // AI will populate these from the scraped content
    let brandData = {
      productName: '',
      brandName: '',
      description: '',
      mission: '',
      categories: [] as string[],
      tags: [] as string[],
      keywords: [] as string[],
      targetAudience: '',
      keyFeatures: [] as string[],
      problemSolved: '',
      painPoints: [] as string[],
      useCases: [] as string[],
      competitors: [] as string[],
    };

    // Use AI to extract comprehensive information if API key is available
    if (apiKey) {
      try {
        const aiAnalysis = await analyzeWithAI(scrapedContent, normalizedUrl, apiKey);
        if (aiAnalysis) {
          brandData = {
            ...brandData,
            ...aiAnalysis,
            // Ensure arrays are always arrays
            categories: aiAnalysis.categories || [],
            tags: aiAnalysis.tags || [],
            keywords: aiAnalysis.keywords || [],
            keyFeatures: aiAnalysis.keyFeatures || [],
            painPoints: aiAnalysis.painPoints || [],
            useCases: aiAnalysis.useCases || [],
            competitors: aiAnalysis.competitors || [],
          };
        }
      } catch (error: any) {
        console.error('AI analysis failed, using basic extraction:', error);
        console.error('Error message:', error?.message);
        // Continue with basic extraction - don't fail the entire request
      }
    } else {
      console.log('Skipping AI analysis - no API key configured');
    }

    const finalBrandData = {
      ...brandData,
      website_url: normalizedUrl,
    };

    // Save to database if user is authenticated
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Get or find persona for this user
        let { data: persona, error: personaError } = await supabase
          .from('personas')
          .select('*')
          .eq('user_id', user.id)
          .limit(1)
          .single();

        // If no persona found, try without single() to get first one
        if (personaError || !persona) {
          const { data: personas } = await supabase
            .from('personas')
            .select('*')
            .eq('user_id', user.id)
            .limit(1);

          if (personas && personas.length > 0) {
            persona = personas[0];
          }
        }

        // If still no persona, create a default one
        if (!persona?.id) {
          const { data: newPersona, error: createError } = await supabase
            .from('personas')
            .insert({
              user_id: user.id,
              name: finalBrandData.productName || finalBrandData.brandName || 'My Brand',
              archetype: 'The Helpful Expert', // Default archetype
              brand_mission: finalBrandData.description || finalBrandData.mission || '',
              product_name: finalBrandData.productName || finalBrandData.brandName || '',
              problem_description: finalBrandData.problemSolved || (finalBrandData.useCases && finalBrandData.useCases.length > 0 ? finalBrandData.useCases.join('. ') : '') || '',
              pain_points: finalBrandData.painPoints || [],
              tone_professionalism: 7,
              tone_conciseness: 6,
              tone_empathy: 8,
              authenticity_markers: {
                useLowercaseI: true,
                useContractions: true,
                varySentenceLength: true,
                avoidCorporateSpeak: true,
              },
              // Save all brand analysis fields
              website_url: finalBrandData.website_url || null,
              target_audience: finalBrandData.targetAudience || null,
              key_features: finalBrandData.keyFeatures && finalBrandData.keyFeatures.length > 0 
                ? finalBrandData.keyFeatures 
                : null,
              last_analyzed: new Date().toISOString(),
              scraped_content: scrapedContent || null, // Save raw scraped content
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating persona:', createError);
            // Don't fail the request, just log the error
          } else {
            persona = newPersona;
            console.log('Created default persona and saved brand data');
          }
        } else {
          // Update existing persona with brand data
          const { error: updateError } = await supabase
            .from('personas')
            .update({
              product_name: finalBrandData.productName || persona.product_name || '',
              brand_mission: finalBrandData.description || finalBrandData.mission || persona.brand_mission || '',
              problem_description: finalBrandData.problemSolved || (finalBrandData.useCases && finalBrandData.useCases.length > 0 ? finalBrandData.useCases.join('. ') : '') || persona.problem_description || '',
              pain_points: finalBrandData.painPoints && finalBrandData.painPoints.length > 0 
                ? finalBrandData.painPoints 
                : (persona.pain_points || []),
              // Save all brand analysis fields
              website_url: finalBrandData.website_url || null,
              target_audience: finalBrandData.targetAudience || null,
              key_features: finalBrandData.keyFeatures && finalBrandData.keyFeatures.length > 0 
                ? finalBrandData.keyFeatures 
                : null,
              last_analyzed: new Date().toISOString(),
              scraped_content: scrapedContent || null, // Save raw scraped content
            })
            .eq('id', persona.id);

          if (updateError) {
            console.error('Error saving brand data to database:', updateError);
            // Don't fail the request, just log the error
          } else {
            console.log('Brand data saved to database successfully');
          }
        }
      }
    } catch (dbError: any) {
      console.error('Error saving to database:', dbError);
      // Don't fail the request if database save fails
    }

    return NextResponse.json(finalBrandData);
  } catch (error: any) {
    console.error('Error scraping brand:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to scrape brand' },
      { status: 500 }
    );
  }
}

