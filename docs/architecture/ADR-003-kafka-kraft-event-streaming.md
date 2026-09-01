# ADR-003: Apache Kafka in KRaft Mode for Domain Event Streaming

## Status
Accepted

## Context
Asynchronous operations (resume parsing, ATS scoring, match report generation, notification dispatch) require decoupled event distribution. We evaluated:
1. Direct synchronous HTTP calls between services.
2. In-memory queues (BullMQ / Redis).
3. RabbitMQ.
4. Apache Kafka with ZooKeeper.
5. Apache Kafka in KRaft (Kafka Raft Metadata) mode.

## Decision
We chose **Apache Kafka in KRaft mode** (`apache/kafka:3.7.0`) for domain events:
- No ZooKeeper dependency, eliminating extra container memory footprint and operational complexity.
- Domain events published: `resume.uploaded`, `resume.parsed`, `resume.analyzed`, `application.created`, `application.status_changed`, `match.completed`, `payment.completed`.
- Worker consumer groups independently consume and process events at their own rate.

RabbitMQ is explicitly deferred from v1 to prevent overlapping architectural responsibilities. If advanced AMQP task-routing or specific dead-letter semantics are needed later, it can be introduced in a future phase.

## Consequences
### Positive
- High-throughput, persistent event logs with replayability.
- KRaft mode allows running a single, self-managed metadata quorum broker in Docker without ZooKeeper.
- Natural decoupling between HTTP request life-cycles and heavy AI background workloads.

### Trade-offs
- Requires Kafka client configuration in Node.js (`kafkajs`) and Python (`aiokafka`).
