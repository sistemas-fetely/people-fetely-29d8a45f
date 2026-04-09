/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as conviteCadastro } from './convite-cadastro.tsx'
import { template as cadastroRecebido } from './cadastro-recebido.tsx'
import { template as nfPagamento } from './nf-pagamento.tsx'
import { template as cadastroAprovado } from './cadastro-aprovado.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'convite-cadastro': conviteCadastro,
  'cadastro-recebido': cadastroRecebido,
  'nf-pagamento': nfPagamento,
  'cadastro-aprovado': cadastroAprovado,
}
