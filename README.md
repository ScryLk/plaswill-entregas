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

O projeto possui um servidor Python zero-dependências integrado que simula todos os endpoints da API PHP:

```bash
# 1. Clonar o repositório
git clone https://github.com/ScryLk/plaswill-entregas.git
cd plaswill-entregas

# 2. Configurar a chave de API da IA (opcional, para leitura de DANFE)
cp api/.env.example api/.env
# Edite api/.env adicionando sua GEMINI_API_KEY do Google AI Studio

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

Crie o arquivo `api/.env` (não versionado) a partir de `api/.env.example`:

```ini
GEMINI_API_KEY=sua_chave_gemini_aqui
```

---

## 📄 Licença e Uso

Propriedade de **Plaswill Indústria de Termoplásticos Ltda** e **Lótus Descartáveis**.  
Panambi - RS, Brasil.
