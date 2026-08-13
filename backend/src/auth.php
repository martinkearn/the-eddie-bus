<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/response.php';

function admin_cookie_name(): string
{
    $config = app_config();
    $name = (string)($config['admin']['session_cookie_name'] ?? 'eddie_admin_session');
    return $name !== '' ? $name : 'eddie_admin_session';
}

function admin_cookie_lifetime_seconds(): int
{
    $config = app_config();
    $lifetime = (int)($config['admin']['session_cookie_lifetime_seconds'] ?? 315360000);
    return max(86400, $lifetime);
}

function admin_cookie_samesite(): string
{
    $config = app_config();
    $raw = strtolower(trim((string)($config['admin']['session_cookie_samesite'] ?? 'lax')));

    if ($raw === 'strict') {
        return 'Strict';
    }

    if ($raw === 'none') {
        // Browsers reject SameSite=None cookies unless Secure is also true.
        return is_https_request() ? 'None' : 'Lax';
    }

    return 'Lax';
}

function is_https_request(): bool
{
    if (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off') {
        return true;
    }

    $forwardedProto = strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''));
    return $forwardedProto === 'https';
}

function password_hash_secure(string $password): string
{
    $algo = PASSWORD_BCRYPT;
    if (defined('PASSWORD_ARGON2ID')) {
        $algo = PASSWORD_ARGON2ID;
    }

    $hash = password_hash($password, $algo);
    if (!is_string($hash) || $hash === '') {
        throw new RuntimeException('Could not hash password.');
    }

    return $hash;
}

function password_verify_secure(string $password, string $hash): bool
{
    return password_verify($password, $hash);
}

function random_memorable_password(): string
{
    $words = [
        'acorn', 'apple', 'apron', 'arrow', 'baker', 'beach', 'beacon', 'berry',
        'birch', 'biscuit', 'blossom', 'blue', 'boat', 'book', 'breeze', 'brick',
        'bridge', 'brook', 'button', 'cabin', 'candle', 'carrot', 'castle', 'cedar',
        'chair', 'cherry', 'cloud', 'coast', 'comet', 'coral', 'cottage', 'crane',
        'daisy', 'dolphin', 'door', 'dragon', 'drum', 'eagle', 'elm', 'falcon',
        'feather', 'fern', 'field', 'finch', 'forest', 'fox', 'garden', 'gate',
        'ginger', 'glade', 'grape', 'green', 'harbour', 'hazel', 'hill', 'honey',
        'horse', 'island', 'ivy', 'jacket', 'juniper', 'kettle', 'kingfisher', 'kite',
        'lake', 'lantern', 'lemon', 'lilac', 'lime', 'maple', 'marble', 'meadow',
        'melon', 'mint', 'moon', 'morning', 'mouse', 'oak', 'ocean', 'olive',
        'orange', 'orchard', 'otter', 'owl', 'paper', 'peach', 'pearl', 'pepper',
        'pine', 'planet', 'plum', 'pond', 'poppy', 'rabbit', 'rain', 'raven',
        'red', 'river', 'robin', 'rocket', 'rose', 'sailor', 'shell', 'silver',
        'sky', 'sparrow', 'spoon', 'spruce', 'star', 'stone', 'storm', 'squirrel',
        'sunset', 'table', 'thistle', 'tiger', 'train', 'tree', 'tulip', 'valley',
        'violet', 'walnut', 'wave', 'willow', 'window', 'winter', 'wood', 'yellow',
        'anchor', 'angel', 'ant', 'badger', 'banana', 'barn', 'basket', 'bat',
        'bell', 'bench', 'bird', 'blanket', 'boot', 'bottle', 'branch', 'bread',
        'broom', 'bucket', 'butterfly', 'cactus', 'camel', 'canoe', 'cheese', 'chestnut',
        'circle', 'clock', 'clover', 'cocoa', 'copper', 'corn', 'crown', 'cup',
        'deer', 'diamond', 'duck', 'earth', 'egg', 'elephant', 'ember', 'engine',
        'farm', 'fire', 'fish', 'flower', 'flute', 'frog', 'frost', 'glove',
        'goat', 'gold', 'goose', 'grass', 'hammer', 'hat', 'hawk', 'heart',
        'hedgehog', 'heron', 'holly', 'house', 'ice', 'ink', 'key', 'ladder',
        'lamb', 'leaf', 'lighthouse', 'lion', 'magpie', 'mango', 'milk', 'mill',
        'mirror', 'muffin', 'mountain', 'mug', 'mushroom', 'nest', 'night', 'nutmeg',
        'onion', 'palm', 'panda', 'parrot', 'path', 'pear', 'pencil', 'piano',
        'pickle', 'pillow', 'pink', 'pumpkin', 'queen', 'rainbow', 'reed', 'ring',
        'road', 'sail', 'salmon', 'scarf', 'seal', 'sheep', 'shoe', 'shore',
        'snow', 'sock', 'soap', 'spring', 'stamp', 'strawberry', 'summer', 'swan',
        'tea', 'thunder', 'toast', 'tomato', 'tower', 'trumpet', 'turtle', 'umbrella',
        'wagon', 'water', 'whale', 'wheat', 'whistle', 'wind', 'wing', 'zebra',
    ];
    $max = count($words) - 1;

    $firstWord = $words[random_int(0, $max)];
    $secondWord = $words[random_int(0, $max)];
    $firstNumber = str_pad((string)random_int(0, 99), 2, '0', STR_PAD_LEFT);
    $secondNumber = str_pad((string)random_int(0, 99), 2, '0', STR_PAD_LEFT);

    return $firstWord . '-' . $firstNumber
        . '-' . $secondWord . '-' . $secondNumber;
}

