---
name: Super admin bypasses form validation
description: Super admin users can save all forms without required field validation
type: feature
---
- All wizard forms (CLT, PJ) skip zod schema validation for super_admin
- All inline form dialogs (NF, Pagamentos) skip required field checks for super_admin
- super_admin also bypasses react-hook-form's handleSubmit validation (calls onSubmit directly)
- Files affected: CadastroColaboradorCLT, CadastroContratoPJ, ImportNFDialog, NotasFiscais, PagamentosPJ, ContratoPJDetalhe
