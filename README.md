# Plaswill Entregas 🚚

> **Plataforma Web & PWA de Roteirização, Despacho e Gestão de Entregas de Última Milha**  
> *Plaswill Indústria de Termoplásticos & Lótus Descartáveis — Panambi, RS*

[![PHP](https://img.shields.io/badge/PHP-8.3-777BB4?style=flat&logo=php&logoColor=white)](https://www.php.net/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-199900?style=flat&logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash_Vision-4285F4?style=flat&logo=google&logoColor=white)](https://aistudio.google.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Status](https://img.shields.io/badge/Produção-Online-10B981?style=flat)](https://entregas.plaswill.tech)

---

## 📌 Visão Geral

O **Plaswill Entregas** é um sistema moderno de logística de distribuição municipal e regional desenvolvido para simplificar e acelerar a expedição de mercadorias no polo industrial de Panambi e cidades vizinhas.

A aplicação atende a duas frentes operacionais integradas:
1. **Expedição & Faturamento (Desktop):** Gestão visual da carga no mapa interativo (GIS), extração de notas fiscais via IA (Google Gemini Vision), sequenciamento inteligente de paradas e impressão de romaneio A4.
2. **Motorista em Trânsito (Mobile PWA):** Interface *mobile-first* com navegação direta em 1-clique para **Waze** e **Google Maps**, barra de progresso da viagem e confirmação de entrega em tempo real.

---

## 🚀 Principais Funcionalidades

* 🗺️ **Mapa Interativo GIS:** Baseado em Leaflet.js e camadas profissionais Esri (*World Street Map* e *Satélite alta resolução*).
* 📍 **Dispersão Anti-Sobreposição (Spiderfier Jitter):** Algoritmo radial que evita colisão visual quando múltiplos pedidos são entregues no mesmo endereço ou prédio.
* 📷 **Leitura de DANFE via Visão Computacional (Gemini 2.5 Flash):** O operador fotografa a nota fiscal física e a IA extrai automaticamente destinatário, NF-e, volumes e endereço completo.
* 🏢 **Catálogo Local com 1.604 Clientes:** Autocomplete instantâneo integrado à base cadastral corporativa.
* 🧭 **Normalização de Vias de Panambi:** Mapeamento inteligente de nomes populares e abreviações para vias oficiais do OpenStreetMap (ex: *Pres Kennedy* $\rightarrow$ *Avenida Presidente Kennedy*, *Richard Saur* $\rightarrow$ *Rua Richard Sauer*).
* ⚡ **Sequenciamento Ótimo de Rota:** Heurística do Vizinho Mais Próximo (*Nearest Neighbor*) baseada no cálculo geodésico de Haversine para minimizar quilômetros rodados.
* 🏁 **Ciclo de Vida "Rotina de Entregas":** Gestão de viagem (`Em Andamento` $\rightarrow$ `Finalizar Rotina`), com cálculo de taxa de eficácia e arquivamento corporativo em histórico.
* 📱 **Modo Motorista PWA:** Funciona como app instalado no smartphone, com deep links para Waze/Maps e cache offline resiliente.
* 📄 **Romaneio Impresso A4:** Folha de carga pronta para impressão com QR Code para o motorista carregar a rota no celular.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologias |
| :--- | :--- |
| **Frontend Desktop** | HTML5, CSS3 Variables, JavaScript Vanilla (ES6+), Leaflet 1.9.4, QRCode.js |
| **Frontend Mobile** | PWA (Web App Manifest), Mobile First CSS, Touch Gestures |
| **Backend REST** | PHP 8.3 (Apache) e Python 3 (servidor autônomo local) |
| **Inteligência Artificial** | Google Gemini API (`gemini-2.5-flash`) via Vision REST |
| **Geocodificação & GIS** | OpenStreetMap Nominatim API + Esri ArcGIS Tile Server |
| **Infraestrutura** | VPS Linux Debian 12, Docker Compose, Caddy v2 (Reverse Proxy / TLS automático) |

---

## 💻 Como Rodar Localmente (Desenvolvimento)

O frontend continua vanilla. O servidor Python local agora encaminha todas as APIs à implementação PHP compartilhada, incluindo histórico e finalização. Requer Python 3 e PHP 8.2+ com curl. Use somente em desenvolvimento; a autorização falha fechada sem uma integração de identidade configurada e válida. O login OAuth2 nativo GED/Nextcloud está implementado com sessões, CSRF e grupos; a integração real ainda depende de configuração e validação administrativa. Veja [autenticação](docs/AUTHENTICATION.md).

Para testes isolados com identidades sintéticas e sem dados reais:

```bash
ENTREGAS_PHP_BIN=php python3 -m unittest discover -s tests -v
node --test tests/outbox.test.js
```

Para iniciar o shell e APIs locais (operações restritas retornam 401 até existir identidade válida):

```bash
# 1. Clonar o repositório
git clone https://github.com/ScryLk/plaswill-entregas.git
cd plaswill-entregas

# 2. PHP deve estar no PATH, ou configure ENTREGAS_PHP_BIN.
# GEMINI_API_KEY é opcional e deve ser configurada de forma segura.
# Não copie uma chave fictícia para api/.env.

# 3. Iniciar o servidor
python3 server.py
```

Acesse no navegador:
* 🖥️ **Painel da Expedição:** [http://localhost:8085](http://localhost:8085)
* 📱 **Visão do Motorista:** [http://localhost:8085/motorista.html](http://localhost:8085/motorista.html)

---

## 📦 Estrutura de Diretórios

```
plaswill-entregas/
├── index.html                   # Painel Desktop da Expedição
├── app.js                       # Controlador mestre do Frontend (DeliveryPlanner)
├── style.css                    # Estilos Desktop e regras de impressão A4
├── motorista.html               # Aplicação Mobile First do Motorista
├── motorista.js                 # Controlador Frontend do Motorista (DriverApp)
├── motorista.css                # Estilos adaptados para telas touch
├── manifest.json                # Manifesto PWA
├── qrcode.min.js                # Biblioteca geradora de QR Code
├── server.py                    # Servidor local autônomo Python (porta 8085)
├── DEPLOY.md                    # Documentação de infraestrutura e deploy
│
├── api/                         # Backend REST em PHP 8.3
│   ├── config.php               # CORS, aliases de Panambi e geocodeAddress()
│   ├── process_danfe.php        # OCR semântico de DANFEs via Gemini Vision
│   ├── geocode.php              # Geocodificação síncrona
│   ├── search_company.php       # Autocomplete na base local de clientes
│   ├── optimize_sequence.php    # Roteirização pelo Vizinho Mais Próximo
│   ├── save_route.php           # Criação e despacho de rotas (ROT-XXXX)
│   ├── get_route.php            # Consulta de rota ativa
│   ├── update_route_status.php  # Atualização do status da entrega
│   ├── finish_route.php         # Conclusão e arquivamento da rotina
│   ├── get_history.php          # Histórico de rotinas finalizadas
│   ├── companies_db.json        # Base de 1.604 empresas cadastradas
│   └── street_coords_cache.json # Cache de vias normalizadas de Panambi
│
├── data/                        # Armazenamento de rotas e histórico
│   ├── routes/                  # Arquivos de rotas ativas (ROT-XXXX.json)
│   └── routes_history.json      # Histórico de rotinas concluídas
│
└── img/ & icons/                # Ícones, vetores e logotipos corporativos
```

---

## 🔒 Variáveis de Ambiente

Configure GEMINI_API_KEY com segurança em ambiente ou api/.env ignorado; não use o placeholder em produção:

```ini
GEMINI_API_KEY=sua_chave_gemini_aqui
```

---

## 📄 Licença e Uso

Propriedade de **Plaswill Indústria de Termoplásticos Ltda** e **Lótus Descartáveis**.  
Panambi - RS, Brasil.


## Segurança e compatibilidade desta evolução

Não implantar sem revisar [segurança](docs/SECURITY_REVIEW.md) e [plano de implantação](DEPLOY.md). Os links antigos ROT-XXXX sozinhos deixam de autorizar o motorista; operadores precisam reemitir links com capacidade por rota. Dados internos devem ser bloqueados pelo web server. A origem padrão está em origin.json; alterações do ponto de saída dependem de confirmação operacional.

[Arquitetura e fluxos](docs/ARCHITECTURE.md) · [Contratos HTTP](docs/API_CONTRACTS.md) · [Testes](docs/TEST_PLAN.md) · [Implementações e pendências](docs/IMPLEMENTATION_PLAN.md).

O botão **Entrar pelo GED** inicia o OAuth2 quando configurado. Nenhuma senha corporativa é capturada. Supervisão é somente leitura; Diretoria/admin têm privilégios cumulativos. Configuração em api/.env.example, com segredo vazio para preenchimento seguro pelo administrador.


## Gestão de Rotinas de Entregas

O painel agora começa em **Rotinas de Entregas**: crie rascunhos no servidor, selecione vários clientes entre pesquisas/páginas, confira endereços e retome o planejamento em outro computador. Planejamento reutiliza mapa, inclusão manual/DANFE, edição, ordenação e otimização. O despacho confirmado associa uma única rota e o link seguro do motorista; progresso, encerramento e cancelamento preservam os dados.

[Fluxo, estados, APIs e validação do módulo](docs/ROUTINES.md). Rotas legadas continuam no Histórico. A camada PHP-FPM/web server precisa permitir os dois novos endpoints públicos e bloquear os módulos privados/data/routines conforme a documentação; não há deploy automático.
