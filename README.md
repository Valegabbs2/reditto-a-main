# Reditto - Correção de Redações ENEM

Plataforma inteligente para correção de redações ENEM com feedback detalhado e notas por competência.

## 🚀 Sobre o Projeto

O Reditto é uma aplicação web desenvolvida para ajudar estudantes a melhorar suas redações do ENEM através de correções inteligentes e feedback detalhado por competência.

## ✨ Funcionalidades

- **Correção Inteligente**: Análise automática de redações usando IA
- **Feedback Detalhado**: Comentários específicos por competência
- **Interface Moderna**: Design responsivo e intuitivo
- **Tema Escuro/Claro**: Suporte a diferentes preferências visuais
- **Upload de Imagens**: Possibilidade de enviar redações em formato de imagem

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React + TypeScript + Vite
- **UI**: Tailwind CSS + Shadcn/ui
- **Backend**: Supabase (Funções Edge)
- **IA**: OpenRouter API
- **Deploy**: Vercel
- **Analytics**: Vercel Analytics

## 📦 Instalação

1. Clone o repositório:
```bash
git clone [URL_DO_REPOSITORIO]
cd reditto-a-main
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
# Crie um arquivo .env.local com as seguintes variáveis:
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
VITE_OPENROUTER_API_KEY=sua_chave_da_openrouter
```

4. Execute o projeto:
```bash
npm run dev
```

## 🚀 Deploy

O projeto está configurado para deploy automático no Vercel. Para fazer deploy:

1. Conecte seu repositório ao Vercel
2. Configure as variáveis de ambiente no painel do Vercel
3. O deploy será feito automaticamente a cada push

## 📁 Estrutura do Projeto

```
src/
├── components/     # Componentes reutilizáveis
├── pages/         # Páginas da aplicação
├── hooks/         # Custom hooks
├── lib/           # Utilitários
└── integrations/  # Integrações externas (Supabase)
```

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Contato

- **Email**: [seu-email@exemplo.com]
- **LinkedIn**: [seu-linkedin]
- **Portfolio**: [seu-portfolio]

---

Desenvolvido com ❤️ para ajudar estudantes a alcançarem seus objetivos no ENEM.
