type ResponsesApiResponse = {
    output_text?: string;
    output?: Array<{
        type?: string;
        content?: Array<{
            type?: string;
            text?: string;
            refusal?: string;
        }>;
    }>;
    incomplete_details?: {
        reason?: string;
    } | null;
};

/** Call the OpenAI Responses API with a request-scoped API key. */
export async function callOpenAiResponses(input: {
    model: string;
    prompt: string;
    maxTokens: number;
    apiKey: string;
}): Promise<string> {
    const res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            authorization: `Bearer ${input.apiKey}`,
        },
        body: JSON.stringify({
            model: input.model,
            input: input.prompt,
            max_output_tokens: input.maxTokens,
            store: false,
        }),
        cache: "no-store",
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`OpenAI API error (${res.status}): ${text.slice(0, 800)}`);
    }

    const json = (await res.json()) as ResponsesApiResponse;
    // `output_text` is an SDK convenience property. Raw HTTP responses expose
    // generated text in output[].content[].
    const text = json.output_text?.trim() || json.output
        ?.flatMap((item) => item.content ?? [])
        .filter((part) => part.type === "output_text" && part.text)
        .map((part) => part.text!.trim())
        .join("\n")
        .trim();

    if (!text) {
        const refusal = json.output
            ?.flatMap((item) => item.content ?? [])
            .find((part) => part.refusal)?.refusal;
        const incomplete = json.incomplete_details?.reason;
        throw new Error(
            refusal
                ? `OpenAI returned a refusal: ${refusal}`
                : incomplete
                    ? `OpenAI returned no text output (incomplete: ${incomplete})`
                    : "OpenAI returned no text output",
        );
    }
    return text;
}