function session_token_from_request(): string
{
    $cookieName = admin_cookie_name();
    $cookieToken = trim((string)($_COOKIE[$cookieName] ?? ''));
    if ($cookieToken !== '') {
        return $cookieToken;
    }

    $headerToken = trim((string)($_SERVER['HTTP_X_ADMIN_SESSION'] ?? ''));
    if ($headerToken !== '') {
        return $headerToken;
    }

    return '';
}

function set_session_cookie(string $token): void
{
    $cookieName = admin_cookie_name();
    $expires = time() + admin_cookie_lifetime_seconds();

    setcookie($cookieName, $token, [
        'expires' => $expires,
        'path' => '/',
        'domain' => '',
        'secure' => is_https_request(),
        'httponly' => true,
        'samesite' => admin_cookie_samesite(),
    ]);
}

function clear_session_cookie(): void
{
    $cookieName = admin_cookie_name();

    setcookie($cookieName, '', [
        'expires' => time() - 3600,
        'path' => '/',
        'domain' => '',
        'secure' => is_https_request(),
        'httponly' => true,
        'samesite' => admin_cookie_samesite(),
    ]);
}

function issue_session(PDO $pdo, int $userId): string
{
    $token = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $token);

    $stmt = $pdo->prepare(
        'INSERT INTO admin_sessions (user_id, token_hash, ip_address, user_agent)
         VALUES (:user_id, :token_hash, :ip_address, :user_agent)'
    );
    $stmt->execute([
        ':user_id' => $userId,
        ':token_hash' => $tokenHash,
        ':ip_address' => substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45),
        ':user_agent' => substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 512),
    ]);

    return $token;
}

function revoke_session_by_token(PDO $pdo, string $token): void
{
    if ($token === '') {
        return;
    }

    $tokenHash = hash('sha256', $token);
    $stmt = $pdo->prepare('UPDATE admin_sessions SET revoked_at = NOW() WHERE token_hash = :token_hash AND revoked_at IS NULL');
    $stmt->execute([':token_hash' => $tokenHash]);
}

