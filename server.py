#!/usr/bin/env python3
"""
Plaswill Entregas - Servidor Local e API Runner
Permite rodar a mini-aplicação completa em qualquer ambiente (Mac/Linux/VPS).
Sem dependências externas além do Python 3 padrão.
"""

import http.server
import socketserver
import os
import json
import urllib.request
import urllib.parse
import base64
import cgi
import math

PORT = int(os.environ.get("PORT", 8085))
WEB_DIR = os.path.dirname(os.path.abspath(__file__))

def get_gemini_key():
    env_path = os.path.join(WEB_DIR, "api", ".env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.strip().startswith("GEMINI_API_KEY="):
                    return line.strip().split("=", 1)[1].strip("\"' ")
    return os.environ.get("GEMINI_API_KEY", "")

GEMINI_API_KEY = get_gemini_key()
GEMINI_MODEL = "gemini-2.5-flash"
PANAMBI_DEFAULT_LAT = -28.2917
PANAMBI_DEFAULT_LON = -53.5019

def geocode_address(query, municipio="Panambi", uf="RS"):
    full_query = query.strip()
    if municipio.lower() not in full_query.lower():
        full_query += f", {municipio}"
    if uf.lower() not in full_query.lower():
        full_query += f" - {uf}"
    full_query += ", Brasil"

    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({
        "q": full_query,
        "format": "json",
        "limit": 1,
        "countrycodes": "br"
    })
    req = urllib.request.Request(url, headers={"User-Agent": "PlaswillEntregasLocal/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=4) as response:
            data = json.loads(response.read().decode())
            if data and len(data) > 0:
                return {
                    "lat": float(data[0]["lat"]),
                    "lon": float(data[0]["lon"]),
                    "display_name": data[0].get("display_name", full_query)
                }
    except Exception as e:
        print(f"[Geocode Error] {e}")
    return None

class DeliveryHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        qs = urllib.parse.parse_qs(parsed.query)

        if path.endswith("/search_company.php") or path.endswith("/search_company"):
            self.handle_search_company(qs)
            return
        elif path.endswith("/geocode.php") or path.endswith("/geocode"):
            self.handle_geocode(qs)
            return
        elif path.endswith("/get_route.php") or path.endswith("/get_route"):
            self.handle_get_route(qs)
            return

        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.endswith("/process_danfe.php") or path.endswith("/process_danfe"):
            self.handle_process_danfe()
            return
        elif path.endswith("/optimize_sequence.php") or path.endswith("/optimize_sequence"):
            self.handle_optimize_sequence()
            return
        elif path.endswith("/save_route.php") or path.endswith("/save_route"):
            self.handle_save_route()
            return
        elif path.endswith("/update_route_status.php") or path.endswith("/update_route_status"):
            self.handle_update_route_status()
            return

        self.send_error(404, "Endpoint não encontrado")

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def handle_search_company(self, qs):
        query = qs.get("q", [""])[0].strip()
        comp_file = os.path.join(WEB_DIR, "api", "companies_db.json")
        companies = []
        if os.path.exists(comp_file):
            try:
                with open(comp_file, "r", encoding="utf-8") as f:
                    companies = json.load(f)
            except Exception:
                pass

        if not query:
            self.send_json({"success": True, "results": companies[:8]})
            return

        results = []
        for c in companies:
            if (query.lower() in c.get("nome", "").lower() or
                query.lower() in c.get("fantasia", "").lower() or
                query.lower() in c.get("logradouro", "").lower()):
                results.append(c)

        if len(results) < 3 and len(query) >= 3:
            # Query Gemini
            gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
            prompt = f"""Você é um catálogo e mapa comercial de Panambi - RS e cidades vizinhas no Rio Grande do Sul.
O usuário está procurando por uma empresa/local digitando: "{query}".
Retorne uma lista JSON com até 3 empresas ou estabelecimentos correspondentes na cidade de Panambi/RS ou região.
Formato exato:
[
  {{
    "nome": "Razão Social ou Nome Completo",
    "fantasia": "Nome Popular ou Comercial",
    "logradouro": "Nome da Rua ou Avenida",
    "numero": "Número do Imóvel",
    "bairro": "Bairro em Panambi",
    "municipio": "Panambi",
    "uf": "RS",
    "cep": "98280-000"
  }}
]
Retorne APENAS o JSON válido sem markdown."""

            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"response_mime_type": "application/json"}
            }
            try:
                req = urllib.request.Request(gemini_url, data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"})
                with urllib.request.urlopen(req, timeout=6) as response:
                    res_data = json.loads(response.read().decode())
                    raw_text = res_data["candidates"][0]["content"]["parts"][0]["text"]
                    ai_list = json.loads(raw_text)
                    for item in ai_list:
                        if not item.get("nome"): continue
                        geo = geocode_address(f"{item.get('logradouro', '')}, {item.get('numero', '')}, {item.get('bairro', '')}")
                        lat = geo["lat"] if geo else PANAMBI_DEFAULT_LAT
                        lon = geo["lon"] if geo else PANAMBI_DEFAULT_LON
                        results.append({
                            "id": f"ai_{os.urandom(4).hex()}",
                            "nome": item.get("nome"),
                            "fantasia": item.get("fantasia") or item.get("nome"),
                            "logradouro": item.get("logradouro", ""),
                            "numero": item.get("numero", ""),
                            "bairro": item.get("bairro", ""),
                            "municipio": item.get("municipio", "Panambi"),
                            "uf": item.get("uf", "RS"),
                            "cep": item.get("cep", "98280-000"),
                            "lat": lat,
                            "lon": lon,
                            "tipo": "ai_search"
                        })
            except Exception as e:
                print(f"[Gemini Company Search Error] {e}")

        self.send_json({"success": True, "query": query, "count": len(results), "results": results})

    def handle_geocode(self, qs):
        query = qs.get("q", [""])[0].strip()
        if not query:
            self.send_json({"error": "Parâmetro 'q' é obrigatório"}, 400)
            return
        geo = geocode_address(query)
        if geo:
            self.send_json({"success": True, "lat": geo["lat"], "lon": geo["lon"], "display_name": geo["display_name"]})
        else:
            self.send_json({"success": False, "lat": PANAMBI_DEFAULT_LAT, "lon": PANAMBI_DEFAULT_LON})

    def handle_process_danfe(self):
        content_type = self.headers.get("Content-Type", "")
        b64_data = ""
        mime_type = "image/jpeg"

        if "multipart/form-data" in content_type:
            # Parse multipart
            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ={"REQUEST_METHOD": "POST", "CONTENT_TYPE": content_type}
            )
            if "file" in form and form["file"].file:
                raw_bytes = form["file"].file.read()
                b64_data = base64.b64encode(raw_bytes).decode("utf-8")
                mime_type = form["file"].type or "image/jpeg"
        else:
            # Parse JSON
            length = int(self.headers.get("Content-Length", 0))
            raw_body = self.rfile.read(length).decode("utf-8")
            data = json.loads(raw_body)
            b64_data = data.get("image_base64", "")
            if "data:" in b64_data and ";base64," in b64_data:
                parts = b64_data.split(";base64,")
                mime_type = parts[0].replace("data:", "")
                b64_data = parts[1]

        if not b64_data:
            self.send_json({"error": "Nenhuma imagem de nota enviada"}, 400)
            return

        gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
        prompt = """Você é um leitor especialista de DANFEs e Notas Fiscais Eletrônicas brasileiras (NF-e).
Analise a imagem da nota fiscal e extraia com máxima fidelidade os dados do destinatário e da entrega.

Retorne estritamente um JSON no seguinte formato:
{
  "numero_nota": "número da nota ou DANFE",
  "serie": "série se houver",
  "emitente": "razão social do emitente",
  "destinatario": "razão social completa do destinatário",
  "nome_fantasia": "nome comercial do destinatário se identificado",
  "cnpj_destinatario": "CNPJ do destinatário",
  "endereco": {
    "logradouro": "rua ou avenida",
    "numero": "número do imóvel",
    "complemento": "",
    "bairro": "bairro",
    "municipio": "cidade (ex: Panambi)",
    "uf": "sigla (ex: RS)",
    "cep": "CEP formatado"
  },
  "itens_resumo": "resumo dos produtos e volumes"
}
Retorne APENAS o JSON válido sem markdown."""

        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {"inline_data": {"mime_type": mime_type, "data": b64_data}}
                ]
            }],
            "generationConfig": {"response_mime_type": "application/json", "temperature": 0.1}
        }

        try:
            req = urllib.request.Request(gemini_url, data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=25) as response:
                res_data = json.loads(response.read().decode())
                raw_text = res_data["candidates"][0]["content"]["parts"][0]["text"]
                extracted = json.loads(raw_text)

                destinatario = extracted.get("destinatario", "")
                endereco = extracted.get("endereco", {})
                logradouro = endereco.get("logradouro", "")
                numero = endereco.get("numero", "")
                bairro = endereco.get("bairro", "")
                municipio = endereco.get("municipio", "Panambi")
                uf = endereco.get("uf", "RS")

                # Checa na base local
                lat, lon = None, None
                comp_file = os.path.join(WEB_DIR, "api", "companies_db.json")
                if os.path.exists(comp_file):
                    with open(comp_file, "r", encoding="utf-8") as f:
                        for c in json.load(f):
                            if destinatario.lower() in c.get("nome", "").lower() or c.get("nome", "").lower() in destinatario.lower():
                                lat = c.get("lat")
                                lon = c.get("lon")
                                break

                if not lat or not lon:
                    geo = geocode_address(f"{logradouro}, {numero}, {bairro}", municipio, uf)
                    if geo:
                        lat = geo["lat"]
                        lon = geo["lon"]
                    else:
                        lat = PANAMBI_DEFAULT_LAT
                        lon = PANAMBI_DEFAULT_LON

                delivery = {
                    "id": f"del_{os.urandom(4).hex()}",
                    "destinatario": destinatario,
                    "nome_fantasia": extracted.get("nome_fantasia") or destinatario,
                    "numero_nota": extracted.get("numero_nota", ""),
                    "serie": extracted.get("serie", ""),
                    "emitente": extracted.get("emitente", ""),
                    "cnpj": extracted.get("cnpj_destinatario", ""),
                    "logradouro": logradouro,
                    "numero": numero,
                    "bairro": bairro,
                    "municipio": municipio,
                    "uf": uf,
                    "cep": endereco.get("cep", ""),
                    "endereco_completo": f"{logradouro}, {numero} - {bairro}, {municipio} - {uf}",
                    "itens_resumo": extracted.get("itens_resumo", ""),
                    "lat": lat,
                    "lon": lon,
                    "status": "pending",
                    "created_at": "2026-10-23T09:00:00Z"
                }

                self.send_json({"success": True, "delivery": delivery})
        except Exception as e:
            print(f"[Process Danfe Error] {e}")
            self.send_json({"error": "Falha ao processar DANFE", "details": str(e)}, 500)

    def handle_optimize_sequence(self):
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length).decode("utf-8"))
        stops = body.get("stops", [])
        origin = body.get("origin", {"lat": -28.2745, "lon": -53.5182})

        if not stops:
            self.send_json({"error": "Lista de paradas vazia"}, 400)
            return

        unvisited = list(stops)
        ordered = []
        cur_lat = float(origin.get("lat", PANAMBI_DEFAULT_LAT))
        cur_lon = float(origin.get("lon", PANAMBI_DEFAULT_LON))

        while unvisited:
            nearest_idx = 0
            min_dist = float("inf")
            for idx, stop in enumerate(unvisited):
                s_lat = float(stop.get("lat", PANAMBI_DEFAULT_LAT))
                s_lon = float(stop.get("lon", PANAMBI_DEFAULT_LON))
                dist = math.hypot(s_lat - cur_lat, s_lon - cur_lon)
                if dist < min_dist:
                    min_dist = dist
                    nearest_idx = idx

            chosen = unvisited.pop(nearest_idx)
            ordered.append(chosen)
            cur_lat = float(chosen.get("lat", cur_lat))
            cur_lon = float(chosen.get("lon", cur_lon))

        self.send_json({"success": True, "ordered_stops": ordered, "count": len(ordered)})

    def handle_save_route(self):
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length).decode("utf-8"))
        stops = body.get("stops", [])
        origin = body.get("origin")
        motorista = body.get("motorista", "Motorista da Expedição").strip()
        veiculo = body.get("veiculo", "Furgão / Utilitário").strip()

        if not stops:
            self.send_json({"error": "Nenhuma parada de entrega para salvar."}, 400)
            return

        import random, datetime
        chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
        code = "ROT-" + "".join(random.choice(chars) for _ in range(4))

        routes_dir = os.path.join(WEB_DIR, "data", "routes")
        os.makedirs(routes_dir, exist_ok=True)

        now = datetime.datetime.now()
        data_formatada = now.strftime("%d/%m/%Y %H:%M")

        route_data = {
            "route_id": code,
            "created_at": now.isoformat(),
            "data_formatada": data_formatada,
            "motorista": motorista,
            "veiculo": veiculo,
            "origin": origin,
            "total_stops": len(stops),
            "stops": stops
        }

        with open(os.path.join(routes_dir, f"{code}.json"), "w", encoding="utf-8") as f:
            json.dump(route_data, f, ensure_ascii=False, indent=2)

        host = self.headers.get("Host", f"localhost:{PORT}")
        share_url = f"http://{host}/motorista.html?r={code}"

        self.send_json({
            "success": True,
            "route_id": code,
            "share_url": share_url,
            "total_stops": len(stops),
            "data_formatada": data_formatada
        })

    def handle_update_route_status(self):
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length).decode("utf-8"))
        route_id = str(body.get("route_id", body.get("r", ""))).strip()
        stop_id = str(body.get("stop_id", "")).strip()
        new_status = str(body.get("status", "delivered")).strip()

        if not route_id or not stop_id:
            self.send_json({"error": "Parâmetros 'route_id' e 'stop_id' são obrigatórios."}, 400)
            return

        import re, datetime
        safe_id = re.sub(r'[^A-Za-z0-9_-]', '', route_id)
        routes_dir = os.path.join(WEB_DIR, "data", "routes")
        file_path = os.path.join(routes_dir, f"{safe_id}.json")

        if not os.path.exists(file_path):
            self.send_json({"error": f"Rota '{safe_id}' não encontrada."}, 404)
            return

        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        found = False
        stops = data.get("stops", [])
        for stop in stops:
            if str(stop.get("id", "")) == stop_id:
                stop["status"] = new_status
                stop["updated_at"] = datetime.datetime.now().isoformat()
                found = True
                break

        if not found:
            self.send_json({"error": f"Parada '{stop_id}' não encontrada nesta rota."}, 404)
            return

        delivered_count = sum(1 for s in stops if s.get("status") == "delivered")
        data["delivered_stops"] = delivered_count
        data["last_update"] = datetime.datetime.now().isoformat()

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        self.send_json({
            "success": True,
            "route_id": safe_id,
            "stop_id": stop_id,
            "status": new_status,
            "delivered_stops": delivered_count,
            "total_stops": len(stops)
        })

    def handle_get_route(self, qs):
        route_id = qs.get("id", qs.get("r", [""]))[0].strip()
        if not route_id:
            self.send_json({"error": "Parâmetro 'id' ou 'r' obrigatório"}, 400)
            return

        import re
        safe_id = re.sub(r'[^A-Za-z0-9_-]', '', route_id)
        routes_dir = os.path.join(WEB_DIR, "data", "routes")
        file_path = os.path.join(routes_dir, f"{safe_id}.json")

        if not os.path.exists(file_path):
            self.send_json({"error": f"Rota '{safe_id}' não encontrada"}, 404)
            return

        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.send_json({"success": True, "route": data})

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), DeliveryHandler) as httpd:
        print(f"🚀 Plaswill Entregas rodando em: http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nEncerrando servidor.")
