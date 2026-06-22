import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { snapshot, code, customQuery } = await req.json();
    const apiKey = process.env.NVIDIA_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'NVIDIA_API_KEY is not configured in .env.local' },
        { status: 500 }
      );
    }

    const isCustomQuery = !!customQuery;

    const threads = snapshot && snapshot.threads ? Object.values(snapshot.threads).map((t: any) => ({
      name: t.name,
      state: t.state,
      stackDepth: t.stackDepth,
      virtual: t.virtual,
      carrier: t.carrierThread,
      waitingOn: t.waitingForMonitor,
      owns: t.ownsMonitor,
      deadlocked: t.deadlocked
    })).slice(0, 20) : [];

    const heap = snapshot && snapshot.heap ? Object.values(snapshot.heap).map((o: any) => ({
      id: o.id,
      className: o.className,
      generation: o.generation,
      reachable: o.reachable,
      refCount: o.refCount,
      age: o.age,
      isString: o.isString,
      stringValue: o.stringValue
    })).slice(0, 30) : [];

    const activeFrame = snapshot && snapshot.stacks 
      ? Object.values(snapshot.stacks).flatMap((s: any) => s).find((f: any) => f.active) 
      : null;

    const codeLines = code ? code.split('\n') : [];
    const activeCodeLine = (snapshot && snapshot.lineNumber > 0 && snapshot.lineNumber <= codeLines.length)
      ? codeLines[snapshot.lineNumber - 1]
      : 'Unknown';

    const systemPrompt = isCustomQuery
      ? `You are JIV (Java Internals Visualizer) Observability Coach, an expert on the Java Virtual Machine.
Answer the user's custom question. You have access to the current JVM execution snapshot and source code for context.

IMPORTANT: You MUST ONLY answer questions related to Java, JVM internals, garbage collection, thread synchronization, memory layout, class loading, or Java programming.
If the user's custom question is NOT related to Java or JVM concepts (for example, general lifestyle, eating habits, cooking, hobbies, other programming languages, general chat, etc.), you MUST politely and smartly refuse to answer, stating that you are specialized in Java internals and visual diagnostics, and can only answer Java-related questions.

GREETINGS AND THANK-YOUS:
- If the user's input is a simple greeting (e.g., "Hi", "Hello", "Hey"), respond with a single, brief, and friendly reply like "Hi! How can I help you?".
- If the user's input is an expression of gratitude (e.g., "Thank you", "Thanks"), respond with a single, brief, and friendly reply like "Hope that was helpful! Feel free to ask me anything else related to Java."
Keep these responses short and warm — do not elaborate or add unnecessary details.

You MUST respond with a valid JSON object ONLY. Do not write any markdown wrappers (like \`\`\`json) or extra text outside the JSON.

Expected JSON schema:
{
  "title": "Topic Restricted, Greetings, Thank You, or Query Title",
  "summary": "One sentence summary of the response, greeting, thank you, or refusal",
  "details": "A detailed explanation answering the user's query, related strictly to Java or JVM (2-3 sentences), or a polite greeting/thank you/refusal.",
  "fix": "Actionable Java optimization tip or query recommendation (optional)"
}`
      : `You are JIV (Java Internals Visualizer) Observability Coach, an expert on the Java Virtual Machine.
Analyze the current JVM execution snapshot and source code to explain what is happening line-by-line.
Explain the JVM mechanics (e.g. Heap allocation, GC generations Young/Survivor/Old, lock monitor ownership, Virtual Thread mapping, or Thread deadlocks).
Explain specifically how the active line of code maps to these JVM internals.
You MUST respond with a valid JSON object ONLY. Do not write any markdown wrappers (like \`\`\`json) or extra text outside the JSON.

Expected JSON schema:
{
  "title": "Short title of the JVM state",
  "summary": "One sentence summary of the current step/issue",
  "details": "Educational explanation of the JVM internal mechanics at play relating to the source statement (2-3 sentences)",
  "fix": "Actionable optimization insight or recommendation"
}`;

    const userQuery = isCustomQuery
      ? `User Custom Question: "${customQuery}"

JVM Context:
- Active Event Type: ${snapshot?.eventType || 'None'}
- Active Method: ${snapshot?.currentMethod || 'None'}
- Line Number: ${snapshot?.lineNumber || 0}
- Active Code Line: \`${activeCodeLine.trim()}\`
- Entire Program Code:
\`\`\`java
${code || '// No code provided'}
\`\`\`
- Thread States: ${JSON.stringify(threads)}
- Heap Objects: ${JSON.stringify(heap)}`
      : `JVM Execution Snapshot Context:
- Active Event Type: ${snapshot.eventType}
- Active Method: ${snapshot.currentMethod}
- Line Number: ${snapshot.lineNumber}
- Active Code Line: \`${activeCodeLine.trim()}\`
- Entire Program Code:
\`\`\`java
${code || '// No code provided'}
\`\`\`
- Active Instruction: "${snapshot.currentBytecode || 'None'}"
- Printed stdout: "${snapshot.stdout || ''}"
- Active Stack Frame: ${activeFrame ? JSON.stringify(activeFrame) : 'None'}
- Thread States: ${JSON.stringify(threads)}
- Heap Objects: ${JSON.stringify(heap)}
- JIT Compilation Time: ${snapshot.totalJitTimeMs}ms`;

    let response: Response | null = null;
    let errorOccurred: any = null;
    const attempts = 2;

    for (let i = 0; i < attempts; i++) {
      try {
        console.log(`Attempting AI analysis request (${i + 1}/${attempts})...`);
        response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
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
          }),
          signal: AbortSignal.timeout(24000) // 24 seconds timeout per attempt
        });
        if (response.ok) {
          errorOccurred = null;
          break; // Succeeded, break out of loop
        } else {
          const errText = await response.text();
          errorOccurred = new Error(`NVIDIA API status ${response.status}: ${errText}`);
          console.warn(`AI request attempt ${i + 1} returned status ${response.status}: ${errText}`);
        }
      } catch (err: any) {
        errorOccurred = err;
        console.warn(`AI request attempt ${i + 1} failed with error:`, err.message || err);
      }
      
      // Wait a brief moment before retrying if there are attempts remaining
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    if (errorOccurred || !response) {
      throw errorOccurred || new Error('Failed to reach NVIDIA NIM after multiple attempts');
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      return NextResponse.json({
        title: 'Empty AI Response',
        summary: 'NVIDIA NIM did not return an explanation text choice.',
        details: JSON.stringify(data),
        fix: 'Please verify configuration or try another execution step.'
      });
    }

    const content = rawContent.trim();
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
        details: content,
        fix: 'Please retry the analysis.'
      });
    }

  } catch (err: any) {
    console.error('Error in AI Route handler:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
