import axios from "axios";
import * as Sentry from "@sentry/node";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

export class GeminiService {
  static async generateSupervisorReport(modelResponseJson: any): Promise<string> {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured in the environment variables.");
    }

    const systemPrompt = `You are a shelf audit summarizer for Olympic Noodles. You receive structured detection data from a shelf scan taken by a sales representative and convert it into a clean, readable summary for their supervisor.

You have no knowledge of the store beyond what the data tells you. You did not visit the store. You are summarizing what the scan found.

You will receive a JSON object with shelf detection results. The data covers two products:
- Olympic Noodles (our product)
- Mr. Noodles (competitor product)

Write the summary as a single body of plain prose — no headers, no bullet points, no section labels. Two short paragraphs at most. Cover the following naturally within the text:

1. Whether Olympic Noodles was found on the shelf and how many facings were detected, compared to the competitor if present.
2. How visible our product appears on shelf — state this as a plain observation (e.g. "clearly visible", "partially obscured") without mentioning any scores or model metrics.
3. If the competitor was detected, briefly note their presence and how their shelf share compares to ours.
4. If our product is sitting directly next to competitor facings, mention it as something worth looking into.
5. One straightforward suggestion for the rep or manager based on what the data shows. Do not frame it as urgent. Just state what the data suggests could be improved.
6. A brief closing observation on the overall shelf situation at this location.

Rules:
- Never mention confidence scores, pixel values, percentages from the JSON, bounding boxes, or any detection/ML terminology.
- Translate everything into plain observations. "low_visibility_risk: false" becomes "the product appears clearly visible on shelf." "area_score_pct higher than competitor" becomes "our product takes up more shelf space than the competitor."
- Do not use words like "urgent", "immediately", "critical", "alarming", or any language that implies a crisis. State the situation plainly.
- Do not say "it is worth noting", "it can be observed", or similar filler. Be direct but calm.
- Do not write as if you visited the store or have any context beyond the JSON.
- If Olympic Noodles was not detected, write a short neutral paragraph noting that no Olympic Noodles product was found in this scan and that the rep may want to check placement or stock levels.
- If no competitor was detected, briefly note that no competitor product appeared in this scan.
- Keep the report between 100 and 160 words.
- Output only the report body. Nothing before it, nothing after it.`;

    const rawJson = JSON.stringify(modelResponseJson, null, 2);
    const userPrompt = `Write a supervisor shelf observation report for the following store visit data submitted by the sales representative.

<model_response>
${rawJson}
</model_response>`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    try {
      const response = await axios.post(
        url,
        {
          contents: [
            {
              parts: [
                {
                  text: userPrompt,
                },
              ],
            },
          ],
          systemInstruction: {
            parts: [
              {
                text: systemPrompt,
              },
            ],
          },
          generationConfig: {
            temperature: 0.2,
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 60000,
        }
      );

      const candidate = response.data?.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error("Empty response received from Gemini API");
      }

      return text.replace(/\r?\n|\r/g, " ").replace(/\s+/g, " ").trim();
    } catch (error: any) {
      Sentry.captureException(error);
      const apiErrorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`Gemini report generation failed: ${apiErrorMessage}`);
    }
  }
}
