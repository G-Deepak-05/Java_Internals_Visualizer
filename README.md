# Java Internals Visualizer (JIV)

> **"Chrome DevTools for the JVM"** — See your Java program think, in real-time.

JIV is an educational and debugging platform that visualizes how Java programs execute inside the JVM. Paste any Java program, hit Run, and watch stack frames, heap objects, references, garbage collection, and threads come alive — line by line, animated, interactive.

---

## Screenshots

| Landing Page | Visualizer IDE |
|---|---|
| Dark, gradient hero with feature cards and preset programs | Monaco editor + live stack/heap panels + time-travel scrubber |

---

## Features

### Implemented Features

| Feature | Description |
|---|---|
| **Monaco Code Editor** | VS Code engine with JIV theme, Java syntax, active-line highlighting |
| **Stack Visualization** | Animated frame push/pop, depth coloring, local variable table, recursion counter |
| **Heap Explorer** | React Flow interactive graph, object nodes with fields, generation labels |
| **Reference Tracking** | Directed edges between stack vars and heap objects, animated on hover |
| **GC & Heap Traversal** | BFS reflection heap walker starting from stack frames calculating precise reachability and reference counts |
| **Generational GC aging** | Objects age across GC sweeps and transition from `YOUNG` (green) → `SURVIVOR` (amber) → `OLD` (purple) |
| **Thread Panel** | All JVM threads with live state badges, including virtual thread carrier platform thread mappings |
| **Structured Concurrency** | Maps virtual task scopes to their parent threads hierarchically in the thread lists |
| **Deadlock Detection** | Highlights thread deadlocks in red warning cards with inline alerts |
| **Spring DI Simulator** | Scans `@Component` annotations and autowired dependency links in user code to map the Bean Context |
| **AI Observability Coach** | Real-time diagnostic panel explaining GC, locks, and thread states, powered by live Llama 3.1 completions over NVIDIA NIM |
| **Synchronized Lock Visuals**| Displays lock ownership and wait monitors (e.g. `owns` or `waiting on` lock) mapped to Heap Canvas nodes |
| **JIT compiler Metrics** | Live JIT compiler name and total compilation time tracking |
| **Bytecode Panel** | Dual-view of current method bytecode with active instruction highlighted |
| **String Pool Panel** | Live view of interned string pool contents |
| **Metaspace Panel** | Loaded classes split by user vs system classes |
| **Time-Travel Debugger** | Step forward/backward through every JVM state snapshot |
| **Playback Control** | Play/pause with 0.25×–4× speed, scrubber slider |
| **14 Preset Programs** | Factorial, OOP, String Pool, GC aging, Spring DI, Deadlocks, Virtual Threads, and more |
| **Resizable Split Layout** | Drag-to-resize editor vs visualization column |
| **Panel Toggles** | Show/hide any panel (Stack, Heap, Threads, Spring, AI, Bytecode) from the toolbar |
| **Sandboxed Execution** | Docker-isolated, memory/CPU-limited, 15s timeout |

### Future Roadmap

- **Generational GC Layout Partitioning**: Partition the Heap canvas visually into Eden, Survivor 0/1, and Tenured zones.
- **Cloud Deployment**: Production build configurations using secure container runtimes (e.g., gVisor) on AWS or Railway.

---

## Architecture

