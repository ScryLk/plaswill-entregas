<?php
declare(strict_types=1);

/** Read only supported settings; never expand shell syntax or export secrets. */
function setting(string $name, string $default = ''): string {
    $value = getenv($name);
    if ($value !== false) return $value;
    static $fileValues;
    if ($fileValues === null) {
        $fileValues = [];
        $allowed = ['GEMINI_API_KEY','GED_AUTH_TYPE','GED_BASE_URL','GED_CLIENT_ID','GED_CLIENT_SECRET',
            'GED_REDIRECT_URI','GED_CA_BUNDLE','ENTREGAS_ROLE_GROUPS','ENTREGAS_PUBLIC_ORIGIN'];
        $file = __DIR__ . '/.env';
        if (is_file($file)) {
            foreach (file($file, FILE_IGNORE_NEW_LINES) as $line) {
                if (!preg_match('/^\s*([A-Z_]+)\s*=(.*)$/D', $line, $match) || !in_array($match[1], $allowed, true)) continue;
                $v = trim($match[2]);
                if (strlen($v) >= 2 && (($v[0] === '"' && str_ends_with($v, '"')) || ($v[0] === "'" && str_ends_with($v, "'")))) $v = substr($v, 1, -1);
                $fileValues[$match[1]] = $v;
            }
        }
    }
    return $fileValues[$name] ?? $default;
}
