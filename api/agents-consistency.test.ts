import { describe, it, expect, vi } from 'vitest';
import { getDefaultAgentes } from './kv';
import { getSystemPrompt, AgentType } from './agents';

// Mock dependencies to prevent import errors during testing
vi.mock('@upstash/redis', () => ({ Redis: class {} }));
vi.mock('./lib/error-handler.js', () => ({ handleError: vi.fn(), withErrorHandler: vi.fn() }));
vi.mock('./lib/rate-limit.js', () => ({ rateLimitMiddleware: vi.fn() }));
vi.mock('./lib/safe-logger.js', () => ({ SafeLogger: class { info(){} error(){} warn(){} } }));
vi.mock('../src/lib/agent-monitoring.js', () => ({ agentMonitor: {} }));
vi.mock('../src/lib/agent-schemas.js', () => ({ 
  AnalyzeIntimationInputSchema: { safeParse: vi.fn() }, 
  DraftPetitionInputSchema: { safeParse: vi.fn() } 
}));
vi.mock('../src/lib/legal-memory.js', () => ({ legalMemory: {} }));
vi.mock('../src/lib/tracing.js', () => ({ tracingService: { startSpan: vi.fn(), setAttribute: vi.fn(), addEvent: vi.fn(), endSpan: vi.fn() } }));
vi.mock('./lib/minuta-service-backend.js', () => ({ createMinutaFromAgentTask: vi.fn() }));

describe('Agents Consistency', () => {
  const agents = getDefaultAgentes();
  const fallbackPrompt = "Você é um assistente jurídico inteligente.";

  it('should have a valid AgentType for every agent in KV', () => {
    const validTypes = Object.values(AgentType) as string[];
    
    agents.forEach(agent => {
      expect(validTypes).toContain(agent.type);
    });
  });

  it('should have a specific system prompt for every agent in KV', () => {
    agents.forEach(agent => {
      const prompt = getSystemPrompt(agent.type as AgentType);
      
      // O prompt deve existir
      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(10);

      // O prompt NÃO deve ser o fallback genérico
      if (prompt === fallbackPrompt) {
        throw new Error(`Agent '${agent.name}' (type: ${agent.type}) is using the fallback prompt. Please define a specific prompt in api/agents.ts`);
      }
      expect(prompt).not.toBe(fallbackPrompt);
    });
  });

  it('should match agent IDs with documentation/expectations', () => {
    // Verifica se IDs críticos não foram alterados acidentalmente
    const criticalAgentIds = [
      'harvey',
      'justine',
      'monitor-djen',
      'gestao-prazos',
      'redacao-peticoes'
    ];

    const existingIds = agents.map(a => a.id);
    
    criticalAgentIds.forEach(id => {
      expect(existingIds).toContain(id);
    });
  });
});