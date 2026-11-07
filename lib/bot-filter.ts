// Filtering out automated visits. Without it any crawler that can run JS ended up in the statistics:
// 188 of 246 "visitors" opened the page and left,
// half of them from the US and China, although the site is personal and Russian-language.

// Obvious user-agent markers: search engines, social networks, monitors, headless browsers
// and console clients.
const BOT_UA =
	/bot\b|crawler|spider|crawling|slurp|headless|phantomjs|puppeteer|playwright|selenium|scrapy|curl\/|wget\/|python-requests|httpx|axios\/|go-http-client|java\/|okhttp|libwww|lighthouse|pagespeed|gtmetrix|pingdom|uptimerobot|ahrefs|semrush|mj12|dotbot|petalbot|bingpreview|facebookexternalhit|whatsapp|telegrambot|vkshare|twitterbot|linkedinbot|discordbot|skypeuripreview|applebot|yandexbot|googlebot|duckduckbot|baiduspider|sogou|exabot|ia_archiver/i;

export function isBotUA(ua: string | null | undefined): boolean {
	if (!ua) return true; // request without a user-agent - definitely not a human's browser
	return BOT_UA.test(ua);
}
