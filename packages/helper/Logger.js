/**
 * Minimal pluggable logging/error-reporting interface for time-fit packages.
 *
 * This file defines the *shape* only, as a JSDoc typedef — it introduces no behavior change
 * and rewires no existing `console.*` call sites. Consuming code keeps calling `console.*`
 * directly until a later stage (see docs/refactor-plan.md, Stage 3b/5) wires a concrete
 * implementation of this interface through the packages that currently hardcode output.
 *
 * @typedef {object} Logger
 * @property {(message: string, ...meta: unknown[]) => void} debug
 *   Low-level diagnostic detail, off by default in production.
 * @property {(message: string, ...meta: unknown[]) => void} info
 *   Normal operational messages (e.g. "task executed for user X").
 * @property {(message: string, ...meta: unknown[]) => void} warn
 *   Recoverable but noteworthy conditions (e.g. a retried remote call).
 * @property {(message: string, ...meta: unknown[]) => void} error
 *   Failures that need attention; implementations should include structured context
 *   (error signature, stack trace, correlation ID) rather than a bare message.
 */

export {};
