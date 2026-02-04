import { BetaAnalyticsDataClient } from "@google-analytics/data";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
function kstDateString(d = new Date()) {
  const kst = new Date(d.getTime() + KST_OFFSET_MS);
  return kst.toISOString().slice(0, 10);
}

function clientFromEnv() {
  const propertyId = process.env.GA_PROPERTY_ID;
  const clientEmail = process.env.GA_CLIENT_EMAIL;
  const privateKeyRaw = process.env.GA_PRIVATE_KEY;

  if (!propertyId || !clientEmail || !privateKeyRaw) {
    throw new Error("Missing GA env vars (GA_PROPERTY_ID / GA_CLIENT_EMAIL / GA_PRIVATE_KEY)");
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");
  const client = new BetaAnalyticsDataClient({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  });

  return { client, property: `properties/${propertyId}` };
}

async function runTop({ client, property, date, eventName, dimName, limit }) {
  const [report] = await client.runReport({
    property,
    dateRanges: [{ startDate: date, endDate: date }],
    dimensions: [{ name: dimName }],
    metrics: [{ name: "eventCount" }],
    dimensionFilter: {
      filter: {
        fieldName: "eventName",
        stringFilter: { matchType: "EXACT", value: eventName },
      },
    },
    orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
    limit,
  });

  const rows = report.rows || [];
  return rows
    .map((r) => ({
      key: r.dimensionValues?.[0]?.value || "",
      count: Number(r.metricValues?.[0]?.value || 0),
    }))
    .filter((x) => x.key && x.key !== "(not set)" && x.count > 0);
}

export async function handler(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const { client, property } = clientFromEnv();
    const date = event.queryStringParameters?.date || kstDateString();

    const kws = await runTop({ client, property, date, eventName: "search", dimName: "customEvent:search_term", limit: 10 });
    const cards = await runTop({ client, property, date, eventName: "card_open", dimName: "customEvent:card_id", limit: 5 });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        date,
        keywords: kws.map(x => ({ term: x.key, count: x.count })),
        cards: cards.map(x => ({ id: x.key, count: x.count })),
      }),
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: String(err?.message || err) }) };
  }
}
