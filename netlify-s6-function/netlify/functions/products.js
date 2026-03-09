const https = require("https");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const { collection = "art-prints", sort = "best-selling" } = event.queryStringParameters || {};

  const validCollections = [
    "art-prints", "framed-posters", "canvas-prints", "posters",
    "throw-pillows", "shower-curtains", "throw-blankets", "rugs",
    "mugs", "tote-bags", "duvet-covers", "tapestries"
  ];

  const col = validCollections.includes(collection) ? collection : "art-prints";
  const sortParam = sort === "created-at" ? "created-at" : "best-selling";
  const url = `https://society6.com/collections/${col}/products.json?limit=50&sort_by=${sortParam}`;

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
          try { resolve(JSON.parse(body)); }
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
