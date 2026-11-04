-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "papel" TEXT NOT NULL DEFAULT 'OPERADOR',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "ultimoLoginEm" DATETIME,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "config_smtp" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'unica',
    "host" TEXT NOT NULL,
    "porta" INTEGER NOT NULL DEFAULT 587,
    "sslDireto" BOOLEAN NOT NULL DEFAULT false,
    "aceitarCertificadoInvalido" BOOLEAN NOT NULL DEFAULT false,
    "usuario" TEXT,
    "senhaCifrada" TEXT,
    "remetenteEmail" TEXT NOT NULL,
    "remetenteNome" TEXT NOT NULL,
    "loteTamanho" INTEGER NOT NULL DEFAULT 5,
    "loteIntervaloMin" INTEGER NOT NULL DEFAULT 1,
    "anexoMaxMb" INTEGER NOT NULL DEFAULT 10,
    "ultimoTesteEm" DATETIME,
    "ultimoTesteOk" BOOLEAN,
    "ultimoTesteMensagem" TEXT,
    "atualizadoEm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "produtoId" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "clientes_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "contatos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clienteId" TEXT NOT NULL,
    "nome" TEXT,
    "email" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contatos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "descadastros" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "motivo" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "cartas_modelo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "corpoHtml" TEXT NOT NULL,
    "produtoId" TEXT,
    "criadoPorId" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "cartas_modelo_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "cartas_modelo_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "anexos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cartaId" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "caminho" TEXT NOT NULL,
    "tamanhoBytes" INTEGER NOT NULL,
    "tipoMime" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "anexos_cartaId_fkey" FOREIGN KEY ("cartaId") REFERENCES "cartas_modelo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "envios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cartaId" TEXT,
    "assunto" TEXT NOT NULL,
    "corpoHtml" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
    "agendadoPara" DATETIME,
    "iniciadoEm" DATETIME,
    "concluidoEm" DATETIME,
    "criadoPorId" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "envios_cartaId_fkey" FOREIGN KEY ("cartaId") REFERENCES "cartas_modelo" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "envios_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "envio_destinatarios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "envioId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT,
    "clienteNome" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "erro" TEXT,
    "lote" INTEGER,
    "enviadoEm" DATETIME,
    CONSTRAINT "envio_destinatarios_envioId_fkey" FOREIGN KEY ("envioId") REFERENCES "envios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" TEXT,
    "acao" TEXT NOT NULL,
    "alvo" TEXT,
    "detalhe" TEXT,
    "ip" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "produtos_nome_key" ON "produtos"("nome");

-- CreateIndex
CREATE INDEX "clientes_produtoId_idx" ON "clientes"("produtoId");

-- CreateIndex
CREATE INDEX "contatos_email_idx" ON "contatos"("email");

-- CreateIndex
CREATE UNIQUE INDEX "contatos_clienteId_email_key" ON "contatos"("clienteId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "descadastros_email_key" ON "descadastros"("email");

-- CreateIndex
CREATE INDEX "cartas_modelo_produtoId_idx" ON "cartas_modelo"("produtoId");

-- CreateIndex
CREATE INDEX "anexos_cartaId_idx" ON "anexos"("cartaId");

-- CreateIndex
CREATE INDEX "envios_status_agendadoPara_idx" ON "envios"("status", "agendadoPara");

-- CreateIndex
CREATE INDEX "envio_destinatarios_envioId_status_idx" ON "envio_destinatarios"("envioId", "status");

-- CreateIndex
CREATE INDEX "auditoria_criadoEm_idx" ON "auditoria"("criadoEm");
