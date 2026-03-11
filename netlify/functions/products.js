const https = require("https");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const { collection = "art-prints", sort = "best-selling", search = "" } = event.queryStringParameters || {};

  const validCollections = [
    "art-prints", "framed-posters", "canvas-prints", "posters",
    "throw-pillows", "shower-curtains", "throw-blankets", "rugs",
    "mugs", "tote-bags", "duvet-covers", "tapestries"
  ];
  const col = validCollections.includes(collection) ? collection : "art-prints";
  const sortParam = sort === "created-at" ? "created-at" : "best-selling";

  // Use Shopify's suggest search endpoint for keyword queries, else collection browse
  const url = search
    ? `https://society6.com/search/suggest.json?q=${encodeURIComponent(search)}&resources[type]=product&resources[limit]=20`
    : `https://society6.com/collections/${col}/products.json?limit=100&sort_by=${sortParam}`;

  try {
    const data = await new Promise((resolve, reject) => {
      https.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; MuseBot/1.0)",
          "Accept": "application/json",
        }
      }, (res) => {
        let body = "";
        res.on("data", chunk => body += chunk);
        res.on("end", () => {
          try {
            const parsed = JSON.parse(body);
            // Normalize suggest.json format to products.json format
            if (parsed?.resources?.results?.products) {
              const items = parsed.resources.results.products;
              resolve({
                products: items.map(p => ({
                  id: p.id,
                  title: p.title,
                  vendor: p.vendor,
                  product_type: p.product_type || "",
                  handle: p.handle,
                  tags: p.tags || [],
                  images: p.featured_image ? [{ src: p.featured_image }] : [],
                  variants: p.variants || [{ price: p.price }],
                  url: p.url,
                }))
              });
            } else {
              resolve(parsed);
            }
          }
          catch (e) { reject(new Error("Failed to parse JSON")); }
        });
      }).on("error", reject);
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
