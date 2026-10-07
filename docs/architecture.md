# HTC System Architecture

## HTC System

The HTC System consists of the shared System Foundation, a future Public/User Application, and a future Founder/Admin Application.

## System Foundation

The System Foundation is shared, framework-independent infrastructure and governing documentation. It must remain independent from application presentation layers.

## Public/User Application

The Public/User Application is a future application layer for public and user-facing experiences. It is outside T01.

## Founder/Admin Application

The Founder/Admin Application is a future application layer for founder and administrative experiences. It is outside T01.

## Dependency direction

Future application layers may depend on the Foundation. The Foundation must not depend on future application presentation layers.

## Separation of concerns

Foundation concerns, public/user presentation, and founder/admin presentation are separate concerns with separate task boundaries. No application feature, UI, runtime, database, authentication, authorization, or API is implemented by T01.

## Future application boundaries

Later approved tasks may create the two application layers. They must consume the Foundation through explicit, reviewed boundaries and must not make presentation concerns Foundation dependencies.

## Prohibited cross-layer dependency

Foundation code and documentation must not import, require, embed, or otherwise depend on future application presentation layers. T01 creates no runtime code.
