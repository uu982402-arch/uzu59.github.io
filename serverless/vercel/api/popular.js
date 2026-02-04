import { BetaAnalyticsDataClient } from "@google-analytics/data";

/**
 * Vercel Serverless Function: /api/popular
 *
 * Env vars required:
 * - GA_PROPERTY_ID      (숫자만, 예: 123456789)
 * - GA_CLIENT_EMAIL    (서비스 계정 이메일)
 * - GA_PRIVATE_KEY     (서비스 계정 private key, 개행은 \n 형태로 저장)
 *
 * GA4 설정(필수):
 * - Admin → Custom definitions → Create custom dimensions (Event-scoped)
 *   1) search_term  (event parameter: search_term)   // 이벤트: search
 *   2) card_id      (event parameter: card_id)       // 이벤트: card_open
 *
 * Front에서 보내는 이벤트명:
 * - search    { search_term }
 * - card_open { card_id, title, tag }
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function kstDateString(d = new Date()) {
  const kst = new Date(d.getTime() + KST_OFFSET_MS);
  return kst.toISOString().slice(0, 10); // YYYY-MM-DD
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

async function topKeywords({ client, property, date }) {
  const [report] = await client.runReport({
    property,
    dateRanges: [{ startDate: date, endDate: date }],
    dimensions: [{ name: "customEvent:search_term" }],
    metrics: [{ name: "eventCount" }],
    dimensionFilter: {
      filter: {
        fieldName: "eventName",
        stringFilter: { matchType: "EXACT", value: "search" },
      },
    },
    orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
    limit: 10,
  });

  const rows = report.rows || [];
  return rows
    .map((r) => ({
      term: r.dimensionValues?.[0]?.value || "",
      count: Number(r.metricValues?.[0]?.value || 0),
    }))
    .filter((x) => x.term && x.term !== "(not set)" && x.count > 0);
}

async function topCards({ client, property, date }) {
  const [report] = await client.runReport({
    property,
    dateRanges: [{ startDate: date, endDate: date }],
    dimensions: [{ name: "customEvent:card_id" }],
    metrics: [{ name: "eventCount" }],
    dimensionFilter: {
      filter: {
        fieldName: "eventName",
        stringFilter: { matchType: "EXACT", value: "card_open" },
      },
    },
    orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
    limit: 5,
  });

  const rows = report.rows || [];
  return rows
    .map((r) => ({
      id: r.dimensionValues?.[0]?.value || "",
      count: Number(r.metricValues?.[0]?.value || 0),
    }))
    .filter((x) => x.id && x.id !== "(not set)" && x.count > 0);
}

export default async function handler(req, res) {
  // CORS (필요하면 특정 도메인으로 제한)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    const { client, property } = clientFromEnv();
    const date = (req.query && req.query.date) ? String(req.query.date) : kstDateString();

    const [keywords, cards] = await Promise.all([
      topKeywords({ client, property, date }),
      topCards({ client, property, date }),
    ]);

    // Edge/CDN 캐시: 5분
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.status(200).json({ date, keywords, cards });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
}
