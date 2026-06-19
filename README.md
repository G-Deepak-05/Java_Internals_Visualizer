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

### Phase 1 — MVP (Implemented)

| Feature | Description |
|---|---|
| **Monaco Code Editor** | VS Code engine with JIV dark theme, Java syntax, active-line highlighting |
| **Stack Visualization** | Animated frame push/pop, depth coloring, local variable table, recursion counter |
| **Heap Explorer** | React Flow interactive graph, object nodes with fields, generation labels |
| **Reference Tracking** | Directed edges between stack vars and heap objects, animated on hover |
| **GC Reachability** | Unreachable objects turn red; GC event banner with phase info |
| **Thread Panel** | All JVM threads with live state badges (RUNNABLE/BLOCKED/WAITING etc.) |
| **Bytecode Panel** | Dual-view of current method bytecode with active instruction highlighted |
| **String Pool Panel** | Live view of interned string pool contents |
| **Metaspace Panel** | Loaded classes split by user vs system classes |
| **Time-Travel Debugger** | Step forward/backward through every JVM state snapshot |
| **Playback Control** | Play/pause with 0.25×–4× speed, scrubber slider |
| **10 Preset Programs** | Factorial, Fibonacci, OOP, String Pool, GC demo, Records, and more |
| **Resizable Split Layout** | Drag-to-resize editor vs visualization column |
| **Panel Toggles** | Show/hide any panel from the toolbar |
| **Sandboxed Execution** | Docker-isolated, memory/CPU-limited, 15s timeout |

### Phase 2 — Coming Soon

- Virtual Thread + carrier thread mapping
- synchronized block / monitor visualization
- Deadlock detection overlay
- Structured Concurrency (Java 21)

### Phase 3 — Roadmap

- JIT compilation event visualization
- Generational GC animation (Young → Survivor → Old)
- Spring Boot context visualization
- AI-powered "Why was this object GC'd?" explanations

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
│       └── presets.ts           # 10 preset Java programs
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
# Produces: agent/target/jiv-agent.jar
```

### 3. Start Backend

```bash
# Start dependencies first
cd docker && docker-compose up postgres redis -d

# Start backend
cd backend
./mvnw spring-boot:run -Djiv.agent.jar=../agent/target/jiv-agent.jar
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

### Java Agent (The Core)

The JIV Java Agent attaches to the user's JVM using the `-javaagent` flag. At class load time, **ASM** rewrites every user class to inject calls to `JivRuntime` at:

- Every **source line change** (`visitLineNumber`)
- Every **method entry** (`onMethodEnter`)
- Every **method exit** (`onMethodExit`)

`JivRuntime` then:
1. Maintains a **shadow stack** per thread (mirroring the real JVM stack)
2. Collects **thread states** via `ThreadMXBean`
3. Detects **GC events** via `GarbageCollectorMXBean`
4. Captures **heap objects** via reflection (field-by-field)
5. Serializes all this as `SnapshotData` JSON and queues it for stdout emission

The backend reads each JSON line, stores it in Redis, and broadcasts it over WebSocket.

### Time-Travel Debugging

Every snapshot is an **immutable, complete record** of the entire JVM state at that step. This means:
- You can scrub to any point without replaying — just load that snapshot
- The Zustand store holds all snapshots in memory as an array
- The scrubber slider simply changes `currentStep` — all panels re-render instantly

### Heap Graph

The React Flow canvas converts `heap: Record<string, HeapObject>` into nodes/edges:
- Each `HeapObject` → one React Flow node
- Each `field.value` that is an object ID (`obj_NNN`) → one directed edge
- Node color = GC generation (Young=cyan, Survivor=purple, Old=orange)
- Unreachable nodes turn red when a GC event fires

---

## Environment Variables

### Frontend (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=http://localhost:8080/ws
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
- ✅ Virtual Threads (display only, Phase 2 for visualization)
- ✅ Text Blocks

---

## License

MIT — free to use, modify, and deploy.

---

*Built as a portfolio-grade, open-source JVM education tool. Comparable in scope to a lightweight combination of a debugger, heap analyzer, profiler, and JVM observability platform.*