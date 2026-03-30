import puppeteer from 'puppeteer-core';

/**
 * Price Scraper Service using Lightpanda (Headless Browser)
 * Fetches top result prices from Zepto, Blinkit, and Instamart.
 */

// In-memory cache to prevent redundant scraping (30 min TTL)
const priceCache = new Map();
const CACHE_TTL = 30 * 60 * 1000;

const MARKETPLACES = {
  zepto: {
    name: 'Zepto',
    searchUrl: (q) => `https://www.zeptonow.com/search?query=${encodeURIComponent(q)}`,
    selectors: ['.product-price', '[data-testid="product-price"]', '.sc-price', '.fFqGfH'],
    pincode: '400001'
  },
  blinkit: {
    name: 'Blinkit',
    searchUrl: (q) => `https://blinkit.com/s/?q=${encodeURIComponent(q)}`,
    selectors: ['.Product__UpdatedPriceAndAtc .Product__UpdatedPrice', '.product-card__price', '.Price__PriceContainer-sc-16o-0'],
    pincode: '400001'
  },
  instamart: {
    name: 'Instamart',
    searchUrl: (q) => `https://www.swiggy.com/instamart/search?productName=${encodeURIComponent(q)}`,
    selectors: ['.sc-aXZVg', '.product-price', '.rupee', '._200C0'],
    pincode: '400001'
  }
};

/**
 * Main entry point for fetching market prices
 */
export async function scrapeMarketPrices(items) {
  const globalStart = Date.now();
  const results = {};
  const now = Date.now();
  const uncachedItems = [];

  console.log(`\n[Market Scraper] --- SCAN JOB STARTED ---`);
  console.log(`[Market Scraper] Target Items: ${items.join(', ')}`);
  console.log(`[Market Scraper] Cache Status: ${priceCache.size} items in memory`);

  // 1. Check Cache
  for (const item of items) {
    const cached = priceCache.get(item.toLowerCase());
    if (cached && (now - cached.timestamp < CACHE_TTL)) {
      results[item.toLowerCase()] = cached.prices;
    } else {
      uncachedItems.push(item);
    }
  }

  if (uncachedItems.length === 0) {
    console.log(`[Market Scraper] All items served from cache. Perfect!`);
    console.log(`[Market Scraper] --- SCAN JOB COMPLETE in ${Date.now() - globalStart}ms ---\n`);
    return results;
  }

  console.log(`[Market Scraper] Need to scrape ${uncachedItems.length} items from live markets`);

  // 2. Parallel Scrape via Lightpanda
  try {
    const connStart = Date.now();
    const browser = await puppeteer.connect({
      browserWSEndpoint: 'ws://localhost:9222',
    });
    console.log(`[Market Scraper] Connected to Lightpanda (CDP) in ${Date.now() - connStart}ms`);

    // Run scraping for each marketplace SEQUENTIALLY to avoid Lightpanda context limits
    const marketplaceIds = Object.keys(MARKETPLACES);
    console.log(`[Market Scraper] Starting sequential scan across ${marketplaceIds.length} platforms...`);

    for (const platformId of marketplaceIds) {
      const platformStart = Date.now();
      const platform = MARKETPLACES[platformId];
      let scannedCount = 0;

      console.log(`[Market Scraper] [${platform.name}] Starting scan for ${uncachedItems.length} items...`);

      for (const item of uncachedItems) {
        const itemStart = Date.now();
        let context, page;
        try {
          // Open fresh context for EACH item to avoid frame detachment
          context = await browser.createBrowserContext();
          page = await context.newPage();
          await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

          // Increase timeout to 12s per scan as requested
          await page.goto(platform.searchUrl(item), { waitUntil: 'networkidle2', timeout: 12000 });
          
          await new Promise(r => setTimeout(r, 2000)); // Wait for render

          const price = await page.evaluate((selectors) => {
            // Priority 1: Direct Selectors
            for (const sel of selectors) {
              const el = document.querySelector(sel);
              if (el) {
                const text = el.innerText.replace(/[^0-9.]/g, '');
                const val = parseFloat(text);
                if (val > 0) return val;
              }
            }
            // Priority 2: Generic fallback - find any element with a Rupee symbol and a number
            const allSpans = Array.from(document.querySelectorAll('span, div, p'));
            for (const el of allSpans) {
              if (el.innerText.includes('₹') && /\d+/.test(el.innerText)) {
                const text = el.innerText.replace(/[^0-9.]/g, '');
                const val = parseFloat(text);
                if (val > 0 && val < 5000) return val; // Reasonable price check
              }
            }
            return null;
          }, platform.selectors);

          if (!results[item.toLowerCase()]) results[item.toLowerCase()] = {};
          results[item.toLowerCase()][platformId] = price;
          scannedCount++;

          console.log(`[Market Scraper] [${platform.name}] ${item}: ₹${price || 'N/A'} (${Date.now() - itemStart}ms)`);

        } catch (err) {
          console.error(`[Market Scraper] [${platform.name}] Error on "${item}": ${err.message}`);
          if (!results[item.toLowerCase()]) results[item.toLowerCase()] = {};
          results[item.toLowerCase()][platformId] = null;
        } finally {
          if (page) await page.close().catch(() => {});
          if (context) await context.close().catch(() => {});
        }
      }
      console.log(`[Market Scraper] [${platform.name}] COMPLETED platform scan in ${Date.now() - platformStart}ms`);
    }

    await browser.disconnect();

  } catch (err) {
    console.error('[Market Scraper] FATAL ERROR:', err.message);
  }

  // 3. Update Cache
  for (const item of uncachedItems) {
    if (results[item.toLowerCase()]) {
       priceCache.set(item.toLowerCase(), {
         prices: results[item.toLowerCase()],
         timestamp: now
       });
    }
  }

  console.log(`[Market Scraper] --- SCAN JOB COMPLETE in ${Date.now() - globalStart}ms ---\n`);
  return results;
}