```
User pastes Java code
        │
        ▼
POST /api/execute          (Spring Boot REST)
        │
        ▼
ExecutionService
  - Compiles code (javac)
  - Wraps in Docker sandbox
  - Attaches JIV Java Agent JAR
        │
        ▼
JIV Java Agent (runs inside sandbox JVM)
  - Instruments bytecode via ASM
  - Captures: stack frames, heap objects, threads, GC events
  - Emits JSON snapshots to stdout
        │
stdout stream
        │
        ▼
AgentEventProcessor
  - Parses JvmSnapshot JSON
  - Stores in Redis (time-travel)
  - Broadcasts via WebSocket STOMP
        │
WebSocket /topic/jvm/{sessionId}
        │
        ▼
Frontend (Next.js + Zustand)
  - Receives snapshots
  - Updates all panels live
  - Renders Stack, Heap, Threads, Bytecode
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript |
| State | Zustand with devtools |
| Graph | React Flow (heap visualization) |
| Animations | Framer Motion |
| Editor | Monaco Editor |
| Styling | Tailwind CSS v4 |
| Backend | Spring Boot 3.3, Java 21 |
| WebSocket | STOMP over SockJS |
| Java Agent | ASM 9 bytecode instrumentation |
| Cache | Redis (snapshot storage) |
| Database | PostgreSQL (sessions) |
| Sandbox | Docker (isolated execution) |

---

## Project Structure

```
Java_Internals_Visualizer/
├── frontend/                    # Next.js 14 app
│   ├── app/
│   │   ├── page.tsx             # Landing page
│   │   └── visualizer/page.tsx  # Main IDE page
│   ├── components/
│   │   ├── editor/CodeEditor.tsx
│   │   ├── visualizer/
│   │   │   ├── StackPanel.tsx
│   │   │   ├── HeapPanel.tsx
│   │   │   ├── ThreadPanel.tsx
│   │   │   ├── BytecodePanel.tsx
│   │   │   ├── StringPoolPanel.tsx
│   │   │   ├── MetaspacePanel.tsx
│   │   │   └── GCOverlay.tsx
│   │   └── controls/
│   │       ├── Toolbar.tsx
│   │       └── TimeTravelControls.tsx
│   ├── store/jvmStore.ts        # Zustand store
│   ├── hooks/useWebSocket.ts    # STOMP WebSocket hook
│   ├── types/jvm.ts             # TypeScript interfaces
│   └── lib/
│       ├── api.ts               # Backend REST client
│       └── presets.ts           # 14 preset Java programs
│
├── backend/                     # Spring Boot 3 app
│   └── src/main/java/com/jiv/
│       ├── JivApplication.java
│       ├── controller/ExecutionController.java
│       ├── service/
│       │   ├── ExecutionService.java   # Docker sandbox + agent runner
│       │   └── SnapshotService.java    # Redis snapshot storage
│       ├── model/                      # JvmSnapshot, HeapObject, etc.
│       └── config/                     # WebSocket, CORS
│
├── agent/                       # Java Agent JAR
│   └── src/main/java/com/jiv/agent/
│       ├── JivAgentMain.java           # Agent entry point
│       ├── listeners/
│       │   ├── ClassTransformer.java   # ASM instrumentation
│       │   └── JivRuntime.java         # Runtime state capture
│       ├── emitter/EventEmitter.java   # Async JSON stdout writer
│       └── snapshot/SnapshotData.java  # Snapshot POJO
│
└── docker/
    ├── docker-compose.yml       # Full stack (frontend+backend+pg+redis)
    └── sandbox/Dockerfile       # Isolated JRE execution environment
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Java 21 JDK
- Maven 3.8+
- Docker Desktop

### 1. Start Frontend (Dev Mode)

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

### 2. Build Java Agent

```bash
cd agent
mvn package -DskipTests
# Produces: agent/target/jiv-agent-1.0.0.jar
```

### 3. Start Backend

```bash
# Start dependencies first
cd docker && docker-compose up postgres redis -d

# Start backend
cd backend
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Djiv.sandbox.agent-jar-path=$(pwd)/../agent/target/jiv-agent-1.0.0.jar"
```

### 4. Full Stack with Docker Compose

```bash
cd docker
docker-compose up --build
# Frontend: http://localhost:3000
# Backend API: http://localhost:8080
```

---

## How It Works

### Bytecode Instrumentation & Shadow Stack (ASM)

The JIV Java Agent attaches to the user's JVM using the `-javaagent` flag. At class load time, **ASM** rewrites every compiled user class to inject callbacks to `JivRuntime` at:
- **Method Entry (`onMethodEnter`)**: Captures input parameters, argument values, and pushes a new shadow frame.
- **Source Line Change (`visitLineNumber`)**: Synchronizes the visualizer's active editor line highlighting.
- **Method Exit (`onMethodExit`)**: Pops the shadow frame and collects return values.

`JivRuntime` maintains a local thread-safe **shadow stack** mirroring the real JVM execution frame states.

### Reflection Heap Walker (BFS Reachability)

At every line step, JIV runs a customized Garbage Collection simulation:
1. **Roots Identification**: The walker starts at active local variables and parameters on all shadow stack frames.
2. **Breadth-First Search**: Traverses the memory graph by analyzing object fields and array elements using Java Reflection.
3. **Reachability Mapping**: Marks all visited objects as `reachable: true` and calculates their reference counts. Objects that lost all root links are flagged as `reachable: false` and turn red inside the canvas, simulating dereferencing prior to a GC sweep.
4. **JVM Module Safety**: Wrapping field access in try-catch blocks ensures that modular encapsulation boundaries in Java 9+ do not crash the runner during core library traversal.

