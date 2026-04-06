export default function handler(req, res) {
  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "noeminha_verify_2026";

  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }

    return res.status(403).send("Forbidden");
  }

  if (req.method === "POST") {
    console.log("EVENTO META:", req.body);
    return res.status(200).json({ received: true });
  }

  return res.status(405).end();
}
