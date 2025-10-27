<?php
// generate_secret.php - Run this once to generate your secret
$secret = bin2hex(random_bytes(32));
echo "Generated JWT Secret: " . $secret . "\n";
echo "Add this to your .env file as: JWT_SECRET=" . $secret . "\n";
?>