### Generational GC Aging

Objects are tracked inside a long-lived heap registry. Every time `GarbageCollectorMXBean` indicates a GC sweep has occurred:
- **Young Gen**: Objects are initialized with age `0` and a soft green theme.
- **Survivor Gen**: If an object remains reachable after a GC sweep, its age increments. Upon reaching age `2`, it graduates to `SURVIVOR` gen (soft amber).
- **Old (Tenured) Gen**: If it survives up to age `4`, it transitions to `OLD` gen (soft violet).
- **GC sweep**: Unreachable objects are removed from the heap diagram on the subsequent frame.

### Thread Monitors & Deadlock Detection

JIV interfaces with `ThreadMXBean` to monitor concurrency execution:
- **Lock Mapping**: Resolves owned monitors and waiting locks, translating raw identity hashcodes into JIV Heap object IDs. This shows `owns lock` or `waiting on lock` badges on thread cards and links them directly to the corresponding heap nodes.
- **Deadlock Detection**: Calls `findDeadlockedThreads()` to locate cyclic locking chains. Deadlocked threads are highlighted with red alerts, and the **AI Observability Coach** breaks down the circular dependency.

### Structured Concurrency & Virtual Threads

- **Virtual Threads**: Resolves carrier platform threads dynamically via reflection, visualizing virtual tasks nested inside their executing scheduler threads.
- **Hierarchical Scopes**: Reflectively inspects Java 21 `StructuredTaskScope` owners (mapping the `Thread.container` field) to construct hierarchical parent-child thread trees in the UI.

### Spring Boot DI Simulator

- **Stereotype Scanning**: The agent's bytecode transformer intercepts class definitions to detect custom annotations (`@Component`, `@Service`, `@Repository`, `@Controller`).
- **Dependency Mapping**: Inspects fields for `@Autowired` annotations to map dependencies.
- **Bean Context Panel**: Resolves bean links before runtime initialization and visualizes the dependency injection graph on a dedicated dashboard.

### AI Observability Coach (Live NIM Integration)

- **Prompt Construction**: Serializes the active JVM snapshot (threads, call stack, locks, unreachable heap objects) into structured JSON.
- **Nvidia NIM Proxy**: Passes the snapshot context to a secure Next.js API route (`app/api/ai/route.ts`), which queries `meta/llama-3.1-70b-instruct` using `NVIDIA_API_KEY`.
- **Diagnostic Feedback**: Displays live, context-aware explanations of thread deadlocks, GC events, and heap references directly to the user.

### Time-Travel Debugging

Every snapshot is an **immutable, complete record** of the entire JVM state at that step. This means:
- You can scrub to any point without replaying — just load that snapshot
- The Zustand store holds all snapshots in memory as an array
- The scrubber slider simply changes `currentStep` — all panels re-render instantly

### Heap Graph

The React Flow canvas converts `heap: Record<string, HeapObject>` into nodes/edges:
- Each `HeapObject` → one React Flow node
- Each `field.value` that is an object ID (`obj_NNN`) → one directed edge
- Node color = GC generation (Young=green, Survivor=amber, Old=violet)
- Unreachable nodes turn red when a GC event fires

---

## Environment Variables

### Frontend (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=http://localhost:8080/ws
NVIDIA_API_KEY=your_nvidia_nim_api_key
```

### Backend (`application.yml`)

```yaml
spring.datasource.url: jdbc:postgresql://localhost:5432/jivdb
spring.data.redis.host: localhost
jiv.sandbox.timeout-seconds: 15
jiv.sandbox.memory-limit-mb: 256
```

---

## Security

- User code runs in a Docker container with:
  - `--network=none` (no network access)
  - `--memory=256m` (memory limit)
  - `--cpus=0.5` (CPU limit)
  - `--read-only` (read-only filesystem)
  - 15-second execution timeout
- No user code ever runs on the host JVM directly

---

## Java Version Support

Tested with **Java 21 LTS**. Features supported:

- ✅ All core language features
- ✅ Java Records
- ✅ Sealed Classes  
- ✅ Pattern Matching (`instanceof`)
- ✅ Virtual Threads (with carrier platform mappings & structured scope hierarchies)
- ✅ Text Blocks

---

## License

MIT — free to use, modify, and deploy.

---

*Built as a portfolio-grade, open-source JVM education tool. Comparable in scope to a lightweight combination of a debugger, heap analyzer, profiler, and JVM observability platform.*