function revoke_user_sessions(PDO $pdo, int $userId): void
{
    $stmt = $pdo->prepare('UPDATE admin_sessions SET revoked_at = NOW() WHERE user_id = :user_id AND revoked_at IS NULL');
    $stmt->execute([':user_id' => $userId]);
}

function auth_event(PDO $pdo, string $eventType, ?int $userId = null, ?string $username = null, array $details = []): void
{
    try {
        $stmt = $pdo->prepare(
            'INSERT INTO auth_event_log (event_type, user_id, username, ip_address, user_agent, details_json)
             VALUES (:event_type, :user_id, :username, :ip_address, :user_agent, :details_json)'
        );

        $stmt->execute([
            ':event_type' => substr($eventType, 0, 64),
            ':user_id' => $userId,
            ':username' => $username !== null ? substr($username, 0, 64) : null,
            ':ip_address' => substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45),
            ':user_agent' => substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 512),
            ':details_json' => $details !== [] ? json_encode($details, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : null,
        ]);
    } catch (Throwable $exception) {
        error_log('Auth event logging failed: ' . $exception->getMessage());
    }
}

function auth_user(PDO $pdo): ?array
{
    $token = session_token_from_request();
    if ($token === '') {
        return null;
    }

        $tokenHash = hash('sha256', $token);
        $stmt = $pdo->prepare(
                'SELECT u.id, u.username, u.display_name, u.email, u.phone_number, u.role, u.created_at, u.updated_at, u.last_login_at
                 FROM admin_sessions s
                 INNER JOIN admin_users u ON u.id = s.user_id
                 WHERE s.token_hash = :token_hash
                     AND s.revoked_at IS NULL
                 LIMIT 1'
        );
    $stmt->execute([':token_hash' => $tokenHash]);
    $user = $stmt->fetch();

    if (!is_array($user)) {
        return null;
    }

    $touchStmt = $pdo->prepare('UPDATE admin_sessions SET last_seen_at = NOW() WHERE token_hash = :token_hash');
    $touchStmt->execute([':token_hash' => $tokenHash]);

    return $user;
}

function require_auth(PDO $pdo): array
{
    $user = auth_user($pdo);

    if (!is_array($user)) {
        clear_session_cookie();
        fail_json(401, 'Authentication required.');
    }

    return $user;
}

function require_admin(PDO $pdo): array
{
    $user = require_auth($pdo);

    if (($user['role'] ?? '') !== 'admin') {
        fail_json(403, 'Admin access required.');
    }

    return $user;
}

function validate_password_policy(string $password): ?string
{
    if (strlen($password) < 8) {
        return 'Password must be at least 8 characters long.';
    }

    return null;
}

function ensure_not_last_admin_change(PDO $pdo, int $targetUserId, string $newRole): void
{
    if ($newRole === 'admin') {
        return;
    }

    $stmt = $pdo->prepare('SELECT role FROM admin_users WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $targetUserId]);
    $target = $stmt->fetch();

    if (!is_array($target) || ($target['role'] ?? '') !== 'admin') {
        return;
    }

    $countStmt = $pdo->query("SELECT COUNT(*) AS count_admins FROM admin_users WHERE role = 'admin'");
    $countRow = $countStmt->fetch();
    $count = (int)($countRow['count_admins'] ?? 0);

    if ($count <= 1) {
        fail_json(422, 'Cannot remove or demote the last admin user.');
    }
}

function ensure_not_last_admin_delete(PDO $pdo, int $targetUserId): void
{
    $stmt = $pdo->prepare('SELECT role FROM admin_users WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $targetUserId]);
    $target = $stmt->fetch();

    if (!is_array($target) || ($target['role'] ?? '') !== 'admin') {
        return;
    }

    $countStmt = $pdo->query("SELECT COUNT(*) AS count_admins FROM admin_users WHERE role = 'admin'");
    $countRow = $countStmt->fetch();
    $count = (int)($countRow['count_admins'] ?? 0);

    if ($count <= 1) {
        fail_json(422, 'Cannot delete the last admin user.');
    }
}
