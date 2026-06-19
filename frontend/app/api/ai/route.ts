import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { snapshot } = await req.json();
    const apiKey = process.env.NVIDIA_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'NVIDIA_API_KEY is not configured in .env.local' },
        { status: 500 }
      );
    }

    const threads = Object.values(snapshot.threads ?? {}).map((t: any) => ({
      name: t.name,
      state: t.state,
      stackDepth: t.stackDepth,
      virtual: t.virtual,
      carrier: t.carrierThread,
      waitingOn: t.waitingForMonitor,
      owns: t.ownsMonitor,
      deadlocked: t.deadlocked
    }));

    const heap = Object.values(snapshot.heap ?? {}).map((o: any) => ({
      id: o.id,
      className: o.className,
      generation: o.generation,
      reachable: o.reachable,
      refCount: o.refCount,
      age: o.age,
      isString: o.isString,
      stringValue: o.stringValue
    }));

    const activeFrame = Object.values(snapshot.stacks ?? {}).flatMap((s: any) => s).find((f: any) => f.active);

    const systemPrompt = `You are JIV (Java Internals Visualizer) Observability Coach, an expert on the Java Virtual Machine.
Analyze the current JVM execution snapshot and diagnose what is happening.
Explain the JVM mechanics (e.g. Heap allocation, GC generations Young/Survivor/Old, lock monitor ownership, Virtual Thread mapping, or Thread deadlocks).
You MUST respond with a valid JSON object ONLY. Do not write any markdown wrappers (like \`\`\`json) or extra text outside the JSON.

Expected JSON schema:
{
  "title": "Short title of the JVM state",
  "summary": "One sentence summary of the current step/issue",
  "details": "Educational explanation of the JVM internal mechanics at play (2-3 sentences)",
  "fix": "Actionable optimization insight or recommendation"
}`;

    const userQuery = `JVM Execution Snapshot Context:
- Active Event Type: ${snapshot.eventType}
- Active Method: ${snapshot.currentMethod}
- Line Number: ${snapshot.lineNumber}
- Active Instruction: "${snapshot.currentBytecode || 'None'}"
- Printed stdout: "${snapshot.stdout || ''}"
- Active Stack Frame: ${activeFrame ? JSON.stringify(activeFrame) : 'None'}
- Thread States: ${JSON.stringify(threads)}
- Heap Objects: ${JSON.stringify(heap)}
- JIT Compilation Time: ${snapshot.totalJitTimeMs}ms`;

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-70b-instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userQuery }
        ],
        temperature: 0.2,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `NVIDIA API error: ${errorText}` }, { status: response.status });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    try {
      let cleanedContent = content;
      if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/```$/, '').trim();
      }
      const parsed = JSON.parse(cleanedContent);
      return NextResponse.json(parsed);
    } catch (e) {
      return NextResponse.json({
        title: 'Diagnostic Parsing Error',
        summary: 'AI response was not returned in expected JSON format.',
        details: content || 'Empty response.',
        fix: 'Retry the analysis.'
      });
    }

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
