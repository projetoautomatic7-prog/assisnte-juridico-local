# 🚀 Guia Rápido - Build e Deploy Local

## ⚡ Execução Rápida

### PowerShell (Recomendado)

```powershell
# Executar build completo + testes + preview
.\build-and-preview.ps1

# Pular instalação de dependências (se já instalou)
.\build-and-preview.ps1 -SkipInstall

# Pular testes (build + preview apenas)
.\build-and-preview.ps1 -SkipTests

# Pular instalação E testes
.\build-and-preview.ps1 -SkipInstall -SkipTests
```

### Batch (Alternativa)

```cmd
build-and-preview.bat
```

---

## ?? O Que os Scripts Fazem