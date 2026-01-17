-- Tabela de minutas
CREATE TABLE IF NOT EXISTS minutas (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  titulo TEXT NOT NULL,
  process_id TEXT,
  tipo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'rascunho',
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  autor TEXT NOT NULL,
  google_docs_id TEXT,
  google_docs_url TEXT,
  ultima_sincronizacao TIMESTAMP WITH TIME ZONE,
  criado_por_agente BOOLEAN DEFAULT FALSE,
  agente_id TEXT,
  template_id TEXT,
  expediente_id TEXT,
  variaveis JSONB
);

-- Tabela de expedientes
CREATE TABLE IF NOT EXISTS expedientes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  numero_processo TEXT,
  tribunal TEXT,
  tipo TEXT,
  titulo TEXT,
  conteudo TEXT,
  data_disponibilizacao TIMESTAMP WITH TIME ZONE,
  nome_orgao TEXT,
  autor TEXT,
  reu TEXT,
  advogado_autor TEXT,
  advogado_reu TEXT,
  lawyer_name TEXT,
  lido BOOLEAN DEFAULT FALSE,
  arquivado BOOLEAN DEFAULT FALSE,
  analyzed BOOLEAN DEFAULT FALSE,
  priority TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_expedientes_processo ON expedientes(numero_processo);
CREATE INDEX IF NOT EXISTS idx_expedientes_tribunal ON expedientes(tribunal);
CREATE INDEX IF NOT EXISTS idx_expedientes_lido ON expedientes(lido);
CREATE INDEX IF NOT EXISTS idx_expedientes_data ON expedientes(data_disponibilizacao);
CREATE INDEX IF NOT EXISTS idx_expedientes_lawyer ON expedientes(lawyer_name);

CREATE INDEX IF NOT EXISTS idx_minutas_status ON minutas(status);
CREATE INDEX IF NOT EXISTS idx_minutas_tipo ON minutas(tipo);
CREATE INDEX IF NOT EXISTS idx_minutas_autor ON minutas(autor);
CREATE INDEX IF NOT EXISTS idx_minutas_process ON minutas(process_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_expedientes_updated_at BEFORE UPDATE ON expedientes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_minutas_updated_at BEFORE UPDATE ON minutas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
