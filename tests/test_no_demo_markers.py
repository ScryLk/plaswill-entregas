"""Guarda de regressão: dados demonstrativos e identificadores fictícios não podem voltar.

Este teste roda sem PHP e sem navegador (`python3 -m unittest tests.test_no_demo_markers`
ou pelo discover da suíte). Ele é a barreira contra a reintrodução do seed de primeira
execução (ENT-001/ENT-005) e de códigos de rota inventados em documentos (ENT-002).
"""

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNTIME_FILES = [
    'app.js',
    'routines.js',
    'motorista.js',
    'outbox.js',
    'session.js',
    'sw.js',
    'index.html',
    'motorista.html',
]
FORBIDDEN_MARKERS = [
    r'checkFirstRunSeed',
    r'seedDemo',
    r'demoSeed',
    r'\bROT-0001\b',
    r'\bROT-XXXX\b',
]


class NoDemoMarkers(unittest.TestCase):
    def test_no_demo_seed_or_fixture_markers(self):
        for name in RUNTIME_FILES:
            text = (ROOT / name).read_text(encoding='utf-8')
            for pattern in FORBIDDEN_MARKERS:
                self.assertIsNone(
                    re.search(pattern, text),
                    f'marcador proibido {pattern!r} reapareceu em {name}')

    def test_print_sheet_route_code_is_filled_only_from_server(self):
        html = (ROOT / 'index.html').read_text(encoding='utf-8')
        match = re.search(r'id="print-route-code"[^>]*>([^<]*)<', html)
        self.assertIsNotNone(match, 'folha de impressão sem o campo print-route-code')
        self.assertEqual(
            match.group(1).strip(), '',
            'o código de rota impresso deve vir do registro do servidor, nunca de um valor fixo')

    def test_every_local_asset_reference_is_versioned(self):
        for page in ('index.html', 'motorista.html'):
            html = (ROOT / page).read_text(encoding='utf-8')
            refs = re.findall(r'(?:src|href)="([^"]+\.(?:js|css))(\?[^"]*)?"', html)
            for path, query in refs:
                if path.startswith('http://') or path.startswith('https://'):
                    continue
                self.assertRegex(
                    query, r'^\?v=\d+$',
                    f'{page}: {path} sem ?v= — cache antigo pode servir conteúdo novo')

    def test_service_worker_assets_match_driver_page_versions(self):
        sw = (ROOT / 'sw.js').read_text(encoding='utf-8')
        page = (ROOT / 'motorista.html').read_text(encoding='utf-8')
        for asset in ('motorista.js', 'outbox.js', 'motorista.css'):
            in_sw = re.search(r'\./' + re.escape(asset) + r'\?v=(\d+)', sw)
            in_page = re.search(re.escape(asset) + r'\?v=(\d+)', page)
            self.assertIsNotNone(in_sw, f'sw.js não pré-cacheia {asset}')
            self.assertIsNotNone(in_page, f'motorista.html não referencia {asset} com versão')
            self.assertEqual(
                in_sw.group(1), in_page.group(1),
                f'sw.js e motorista.html divergem na versão de {asset} — o motorista pode ficar em cache misto')


if __name__ == '__main__':
    unittest.main()
