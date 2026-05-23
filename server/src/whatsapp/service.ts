import twilio from "twilio";

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM = process.env.TWILIO_WHATSAPP_FROM;

export class WhatsAppService {
  /**
   * Dispatches a WhatsApp alert to a representative notifying them that
   * their uploaded shelf image has been rejected by the fraud detection system.
   */
  static async sendFraudAlert(to: string, visitId: string, reason: string): Promise<void> {
    const formattedReason = reason.replace("_", " ");
    const body = `⚠️ *RetailOS Audit Alert* ⚠️\n\nHello, your shelf documentation for Visit *#${visitId}* was rejected by the validation system.\n\n*Reason*: ${formattedReason}.\n\nPlease check the placement and capture a new photo.`;

    // 1. Fallback to mock logging if Twilio is not fully configured
    const isConfigured = 
      ACCOUNT_SID && 
      !ACCOUNT_SID.startsWith("ACxxxxxxxx") &&
      AUTH_TOKEN && 
      AUTH_TOKEN !== "your_auth_token_here" &&
      FROM;

    if (!isConfigured) {
      console.log("\n💬 [MOCK WHATSAPP] Sending simulated WhatsApp alert:");
      console.log(`   To     : ${to}`);
      console.log(`   From   : whatsapp:${FROM || "+14155238886"}`);
      console.log(`   Message:\n${body}\n`);
      return;
    }

    // 2. Dispatch real Twilio WhatsApp message
    try {
      const client = twilio(ACCOUNT_SID, AUTH_TOKEN);

      // Clean the phone number (Twilio expects E.164, e.g. +8801711111111)
      let cleanTo = to.trim().replace(/[\s-()]/g, "");
      if (!cleanTo.startsWith("+")) {
        // Assume default code or formatting if needed, but standard is E.164
        cleanTo = `+${cleanTo}`;
      }

      console.log(`📤 Dispatching Twilio WhatsApp alert to ${cleanTo}...`);

      const message = await client.messages.create({
        from: `whatsapp:${FROM}`,
        to: `whatsapp:${cleanTo}`,
        body,
      });

      console.log(`✅ WhatsApp alert sent successfully (SID: ${message.sid}, Status: ${message.status})`);
    } catch (err: any) {
      // 3. Error Safety: Log the failure but do not crash the caller
      console.error(`❌ Failed to send WhatsApp alert to ${to}: ${err.message || err}`);
    }
  }
}
